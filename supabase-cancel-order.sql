CREATE OR REPLACE FUNCTION cancel_order_safe(p_order_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order RECORD;
    v_item RECORD;
    v_coupon_code TEXT;
BEGIN
    -- 1. Tìm đơn hàng
    SELECT * INTO v_order
    FROM public.orders
    WHERE id = p_order_id AND status = 'pending';

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Không tìm thấy đơn hàng hoặc đơn hàng không ở trạng thái pending');
    END IF;

    -- 2. Hoàn lại kho cho từng sản phẩm
    FOR v_item IN SELECT * FROM jsonb_to_recordset(v_order.items) AS x(id TEXT, size TEXT, quantity INT)
    LOOP
        PERFORM public.restore_stock(v_item.id, v_item.size, v_item.quantity, p_order_id);
    END LOOP;

    -- 3. Hoàn lại lượt sử dụng mã giảm giá (nếu có)
    IF v_order.coupon_code IS NOT NULL THEN
        UPDATE public.coupons
        SET usage_count = GREATEST(usage_count - 1, 0)
        WHERE code = v_order.coupon_code;
    END IF;

    -- 4. Cập nhật trạng thái đơn hàng thành cancelled
    UPDATE public.orders
    SET status = 'cancelled',
        note = COALESCE(note, '') || CHR(10) || '[HỆ THỐNG] Khách hủy thanh toán PayOS. Đã tự động hoàn kho.'
    WHERE id = p_order_id;

    RETURN jsonb_build_object('success', true);
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
