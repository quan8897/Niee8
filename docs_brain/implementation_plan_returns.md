# Kế hoạch Nâng cấp Luồng Đổi/Trả hàng (Returns & Exchanges)

Mục tiêu là tích hợp quy trình xử lý trả hàng thông minh, hỗ trợ đổi mẫu/size và tự động hóa việc hoàn kho hoặc đánh dấu hư hỏng cho dự án Niee8.

## 1. Cập nhật Loại dữ liệu (Types)
- **[MODIFY] [src/types.ts](file:///c:/Users/ACER/Downloads/dự án kinh doanh quần áo/Niee8_temp/src/types.ts)**: 
    - Mở rộng `Order['status']`: Thêm `returning`, `returned`, `discarded`, `exchanged`.
    - Cập nhật `StockMovement['type']`: Thêm `damage`.

## 2. Nâng cấp Giao diện Admin (AdminDashboard.tsx)
- **Quản lý vụ kiện (Return Case Manager):**
    - Thêm state `exchangeData` để lưu trữ thông tin sản phẩm khách muốn đổi sang.
    - Cập nhật Modal xác nhận trả hàng để hỗ trợ 3 kịch bản chính:
        1. **Trả hàng hoàn tiền (Hoàn kho):** Chuyển trạng thái sang `returned`, gọi `restore_stock`.
        2. **Trả hàng lỗi (Hủy bỏ):** Chuyển trạng thái sang `discarded`, ghi log `damage`, không cộng lại kho.
        3. **Đổi hàng (Exchange):** Thực hiện "Đổi chéo" - Hoàn kho món cũ và Trừ kho món mới.

## 3. Logic xử lý Đổi hàng (Clean Exchange Workflow)

Thay vì xử lý "nhập nhằng" trong cùng một đơn, hệ thống sẽ thực hiện 2 bước độc lập để đảm bảo sổ sách luôn khớp:

- **Bước 1 (Hoàn món cũ):** Admin chọn món khách trả lại. Hệ thống gọi hàm `restore_stock` để cộng lại kho và cập nhật trạng thái đơn cũ sang `returned` (hoặc `exchanged_returned`). Ghi chú rõ: "Hàng hoàn để đổi sang món mới".
- **Bước 2 (Tạo đơn mới - Mua hàng đổi):**
    - Hệ thống tự động mở giao diện chọn sản phẩm mới.
    - Tạo một bản ghi đơn hàng MỚI trong bảng `orders` với mã tham chiếu (Note) từ đơn cũ.
    - Đơn mới này sẽ sử dụng lại hàm `secure_checkout` để đảm bảo trừ kho và tính lại giá tiền hiện tại một cách tuyệt đối chính xác.
    - Khoản chênh lệch (Refund hoặc Phân thu thêm) sẽ được xử lý minh bạch trên đơn mới này.

## 4. Trải nghiệm người dùng (UX/UI)
- Hiển thị nút "Xử lý đổi trả" cho các đơn hàng ở trạng thái `shipped` hoặc `completed`.
- Sử dụng màu sắc phân biệt cho các trạng thái mới (Ví dụ: `returning` - Cam, `returned` - Xanh lá, `discarded` - Đỏ).

## User Review Required

> [!IMPORTANT]
> **Logic Đổi hàng:** Khi khách đổi sang sản phẩm giá cao hơn hoặc thấp hơn, bạn muốn hệ thống chỉ ghi nhận việc "đổi món" hay cần cả luồng xử lý "thanh toán chênh lệch" (Refund/Upcharge)? Hiện tại mình đề xuất ưu tiên xử lý **tồn kho** trước, phần chênh lệch Admin có thể ghi chú thủ công. Bạn có đồng ý không?

## Verification Plan
- **Kiểm thử Thủ công:** Thử nghiệm quy trình từ `completed` -> `returning` -> `exchanged` và kiểm tra bảng `stock_movements` xem có đủ 2 dòng log (Cộng món cũ, Trừ món mới) không.
- **Build Kiểm tra:** Đảm bảo không có lỗi TypeScript sau khi thay đổi Enum trạng thái.
