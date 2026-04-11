# Implementation Plan: Chuẩn hóa Quy trình Kho & Xử lý Hàng hư hỏng

Kế hoạch này tập trung vào sự minh bạch tuyệt đối của tồn kho: Mọi thay đổi (Nhập, Bán, Hỏng, Trả) đều phải có dấu vết.

## 1. Tách biệt Giao diện (Separation of Concerns)

- **Form Sản phẩm (Edit Form):**
  - Chức năng: Chỉ sửa Tên, Giá, Ảnh, Mô tả.
  - Tồn kho: Chuyển sang chế độ **Chỉ xem (Read-only)**. Admin biết hàng còn bao nhiêu nhưng không thể "sửa tay" con số tổng tại đây.
  - Mục đích: Ngăn chặn việc sửa nhầm số liệu mà không qua quy trình.

- **Nút "Điều chỉnh kho" (Stock Adjustment):**
  - Chức năng: Là cửa ngõ duy nhất để thay đổi con số tồn kho thủ công.
  - Hỗ trợ cả số dương (+) để nhập hàng và số âm (-) để ghi nhận hư hỏng/mất mát.

## 2. Logic Xử lý Hàng hư hỏng (Damage Management)

- **Loại biến động mới:** `damage` (Hư hỏng).
- **Quy trình Trả hàng (Returns):**
  - Khi một đơn hàng bị hủy/trả, Admin có 2 lựa chọn:
    1. **Hoàn tồn kho (Restock):** Cộng lại vào kho (Trường hợp hàng còn mới).
    2. **Loại bỏ (Discard):** Không cộng lại vào kho, ghi nhận là biến động `damage` gắn với ID đơn hàng đó.
- **Báo cáo:** Tỷ lệ hoàn trả và tỷ lệ hư hỏng được tính toán tự động trong tab Lịch sử kho.

## 3. Thay đổi chi tiết trong Code

### [Component] AdminDashboard.tsx

#### [MODIFY] [src/components/AdminDashboard.tsx](file:///c:/Users/ACER/Downloads/dự án kinh doanh quần áo/Niee8_temp/src/components/AdminDashboard.tsx)

**A. Form Sản phẩm:**
- Khóa (Disable) các ô input số lượng khi `editingId` tồn tại.
- Thêm Tooltip hướng dẫn dùng nút "Điều chỉnh kho".

**B. Popup Điều chỉnh kho (Restock Modal chuyển hệ):**
- Đổi tiêu đề thành "Điều chỉnh tồn kho".
- Thêm ô chọn Lý do: "Nhập hàng mới", "Hàng hư hỏng", "Điều chỉnh khác".
- Nếu chọn "Hàng hư hỏng", hệ thống tự động hiểu là trừ (-) số lượng.

**C. Logic Cập nhật Đơn hàng:**
- Bổ sung nút xác nhận tình trạng hàng khi chuyển trạng thái đơn sang `cancelled`.

## Verification Plan

### Automated/Manual Tests
- **Test Nhập hàng:** Nhập +5 ➔ Kiểm tra tồn kho tăng 5, Ledger hiện "Nhập hàng".
- **Test Hư hỏng:** Nhập 2 (chọn loại Hư hỏng) ➔ Kiểm tra tồn kho giảm 2, Ledger hiện "Hư hỏng".
- **Test Trả hàng lỗi:** Hủy đơn hàng ➔ Chọn "Hàng hỏng" ➔ Kiểm tra tồn kho KHÔNG tăng lại.

### KPI Verification
- Kiểm tra Tỷ lệ hoàn và Tỷ lệ hỏng trong tab Lịch sửa kho hiển thị chính xác.
