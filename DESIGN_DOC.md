# Tài liệu Thiết kế Hệ thống (System Design Document) - NIEE8

## 1. Tổng quan dự án (Project Overview)
**NIEE8** là một nền tảng thương mại điện tử (E-commerce) dành cho thời trang nữ mang phong cách tối giản (Minimalist). Điểm nhấn của dự án là sự kết hợp giữa giao diện người dùng tinh tế, mượt mà và trợ lý ảo thông minh (AI Stylist) giúp cá nhân hóa trải nghiệm mua sắm.

## 2. Ngăn xếp Công nghệ (Tech Stack)
*   **Frontend:** React 18 (Vite), TypeScript.
*   **Styling & UI:** Tailwind CSS, Motion (Framer Motion cho animation), Lucide React (Icons).
*   **Backend as a Service (BaaS):** Firebase (Authentication, Cloud Firestore).
*   **Trí tuệ nhân tạo (AI):** Google Gemini API (`gemini-2.0-flash`).
*   **Quản lý State & Tối ưu hóa:** Custom Hooks (`useDebounce`), Custom Cache Layer (`in-memory` + `sessionStorage`).

## 3. Kiến trúc Hệ thống (Architecture)
Dự án được xây dựng theo mô hình **Single Page Application (SPA)** kết nối trực tiếp với **Serverless Backend (Firebase)**.
*   **Client-side Rendering (CSR):** Trình duyệt tải một file HTML duy nhất và dùng JavaScript (React) để render UI.
*   **Caching Layer:** Giảm thiểu số lượng request (reads) lên Firestore bằng cách lưu trữ tạm thời `products` (5 phút) và `site_settings` (10 phút) ở client.
*   **Rate Limiting (Client-side):** Ngăn chặn spam request lên Gemini API (giới hạn 1 request / 3 giây).

## 4. Cấu trúc Dữ liệu (Database Schema - Cloud Firestore)

### 4.1. Collection: `users`
Lưu trữ thông tin người dùng và phân quyền.
*   `uid` (string): ID duy nhất của người dùng (từ Firebase Auth).
*   `email` (string): Email người dùng.
*   `displayName` (string): Tên hiển thị.
*   `photoURL` (string): Link ảnh đại diện.
*   `role` (string): Phân quyền (`'admin'` hoặc `'client'`).

### 4.2. Collection: `products`
Lưu trữ thông tin sản phẩm.
*   `id` (string): ID sản phẩm.
*   `name` (string): Tên sản phẩm.
*   `price` (string): Giá sản phẩm (định dạng chuỗi, vd: "$45.00").
*   `category` (string): Danh mục (Áo, Quần, Váy, Áo khoác, Phụ kiện).
*   `description` (string): Mô tả chi tiết.
*   `images` (array of strings): Danh sách URL hình ảnh.
*   `outfit_suggestions` (array of strings): Danh sách ID các sản phẩm gợi ý phối kèm (được AI tự động tạo ra khi thêm mới/cập nhật).

### 4.3. Collection: `site_settings`
Document `global`: Lưu trữ cấu hình giao diện động.
*   `heroImage` (string): URL ảnh nền trang chủ.
*   `heroTitle` (string): Tiêu đề chính.
*   `heroSubtitle` (string): Tiêu đề phụ.
*   `heroDescription` (string): Đoạn mô tả ngắn.

## 5. Các tính năng cốt lõi hiện tại (Core Features)
1.  **Xác thực & Phân quyền:** Đăng nhập bằng tài khoản Google. Tự động cấp quyền `admin` cho email chủ sở hữu, các email khác là `client`.
2.  **Quản trị viên (Admin Dashboard):** Thêm, sửa, xóa sản phẩm. Cập nhật giao diện trang chủ (Hero section). Hỗ trợ thêm sản phẩm hàng loạt bằng JSON.
3.  **Giỏ hàng (Shopping Cart):** Lưu trữ giỏ hàng ở `localStorage`. Sử dụng kỹ thuật `Debounce` (500ms) để tối ưu hiệu năng khi người dùng thay đổi số lượng liên tục.
4.  **AI Stylist (Trợ lý ảo):** 
    *   *Rule-based:* Tự động tư vấn size dựa trên chiều cao, cân nặng (không tốn phí API).
    *   *AI-based:* Gọi Gemini API để tư vấn phối đồ, màu sắc, phong cách dựa trên ngữ cảnh.
    *   *Auto-suggestion:* AI tự động phân tích và gợi ý các sản phẩm phối kèm (Outfit suggestions) khi Admin đăng sản phẩm mới.

## 6. Lộ trình Nâng cấp (Roadmap)

### Phase 1: Hoàn thiện E-commerce Core (Đang tiến hành)
*   [ ] **Tích hợp Firebase Storage:** Thay thế việc lưu ảnh Base64 bằng việc upload file ảnh lên Cloud Storage, lấy URL lưu vào Firestore để tránh lỗi vượt quá 1MB/document và tăng tốc độ tải trang.
*   [ ] **Luồng Thanh toán (Checkout):** Xây dựng form đặt hàng và collection `orders` để lưu thông tin đơn hàng.

### Phase 2: Bảo mật & Tối ưu hóa (Sắp tới)
*   [ ] **Firestore Security Rules:** Khóa chặt database, chỉ cho phép Admin ghi dữ liệu, Client chỉ được đọc sản phẩm và ghi đơn hàng của chính họ.
*   [ ] **Quản lý Đơn hàng (Order Management):** Giao diện cho Admin duyệt đơn và Client theo dõi đơn.

### Phase 3: Scale-up (Tương lai)
*   [ ] **Migrate sang Next.js:** Chuyển đổi sang Server-side Rendering (SSR) để tối ưu hóa SEO (Google Search) và chia sẻ mạng xã hội (Open Graph).
*   [ ] **Tích hợp Cổng thanh toán:** VNPay, MoMo, Stripe.
