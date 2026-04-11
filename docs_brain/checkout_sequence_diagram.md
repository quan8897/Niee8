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
    
    rect rgb(245, 245, 240)
        Note right of FE: Bước 1: Kiểm tra tồn kho & Khóa bản ghi
        FE->>DB: RPC: validate_inventory_v4(items)
        
        alt Nhánh 1: Đủ hàng
            DB-->>FE: HTTP 200: Inventory Validated
        else Nhánh 2: Hết hàng/Không đủ
            DB-->>FE: HTTP 400: Out of Stock Error
            FE-->>Customer: Thông báo: "Sản phẩm vừa hết hàng"
        end
    end

    rect rgb(250, 240, 230)
        Note right of FE: Bước 2: Xử lý Coupon & Khuyến mãi
        FE->>DB: RPC: validate_coupon(code)
        DB-->>FE: Trả về: Giá trị giảm giá (Discount)
    end

    rect rgb(240, 245, 250)
        Note right of DB: Bước 3: Tạo đơn hàng & Trừ tồn kho (Atomic)
        FE->>DB: RPC: create_secure_order(items, coupon_id)
        Note over DB: Bắt đầu Transaction:<br/>1. Trừ Stock (Concurrency Lock)<br/>2. Lưu Orders & Order_Items<br/>3. Ghi log Stock Movement
        DB-->>FE: Trả về: Order_ID & Total_Amount
    end

    rect rgb(255, 255, 255)
        Note right of FE: Bước 4: Thanh toán phía Cổng (Gateway)
        FE->>PG: API: createPaymentLink(Order_ID, Amount)
        PG-->>FE: Trả về: paymentUrl
        FE-->>Customer: Điều hướng tới trang thanh toán
        
        Customer->>PG: Thực hiện trả tiền
        PG-->>Customer: Xác nhận giao dịch
        
        Note over PG, FE: Luồng Webhook (Background)
        PG->>FE: Webhook: payment_completed(status, signature)
        FE->>DB: UPDATE orders SET status = 'paid' WHERE id = Order_ID
    end

    FE-->>Customer: Hiển thị trang: "Thanh toán thành công!"
```

### 🛠 Giải thích kỹ thuật cho Backend:
1.  **Xử lý Concurrency (Bước 1 & 3):** Sử dụng các hàm RPC (Stored Procedures) với cơ chế `SELECT FOR UPDATE` hoặc các ràng buộc `CHECK (stock >= 0)` để đảm bảo khi 2 khách hàng cùng mua món cuối cùng, chỉ 1 người thành công.
2.  **Tính nguyên tử (Atomicity):** Các bước tạo Order và trừ Stock được bọc trong một Database Transaction. Nếu bước tạo Order lỗi, Stock sẽ tự động được Rollback.
3.  **Bảo mật:** Webhook từ Cổng thanh toán được kiểm tra chữ ký (Signature Verification) trước khi cập nhật trạng thái đơn hàng để chống gian lận.

---
**Sơ đồ này đảm bảo hệ thống Nie8 vận hành minh bạch, chính xác 100% về kho hàng và tài chính.**
