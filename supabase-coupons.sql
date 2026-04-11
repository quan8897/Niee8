-- Hệ thống Quản lý Mã giảm giá (Coupons)

-- 1. Tạo bảng coupons (nếu chưa có) hoặc bổ sung cột
CREATE TABLE IF NOT EXISTS public.coupons (
    code TEXT PRIMARY KEY,
    category TEXT CHECK (category IN ('total', 'shipping')) DEFAULT 'total',
    discount_percent INT CHECK (discount_percent >= 0 AND discount_percent <= 100),
    discount_amount NUMERIC CHECK (discount_amount >= 0),
    max_discount_amount NUMERIC, 
    min_order_amount NUMERIC DEFAULT 0,
    usage_limit INT, -- NULL nghĩa là không giới hạn
    usage_count INT DEFAULT 0,
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ràng buộc: Chỉ được chọn 1 trong 2 loại giảm giá (phần trăm HOẶC số tiền)
    CONSTRAINT check_discount_type CHECK (
        (discount_percent IS NOT NULL AND discount_amount IS NULL) OR 
        (discount_percent IS NULL AND discount_amount IS NOT NULL)
    )
);

-- Bổ sung cột nếu bảng đã tồn tại từ trước
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='coupons' AND column_name='category') THEN
        ALTER TABLE public.coupons ADD COLUMN category TEXT CHECK (category IN ('total', 'shipping')) DEFAULT 'total';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='coupons' AND column_name='max_discount_amount') THEN
        ALTER TABLE public.coupons ADD COLUMN max_discount_amount NUMERIC;
    END IF;
END $$;

-- 2. Bổ sung các cột metadata cho bảng orders để lưu vết coupon
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='note') THEN
        ALTER TABLE public.orders ADD COLUMN note TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='discount_amount') THEN
        ALTER TABLE public.orders ADD COLUMN discount_amount NUMERIC DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='shipping_fee') THEN
        ALTER TABLE public.orders ADD COLUMN shipping_fee NUMERIC DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='orders' AND column_name='coupon_codes') THEN
        ALTER TABLE public.orders ADD COLUMN coupon_codes JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- Enable RLS
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- Policy (Quyền xem bảng)
-- Bất kỳ ai cũng có thể đọc (kiểm tra) mã nếu biết chính xác code
DROP POLICY IF EXISTS "Cho phép mọi người kiểm tra mã" ON public.coupons;
CREATE POLICY "Cho phép mọi người kiểm tra mã" ON public.coupons
    FOR SELECT USING (true);

-- Chỉ admin mới có quyền sửa đổi mã
DROP POLICY IF EXISTS "Chỉ Admin sửa mã" ON public.coupons;
CREATE POLICY "Chỉ Admin sửa mã" ON public.coupons
    FOR ALL USING (auth.role() = 'service_role');

-- 2. Tạo hàm RPC an toàn để cộng dồn lượt sử dụng (Dùng bảo mật)
CREATE OR REPLACE FUNCTION increment_coupon_usage(p_code TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER -- Chạy dưới quyền admin
AS $$
BEGIN
    UPDATE public.coupons
    SET usage_count = usage_count + 1
    WHERE code = p_code And is_active = true;
END;
$$;

-- 3. Tạo một bộ mã mặc định đầy đủ kịch bản (Shopee Model)
-- KỊCH BẢN 1: MÃ GIẢM GIÁ SHOP (Category: total, Color: Cam)
INSERT INTO public.coupons (code, category, discount_amount, min_order_amount, is_active)
VALUES ('SALE50K', 'total', 50000, 200000, TRUE)
ON CONFLICT (code) DO UPDATE SET category = 'total';

INSERT INTO public.coupons (code, category, discount_percent, min_order_amount, is_active)
VALUES ('GIAM10', 'total', 10, 0, TRUE)
ON CONFLICT (code) DO UPDATE SET category = 'total';

-- KỊCH BẢN 2: MÃ MIỄN PHÍ VẬN CHUYỂN (Category: shipping, Color: Xanh)
INSERT INTO public.coupons (code, category, discount_amount, min_order_amount, is_active)
VALUES ('FREESHIP', 'shipping', 2000, 0, TRUE) -- Giảm 2k tiền ship mặc định
ON CONFLICT (code) DO UPDATE SET category = 'shipping';

INSERT INTO public.coupons (code, category, discount_percent, max_discount_amount, is_active)
VALUES ('SHIPFREE', 'shipping', 100, 15000, TRUE) -- Giảm 100% ship, tối đa 15k
ON CONFLICT (code) DO UPDATE SET category = 'shipping';

-- KỊCH BẢN 3: Mã lỗi/Testing khác
INSERT INTO public.coupons (code, category, discount_percent, expires_at, is_active)
VALUES ('HETHAN', 'total', 20, NOW() - INTERVAL '1 day', TRUE)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.coupons (code, category, discount_amount, usage_limit, usage_count, is_active)
VALUES ('HETLUOT', 'total', 30000, 5, 5, TRUE)
ON CONFLICT (code) DO NOTHING;
