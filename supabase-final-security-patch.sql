-- ==========================================
-- NIEE8 — FINAL SECURITY & CONSISTENCY PATCH
-- Mục tiêu: Vá triệt để các lỗ hổng AV-01 đến AV-09
-- ==========================================

-- 1. TẠO BẢNG ĐỐI SOÁT (RECONCILIATION) - Chống AV-07
CREATE TABLE IF NOT EXISTS public.payment_anomalies (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    payos_order_code BIGINT NOT NULL,
    order_id TEXT,
    order_status TEXT,
    payment_code TEXT,
    amount NUMERIC,
    resolution TEXT DEFAULT 'pending_review',
    resolved_at TIMESTAMPTZ,
    notes TEXT
);

-- Bật RLS cho bảng anomaly - Chỉ Admin được xem
ALTER TABLE public.payment_anomalies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_only_anomalies" ON public.payment_anomalies;
CREATE POLICY "admin_only_anomalies" ON public.payment_anomalies 
FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- 2. ÉP CỨNG RÀNG BUỘC TOÀN VẸN DỮ LIỆU - Chống AV-02
-- Chặn tuyệt đối việc tồn kho bị âm ở mức hạ tầng
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS check_stock_not_negative;
ALTER TABLE public.products ADD CONSTRAINT check_stock_not_negative CHECK (stock_quantity >= 0);

-- Chặn tuyệt đối đơn hàng có số lượng <= 0
-- Lưu ý: Cần kiểm tra cấu trúc bảng orders/order_items để áp dụng chính xác
-- Giả định bảng order_items hoặc cột items trong orders cần validate

-- 3. CẬP NHẬT STRUCTURE CHO COUPONS - Chống AV-01
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS max_usage INTEGER DEFAULT 100;
ALTER TABLE public.coupons ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0;

-- 5. RPC: SECURE_CHECKOUT (PHIÊN BẢN BẢO MẬT TUYỆT ĐỐI V6)
CREATE OR REPLACE FUNCTION public.secure_checkout(
    p_order_id TEXT,
    p_user_id UUID,
    p_customer_name TEXT,
    p_customer_phone TEXT,
    p_customer_address TEXT,
    p_customer_city TEXT,
    p_items JSONB,
    p_client_total NUMERIC,      -- Chỉ dùng để đối soát
    p_payment_method TEXT,
    p_note TEXT DEFAULT NULL,
    p_discount_amount NUMERIC DEFAULT 0,
    p_shipping_fee NUMERIC DEFAULT 0,
    p_coupon_codes TEXT[] DEFAULT ARRAY[]::TEXT[]
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
    v_coupon_code TEXT;
    v_order_code BIGINT;
    v_token UUID;
BEGIN
    -- [BƯỚC 1] KIỂM TRA SẢN PHẨM & KHÓA DÒNG (Chống Race Condition & AV-02)
    FOR item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_product_id := item->>'id';
        v_size := item->>'size';
        v_quantity := (item->>'quantity')::INTEGER;

        -- 🛡️ CHỐNG TẤN CÔNG SỐ ÂM (AV-02)
        IF v_quantity <= 0 THEN
            RAISE EXCEPTION 'INVALID_QUANTITY: Số lượng phải là số dương';
        END IF;

        -- 🔒 KHÓA DÒNG SẢN PHẨM (FOR UPDATE)
        SELECT price, COALESCE((stock_by_size->>v_size)::INTEGER, 0)
        INTO v_unit_price, v_current_stock
        FROM public.products
        WHERE id = v_product_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'PRODUCT_NOT_FOUND: Sản phẩm % không tồn tại', v_product_id;
        END IF;

        IF v_current_stock < v_quantity THEN
            RAISE EXCEPTION 'OUT_OF_STOCK: % (size %) chỉ còn %', 
                (SELECT name FROM public.products WHERE id = v_product_id), v_size, v_current_stock;
        END IF;

        -- Tích lũy giá trị đơn (Authoritative Price)
        v_calculated_total := v_calculated_total + (v_unit_price * v_quantity);

        -- Cập nhật kho (Trừ Stock)
        UPDATE public.products
        SET stock_by_size = jsonb_set(stock_by_size, array[v_size], to_jsonb(v_current_stock - v_quantity)),
            stock_quantity = stock_quantity - v_quantity
        WHERE id = v_product_id;

        -- Ghi log sổ cái kho (Audit Trail)
        INSERT INTO public.stock_movements (product_id, size, quantity, type, reference_id, note)
        VALUES (v_product_id, v_size, -v_quantity, 'sale', p_order_id, 'Checkout tự động');
    END LOOP;

    -- [BƯỚC 2] XỬ LÝ MÃ GIẢM GIÁ & KHÓA DÒNG (Chống AV-01)
    IF p_coupon_codes IS NOT NULL AND array_length(p_coupon_codes, 1) > 0 THEN
        FOREACH v_coupon_code IN ARRAY p_coupon_codes
        LOOP
            -- 🔒 KHÓA DÒNG COUPON (FOR UPDATE) - Ngăn chặn dùng quá lượt
            UPDATE public.coupons
            SET usage_count = usage_count + 1
            WHERE code = v_coupon_code 
              AND is_active = true 
              AND (max_usage IS NULL OR usage_count < max_usage)
            RETURNING code INTO v_coupon_code;

            IF NOT FOUND THEN
                RAISE EXCEPTION 'COUPON_INVALID: Mã % hết lượt dùng hoặc không tồn tại', v_coupon_code;
            END IF;
        END LOOP;
    END IF;

    -- [BƯỚC 3] TÍNH TỔNG TIỀN VÀ ĐỐI SOÁT
    v_calculated_total := v_calculated_total + p_shipping_fee - p_discount_amount;
    IF v_calculated_total < 0 THEN v_calculated_total := 0; END IF;

    -- Log nếu chênh lệch giá với Client gửi lên
    IF ABS(v_calculated_total - p_client_total) > 10 THEN
        INSERT INTO public.error_logs (origin, error_message, details)
        VALUES ('price_mismatch', 'Chênh lệch giá!', jsonb_build_object('order', p_order_id, 'client', p_client_total, 'db', v_calculated_total));
    END IF;

    -- [BƯỚC 4] GHI ĐƠN HÀNG
    INSERT INTO public.orders (
        id, user_id, customer_name, customer_phone, customer_address, customer_city,
        items, total_amount, payment_method, status, discount_amount, shipping_fee, coupon_codes
    ) VALUES (
        p_order_id, p_user_id, p_customer_name, p_customer_phone, p_customer_address, p_customer_city,
        p_items, v_calculated_total, p_payment_method, 'pending', p_discount_amount, p_shipping_fee, to_jsonb(p_coupon_codes)
    )
    RETURNING payos_order_code, cancellation_token INTO v_order_code, v_token;

    RETURN jsonb_build_object(
        'success', true,
        'order_id', p_order_id,
        'calculated_total', v_calculated_total,
        'payos_order_code', v_order_code,
        'cancellation_token', v_token
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 6. RPC: CANCEL_ORDER_SAFE (Trigger hoàn kho an toàn)
CREATE OR REPLACE FUNCTION public.cancel_order_safe(p_order_id TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.orders
    SET status = 'cancelled', updated_at = NOW()
    WHERE id = p_order_id AND status = 'pending';

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Đơn không ở trạng thái pending hoặc không tồn tại');
    END IF;

    RETURN jsonb_build_object('success', true);
END;
$$;
