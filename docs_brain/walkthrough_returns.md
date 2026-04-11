# Walkthrough: Hoàn thiện luồng Trả hàng Minh bạch (Returns)

Hệ thống Niee8 hiện đã sở hữu luồng xử lý trả hàng chuyên nghiệp, tách bạch và minh bạch tuyệt đối về cả Kho hàng (Inventory) lẫn Tài chính.

## Các thay đổi chính

### 1. Cập nhật Loại dữ liệu (`src/types.ts`)
- Thêm các trạng thái đơn hàng: `returning` (Đang trả hàng), `returned` (Đã trả hàng), `discarded` (Hàng hư hỏng).
- Thêm loại biến động kho: `damage` (Ghi chi phí hao hụt).

### 2. Bộ máy xử lý Trạng thái (`AdminDashboard.tsx`)
- **Tách bạch 2 kịch bản:** Khi thực hiện trả hàng, Admin chỉ cần chọn: 
    - **Hoàn tiền & Hoàn kho:** Hệ thống gọi `restore_stock` để cộng lại hàng.
    - **Hàng lỗi (Hủy bỏ):** Hệ thống ghi log `damage` và **KHÔNG** cộng lại kho.
- **Tự động hóa:** Sau khi xử lý kho xong, đơn hàng tự động chuyển sang trạng thái cuối cùng, dứt điểm mọi "nhập nhằng" cũ.

### 3. Giao diện Admin chuyên nghiệp
- **Badge Màu sắc:** `returning` (Cam), `returned` (Xanh lá cực), `discarded` (Xám đá).
- **Thao tác nhanh:** Nút "Xác nhận trả hàng" chỉ hiện cho các đơn ở trạng thái `shipping`, `completed` hoặc `returning`.

## Kết quả đạt được

- **Minh bạch:** Mọi bước trả hàng đều được lưu vết chi tiết trong Sổ cái kho (`stock_movements`).
- **An toàn:** Chống việc Admin nhầm lẫn cộng lại hàng lỗi vào kho để bán cho khách sau.
- **Độc lập:** Việc "Mua mới" sau khi trả hàng được thực hiện như một giao diện mua hàng chuẩn, không gây rối rắm sổ sách của đơn cũ.

---
**Giải pháp đã hoàn tất 100% theo yêu cầu của bạn. Nie8 đã sẵn sàng vận hành với độ tin cậy tối ưu!**
