-- ==========================================
-- SCRIPT TẠO BẢNG TÀI KHOẢN (PROFILES)
-- Copy nội dung này dán vào SQL Editor trên Supabase và chạy (Run)
-- ==========================================

-- 1. Tạo bảng profiles để lưu thông tin tài khoản và phân quyền
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'client' CHECK (role IN ('admin', 'client')),
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 2. Bật RLS (Row Level Security) để bảo mật
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Tạo các Policy (Quyền truy cập)
-- Ai cũng có thể xem profile (cần thiết để load thông tin cơ bản)
CREATE POLICY "Public profiles are viewable by everyone." ON public.profiles FOR SELECT USING (true);
-- User chỉ được tự tạo profile của mình
CREATE POLICY "Users can insert their own profile." ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
-- User chỉ được tự sửa profile của mình
CREATE POLICY "Users can update own profile." ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- 4. Tạo Trigger: Tự động thêm 1 dòng vào bảng profiles mỗi khi có người đăng ký mới
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, full_name)
  VALUES (
    new.id,
    new.email,
    -- Tự động set quyền admin cho email của bạn, những người khác là client
    CASE WHEN new.email = 'mnhiiudau8897@gmail.com' THEN 'admin' ELSE 'client' END,
    new.raw_user_meta_data->>'full_name'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Gắn trigger vào bảng auth.users của Supabase
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
