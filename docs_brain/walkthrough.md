# Walkthrough: Hệ thống Quản lý Tồn kho & Hàng hư hỏng

Chào bạn, hệ thống Nie8 hiện đã sở hữu một quy trình quản lý kho chặt chẽ như một phần mềm ERP chuyên nghiệp nhưng vẫn giữ được sự đơn giản tối đa.

## 1. Màn hình Chỉnh sửa Sản phẩm mới
Các ô tồn kho đã được bảo vệ. 
- **Khi Thêm mới:** Bạn vẫn nhập số lượng ban đầu bình thường.
- **Khi Chỉnh sửa:** Các ô này sẽ mờ đi và có dòng hướng dẫn. Điều này giúp bảo toàn dữ liệu tồn kho hiện tại.

![Form kho bị khóa](file:///C:/Users/ACER/.gemini/antigravity/brain/b4366968-52df-4a77-96a6-a8d3f078b61c/media__1775912355466.png)
*(Hình minh họa logic khóa form)*

## 2. Giao diện Nhập kho cải tiến
Được thiết kế lại theo đúng yêu cầu "Dễ dùng, Rõ ràng" của bạn:
- Nút bấm size trực quan.
- Hiển thị số lượng hiện có.
- Ô nhập số lượng lớn, rõ ràng.

## 3. Quy trình Trả hàng & Hàng lỗi
Đây là điểm nâng cấp quan trọng nhất để bạn quản lý rủi ro:
- **Hủy đơn hàng** ➔ Hiện Modal xác nhận.
- Bạn chọn **"Hoàn kho"** nếu hàng còn mới.
- Bạn chọn **"Hàng hỏng"** nếu không thể bán lại. Mọi thứ đều được lưu vết trong Sổ cái.

## 4. Cách Kiểm tra nhanh (UAT)
1. **Thêm sản phẩm mới:** Nhập 10 cái Size S. Sau đó vào tab **Lịch sử kho** kiểm tra xem có dòng `+10 (Khởi tạo)` hay không.
2. **Hủy thử một đơn hàng:** Xem Modal "Xác nhận tình trạng hàng" có hiện lên không. Thử chọn "Hàng hỏng" và kiểm tra xem số lượng kho có bị trừ đi không (hàng không quay lại kho).
3. **Sửa sản phẩm cũ:** Kiểm tra xem các ô nhập size có bị khóa không.

Hệ thống đã sẵn sàng phục vụ công việc kinh doanh của bạn!
