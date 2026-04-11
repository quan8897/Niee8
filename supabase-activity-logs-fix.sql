-- =============================================================
-- SCRIPT KHỞI TẠO & SỬA LỖI NHẬT KÝ HỆ THỐNG (ACTIVITY LOGS)
-- =============================================================

-- 1. TẠO BẢNG NHẬT KÝ (Nếu chưa có)
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id SERIAL PRIMARY KEY,
    product_id TEXT, -- Có thể NULL nếu là cài đặt shop
    action TEXT NOT NULL,
    details TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    admin_id UUID DEFAULT auth.uid()
);

-- 2. KÍCH HOẠT BẢO MẬT TẦNG DÒNG (RLS)
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- 3. CHÍNH SÁCH CHO ADMIN: Toàn quyền ghi và đọc nhật ký
-- (Chỉ những ai có role = 'admin' trong bảng profiles mới được phép)
DROP POLICY IF EXISTS "Admins can manage activity logs" ON public.activity_logs;
CREATE POLICY "Admins can manage activity logs" ON public.activity_logs
FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- 4. CHÍNH SÁCH CHO HÀNH ĐỘNG GUEST (Đặt hàng):
-- Cho phép INSERT nhật ký đơn hàng mới từ khách vãng lai
DROP POLICY IF EXISTS "Allow anonymous logging for orders" ON public.activity_logs;
CREATE POLICY "Allow anonymous logging for orders" ON public.activity_logs
FOR INSERT WITH CHECK (true);

-- 5. ĐẢM BẢO QUYỀN TRUY CẬP CHO ROLE (ANON/AUTH)
GRANT ALL ON public.activity_logs TO anon, authenticated;
GRANT ALL ON SEQUENCE public.activity_logs_id_seq TO anon, authenticated;

COMMENT ON TABLE public.activity_logs IS 'Lưu trữ mọi biến động quan trọng của shop Nie8 (Admin & Order actions)';
