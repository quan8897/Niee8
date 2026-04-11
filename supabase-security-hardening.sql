-- =============================================================
-- SCRIPT THẮT CHẶT AN NINH NIE8 (SECURITY HARDENING)
-- =============================================================

-- 1. VÁ LỖ HỔNG THAO TÚNG GIÁ TRONG SECURE_CHECKOUT
-- Phiên bản v5: Tự động tính toán lại giá tiền từ bảng Products
-- =============================================================

CREATE OR REPLACE FUNCTION secure_checkout(
    p_order_id TEXT,
    p_user_id UUID,
    p_customer_name TEXT,
    p_customer_phone TEXT,
    p_customer_address TEXT,
    p_customer_city TEXT,
    p_items JSONB,
    p_total_amount NUMERIC, -- Chỉ dùng để log hoặc đối chiếu
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
    v_current_count INT;
    v_item_price NUMERIC;
    v_calculated_total NUMERIC := 0;
BEGIN
    -- DUYỆT QUA TỪNG MẶT HÀNG ĐỂ KIỂM TRA KHO VÀ TÍNH GIÁ
    FOR item IN SELECT * FROM jsonb_to_recordset(p_items) AS x(id TEXT, size TEXT, quantity INT)
    LOOP
        v_product_id := item.id;
        v_size := item.size;
        v_quantity := item.quantity;

        -- 1. Khóa dòng và lấy thông tin sản phẩm (Giá + Kho)
        SELECT stock_by_size, (price::TEXT::NUMERIC) 
        INTO v_current_stock_by_size, v_item_price
        FROM public.products
        WHERE id = v_product_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Sản phẩm % không tồn tại.', v_product_id;
        END IF;

        -- 2. Kiểm tra tồn kho theo size
        v_current_count := (v_current_stock_by_size->>v_size)::INT;

        IF v_current_count IS NULL OR v_current_count < v_quantity THEN
            RAISE EXCEPTION 'Sản phẩm % size % đã hết hàng hoặc không đủ.', v_product_id, v_size;
        END IF;

        -- 3. Cộng dồn vào tổng tiền thực tế
        v_calculated_total := v_calculated_total + (v_item_price * v_quantity);

        -- 4. Trừ kho
        UPDATE public.products
        SET 
            stock_by_size = jsonb_set(v_current_stock_by_size, ARRAY[v_size], (v_current_count - v_quantity)::TEXT::JSONB),
            stock_quantity = stock_quantity - v_quantity,
            updated_at = NOW()
        WHERE id = v_product_id;

        -- 5. Ghi log di biến kho
        INSERT INTO public.stock_movements (product_id, size, quantity, type, reference_id, note)
        VALUES (v_product_id, v_size, -v_quantity, 'sale', p_order_id, 'Bán hàng (V5 Secure)');
    END LOOP;

    -- TẠO ĐƠN HÀNG VỚI GIÁ TRỊ ĐÃ TÍNH TOÁN (Bỏ qua giá từ FE gửi lên để an toàn)
    INSERT INTO public.orders (
        id, user_id, customer_name, customer_phone, customer_address, 
        customer_city, total_amount, payment_method, status, created_at, items
    ) VALUES (
        p_order_id, p_user_id, p_customer_name, p_customer_phone, p_customer_address, 
        p_customer_city, v_calculated_total, p_payment_method, 'pending', NOW(), p_items
    );

    -- LƯU CHI TIẾT ĐƠN HÀNG
    INSERT INTO public.order_items (order_id, product_id, size, quantity, price)
    SELECT 
        p_order_id, 
        x.id, 
        x.size, 
        x.quantity,
        (SELECT (price::TEXT::NUMERIC) FROM public.products WHERE id = x.id)
    FROM jsonb_to_recordset(p_items) AS x(id TEXT, size TEXT, quantity INT);

    RETURN jsonb_build_object(
        'success', true, 
        'order_id', p_order_id, 
        'final_amount', v_calculated_total
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;


-- 2. KÍCH HOẠT HÀNG RÀO BẢO VỆ DỮ LIỆU (RLS)
-- =============================================================

-- Bật RLS cho các bảng chính
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- POLICY CHO PRODUCTS: Ai cũng xem được, chỉ Admin sửa được
DROP POLICY IF EXISTS "Public can view products" ON public.products;
CREATE POLICY "Public can view products" ON public.products FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage products" ON public.products;
CREATE POLICY "Admins can manage products" ON public.products 
FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- POLICY CHO ORDERS: User xem được đơn mình, Admin xem hết
DROP POLICY IF EXISTS "Users view own orders" ON public.orders;
CREATE POLICY "Users view own orders" ON public.orders FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins view all orders" ON public.orders;
CREATE POLICY "Admins view all orders" ON public.orders FOR ALL 
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- POLICY CHO SITE_SETTINGS: Ai cũng xem được, Admin sửa được
DROP POLICY IF EXISTS "Public can view settings" ON public.site_settings;
CREATE POLICY "Public can view settings" ON public.site_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "Admins can manage settings" ON public.site_settings;
CREATE POLICY "Admins can manage settings" ON public.site_settings 
FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
