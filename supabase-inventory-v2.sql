-- 1. Thêm cột stock_by_size vào bảng products
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS stock_by_size JSONB DEFAULT '{"S": 0, "M": 0, "L": 0, "XL": 0}'::jsonb;

-- 2. Tạo bảng stock_movements (Lịch sử kho)
CREATE TABLE IF NOT EXISTS public.stock_movements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_id TEXT REFERENCES public.products(id) ON DELETE CASCADE,
    size TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('import', 'sale', 'return', 'adjustment')),
    reference_id TEXT,
    note TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- 3. Bật RLS cho bảng stock_movements
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;

-- 4. Policy cho admin (Chỉ admin được xem và thêm lịch sử kho)
DROP POLICY IF EXISTS "Allow admin full access to stock_movements" ON public.stock_movements;
CREATE POLICY "Allow admin full access to stock_movements" ON public.stock_movements
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
        )
    );

-- 5. Cập nhật hàm decrement_stock để trừ theo size và tự động ghi log xuất bán
CREATE OR REPLACE FUNCTION decrement_stock(p_product_id TEXT, p_size TEXT, p_quantity INTEGER, p_order_id TEXT)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  current_stock INTEGER;
BEGIN
  -- Lấy tồn kho hiện tại của size
  SELECT COALESCE((stock_by_size->>p_size)::INTEGER, 0) INTO current_stock
  FROM public.products
  WHERE id = p_product_id;

  IF current_stock >= p_quantity THEN
    -- Cập nhật JSONB và tổng stock_quantity
    UPDATE public.products
    SET stock_by_size = jsonb_set(
          COALESCE(stock_by_size, '{"S": 0, "M": 0, "L": 0, "XL": 0}'::jsonb),
          array[p_size],
          to_jsonb(current_stock - p_quantity)
        ),
        stock_quantity = stock_quantity - p_quantity
    WHERE id = p_product_id;

    -- Ghi log xuất bán vào bảng stock_movements
    INSERT INTO public.stock_movements (product_id, size, quantity, type, reference_id, note)
    VALUES (p_product_id, p_size, -p_quantity, 'sale', p_order_id, 'Xuất bán đơn hàng');
  ELSE
    RAISE EXCEPTION 'Not enough stock for size %', p_size;
  END IF;
END;
$$;
