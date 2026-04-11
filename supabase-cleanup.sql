-- Chạy script này để dọn dẹp các hàm cũ bị trùng lặp
DROP FUNCTION IF EXISTS public.secure_checkout(text, uuid, text, text, text, text, jsonb, numeric, text);
