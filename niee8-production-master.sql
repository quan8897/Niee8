-- ============================================================================
-- NIEE8 — THE SYSTEM REVIVAL MASTER (V2.0 - GOLD EDITION)
-- "Bản hồi sinh hệ thống toàn diện" - Chứa toàn bộ cấu trúc kiến trúc Niee8
-- Được tổng hợp từ 22 tệp di sản SQL (Cập nhật: 12/04/2026)
-- ============================================================================

-- [0] KHỞI TẠO CÁC SEQUENCE & TIỆN ÍCH HẠ TẦNG
-- Đảm bảo mỗi đơn hàng có một mã số nguyên tịnh tiến duy nhất cho PayOS
CREATE SEQUENCE IF NOT EXISTS public.payos_order_code_seq START 100000;

-- [1] HỆ THỐNG TÀI KHOẢN & PHÂN QUYỀN (Profiles)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    role TEXT DEFAULT 'client' CHECK (role IN ('admin', 'client')),
    full_name TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone." ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users can update own profile." ON public.profiles;
CREATE POLICY "Users can update own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- [2] CẤU TRÚC SẢN PHẨM & KHO HÀNG (Products)
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price NUMERIC DEFAULT 0, 
    category TEXT NOT NULL,
    description TEXT,
    images TEXT[] DEFAULT '{}',
    stock_quantity INTEGER DEFAULT 0,
    stock_by_size JSONB DEFAULT '{"S": 0, "M": 0, "L": 0, "XL": 0}'::jsonb,
    likes_count BIGINT DEFAULT 0,
    sales_count BIGINT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS check_stock_not_negative;
ALTER TABLE public.products ADD CONSTRAINT check_stock_not_negative CHECK (stock_quantity >= 0);

DROP POLICY IF EXISTS "Public_View_Products" ON public.products;
CREATE POLICY "Public_View_Products" ON public.products FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin_Manage_All" ON public.products;
CREATE POLICY "Admin_Manage_All" ON public.products FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- [3] HỆ THỐNG KHUYẾN MÃI (Coupons)
CREATE TABLE IF NOT EXISTS public.coupons (
    code TEXT PRIMARY KEY,
    category TEXT CHECK (category IN ('total', 'shipping')) DEFAULT 'total',
    discount_percent INT CHECK (discount_percent >= 0 AND discount_percent <= 100),
    discount_amount NUMERIC CHECK (discount_amount >= 0),
    max_discount_amount NUMERIC, 
    min_order_amount NUMERIC DEFAULT 0,
    usage_limit INT, 
    usage_count INT DEFAULT 0,
    require_auth BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT check_discount_type CHECK (
        (discount_percent IS NOT NULL AND discount_amount IS NULL) OR 
        (discount_percent IS NULL AND discount_amount IS NOT NULL)
    )
);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public_Check_Coupon" ON public.coupons;
CREATE POLICY "Public_Check_Coupon" ON public.coupons FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admin_Manage_Coupons" ON public.coupons;
CREATE POLICY "Admin_Manage_Coupons" ON public.coupons FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- [4] HỆ THỐNG ĐƠN HÀNG (Orders)
CREATE TABLE IF NOT EXISTS public.orders (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_address TEXT NOT NULL,
    customer_city TEXT NOT NULL,
    items JSONB NOT NULL,
    total_amount NUMERIC NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', 
    payment_method TEXT NOT NULL, 
    payos_order_code BIGINT UNIQUE DEFAULT nextval('payos_order_code_seq'),
    cancellation_token UUID DEFAULT gen_random_uuid(),
    discount_amount NUMERIC DEFAULT 0,
    shipping_fee NUMERIC DEFAULT 0,
    coupon_codes JSONB DEFAULT '[]'::jsonb,
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can insert orders" ON public.orders;
CREATE POLICY "Anyone can insert orders" ON public.orders FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Users view own orders" ON public.orders;
CREATE POLICY "Users view own orders" ON public.orders FOR SELECT USING (
    auth.uid() = user_id OR customer_phone IN (SELECT phone FROM public.profiles WHERE id = auth.uid()) OR cancellation_token::text = auth.uid()::text
);
DROP POLICY IF EXISTS "Admin manage all orders" ON public.orders;
CREATE POLICY "Admin manage all orders" ON public.orders FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- [5] HỆ THỐNG SỔ CÁI & NHẬT KÝ (Ledgers & Logs)
CREATE TABLE IF NOT EXISTS public.stock_movements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id TEXT REFERENCES public.products(id) ON DELETE CASCADE,
    size TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('import', 'sale', 'return', 'adjustment')),
    reference_id TEXT, 
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.activity_logs (
    id SERIAL PRIMARY KEY,
    action TEXT NOT NULL,
    details TEXT,
    performed_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.error_logs (
    id SERIAL PRIMARY KEY,
    origin TEXT,
    error_message TEXT,
    details JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.payment_anomalies (
    id SERIAL PRIMARY KEY,
    payos_order_code BIGINT NOT NULL,
    order_id TEXT,
    amount NUMERIC,
    resolution TEXT DEFAULT 'pending_review',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_anomalies ENABLE ROW LEVEL SECURITY;

-- Admin-only policies for ledgers
CREATE POLICY "Admin_Ledgers" ON public.stock_movements FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admin_Logs" ON public.activity_logs FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admin_Errors" ON public.error_logs FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Admin_Anomalies" ON public.payment_anomalies FOR ALL USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- [6] TƯƠNG TÁC NGƯỜI DÙNG (Likes)
CREATE TABLE IF NOT EXISTS public.product_likes (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id), 
    ip_address TEXT,                        
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_user_like ON public.product_likes (product_id, user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_ip_like ON public.product_likes (product_id, ip_address) WHERE user_id IS NULL;

ALTER TABLE public.product_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public_Likes" ON public.product_likes FOR SELECT USING (true);
CREATE POLICY "Anyone_Can_Like" ON public.product_likes FOR INSERT WITH CHECK (true);

-- [7] TRANG TRÍ & TIỆN ÍCH (Site Settings)
CREATE TABLE IF NOT EXISTS public.site_settings (
  id TEXT PRIMARY KEY DEFAULT 'global',
  hero_title TEXT,
  hero_subtitle TEXT,
  hero_description TEXT
);
INSERT INTO public.site_settings (id, hero_title, hero_subtitle, hero_description)
VALUES ('global', 'niee8.', 'Minimalist Romantic', 'Vượt thời gian.') 
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- [8] HÀM RPC & LOGIC NGHIỆP VỤ BẢO MẬT (Security Definer)
-- ============================================================================

-- Hàm thanh toán cốt lõi V6 (Bảo mật tuyệt đối)
CREATE OR REPLACE FUNCTION public.secure_checkout(
    p_order_id TEXT,
    p_user_id UUID,
    p_customer_name TEXT,
    p_customer_phone TEXT,
    p_customer_address TEXT,
    p_customer_city TEXT,
    p_items JSONB,
    p_client_total NUMERIC,
    p_payment_method TEXT,
    p_note TEXT DEFAULT NULL,
    p_discount_amount NUMERIC DEFAULT 0,
    p_shipping_fee NUMERIC DEFAULT 0,
    p_coupon_codes TEXT[] DEFAULT ARRAY[]::TEXT[]
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    item JSONB; v_product_id TEXT; v_size TEXT; v_quantity INTEGER;
    v_unit_price NUMERIC; v_current_stock INTEGER; v_calculated_total NUMERIC := 0;
    v_coupon_code TEXT; v_order_code BIGINT; v_token UUID;
BEGIN
    FOR item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
        v_product_id := item->>'id'; v_size := item->>'size'; v_quantity := (item->>'quantity')::INTEGER;
        IF v_quantity <= 0 THEN RAISE EXCEPTION 'INVALID_QUANTITY: Số lượng phải là số dương'; END IF;

        SELECT price, COALESCE((stock_by_size->>v_size)::INTEGER, 0) INTO v_unit_price, v_current_stock
        FROM public.products WHERE id = v_product_id FOR UPDATE;
        
        IF NOT FOUND THEN RAISE EXCEPTION 'PRODUCT_NOT_FOUND: %', v_product_id; END IF;
        IF v_current_stock < v_quantity THEN RAISE EXCEPTION 'OUT_OF_STOCK: % (size %) chỉ còn %', (SELECT name FROM public.products WHERE id = v_product_id), v_size, v_current_stock; END IF;

        v_calculated_total := v_calculated_total + (v_unit_price * v_quantity);
        UPDATE public.products SET stock_by_size = jsonb_set(stock_by_size, array[v_size], to_jsonb(v_current_stock - v_quantity)), stock_quantity = stock_quantity - v_quantity WHERE id = v_product_id;
        INSERT INTO public.stock_movements (product_id, size, quantity, type, reference_id, note) VALUES (v_product_id, v_size, -v_quantity, 'sale', p_order_id, 'Checkout tự động');
    END LOOP;

    v_calculated_total := v_calculated_total + p_shipping_fee - p_discount_amount;
    IF v_calculated_total < 0 THEN v_calculated_total := 0; END IF;

    -- Log nếu chênh lệch giá đáng kể
    IF ABS(v_calculated_total - p_client_total) > 10 THEN
        INSERT INTO public.error_logs (origin, error_message, details) VALUES ('price_mismatch', 'Chênh lệch giá!', jsonb_build_object('order', p_order_id, 'client', p_client_total, 'db', v_calculated_total));
    END IF;

    INSERT INTO public.orders (id, user_id, customer_name, customer_phone, customer_address, customer_city, items, total_amount, payment_method, status, discount_amount, shipping_fee, coupon_codes, note)
    VALUES (p_order_id, p_user_id, p_customer_name, p_customer_phone, p_customer_address, p_customer_city, p_items, v_calculated_total, p_payment_method, 'pending', p_discount_amount, p_shipping_fee, to_jsonb(p_coupon_codes), p_note)
    RETURNING payos_order_code, cancellation_token INTO v_order_code, v_token;

    IF p_coupon_codes IS NOT NULL AND array_length(p_coupon_codes, 1) > 0 THEN
        FOREACH v_coupon_code IN ARRAY p_coupon_codes LOOP
            UPDATE public.coupons SET usage_count = usage_count + 1 WHERE code = v_coupon_code AND is_active = true AND (usage_limit IS NULL OR usage_count < usage_limit);
        END LOOP;
    END IF;

    RETURN jsonb_build_object('success', true, 'order_id', p_order_id, 'calculated_total', v_calculated_total, 'payos_order_code', v_order_code, 'cancellation_token', v_token);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'SYSTEM_ERROR', 'error', SQLERRM);
END; $$;

-- Hàm hủy đơn an toàn
CREATE OR REPLACE FUNCTION public.cancel_order_safe(p_order_id TEXT)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    UPDATE public.orders SET status = 'cancelled', updated_at = NOW() WHERE id = p_order_id AND status = 'pending';
    IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Không thể hủy đơn.'); END IF;
    RETURN jsonb_build_object('success', true);
END; $$;

-- Các hàm nghiệp vụ phụ trợ
CREATE OR REPLACE FUNCTION public.restore_stock(p_product_id TEXT, p_size TEXT, p_quantity INTEGER, p_order_id TEXT)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    UPDATE public.products SET stock_by_size = jsonb_set(COALESCE(stock_by_size, '{"S":0,"M":0,"L":0,"XL":0}'::jsonb), array[p_size], to_jsonb(COALESCE((stock_by_size->>p_size)::INTEGER, 0) + p_quantity)), stock_quantity = stock_quantity + p_quantity, updated_at = NOW() WHERE id = p_product_id;
    INSERT INTO public.stock_movements (product_id, size, quantity, type, reference_id, note) VALUES (p_product_id, p_size, p_quantity, 'return', p_order_id, '[TỰ ĐỘNG] Hoàn hàng.');
END; $$;

CREATE OR REPLACE FUNCTION public.handle_product_like(p_id TEXT, p_ip TEXT, p_uid UUID DEFAULT NULL)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    INSERT INTO public.product_likes (product_id, user_id, ip_address) VALUES (p_id, p_uid, p_ip);
    UPDATE public.products SET likes_count = likes_count + 1 WHERE id = p_id;
    RETURN jsonb_build_object('success', true);
EXCEPTION WHEN unique_violation THEN RETURN jsonb_build_object('success', false, 'error', 'ALREADY_LIKED');
END; $$;

-- ============================================================================
-- [9] HỆ THỐNG TRIGGER TỰ ĐỘNG (Automation)
-- ============================================================================

-- Trigger: Restore stock on cancel
CREATE OR REPLACE FUNCTION trigger_restore_stock_on_cancel() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE item JSONB;
BEGIN
    IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
        FOR item IN SELECT * FROM jsonb_array_elements(OLD.items) LOOP
            PERFORM public.restore_stock(item->>'id', item->>'size', (item->>'quantity')::INTEGER, OLD.id);
        END LOOP;
    END IF; RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_order_cancelled ON public.orders;
CREATE TRIGGER on_order_cancelled AFTER UPDATE OF status ON public.orders FOR EACH ROW EXECUTE FUNCTION trigger_restore_stock_on_cancel();

-- Trigger: Increment sales on success
CREATE OR REPLACE FUNCTION trigger_increment_sales_count() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE item JSONB;
BEGIN
    IF (NEW.status IN ('processing', 'completed')) AND (OLD.status = 'pending') THEN
        FOR item IN SELECT * FROM jsonb_array_elements(NEW.items) LOOP
            UPDATE public.products SET sales_count = sales_count + (item->>'quantity')::INTEGER WHERE id = item->>'id';
        END LOOP;
    END IF; RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS on_order_success_increment_sales ON public.orders;
CREATE TRIGGER on_order_success_increment_sales AFTER UPDATE OF status ON public.orders FOR EACH ROW EXECUTE FUNCTION trigger_increment_sales_count();

-- Trigger: Handle new user profile
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, full_name)
  VALUES (new.id, new.email, CASE WHEN new.email = 'mnhiiudau8897@gmail.com' THEN 'admin' ELSE 'client' END, new.raw_user_meta_data->>'full_name');
  RETURN new;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- ============================================================================
-- [HƯỚNG DẪN SEED DỮ LIỆU MẪU - CHẠY NẾU CẦN]
-- ============================================================================
/*
-- 1. Thêm một số mã giảm giá mẫu
INSERT INTO public.coupons (code, category, discount_amount, min_order_amount, is_active)
VALUES ('SALE50K', 'total', 50000, 200000, TRUE);

INSERT INTO public.coupons (code, category, discount_percent, max_discount_amount, is_active)
VALUES ('FREESHIP', 'shipping', 100, 15000, TRUE);

-- 2. Thêm cài đặt trang web mặc định
INSERT INTO public.site_settings (id, hero_title, hero_subtitle, hero_description)
VALUES ('global', 'niee8.', 'Minimalist Romantic', 'Vượt thời gian.')
ON CONFLICT (id) DO NOTHING;
*/
