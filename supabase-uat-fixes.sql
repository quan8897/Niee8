-- ==========================================
-- BẢN VÁ LỖI DATABASE TỪ UAT TEST RUNNER
-- ==========================================

-- 1. Bật RLS (Row Level Security) cho bảng Products và Site Settings
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Cấp quyền ĐỌC (Select) cho tất cả mọi người
CREATE POLICY "Cho phép tất cả mọi người xem sản phẩm" 
ON public.products FOR SELECT USING (true);

CREATE POLICY "Cho phép tất cả mọi người xem cài đặt" 
ON public.site_settings FOR SELECT USING (true);

-- Cấp quyền THÊM/SỬA/XÓA (Insert, Update, Delete) CHỈ DÀNH CHO ADMIN
CREATE POLICY "Chỉ Admin mới được thay đổi sản phẩm" 
ON public.products FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "Chỉ Admin mới được thay đổi cài đặt" 
ON public.site_settings FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 2. Thêm Ràng buộc (Constraint) chống Tồn Kho Âm
ALTER TABLE public.products 
ADD CONSTRAINT check_stock_positive CHECK (stock_quantity >= 0);

-- 3. Tạo Hàm Transaction Bán Hàng Trọn Gói (Chống Race Condition)
-- Hàm này sẽ INSERT đơn hàng và TRỪ TỒN KHO cùng 1 lúc. Nếu kho âm, toàn bộ giao dịch bị hủy tự động.
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
SECURITY DEFINER -- Đảm bảo hàm chạy với quyền cao nhất trong nội bộ
AS $$
DECLARE
    item JSONB;
    v_product_id TEXT;
    v_size TEXT;
    v_quantity INTEGER;
    v_current_stock INTEGER;
    v_price NUMERIC;
BEGIN
    -- Vòng lặp kiểm tra và trừ kho cho từng mặt hàng trong đơn
    FOR item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_product_id := item->>'id';
        v_size := item->>'size';
        v_quantity := (item->>'quantity')::INTEGER;

        -- Khóa dòng sản phẩm này lại để tránh 2 người cùng mua 1 lúc (Row-level lock)
        SELECT COALESCE((stock_by_size->>v_size)::INTEGER, 0)
        INTO v_current_stock
        FROM public.products
        WHERE id = v_product_id
        FOR UPDATE;

        IF v_current_stock < v_quantity THEN
            RAISE EXCEPTION 'Mã sản phẩm % size % đã hết hàng hoặc không đủ số lượng.', v_product_id, v_size;
        END IF;

        -- Trừ kho
        UPDATE public.products
        SET stock_by_size = jsonb_set(
              COALESCE(stock_by_size, '{"S": 0, "M": 0, "L": 0, "XL": 0}'::jsonb),
              array[v_size],
              to_jsonb(v_current_stock - v_quantity)
            ),
            stock_quantity = stock_quantity - v_quantity
        WHERE id = v_product_id;

        -- Ghi sổ nghiệp vụ xuất kho
        INSERT INTO public.stock_movements (product_id, size, quantity, type, reference_id, note)
        VALUES (v_product_id, v_size, -v_quantity, 'sale', p_order_id, 'Xuất bán trừ kho tự động.');

    END LOOP;

    -- Nếu trừ kho trót lọt tất cả, tiến hành ghi Đơn hàng
    INSERT INTO public.orders (
        id, user_id, customer_name, customer_phone, customer_address, customer_city, items, total_amount, payment_method, status
    ) VALUES (
        p_order_id, p_user_id, p_customer_name, p_customer_phone, p_customer_address, p_customer_city, p_items, p_total_amount, p_payment_method, 'pending'
    );

    RETURN jsonb_build_object('success', true, 'message', 'Đặt hàng thành công!');
EXCEPTION
    WHEN OTHERS THEN
        -- Bất kỳ lỗi gì xảy ra (hết hàng, lỗi data), mọi thao tác sẽ tự động ROLLBACK hoàn tác.
        RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
