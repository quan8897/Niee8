# Sequence Diagram: Luồng Thanh toán Niee8 (Checkout Flow)

Sơ đồ này mô tả chi tiết cách hệ thống xử lý một đơn hàng từ khi khách hàng nhấn nút Thanh toán cho đến khi xác nhận giao dịch thành công.

```mermaid
sequenceDiagram
    autonumber
    actor Customer as Khách hàng
    participant FE as Next.js Frontend
    participant DB as Supabase DB (RPC/Transaction)
    participant PG as Payment Gateway (PayOS)

    Customer->>FE: Ấn Checkout (Giỏ hàng)
    
    rect rgb(240, 245, 250)
        Note right of DB: Bước 1: Atomic Secure Checkout (RPC)
        FE->>DB: RPC: secure_checkout(items, coupon, userId)
        Note over DB: Bắt đầu Transaction:<br/>1. Tính Subtotal (Giá gốc từ DB)<br/>2. Áp mã Shop (Max = Subtotal)<br/>3. Áp mã Ship (Max = ShippingFee)<br/>4. Chốt: Final = (Subtotal - Shop) + (ShipFee - Ship)<br/>5. Trừ Stock (FOR UPDATE) & Lưu đơn
        
        alt Nhánh 1: Thành công
            DB-->>FE: JSON { success: true, payos_order_code, ... }
        else Nhánh 2: Thất bại (Hết hàng/Mã lỗi/Hệ thống)
            DB-->>FE: JSON { success: false, error_code: 'OUT_OF_STOCK' | 'COUPON_INVALID' }
            FE-->>Customer: Hiển thị thông báo tiếng Việt tương ứng
        end
    end

    rect rgb(255, 255, 255)
        Note right of FE: Bước 2: Thanh toán phía Cổng (PayOS SDK)
        FE->>FE: Init PayOS SDK (ID, Key, Checksum)
        FE->>PG: payos.createPaymentLink(orderCode, expiredAt: 15m)
        PG-->>FE: Trả về: checkoutUrl
        FE-->>Customer: Chuyển hướng tới PayOS
        
        Customer->>PG: Thực hiện trả tiền (QR/Chuyển khoản)
        
        Note over PG, FE: Luồng Webhook (Bảo mật SDK)
        PG->>FE: Webhook Post (Signature HMAC-SHA256)
        FE->>FE: payos.verifyPaymentWebhookData(body)
        FE->>DB: UPDATE orders SET status = 'processing' <br/>WHERE payos_order_code = code AND status = 'pending'
        DB-->>FE: Confirmed (Rows Affected: 1)
    end

    FE-->>Customer: Hiển thị trang: "Thanh toán thành công!"
```

### 🛠 Giải thích kỹ thuật:
1.  **Atomic Transaction:** Không có kẽ hở giữa việc kiểm tra hàng và trừ kho. Mọi thứ diễn ra trong một nhịp đập duy nhất của Database.
2.  **Server-side Pricing:** Giá tiền được tính toán lại 100% dựa trên bảng `products`. Mọi can thiệp giá từ Client đều bị vô hiệu hóa.
3.  **SDK Standard:** Sử dụng thư viện chính thức từ PayOS để đảm bảo chữ ký Webhook và link thanh toán luôn đạt chuẩn bảo mật mới nhất.
4.  **Idempotency & Concurrency:** Sử dụng `payos_order_code` và kiểm tra trạng thái ngay khi update để tránh việc xử lý trùng lặp webhook khi có độ trễ mạng.

---
**Sơ đồ này đảm bảo hệ thống Nie8 vận hành minh bạch, chính xác 100% về kho hàng và tài chính.**
