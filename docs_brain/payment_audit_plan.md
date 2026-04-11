# Kế hoạch Kiểm tra (Audit) Luồng Thanh toán Niee8

Mục tiêu là đánh giá xem hệ thống hiện tại có lỗ hổng về bảo mật (giả mạo thanh toán) hay lỗi logic (quá bán - overselling) hay không.

## 1. Nghiên cứu & Phân tích (Research)
- Tìm và đọc file `CheckoutPage.tsx` hoặc `StoreClient.tsx` để xem cách đơn hàng được tạo.
- Kiểm tra các API định nghĩa trong `app/api/` hoặc các Server Actions.
- Xác định: Đơn hàng được cập nhật trạng thái "Thành công" thông qua Webhook (Server-to-Server) hay cập nhật trực tiếp từ Trình duyệt (Client-side)?

## 2. Tiêu chí Đánh giá (Benchmark)
Mình sẽ đối soát code thực tế với 4 tiêu chuẩn "Vàng" của Solutions Architect:
- **Tính Duy nhất (Idempotency):** Một đơn hàng có bị trừ kho 2 lần nếu khách bấm F5 không?
- **Tính Chính xác (Data Integrity):** Hàng có được "giữ" (Reserved) trong lúc khách đang trả tiền không?
- **Bảo mật (Security):** Token/Signature có được xác thực khi nhận thông báo từ Ngân hàng không?
- **Khả năng Phục hồi (Resilience):** Nếu API chết giữa chừng, khách hàng có biết họ đã mất tiền hay chưa?

## 3. Báo cáo & Đề xuất (Reporting)
- Sau khi kiểm tra xong, mình sẽ gửi bạn một bản **Báo cáo Đánh giá (Security Audit Report)**.
- Nếu có lỗ hổng, mình sẽ đề xuất các bước sửa lỗi (ví dụ: chuyển logic từ Client sang Server-side).

## User Review Required

> [!NOTE]
> **Hiện tại bạn đang sử dụng phương thức thanh toán nào là chủ đạo?** (Chuyển khoản thủ công bằng QR, Momo, hay đã tích hợp Stripe/PayOS?) Biết được điều này sẽ giúp mình kiểm tra đúng logic của cổng thanh toán đó.

## Verification Plan
- Chạy lệnh liệt kê tệp để tìm chính xác nơi xử lý nghiệp vụ thanh toán.
- Phân tích mã nguồn để phát hiện lỗ hổng "Giả mạo phản hồi thành công" (Success spoofing).
