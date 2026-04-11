# Đặc tả Thiết kế Cơ sở Dữ liệu - Niee8 E-commerce

Tài liệu này trình bày kiến trúc cơ sở dữ liệu chuẩn hóa cho hệ thống thời trang Niee8, tập trung vào hiệu suất cao, tính minh bạch và khả năng mở rộng trên nền tảng Supabase (PostgreSQL).

## 1. Sơ đồ Thực thể Liên kết (ERD)

```mermaid
erDiagram
    users ||--|| profiles : "has_profile"
    products ||--|{ product_variants : "has_variants"
    product_variants ||--|| inventory : "manages_stock"
    profiles ||--|{ orders : "places"
    orders ||--|{ order_items : "contains"
    coupons ||--o{ orders : "applied_to"

    profiles {
        uuid id PK "FK to auth.users"
        string email
        string full_name
        string phone
        string address
    }

    products {
        uuid id PK
        string name
        text description
        decimal base_price
        string category
        string_array images
    }

    product_variants {
        uuid id PK
        uuid product_id FK
        string size "S, M, L, XL"
        string color "Optional"
        string sku "Stock Keeping Unit"
        decimal price_adjustment
    }

    inventory {
        uuid id PK
        uuid variant_id FK "UK"
        integer quantity
        integer low_stock_threshold
    }

    orders {
        uuid id PK
        uuid user_id FK
        bigint payos_order_code "Unique sequence for Payment"
        decimal total_amount
        string status "pending, processing, shipping, completed, cancelled"
        uuid coupon_id FK
        timestamp created_at
    }

    activity_logs {
        uuid id PK
        string action
        jsonb details
        uuid performed_by FK "FK to profiles"
    }

    error_logs {
        integer id PK
        timestamp created_at
        string origin "RPC Name"
        string error_message
        jsonb details
    }
```

## 2. Chiến lược Đánh chỉ mục (Indexing Strategy)

Chúng ta triển khai các lớp Index để tối ưu hóa hiệu năng:

| Loại Index | Mục tiêu | Cột áp dụng |
| :--- | :--- | :--- |
| **B-Tree (Unique)** | Đảm bảo tính duy nhất & Tra cứu nhanh | `orders(payos_order_code)`, `coupons(code)` |
| **GIN (Full-Text)** | Tìm kiếm sản phẩm theo từ khóa | `products(name, description)` |
| **Relationship B-Tree** | Tăng tốc độ JOIN | `orders(user_id)`, `activity_logs(performed_by)` |

## 3. Mã triển khai (SQL Script - Phiên bản Bảo mật)

```sql
-- 1. Khởi tạo Sequence & Log Tables
CREATE SEQUENCE payos_order_code_seq START 100000;

CREATE TABLE error_logs (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    origin TEXT,
    error_message TEXT,
    details JSONB
);

-- 2. Cập nhật bảng Orders & Activity
ALTER TABLE orders ADD COLUMN payos_order_code BIGINT UNIQUE DEFAULT nextval('payos_order_code_seq');
ALTER TABLE activity_logs ADD COLUMN performed_by UUID REFERENCES profiles(id);

-- 3. RPC: secure_checkout (Atomic Logic)
CREATE OR REPLACE FUNCTION secure_checkout(...) -- Xem tệp supabase-security-hardening-final.sql để biết chi tiết
```

## 4. Nguyên tắc Vận hành (Architectural Best Practices)

- **Atomic Checkout:** Toàn bộ quá trình kiểm tra giá, trừ kho và tạo đơn được bọc trong một Database Transaction duy nhất qua RPC.
- **Server-side Calculation:** Tuyệt đối không tin tưởng giá trị `total_amount` từ client; mọi phép tính phải được thực thi lại trong Database.
- **Idempotency:** Webhook thanh toán dựa trên `payos_order_code` và trạng thái `pending` để tránh xử lý trùng.
- **Audit Logging:** Mọi thao tác trọng yếu đều được ghi vết người thực hiện qua `performed_by`.
