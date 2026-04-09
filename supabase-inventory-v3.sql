-- 1. Hàm hoàn kho (khi hủy đơn hàng)
CREATE OR REPLACE FUNCTION restore_stock(p_product_id TEXT, p_size TEXT, p_quantity INTEGER, p_order_id TEXT)
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

  -- Cập nhật JSONB và tổng stock_quantity
  UPDATE public.products
  SET stock_by_size = jsonb_set(
        COALESCE(stock_by_size, '{"S": 0, "M": 0, "L": 0, "XL": 0}'::jsonb),
        array[p_size],
        to_jsonb(current_stock + p_quantity)
      ),
      stock_quantity = stock_quantity + p_quantity
  WHERE id = p_product_id;

  -- Ghi log hoàn kho vào bảng stock_movements
  INSERT INTO public.stock_movements (product_id, size, quantity, type, reference_id, note)
  VALUES (p_product_id, p_size, p_quantity, 'return', p_order_id, 'Hoàn kho do hủy đơn hàng');
END;
$$;

-- 2. Hàm nhập kho (khi admin nhập thêm hàng)
CREATE OR REPLACE FUNCTION import_stock(p_product_id TEXT, p_size TEXT, p_quantity INTEGER, p_note TEXT)
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

  -- Cập nhật JSONB và tổng stock_quantity
  UPDATE public.products
  SET stock_by_size = jsonb_set(
        COALESCE(stock_by_size, '{"S": 0, "M": 0, "L": 0, "XL": 0}'::jsonb),
        array[p_size],
        to_jsonb(current_stock + p_quantity)
      ),
      stock_quantity = stock_quantity + p_quantity
  WHERE id = p_product_id;

  -- Ghi log nhập kho vào bảng stock_movements
  INSERT INTO public.stock_movements (product_id, size, quantity, type, note)
  VALUES (p_product_id, p_size, p_quantity, 'import', p_note);
END;
$$;
