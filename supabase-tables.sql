-- ==========================================
-- SCRIPT TẠO BẢNG SẢN PHẨM VÀ CÀI ĐẶT
-- Copy nội dung này dán vào SQL Editor trên Supabase và chạy (Run)
-- ==========================================

-- 1. Bảng Sản phẩm (Products)
CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  images TEXT[] DEFAULT '{}',
  outfit_suggestions TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Bật bảo mật RLS cho bảng products
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Cho phép ai cũng xem được sản phẩm
CREATE POLICY "Public products are viewable by everyone." 
ON public.products FOR SELECT USING (true);

-- Chỉ cho phép người đã đăng nhập (Admin) thêm/sửa/xóa sản phẩm
CREATE POLICY "Authenticated users can insert products" 
ON public.products FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update products" 
ON public.products FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete products" 
ON public.products FOR DELETE USING (auth.role() = 'authenticated');


-- 2. Bảng Cài đặt giao diện (Site Settings)
DROP TABLE IF EXISTS public.site_settings;

CREATE TABLE public.site_settings (
  id TEXT PRIMARY KEY DEFAULT 'global',
  "heroImage" TEXT,
  "heroTitle" TEXT,
  "heroSubtitle" TEXT,
  "heroDescription" TEXT
);

-- Bật bảo mật RLS cho bảng site_settings
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Cho phép ai cũng xem được cài đặt
CREATE POLICY "Public settings are viewable by everyone." 
ON public.site_settings FOR SELECT USING (true);

-- Chỉ cho phép người đã đăng nhập (Admin) thêm/sửa cài đặt
CREATE POLICY "Authenticated users can insert settings" 
ON public.site_settings FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update settings" 
ON public.site_settings FOR UPDATE USING (auth.role() = 'authenticated');

-- 3. Chèn dữ liệu mặc định cho cài đặt (nếu chưa có)
INSERT INTO public.site_settings (id, "heroTitle", "heroSubtitle", "heroDescription")
VALUES (
  'global',
  'niee8.',
  'Minimalist Romantic & Craftsmanship',
  'Những thiết kế tinh tuyển dành cho người phụ nữ hiện đại, trân trọng chất lượng hơn số lượng. Kiểu dáng vượt thời gian trong bảng màu trung tính.'
) ON CONFLICT (id) DO NOTHING;
