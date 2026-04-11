-- ==========================================
-- NIEE8 — GO-LIVE SECURITY & ARCHITECTURE HARDENING
-- Chỉnh sửa lần cuối: 11/04/2026
-- ==========================================

-- [1] SEQUENCE & TABLES
-- Đảm bảo mỗi đơn hàng có một mã số nguyên tịnh tiến duy nhất cho PayOS
CREATE SEQUENCE IF NOT EXISTS payos_order_code_seq START 100000;

ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS payos_order_code BIGINT UNIQUE DEFAULT nextval('payos_order_code_seq');

-- Mở rộng bảng Nhật ký để biết AI hay Admin đã thực hiện
ALTER TABLE public.activity_logs 
ADD COLUMN IF NOT EXISTS performed_by UUID REFERENCES auth.users(id);

-- Tạo bảng log lỗi để debug RPC chuyên nghiệp
CREATE TABLE IF NOT EXISTS public.error_logs (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    origin TEXT,
    error_message TEXT,
    details JSONB
);

-- [2] RPC: SECURE_CHECKOUT (PHIÊN BẢN BẢO MẬT TUYỆT ĐỐI)
CREATE OR REPLACE FUNCTION secure_checkout(
    p_order_id TEXT,
    p_user_id UUID,
    p_customer_name TEXT,
    p_customer_phone TEXT,
    p_customer_address TEXT,
    p_customer_city TEXT,
    p_items JSONB,
    p_total_amount NUMERIC, -- Chỉ dùng để đối soát, không dùng để ghi DB
    p_payment_method TEXT,
    p_note TEXT DEFAULT NULL,
    p_discount_amount NUMERIC DEFAULT 0,
    p_coupon_code TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    item JSONB;
    v_product_id TEXT;
    v_size TEXT;
    v_quantity INTEGER;
    v_unit_price NUMERIC;
    v_current_stock INTEGER;
    v_calculated_total NUMERIC := 0;
    v_error_code TEXT;
BEGIN
    -- 1. KIỂM TRA KHO & TÍNH LẠI GIÁ (SỬ DỤNG GIÁ TỪ DATABASE)
    FOR item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_product_id := item->>'id';
        v_size := item->>'size';
        v_quantity := (item->>'quantity')::INTEGER;

        -- Khóa hàng (FOR UPDATE) để tránh Race Condition
        SELECT price, COALESCE((stock_by_size->>v_size)::INTEGER, 0)
        INTO v_unit_price, v_current_stock
        FROM public.products
        WHERE id = v_product_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'PRODUCT_NOT_FOUND: Sản phẩm % không tồn tại', v_product_id;
        END IF;

        IF v_current_stock < v_quantity THEN
            RAISE EXCEPTION 'OUT_OF_STOCK: Sản phẩm % size % đã hết hàng', v_product_id, v_size;
        END IF;

        -- Tính toán tích lũy giá trị đơn hàng thực tế
        v_calculated_total := v_calculated_total + (v_unit_price * v_quantity);

        -- Cập nhật kho
        UPDATE public.products
        SET stock_by_size = jsonb_set(
              COALESCE(stock_by_size, '{"S":0,"M":0,"L":0,"XL":0}'::jsonb),
              array[v_size],
              to_jsonb(v_current_stock - v_quantity)
            ),
            stock_quantity = stock_quantity - v_quantity
        WHERE id = v_product_id;

        -- Ghi sổ kho
        INSERT INTO public.stock_movements (product_id, size, quantity, type, reference_id, note)
        VALUES (v_product_id, v_size, -v_quantity, 'sale', p_order_id, 'Bán hàng tự động (secure_checkout).');
    END LOOP;

    -- 2. KIỂM TRA MÃ GIẢM GIÁ (NẾU CÓ)
    IF p_coupon_code IS NOT NULL THEN
        UPDATE public.coupons
        SET usage_count = usage_count + 1
        WHERE code = p_coupon_code AND (max_usage IS NULL OR usage_count < max_usage);
        
        IF NOT FOUND THEN
            RAISE EXCEPTION 'COUPON_INVALID: Mã giảm giá không hợp lệ hoặc đã hết lượt dùng';
        END IF;
    END IF;

    -- 3. ĐỐI SOÁT GIÁ (Tính lại tổng tiền thực tế sau khi trừ giảm giá)
    v_calculated_total := v_calculated_total - p_discount_amount;

    -- 4. LƯU ĐƠN HÀNG VỚI GIÁ ĐÃ TÍNH LẠI
    INSERT INTO public.orders (
        id, user_id, customer_name, customer_phone,
        customer_address, customer_city, items,
        total_amount, payment_method, status,
        note, discount_amount, coupon_code
    ) VALUES (
        p_order_id, p_user_id, p_customer_name, p_customer_phone,
        p_customer_address, p_customer_city, p_items,
        v_calculated_total, p_payment_method, 'pending',
        p_note, p_discount_amount, p_coupon_code
    );

    -- 5. GHI NHẬT KÝ
    INSERT INTO public.activity_logs (action, details, performed_by)
    VALUES ('checkout', 'Đơn hàng mới tạo: ' || p_order_id || '. Tổng tiền: ' || v_calculated_total, p_user_id);

    -- Lấy payos_order_code vừa sinh ra để trả về cho API
    DECLARE
        v_payos_order_code BIGINT;
    BEGIN
        SELECT payos_order_code INTO v_payos_order_code FROM public.orders WHERE id = p_order_id;
        RETURN jsonb_build_object(
            'success', true, 
            'order_id', p_order_id, 
            'calculated_total', v_calculated_total,
            'payos_order_code', v_payos_order_code
        );
    END;

EXCEPTION
    WHEN OTHERS THEN
        -- PHÂN LOẠI MÃ LỖI CHO FRONTEND
        v_error_code := CASE
            WHEN SQLERRM LIKE 'OUT_OF_STOCK%' THEN 'OUT_OF_STOCK'
            WHEN SQLERRM LIKE 'PRODUCT_NOT_FOUND%' THEN 'PRODUCT_NOT_FOUND'
            WHEN SQLERRM LIKE 'COUPON_INVALID%' THEN 'COUPON_INVALID'
            ELSE 'SYSTEM_ERROR'
        END;

        -- GHI LOG LỖI ĐỂ TRUY VẾT
        INSERT INTO public.error_logs (origin, error_message, details)
        VALUES ('secure_checkout', SQLERRM, jsonb_build_object('order_id', p_order_id, 'user_id', p_user_id));

        RETURN jsonb_build_object(
            'success', false, 
            'error_code', v_error_code,
            'error', SQLERRM
        );
END;
$$;


-- [3] RPC: CANCEL_ORDER_SAFE (CHỐNG HOÀN KHO KÉP)
CREATE OR REPLACE FUNCTION cancel_order_safe(p_order_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_order_status TEXT;
BEGIN
    -- Chỉ cho phép hủy đơn đang ở trạng thái pending
    SELECT status INTO v_order_status
    FROM public.orders
    WHERE id = p_order_id;

    IF v_order_status != 'pending' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Đơn hàng không thể hủy (trạng thái: ' || v_order_status || ')');
    END IF;

    -- QUAN TRỌNG: KHÔNG gọi restore_stock ở đây. 
    -- Trigger on_order_cancelled sẽ tự động gọi khi status chuyển sang 'cancelled'.
    UPDATE public.orders
    SET status = 'cancelled',
        updated_at = NOW(),
        note = COALESCE(note, '') || CHR(10) || '[HỆ THỐNG] Đã hủy đơn và tự động hoàn kho.'
    WHERE id = p_order_id;

    RETURN jsonb_build_object('success', true);
EXCEPTION
    WHEN OTHERS THEN
        INSERT INTO public.error_logs (origin, error_message, details)
        VALUES ('cancel_order_safe', SQLERRM, jsonb_build_object('order_id', p_order_id));
        RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
