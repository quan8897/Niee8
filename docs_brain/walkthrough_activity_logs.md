# Walkthrough: Nhật ký Hoạt động & Quản trị Minh bạch

Chào bạn, hệ thống Nie8 giờ đây đã có "trí nhớ" tuyệt vời cho mọi quyết định quản trị quan trọng của bạn.

## 1. Tab "Nhật ký hệ thống" mới
Bạn sẽ tìm thấy một mục mới trong Sidebar của Admin Dashboard với icon `Activity`. Đây là nơi lưu giữ những "dấu vết" quan trọng của hệ thống.

## 2. Các sự kiện được ghi lại
Hệ thống sẽ tự động tạo nhật ký khi:
- **Sửa Giá sản phẩm:** Ghi rõ giá cũ và giá mới.
- **Sửa Tên sản phẩm:** Ghi nhận sự thay đổi thương hiệu/mã hàng.
- **Xóa sản phẩm:** Lưu lại thông tin sản phẩm đã bị xóa.
- **Cập nhật Cài đặt:** Ghi nhận khi bạn thay đổi giao diện hoặc cấu hình website.

## 3. Giao diện trực quan
Mỗi dòng nhật ký bao gồm:
- **Tên hành động:** (Ví dụ: Cập nhật sản phẩm)
- **Thời gian:** Theo định dạng Việt Nam (Ngày/Tháng/Năm Giờ:Phút)
- **Chi tiết:** Nội dung thay đổi cụ thể (Ví dụ: `Giá: 150.000đ -> 180.000đ`)

## 4. Cách kiểm tra (UAT)
1. **Chạy mã SQL:** Đừng quên chạy đoạn mã SQL mình đã cung cấp ở bước trước vào Supabase SQL Editor để tạo bảng.
2. **Thử sửa Giá:** Vào danh sách sản phẩm, chọn một món đồ và đổi giá của nó.
3. **Mở tab Nhật ký:** Kiểm tra xem dòng ghi nhận thay đổi giá có xuất hiện ngay lập tức không.

Hệ thống của bạn giờ đây đã thực sự chuyên nghiệp và minh bạch!
