# Product Specification: Use Case & Permissions (Niee8)

Tài liệu này xác định các tương tác của người dùng và quyền hạn truy cập dữ liệu để đảm bảo tính toàn vẹn của hệ thống E-commerce.

## 1. Sơ đồ Use Case (Mermaid.js)

Sơ đồ dưới đây mô tả các hành động chính của Khách hàng (Customer) và Quản trị viên (Admin).

```mermaid
useCaseDiagram
    actor "Khách hàng (Vãng lai/Đã đăng nhập)" as Customer
    actor "Quản trị viên (Chủ shop)" as Admin

    package "Trang Storefront (Trải nghiệm mua sắm)" {
        usecase "Xem sản phẩm & Story nghệ thuật" as UC1
        usecase "Thanh toán nhanh (Không cần đăng nhập)" as UC4
        usecase "Đăng nhập để xem lịch sử mua hàng" as UC3
    }

    package "Hệ thống Admin (Quản trị toàn quyền)" {
        usecase "Điều hành toàn bộ Kho & Sản phẩm" as UC6
        usecase "Quyết định Trạng thái Đơn hàng" as UC7
        usecase "Xử lý Trả hàng & Nhật ký hệ thống" as UC8
    }

    Customer --> UC1
    Customer --> UC3
    Customer --> UC4

    Admin --> UC6
    Admin --> UC7
    Admin --> UC8

    UC4 ..> UC7 : "Trigger tạo đơn"
    UC8 ..> UC6 : "Cập nhật tồn kho"
```

## 2. Ma trận Tính năng & Phân quyền (Feature Matrix)

Dưới đây là bảng chi tiết các quyền hạn CRUD (Create, Read, Update, Delete) cho từng module:

| Module | Role | Create | Read | Update | Delete | Ghi chú |
| :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| **Sản phẩm** | Admin | ✅ | ✅ | ✅ | ✅ | Toàn quyền kiểm soát nội dung và kho. |
| | Customer | ❌ | ✅ | ❌ | ❌ | Được phép xem ảnh, giá và story. |
| **Đơn hàng** | Admin | ❌ | ✅ | ✅ | ❌ | Quyết định trạng thái (Duyệt/Giao/Trả). |
| | Customer | ✅ | ✅ | ❌ | ❌ | Đặt hàng nhanh (có thể ko cần Login). |
| **Kho hàng** | Admin | ✅ | ✅ | ✅ | ✅ | Quản lý nhập/xuất và hàng hư hỏng. |
| | Customer | ❌ | ✅ | ❌ | ❌ | Chỉ thấy trạng thái Stock công khai. |

---

> [!IMPORTANT]
> **Nguyên tắc bảo mật:** Khách hàng không bao giờ được phép thay đổi trực tiếp số lượng tồn kho hoặc giá sản phẩm. Mọi thay đổi tồn kho của Khách hàng phải thông qua logic trung gian (Checkout/Cancel Order).

> [!TIP]
> **Mở rộng tính năng:** Trong tương lai, chúng ta có thể bổ sung thêm Role **"Warehouse"** (Chỉ quản lý Tồn kho & Giao nhận) để tối ưu hóa quy trình đóng gói.
