# NIEE8 Studio: Tài liệu Kỹ thuật Thanh toán Tích hợp PayOS — Chuẩn Thương mại Điện tử

| Tiêu chí | Thông tin |
|---|---|
| **Phiên bản** | 1.1 — Solid & Practical Edition |
| **Ngày soạn** | 12/04/2026 |
| **Phạm vi** | NIEE8 E-commerce — Luồng thanh toán PayOS (Next.js 14) |
| **Mức độ** | 🔒 Nội bộ — Không phân phối ra ngoài |
| **Tác giả** | Claude (Security Architect Review) |

---

## 1. Tổng quan kiến trúc thanh toán
Tài liệu này mô tả luồng thanh toán của NIEE8, tập trung vào tính an toàn của giao dịch (Atomic) và ngăn chặn các lỗi nghiệp vụ cơ bản.

### 1.1 Nguyên tắc thiết kế cốt lõi
1. **Atomic Transaction:** Kiểm kho, tính giá và ghi đơn phải nằm trong cùng một Transaction (PostgreSQL RPC).
2. **Server-authoritative:** Giá tiền và tồn kho được quản lý tuyệt đối bởi Server/Database.
3. **Fail-safe:** Rollback hoàn toàn nếu có bất kỳ bước nào trong quá trình tạo đơn thất bại.

---

## 2. Luồng Checkout chi tiết

### 2.1 Bước 1 — Client gửi request
Client POST tới `/api/checkout` với payload:
- `items`: Danh sách sản phẩm.
- `paymentMethod`: "payos" hoặc "cod".
- `couponCodes`: Danh sách mã giảm giá.

> 🛡️ **Validation (Chống AV-02):** Backend bắt buộc kiểm tra `quantity > 0` cho mọi sản phẩm.

### 2.2 Bước 2 — Server validate & gọi DB
API Route xử lý:
1. Tạo `orderId` duy nhất (ví dụ: `NIE8-A3F9BC`).
2. Gọi Supabase RPC `secure_checkout()`.
3. Nếu thành công, trả về link thanh toán (nếu là PayOS).

### 2.3 Bước 3 — Supabase RPC secure_checkout() [Trọng yếu]
Transaction này thực hiện các bước sau để đảm bảo an toàn tài chính:
1. `SELECT FOR UPDATE` trên các dòng sản phẩm để chốt tồn kho.
2. `SELECT FOR UPDATE` trên dòng mã giảm giá (`coupons`) để chốt lượt sử dụng (Chặn **AV-01**).
3. Kiểm tra Stock và Coupon limit.
4. Tính lại `total_amount` từ Database (Không tin giá từ Client).
5. Trừ Stock, tăng lượt dùng Coupon, INSERT đơn hàng.

---

## 3. Xử lý PayOS Webhook

### 3.1 Idempotency Guard
Webhook có thể được gửi nhiều lần bởi PayOS. Hệ thống chỉ xử lý nếu status hiện tại là `pending`:
```javascript
const { data: updated } = await supabase
  .from("orders")
  .update({ status: isSuccess ? "processing" : "cancelled" })
  .eq("payos_order_code", orderCode)
  .eq("status", "pending");  // Chỉ update nếu đang là pending
```

### 3.2 Precision Handling
Sử dụng `Math.round()` cho mọi phép tính tiền tệ trước khi gửi sang PayOS để đảm bảo chữ ký HMAC luôn khớp 100%.

---

## 4. Hủy đơn & Auto-expire

### 4.1 Cancellation Token
Mỗi đơn hàng sinh một `cancellation_token` (UUID v4 ngẫu nhiên). Link hủy đơn yêu cầu token này để đảm bảo chỉ chủ đơn mới có quyền hủy, ngăn chặn việc phá hoại đơn hàng của người khác.

### 4.2 Cron Cleanup
Mọi đơn hàng `pending` quá 15 phút sẽ tự động bị hủy bởi Cron Job để giải phóng kho hàng, giúp sản phẩm quay lại kệ cho khách khác mua.

---

## 5. Security Checklist (Thực dụng)
- [x] **Database Check:** Ràng buộc `quantity > 0` tại DB.
- [x] **Race Condition:** Sử dụng `FOR UPDATE` cho cả Product và Coupon.
- [x] **Validation:** Tính lại giá từ DB, không dùng giá từ Client.
- [x] **Security Token:** Sử dụng UUID cho `cancellation_token`.

---
**NIEE8 Payment Technical Specification v1.1**
