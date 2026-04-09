-- 1. Đảm bảo bảng stock_notifications tồn tại với đầy đủ các cột cần thiết
CREATE TABLE IF NOT EXISTS public.stock_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id TEXT REFERENCES public.products(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    email TEXT NOT NULL,
    size TEXT DEFAULT 'M',
    status TEXT DEFAULT 'pending', -- 'pending', 'notified'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Thêm cột size nếu chưa có (trường hợp bảng đã tồn tại nhưng thiếu cột)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'stock_notifications' AND column_name = 'size') THEN
    ALTER TABLE public.stock_notifications ADD COLUMN size TEXT DEFAULT 'M';
  END IF;
END $$;

-- 3. Bật RLS
ALTER TABLE public.stock_notifications ENABLE ROW LEVEL SECURITY;

-- 4. Thiết lập Policies
DROP POLICY IF EXISTS "Anyone can register for stock notifications" ON public.stock_notifications;
DROP POLICY IF EXISTS "Users can view own stock notifications" ON public.stock_notifications;
DROP POLICY IF EXISTS "Admins can manage stock notifications" ON public.stock_notifications;

-- Khách hàng có thể đăng ký
CREATE POLICY "Anyone can register for stock notifications" 
ON public.stock_notifications FOR INSERT 
WITH CHECK (true);

-- Người dùng xem của mình
CREATE POLICY "Users can view own stock notifications" 
ON public.stock_notifications FOR SELECT 
USING (auth.uid() = user_id OR email = (SELECT email FROM public.profiles WHERE id = auth.uid()));

-- Admin quản lý tất cả
CREATE POLICY "Admins can manage stock notifications" 
ON public.stock_notifications FOR ALL 
USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
