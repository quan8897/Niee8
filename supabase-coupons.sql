-- Hệ thống Quản lý Mã giảm giá (Coupons)

-- 1. Tạo bảng coupons
CREATE TABLE IF NOT EXISTS public.coupons (
    code TEXT PRIMARY KEY,
    discount_percent INT CHECK (discount_percent >= 0 AND discount_percent <= 100),
    discount_amount NUMERIC CHECK (discount_amount >= 0),
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

-- 3. Tạo một bộ mã mặc định đầy đủ kịch bản để bạn test (UAT)
-- Kịch bản 1: Mã hợp lệ - Giảm số tiền cố định (50k cho đơn > 200k)
INSERT INTO public.coupons (code, discount_amount, min_order_amount, is_active)
VALUES ('SALE50K', 50000, 200000, TRUE)
ON CONFLICT (code) DO NOTHING;

-- Kịch bản 2: Mã hợp lệ - Giảm phần trăm (10% cho mọi đơn)
INSERT INTO public.coupons (code, discount_percent, min_order_amount, is_active)
VALUES ('GIAM10', 10, 0, TRUE)
ON CONFLICT (code) DO NOTHING;

-- Kịch bản 3: Mã đã hết hạn (Expired)
INSERT INTO public.coupons (code, discount_percent, expires_at, is_active)
VALUES ('HETHAN', 20, NOW() - INTERVAL '1 day', TRUE)
ON CONFLICT (code) DO NOTHING;

-- Kịch bản 4: Mã đã hết số lượt sử dụng (Usage Limit Reached)
INSERT INTO public.coupons (code, discount_amount, usage_limit, usage_count, is_active)
VALUES ('HETLUOT', 30000, 5, 5, TRUE)
ON CONFLICT (code) DO NOTHING;

-- Kịch bản 5: Mã đang bị tạm dừng (Inactive)
INSERT INTO public.coupons (code, discount_percent, is_active)
VALUES ('TAMNGUNG', 15, FALSE)
ON CONFLICT (code) DO NOTHING;

-- Kịch bản 6: Mã VIP cho đơn hàng lớn (Giảm 100k cho đơn > 500k)
INSERT INTO public.coupons (code, discount_amount, min_order_amount, is_active)
VALUES ('VIP500', 100000, 500000, TRUE)
ON CONFLICT (code) DO NOTHING;
