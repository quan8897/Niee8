-- =============================================================
-- NIEE8 - BẢO MỆT LƯỢT THÍCH (ROBUST LIKES)
-- =============================================================

-- 1. Tạo bảng lưu vết (Dùng IP hoặc User ID để định danh)
CREATE TABLE IF NOT EXISTS public.product_likes (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id), 
    ip_address TEXT,                        
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Đảm bảo mỗi IP hoặc mỗi User chỉ được Like một sản phẩm 1 lần duy nhất
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_user_like ON public.product_likes (product_id, user_id) WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_ip_like ON public.product_likes (product_id, ip_address) WHERE user_id IS NULL;

-- 2. Hàm xử lý Like an toàn
CREATE OR REPLACE FUNCTION handle_product_like(p_id TEXT, p_ip TEXT, p_uid UUID DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Thêm bản ghi vào bảng likes để chặn spam
    INSERT INTO public.product_likes (product_id, user_id, ip_address)
    VALUES (p_id, p_uid, p_ip);
    
    -- Chỉ khi insert thành công (không bị unique_violation) mới tăng biến đếm
    UPDATE public.products SET likes_count = likes_count + 1 WHERE id = p_id;
    
    RETURN jsonb_build_object('success', true);
EXCEPTION
    WHEN unique_violation THEN
        RETURN jsonb_build_object('success', false, 'error', 'ALREADY_LIKED');
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
