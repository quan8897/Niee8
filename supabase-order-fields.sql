-- Nâng cấp bảng orders với các trường nâng cao

-- 1. Thêm các cột nâng cao vào bảng orders (sẽ không bị lỗi nếu cột đã tồn tại)
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS invoice_info JSONB;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS note TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS discount_amount NUMERIC DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS coupon_code TEXT;

-- ĐẢM BẢO RÀNG BUỘC (FOREIGN KEY) MÃ GIẢM GIÁ (Coupons <=> Orders)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'fk_orders_coupon'
    ) THEN
        ALTER TABLE public.orders 
        ADD CONSTRAINT fk_orders_coupon 
        FOREIGN KEY (coupon_code) 
        REFERENCES public.coupons (code) 
        ON DELETE RESTRICT; -- Cấm xóa mã coupon nếu đã có đơn hàng sử dụng mã đó (Bảo vệ dữ liệu kế toán)
    END IF;
END $$;

-- 2. Cập nhật lại Function tạo đơn mua hàng an toàn (secure_checkout)
CREATE OR REPLACE FUNCTION secure_checkout(
    p_order_id TEXT,
    p_user_id UUID,
    p_customer_name TEXT,
    p_customer_phone TEXT,
    p_customer_address TEXT,
    p_customer_city TEXT,
    p_items JSONB,
    p_total_amount NUMERIC,
    p_payment_method TEXT,
    p_note TEXT DEFAULT NULL,
    p_invoice_info JSONB DEFAULT NULL,
    p_discount_amount NUMERIC DEFAULT 0,
    p_coupon_code TEXT DEFAULT NULL
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

        SELECT stock_by_size INTO v_current_stock_by_size
        FROM public.products
        WHERE id = v_product_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Sản phẩm % không tồn tại', v_product_id;
        END IF;

        IF v_current_stock_by_size IS NULL THEN
            v_current_count := 0;
        ELSE
            v_current_count := COALESCE((v_current_stock_by_size->>v_size)::INT, 0);
        END IF;

        IF v_current_count < v_quantity THEN
            RAISE EXCEPTION 'Sản phẩm % size % hiện không đủ trong kho', v_product_id, v_size;
        END IF;
    END LOOP;

    -- 2. DUYỆT LẠI LẦN NỮA ĐỂ THỰC SỰ TRỪ KHO (nếu không có lỗi)
    FOR item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(id TEXT, size TEXT, quantity INT)
    LOOP
        v_product_id := item.id;
        v_size := item.size;
        v_quantity := item.quantity;

        SELECT stock_by_size INTO v_current_stock_by_size
        FROM public.products
        WHERE id = v_product_id;

        v_current_count := COALESCE((v_current_stock_by_size->>v_size)::INT, 0);
        
        v_new_stock_by_size := COALESCE(v_current_stock_by_size, '{}'::JSONB);
        v_new_stock_by_size := jsonb_set(
            v_new_stock_by_size,
            ARRAY[v_size],
            to_jsonb(v_current_count - v_quantity)
        );

        UPDATE public.products
        SET stock_by_size = v_new_stock_by_size,
            stock_quantity = stock_quantity - v_quantity
        WHERE id = v_product_id;

        -- LƯU LẠI LỊCH SỬ KHO
        INSERT INTO public.stock_movements (product_id, size, quantity, type, order_id, note)
        VALUES (v_product_id, v_size, v_quantity, 'export', p_order_id, 'Xuất kho cho đơn hàng mới');
    END LOOP;

    -- 3. TẠO ĐƠN HÀNG (Với dữ liệu đầy đủ bao gồm MÃ GIẢM GIÁ VÀ HÓA ĐƠN)
    INSERT INTO public.orders (
        id, user_id, customer_name, customer_phone, customer_address, customer_city,
        items, total_amount, payment_method, status, note, invoice_info, discount_amount, coupon_code
    ) VALUES (
        p_order_id, p_user_id, p_customer_name, p_customer_phone, p_customer_address, p_customer_city,
        p_items, p_total_amount, p_payment_method, 'pending', p_note, p_invoice_info, p_discount_amount, p_coupon_code
    );

    RETURN jsonb_build_object('success', true);
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
