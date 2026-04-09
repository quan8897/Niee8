-- ==========================================
-- NIEE8 — DATABASE SECURITY & BUSINESS LOGIC FIXES
-- Chạy toàn bộ file này trong Supabase SQL Editor
-- ==========================================

-- ==========================================
-- PHẦN 1: RLS (Row Level Security)
-- ==========================================

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_notifications ENABLE ROW LEVEL SECURITY;

-- Drop old policies nếu có để tránh conflict
DROP POLICY IF EXISTS "Cho phép tất cả mọi người xem sản phẩm" ON public.products;
DROP POLICY IF EXISTS "Cho phép tất cả mọi người xem cài đặt" ON public.site_settings;
DROP POLICY IF EXISTS "Chỉ Admin mới được thay đổi sản phẩm" ON public.products;
DROP POLICY IF EXISTS "Chỉ Admin mới được thay đổi cài đặt" ON public.site_settings;

-- Products: Tất cả xem, chỉ Admin sửa
CREATE POLICY "products_select_public" ON public.products FOR SELECT USING (true);
CREATE POLICY "products_write_admin" ON public.products FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Site Settings: Tất cả xem, chỉ Admin sửa
CREATE POLICY "settings_select_public" ON public.site_settings FOR SELECT USING (true);
CREATE POLICY "settings_write_admin" ON public.site_settings FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Orders: Khách xem đơn của mình, Admin xem tất cả
CREATE POLICY "orders_select_own" ON public.orders FOR SELECT USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "orders_insert_auth" ON public.orders FOR INSERT WITH CHECK (true); -- RPC handle
CREATE POLICY "orders_update_admin" ON public.orders FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Stock Movements: Chỉ Admin và RPC (SECURITY DEFINER) xem/ghi
CREATE POLICY "stock_movements_admin" ON public.stock_movements FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Stock Notifications: Khách thêm của mình
CREATE POLICY "stock_notif_insert" ON public.stock_notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "stock_notif_select_admin" ON public.stock_notifications FOR SELECT USING (
    auth.uid()::text = user_id::text OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);


-- ==========================================
-- PHẦN 2: CONSTRAINTS CHỐNG TỒN KHO ÂM
-- ==========================================

ALTER TABLE public.products
DROP CONSTRAINT IF EXISTS check_stock_positive;

ALTER TABLE public.products
ADD CONSTRAINT check_stock_positive CHECK (stock_quantity >= 0);

-- Đổi price thành NUMERIC nếu vẫn là TEXT
-- ALTER TABLE public.products ALTER COLUMN price TYPE NUMERIC USING (regexp_replace(price, '[^0-9]', '', 'g'))::NUMERIC;


-- ==========================================
-- PHẦN 3: HÀM ATOMIC CHECKOUT (Chống Race Condition)
-- ==========================================

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
    item JSONB;
    v_product_id TEXT;
    v_size TEXT;
    v_quantity INTEGER;
    v_current_stock INTEGER;
BEGIN
    FOR item IN SELECT * FROM jsonb_array_elements(p_items)
    LOOP
        v_product_id := item->>'id';
        v_size := item->>'size';
        v_quantity := (item->>'quantity')::INTEGER;

        -- Row-level lock: chặn 2 user mua cùng lúc
        SELECT COALESCE((stock_by_size->>v_size)::INTEGER, 0)
        INTO v_current_stock
        FROM public.products
        WHERE id = v_product_id
        FOR UPDATE;

        IF v_current_stock < v_quantity THEN
            RAISE EXCEPTION 'Sản phẩm % size % đã hết hàng (còn %). Vui lòng giảm số lượng.', 
                v_product_id, v_size, v_current_stock;
        END IF;

        -- Trừ kho
        UPDATE public.products
        SET stock_by_size = jsonb_set(
              COALESCE(stock_by_size, '{"S":0,"M":0,"L":0,"XL":0}'::jsonb),
              array[v_size],
              to_jsonb(v_current_stock - v_quantity)
            ),
            stock_quantity = stock_quantity - v_quantity
        WHERE id = v_product_id;

        -- Ghi sổ kho (stock ledger)
        INSERT INTO public.stock_movements (product_id, size, quantity, type, reference_id, note)
        VALUES (v_product_id, v_size, -v_quantity, 'sale', p_order_id, 'Bán hàng tự động.');
    END LOOP;

    -- Lưu đơn hàng sau khi trừ kho thành công
    INSERT INTO public.orders (
        id, user_id, customer_name, customer_phone,
        customer_address, customer_city, items,
        total_amount, payment_method, status
    ) VALUES (
        p_order_id, p_user_id, p_customer_name, p_customer_phone,
        p_customer_address, p_customer_city, p_items,
        p_total_amount, p_payment_method, 'pending'
    );

    RETURN jsonb_build_object('success', true, 'order_id', p_order_id);
EXCEPTION
    WHEN OTHERS THEN
        -- Bất kỳ lỗi nào → ROLLBACK toàn bộ
        RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;


-- ==========================================
-- PHẦN 4: HÀM HOÀN KHO KHI HỦY ĐƠN
-- ==========================================

CREATE OR REPLACE FUNCTION restore_stock(
    p_product_id TEXT,
    p_size TEXT,
    p_quantity INTEGER,
    p_order_id TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.products
    SET stock_by_size = jsonb_set(
          COALESCE(stock_by_size, '{"S":0,"M":0,"L":0,"XL":0}'::jsonb),
          array[p_size],
          to_jsonb(COALESCE((stock_by_size->>p_size)::INTEGER, 0) + p_quantity)
        ),
        stock_quantity = stock_quantity + p_quantity
    WHERE id = p_product_id;

    INSERT INTO public.stock_movements (product_id, size, quantity, type, reference_id, note)
    VALUES (p_product_id, p_size, p_quantity, 'return', p_order_id, 'Hoàn kho khi hủy đơn.');
END;
$$;


-- ==========================================
-- PHẦN 5: DB TRIGGER — TỰ ĐỘNG HOÀN KHO KHI HỦY ĐƠN
-- Không phụ thuộc Frontend: Admin xóa thẳng trên Supabase cũng tự hoàn kho
-- ==========================================

CREATE OR REPLACE FUNCTION trigger_restore_stock_on_cancel()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    item JSONB;
BEGIN
    -- Chỉ kích hoạt khi status thay đổi SANG 'cancelled'
    IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
        FOR item IN SELECT * FROM jsonb_array_elements(OLD.items)
        LOOP
            PERFORM restore_stock(
                item->>'id',
                item->>'size',
                (item->>'quantity')::INTEGER,
                OLD.id
            );
        END LOOP;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_order_cancelled ON public.orders;

CREATE TRIGGER on_order_cancelled
    AFTER UPDATE OF status ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION trigger_restore_stock_on_cancel();


-- ==========================================
-- PHẦN 6: CRON JOB — TỰ HỦY ĐƠN PAYOS QUÁ 30 PHÚT
-- Yêu cầu bật pg_cron extension trên Supabase Dashboard
-- ==========================================

-- Bật extension (chạy 1 lần):
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Đăng ký cron job (chạy mỗi 15 phút):
-- SELECT cron.schedule(
--     'cancel-expired-payos-orders',
--     '*/15 * * * *',
--     $$
--     UPDATE public.orders
--     SET status = 'cancelled'
--     WHERE status = 'pending'
--       AND payment_method = 'payos'
--       AND created_at < NOW() - INTERVAL '30 minutes';
--     $$
-- );
-- LƯU Ý: Trigger on_order_cancelled sẽ tự động hoàn kho khi cron này chạy.


-- ==========================================
-- PHẦN 7: HÀM GHI SỔ KHO KHI ADMIN CHỈNH SỬA TRỰC TIẾP
-- Admin sửa stock qua Edit Product phải ghi log stock_movements
-- ==========================================

CREATE OR REPLACE FUNCTION log_stock_adjustment(
    p_product_id TEXT,
    p_size TEXT,
    p_old_quantity INTEGER,
    p_new_quantity INTEGER,
    p_admin_id UUID,
    p_note TEXT DEFAULT 'Admin điều chỉnh kho'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_delta INTEGER;
BEGIN
    v_delta := p_new_quantity - p_old_quantity;
    IF v_delta = 0 THEN RETURN; END IF;

    INSERT INTO public.stock_movements (product_id, size, quantity, type, reference_id, note)
    VALUES (p_product_id, p_size, v_delta, 'adjustment', p_admin_id::TEXT, p_note);
END;
$$;
