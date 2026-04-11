-- =============================================================
-- SCRIPT KHỞI TẠO CÁC BẢNG THIẾU (STOCK MOVEMENTS & NOTIFICATIONS)
-- =============================================================

-- 1. Bảng Biến động kho (Stock Movements - Sổ cái kho)
CREATE TABLE IF NOT EXISTS public.stock_movements (
    id SERIAL PRIMARY KEY,
    product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    size TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('import', 'sale', 'return', 'adjustment')),
    reference_id TEXT, -- ID đơn hàng (order_id) hoặc ID admin
    note TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Đã gỡ bỏ bảng Stock Notifications theo yêu cầu

-- 3. KÍCH HOẠT BẢO MẬT TẦNG DÒNG (RLS)
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;


-- 4. PHÂN QUYỀN TRUY CẬP (GRANTS)
GRANT ALL ON public.stock_movements TO anon, authenticated;
GRANT ALL ON SEQUENCE public.stock_movements_id_seq TO anon, authenticated;

COMMENT ON TABLE public.stock_movements IS 'Lưu lịch sử mọi biến động nhập/xuất kho của Nie8';
