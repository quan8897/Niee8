# Kế hoạch: Xây dựng Hệ thống Nhật ký Hoạt động (Activity Logs)

Mục tiêu là tạo ra một tab "Nhật ký Hệ thống" riêng biệt, giúp Admin theo dõi các thay đổi về thông tin (như Giá, Tên, Cấu hình) mà không làm ảnh hưởng đến dữ liệu tồn kho.

## 1. Cơ sở dữ liệu (Database)
Mình sẽ cung cấp một đoạn mã SQL để tạo bảng `activity_logs` với các trường:
- `id`: Định danh duy nhất.
- `created_at`: Thời gian thực hiện.
- `product_id`: Liên kết đến sản phẩm (nếu có).
- `action`: Tên hành động (Ví dụ: "Cập nhật Giá", "Đổi tên sản phẩm").
- `details`: Chi tiết thay đổi (Ví dụ: "150.000đ -> 180.000đ").
- `admin_id`: Người thực hiện.

## 2. Logic Ghi nhật ký (Logging Logic)
Mình sẽ nâng cấp các hàm xử lý trong `StoreClient.tsx`:
- **Khi Cập nhật Sản phẩm:** Hệ thống sẽ tự động so sánh dữ liệu cũ và mới. Nếu có sự thay đổi về Giá hoặc Tên, một dòng nhật ký sẽ được tự động tạo ra.
- **Khi Cập nhật Cài đặt Website:** Ghi lại các thay đổi về giao diện hoặc cấu hình hệ thống.

## 3. Giao diện Quản trị (UI)
- Thêm một tab mới tên là **"Nhật ký hệ thống"** (Sử dụng icon `Activity` hoặc `FileText`).
- Thiết kế giao diện Timeline sạch sẽ, dễ nhìn:
  - Cột 1: Thời gian.
  - Cột 2: Sản phẩm liên quan (nếu có).
  - Cột 3: Nội dung hành động.
  - Cột 4: Chi tiết thay đổi.

## User Review Required

> [!IMPORTANT]
> **Bạn có muốn mình tự động ghi Log cho tất cả mọi thay đổi (kể cả những thay đổi nhỏ như sửa mô tả, thay ảnh) hay chỉ tập trung vào các thông số quan trọng như Giá và Tên sản phẩm?**
> (Ghi tất cả sẽ chi tiết hơn, nhưng danh sách sẽ dài hơn).

## Verification Plan

### Manual Verification
- Thực hiện sửa giá một chiếc váy ➔ Kiểm tra tab "Nhật ký hệ thống" xem có dòng ghi nhận thay đổi giá không.
- Kiểm tra xem tab "Lịch sử kho" có bị lẫn lộn dữ liệu vừa sửa giá vào không (Kỳ vọng: Lịch sử kho vẫn chỉ hiện nhập/xuất/bán).
