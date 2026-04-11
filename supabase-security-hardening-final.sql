-- ==========================================
-- NIEE8 — GO-LIVE SECURITY & ARCHITECTURE HARDENING
-- Chỉnh sửa lần cuối: 11/04/2026
-- ==========================================

-- [1] SEQUENCE & TABLES
-- Đảm bảo mỗi đơn hàng có một mã số nguyên tịnh tiến duy nhất cho PayOS
CREATE SEQUENCE IF NOT EXISTS payos_order_code_seq START 100000;

ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS payos_order_code BIGINT UNIQUE DEFAULT nextval('payos_order_code_seq'),
ADD COLUMN IF NOT EXISTS cancellation_token UUID DEFAULT gen_random_uuid(),
ADD COLUMN IF NOT EXISTS shipping_fee NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS coupon_codes JSONB DEFAULT '[]'::jsonb;

-- Đảm bảo bảng Coupons có đủ các cột cần thiết cho logic bảo mật và phân loại
ALTER TABLE public.coupons 
ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS max_usage INTEGER,
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'product', -- 'product', 'shipping', 'total'
ADD COLUMN IF NOT EXISTS require_auth BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS max_discount_amount NUMERIC;

-- Bổ sung chỉ số sức hút cho Sản phẩm
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS sales_count BIGINT DEFAULT 0,
ADD COLUMN IF NOT EXISTS likes_count BIGINT DEFAULT 0;

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

    -- 2. KIỂM TRA & CẬP NHẬT TẤT CẢ MÃ GIẢM GIÁ (STACKING)
    IF p_coupon_codes IS NOT NULL AND array_length(p_coupon_codes, 1) > 0 THEN
        DECLARE
            v_code TEXT;
        BEGIN
            FOREACH v_code IN ARRAY p_coupon_codes
            LOOP
                UPDATE public.coupons
                SET usage_count = usage_count + 1
                WHERE code = v_code AND (max_usage IS NULL OR usage_count < max_usage) AND is_active = true;
                
                IF NOT FOUND THEN
                    RAISE EXCEPTION 'COUPON_INVALID: Mã % không hợp lệ hoặc đã hết lượt dùng', v_code;
                END IF;
            END LOOP;
        END;
    END IF;

    -- 3. ĐỐI SOÁT GIÁ (Tính lại tổng tiền thực tế: hàng + ship - giảm giá)
    v_calculated_total := v_calculated_total + p_shipping_fee - p_discount_amount;

    -- Cảnh báo nếu giá Client gửi lên chênh lệch > 1% so với giá DB tính (Dấu hiệu thao túng)
    IF ABS(v_calculated_total - p_total_amount) > (v_calculated_total * 0.01) THEN
        INSERT INTO public.error_logs (origin, error_message, details)
        VALUES ('secure_checkout_warn', 'Phát hiện chênh lệch giá đáng kể!', 
                jsonb_build_object(
                    'order_id', p_order_id, 
                    'client_total', p_total_amount, 
                    'db_calculated_total', v_calculated_total,
                    'diff_percentage', CASE WHEN v_calculated_total > 0 THEN ROUND((ABS(v_calculated_total - p_total_amount) / v_calculated_total * 100)::numeric, 2) ELSE 0 END
                ));
    END IF;

    -- 4. LƯU ĐƠN HÀNG VỚI GIÁ ĐÃ TÍNH LẠI
    INSERT INTO public.orders (
        id, user_id, customer_name, customer_phone,
        customer_address, customer_city, items,
        total_amount, shipping_fee, payment_method, status,
        note, discount_amount, coupon_codes
    ) VALUES (
        p_order_id, p_user_id, p_customer_name, p_customer_phone,
        p_customer_address, p_customer_city, p_items,
        v_calculated_total, p_shipping_fee, p_payment_method, 'pending',
        p_note, p_discount_amount, to_jsonb(p_coupon_codes)
    );

    -- 5. GHI NHẬT KÝ
    INSERT INTO public.activity_logs (action, details, performed_by)
    VALUES ('checkout', 'Đơn hàng mới tạo: ' || p_order_id || '. Tổng tiền: ' || v_calculated_total, p_user_id);

    -- Lấy payos_order_code và cancellation_token vừa sinh ra để trả về cho API
    DECLARE
        v_payos_order_code BIGINT;
        v_cancellation_token UUID;
    BEGIN
        SELECT payos_order_code, cancellation_token 
        INTO v_payos_order_code, v_cancellation_token 
        FROM public.orders 
        WHERE id = p_order_id;

        RETURN jsonb_build_object(
            'success', true, 
            'order_id', p_order_id, 
            'calculated_total', v_calculated_total,
            'payos_order_code', v_payos_order_code,
            'cancellation_token', v_cancellation_token
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


-- [4] HÀM XỬ LÝ LIGHT-WEIGHT LIKE (Kết nối với nút Tim có sẵn)
CREATE OR REPLACE FUNCTION handle_product_like(p_id TEXT, p_increment INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.products
    SET likes_count = GREATEST(0, likes_count + p_increment)
    WHERE id = p_id;
END;
$$;


-- [5] TỰ ĐỘNG CẬP NHẬT DOANH SỐ KHI ĐƠN HÀNG THÀNH CÔNG
CREATE OR REPLACE FUNCTION trigger_increment_sales_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    item JSONB;
BEGIN
    -- Khi đơn hàng chuyển sang 'processing' (đã thanh toán) hoặc 'completed'
    IF (NEW.status IN ('processing', 'completed')) AND (OLD.status = 'pending') THEN
        FOR item IN SELECT * FROM jsonb_array_elements(NEW.items)
        LOOP
            UPDATE public.products
            SET sales_count = sales_count + (item->>'quantity')::INTEGER
            WHERE id = item->>'id';
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_order_success_increment_sales ON public.orders;
CREATE TRIGGER on_order_success_increment_sales
    AFTER UPDATE OF status ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION trigger_increment_sales_count();
