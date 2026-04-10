-- HÀM THANH TOÁN AN TOÀN NIEE8 2026
-- Đảm bảo: Nguyên tử (Atomic), Chống tranh mua (Locking), Tự hoàn tác (Rollback)

CREATE OR REPLACE FUNCTION secure_checkout(
    p_order_id TEXT,
    p_user_id UUID,
    p_customer_name TEXT,
    p_customer_phone TEXT,
    p_customer_address TEXT,
    p_customer_city TEXT,
    p_items JSONB,
    p_total_amount NUMERIC,
    p_payment_method TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    item RECORD;
    v_product_id TEXT;
    v_size TEXT;
    v_quantity INT;
    v_current_stock_by_size JSONB;
    v_new_stock_by_size JSONB;
    v_current_count INT;
BEGIN
    -- 1. DUYỆT QUA TỪNG MẶT HÀNG ĐỂ KIỂM TRA VÀ KHÓA KHO
    FOR item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(id TEXT, size TEXT, quantity INT)
    LOOP
        v_product_id := item.id;
        v_size := item.size;
        v_quantity := item.quantity;

        -- Khóa dòng dữ liệu của sản phẩm để không ai khác được sửa cùng lúc
        SELECT stock_by_size INTO v_current_stock_by_size
        FROM public.products
        WHERE id = v_product_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Sản phẩm % không tồn tại.', v_product_id;
        END IF;

        -- Lấy số lượng tồn của size cụ thể
        v_current_count := (v_current_stock_by_size->>v_size)::INT;

        IF v_current_count IS NULL OR v_current_count < v_quantity THEN
            RAISE EXCEPTION 'Sản phẩm % size % đã hết hàng (còn %). Vui lòng giảm số lượng.', 
                (SELECT name FROM public.products WHERE id = v_product_id), v_size, COALESCE(v_current_count, 0);
        END IF;

        -- 2. TRỪ KHO (Cập nhật JSONB và stock_quantity)
        v_new_stock_by_size := jsonb_set(
            v_current_stock_by_size, 
            ARRAY[v_size], 
            (v_current_count - v_quantity)::TEXT::JSONB
        );

        UPDATE public.products
        SET 
            stock_by_size = v_new_stock_by_size,
            stock_quantity = stock_quantity - v_quantity,
            updated_at = NOW()
        WHERE id = v_product_id;
    END LOOP;

    -- 3. TẠO ĐƠN HÀNG CHÍNH
    INSERT INTO public.orders (
        id, user_id, customer_name, customer_phone, customer_address, 
        customer_city, total_amount, payment_method, status, created_at
    ) VALUES (
        p_order_id, p_user_id, p_customer_name, p_customer_phone, p_customer_address, 
        p_customer_city, p_total_amount, p_payment_method, 'pending', NOW()
    );

    -- 4. LƯU CHI TIẾT ĐƠN HÀNG
    INSERT INTO public.order_items (order_id, product_id, size, quantity, price)
    SELECT 
        p_order_id, 
        x.id, 
        x.size, 
        x.quantity,
        (SELECT (price::TEXT::NUMERIC) FROM public.products WHERE id = x.id)
    FROM jsonb_to_recordset(p_items) AS x(id TEXT, size TEXT, quantity INT);

    RETURN jsonb_build_object('success', true, 'order_id', p_order_id);

EXCEPTION WHEN OTHERS THEN
    -- Mọi lỗi xảy ra sẽ tự động hủy toàn bộ quá trình (Rollback)
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
