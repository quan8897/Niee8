-- Create orders table
CREATE TABLE IF NOT EXISTS public.orders (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id),
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_address TEXT NOT NULL,
    customer_city TEXT NOT NULL,
    items JSONB NOT NULL,
    total_amount NUMERIC NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    payment_method TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Policies
-- 1. Allow anyone to insert (for guest checkout)
CREATE POLICY "Anyone can insert orders" 
ON public.orders FOR INSERT 
WITH CHECK (true);

-- 2. Allow users to view their own orders (by user_id or phone)
CREATE POLICY "Users can view their own orders" 
ON public.orders FOR SELECT 
USING (
    auth.uid() = user_id OR 
    customer_phone IN (
        SELECT phone FROM public.profiles WHERE id = auth.uid()
    )
);

-- 3. Allow admins to view all and update status
CREATE POLICY "Admins can manage all orders" 
ON public.orders FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'admin'
    )
);
