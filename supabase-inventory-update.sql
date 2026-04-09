-- 1. Thêm cột stock_quantity vào bảng products
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS stock_quantity INTEGER DEFAULT 0;

-- 2. Tạo bảng stock_notifications để lưu yêu cầu nhận thông báo khi có hàng
CREATE TABLE IF NOT EXISTS public.stock_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id TEXT REFERENCES public.products(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    email TEXT NOT NULL,
    status TEXT DEFAULT 'pending', -- 'pending', 'notified'
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Bật RLS cho bảng mới
ALTER TABLE public.stock_notifications ENABLE ROW LEVEL SECURITY;

-- 4. Quyền truy cập cho stock_notifications
-- Khách hàng có thể đăng ký nhận thông báo
CREATE POLICY "Anyone can register for stock notifications" 
ON public.stock_notifications FOR INSERT 
WITH CHECK (true);

-- Người dùng có thể xem yêu cầu của chính mình
CREATE POLICY "Users can view own stock notifications" 
ON public.stock_notifications FOR SELECT 
USING (auth.uid() = user_id OR email = (SELECT email FROM public.profiles WHERE id = auth.uid()));

-- Admin có toàn quyền quản lý
CREATE POLICY "Admins can manage stock notifications" 
ON public.stock_notifications FOR ALL 
USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);
