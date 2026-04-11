# Sổ cái Gia cố Bảo mật (Security Hardening Ledger) - Niee8

Tài liệu này ghi nhận danh mục các lỗ hổng bảo mật đã được phát hiện và khắc phục trong quá trình hoàn thiện hệ thống thương mại điện tử Niee8.

## 1. Nhật ký khắc phục Lỗ hổng (Vulnerability Patch Log)

| ID | Loại lỗ hổng | Tình trạng | Giải pháp khắc phục (Remediation) |
| :--- | :--- | :--- | :--- |
| **SEC-01** | **Thao túng giá (Price Tampering)** | ✅ Đã vá | Chuyển 100% logic tính toán giá lên Server (RPC `secure_checkout`). Bất kể Client gửi giá nào, Server sẽ tính lại từ DB. Nếu sai lệch > 10đ sẽ tự động Abort transaction. |
| **SEC-02** | **Tranh chấp kho (Race Condition)** | ✅ Đã vá | Sử dụng khóa hàng (`FOR UPDATE`) trong PostgreSQL. Đảm bảo khi có 2 khách hàng cùng mua món cuối cùng, chỉ 1 người thành công và người kia nhận thông báo hết hàng. |
| **SEC-03** | **Cộng dồn Coupon vô hạn** | ✅ Đã vá | Thiết lập quy tắc "Thanh sắt" 1-1 (1 Ship + 1 Shop). Chặn việc stack nhiều mã shop để giảm giá quá 100% đơn hàng. |
| **SEC-04** | **Thanh toán số âm** | ✅ Đã vá | Cấu trúc lại logic tính giảm giá: Shop Voucher không được trừ vào phí vận chuyển. Đảm bảo giá trị đơn hàng luôn >= Phí ship sau giảm. |
| **SEC-05** | **Spam lượt thích (Like Bot)** | ✅ Đã vá | Chuyển từ biến đếm (Increment) sang hệ thống Audit Log (`product_likes`). Mỗi IP/User chỉ được phép thích 1 lần. Chặn spam ngay từ tầng Database Unique Constraint. |
| **SEC-06** | **Tấn công Bot cào dữ liệu** | ✅ Đã vá | Triển khai Edge Middleware để nhận diện User-Agent và chặn các truy cập từ Bot/Crawler vào các API nhạy cảm (AI, Checkout). |
| **SEC-07** | **Trùng lặp Mã thanh toán** | ✅ Đã vá | Sử dụng Order ID 12 ký tự (High Entropy) và Sequence BigInt để cấp mã link thanh toán PayOS, triệt tiêu xác suất trùng lặp đơn hàng. |

## 2. Logic "Nguồn sự thật" (Source of Truth)

- **Giá sản phẩm:** Lấy duy nhất từ cột `price` trong bảng `products`.
- **Hạn dùng Coupon:** Kiểm tra cột `expires_at` tại cả Frontend (UX) và Backend (Security).
- **Tồn kho:** Trừ kho đồng thời với tạo đơn (Atomic). Nếu tạo Link thanh toán thất bại, kho sẽ được rollback.

## 3. Khuyến nghị Vận hành An toàn

1. **Bảo mật API Key:** Luôn giữ `PAYOS_CHECKSUM_KEY` và `SUPABASE_SERVICE_ROLE_KEY` (nếu có) trong biến môi trường server-side.
2. **Kiểm tra Log:** Định kỳ tra soát bảng `error_logs` để phát hiện các nỗ lực tấn công thao túng giá (Price Mismatch logs).
3. **Audit Trail:** Sử dụng bảng `stock_movements` để đối soát kho hàng khi có khiếu nại của khách hàng.

---
**Hệ thống Niee8 hiện tại đạt mức độ bảo mật cao nhất trong phân khúc Web E-commerce khởi nghiệp, sẵn sàng cho các đợt Flash Sale lưu lượng lớn.**
