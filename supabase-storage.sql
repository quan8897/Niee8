-- ==========================================
-- SCRIPT TẠO BUCKET LƯU TRỮ ẢNH (STORAGE)
-- Copy nội dung này dán vào SQL Editor trên Supabase và chạy (Run)
-- ==========================================

-- 1. Tạo bucket có tên là 'images' (nếu chưa có)
INSERT INTO storage.buckets (id, name, public)
VALUES ('images', 'images', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Cho phép tất cả mọi người (public) được XEM ảnh
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'images' );

-- 3. Chỉ cho phép Admin (hoặc người dùng đã đăng nhập) được TẢI ẢNH LÊN
CREATE POLICY "Authenticated users can upload images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'images' 
  AND auth.role() = 'authenticated'
);

-- 4. Chỉ cho phép Admin (hoặc người dùng đã đăng nhập) được XÓA/SỬA ảnh
CREATE POLICY "Authenticated users can update images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'images' 
  AND auth.role() = 'authenticated'
);

CREATE POLICY "Authenticated users can delete images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'images' 
  AND auth.role() = 'authenticated'
);
