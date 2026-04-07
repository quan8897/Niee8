-- ==========================================
-- SCRIPT KHỞI TẠO CƠ SỞ DỮ LIỆU SUPABASE
-- Copy toàn bộ nội dung file này và dán vào mục "SQL Editor" trên Supabase
-- ==========================================

-- 1. Bảng Sản phẩm (Products)
CREATE TABLE public.products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  images TEXT[] DEFAULT '{}',
  outfit_suggestions TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Bảng Cài đặt giao diện (Site Settings)
CREATE TABLE public.site_settings (
  id TEXT PRIMARY KEY DEFAULT 'global',
  heroImage TEXT,
  heroTitle TEXT,
  heroSubtitle TEXT,
  heroDescription TEXT
);

-- 3. Chèn dữ liệu mặc định cho giao diện
INSERT INTO public.site_settings (id, heroTitle, heroSubtitle, heroDescription)
VALUES (
  'global',
  'niee8.',
  'Minimalist Romantic & Craftsmanship',
  'Những thiết kế tinh tuyển dành cho người phụ nữ hiện đại, trân trọng chất lượng hơn số lượng. Kiểu dáng vượt thời gian trong bảng màu trung tính.'
) ON CONFLICT (id) DO NOTHING;

-- 4. Thiết lập Kho chứa ảnh (Storage)
-- Tạo bucket tên là 'images' và cho phép public
INSERT INTO storage.buckets (id, name, public)
VALUES ('images', 'images', true)
ON CONFLICT (id) DO NOTHING;

-- 5. Phân quyền (Security Policies) cho Storage
-- Cho phép tất cả mọi người xem ảnh
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING ( bucket_id = 'images' );
-- Chỉ cho phép user đã đăng nhập (Admin) được upload/sửa/xóa ảnh
CREATE POLICY "Auth Insert" ON storage.objects FOR INSERT WITH CHECK ( bucket_id = 'images' AND auth.role() = 'authenticated' );
CREATE POLICY "Auth Update" ON storage.objects FOR UPDATE WITH CHECK ( bucket_id = 'images' AND auth.role() = 'authenticated' );
CREATE POLICY "Auth Delete" ON storage.objects FOR DELETE USING ( bucket_id = 'images' AND auth.role() = 'authenticated' );
