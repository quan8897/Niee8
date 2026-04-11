-- =========================================================================
-- KỊCH BẢN CHUẨN BỊ GO-LIVE: DỌN DẸP DỮ LIỆU RÁC (FACTORY RESET)
-- =========================================================================
-- File này sẽ TẨY TRẮNG toàn bộ các Giao dịch (Đơn hàng, Lịch sử), 
-- nhưng GIỮ LẠI toàn bộ Hàng hóa (Products), Tài khoản (Profiles), Cấu hình.

BEGIN;

-- 1. Xóa sạch sẽ toàn bộ Đơn Hàng nháp/test
TRUNCATE TABLE public.orders CASCADE;

-- 2. Xóa sạch Sổ Cái Biến Động Kho (để mốt bắt đầu đếm lại từ đầu)
TRUNCATE TABLE public.stock_movements CASCADE;

-- 3. Xóa các email đăng ký Restock ảo
TRUNCATE TABLE public.stock_notifications CASCADE;

-- 4. Trả lại toàn bộ số lượt đã dùng của tất cả Mã Giảm Giá về 0. (Code giữ nguyên)
UPDATE public.coupons 
SET usage_count = 0;

-- 5. LỰA CHỌN MỞ RỘNG: LÀM SẠCH KHO (Mặc định đang TẮT)
-- Nếu bạn muốn dọn sạch luôn Tồn kho hiện tại để nhập tay lại số lượng 
-- lô hàng thực tế chuẩn bị bán, hãy Bôi Đen 2 dòng dưới đây và CHẠY RIÊNG.
-- CÒN NẾU: Bạn muốn giữ nguyên số lượng kho đang có thì ĐỪNG chạy 2 dòng này.
-- UPDATE public.products 
-- SET stock_quantity = 0, stock_by_size = '{"S": 0, "M": 0, "L": 0, "XL": 0}'::jsonb;

COMMIT;
