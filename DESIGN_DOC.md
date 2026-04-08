# Tài liệu Thiết kế Hệ thống (System Design Document) - NIEE8

## 1. Tổng quan dự án (Project Overview)
**NIEE8** là một nền tảng thương mại điện tử (E-commerce) dành cho thời trang nữ mang phong cách tối giản (Minimalist). Điểm nhấn của dự án là sự kết hợp giữa giao diện người dùng tinh tế, mượt mà, tối ưu hóa hình ảnh chuyên sâu và trợ lý ảo thông minh (AI Stylist) giúp cá nhân hóa trải nghiệm mua sắm.

## 2. Ngăn xếp Công nghệ (Tech Stack)
*   **Frontend:** React 18 (Vite), TypeScript.
*   **Styling & UI:** Tailwind CSS, Motion (Framer Motion cho animation), Lucide React (Icons).
*   **Backend as a Service (BaaS):** Supabase (PostgreSQL Database, Authentication, Storage).
*   **Trí tuệ nhân tạo (AI):** Google Gemini API (`gemini-2.0-flash`).
*   **Quản lý State & Tối ưu hóa:** Custom Hooks (`useDebounce`), Client-side Image Optimization (Canvas API).

## 3. Kiến trúc Hệ thống (Architecture)
Dự án được xây dựng theo mô hình **Single Page Application (SPA)** kết nối trực tiếp với **Supabase Backend**.
*   **Client-side Rendering (CSR):** Trình duyệt tải một file HTML duy nhất và dùng JavaScript (React) để render UI.
*   **Tối ưu hóa Hình ảnh (Image Optimization):** Client-side tự động nén ảnh sang định dạng `AVIF` (ưu tiên 1) hoặc `WebP` (dự phòng) trước khi upload lên Supabase Storage, giúp tiết kiệm băng thông và dung lượng.
*   **Bảo vệ Bản quyền Hình ảnh:** Sử dụng component `ProtectedImage` với 4 lớp bảo vệ (chống click chuột phải, chống kéo thả, chặn menu ngữ cảnh trên mobile, lớp phủ tàng hình) để ngăn chặn sao chép trái phép.
*   **Rate Limiting (Client-side):** Ngăn chặn spam request lên Gemini API.

## 4. Cấu trúc Dữ liệu (Database Schema - Supabase PostgreSQL)

### 4.1. Table: `users`
Lưu trữ thông tin người dùng và phân quyền.
*   `id` (uuid): ID duy nhất của người dùng (liên kết với Supabase Auth).
*   `email` (text): Email người dùng.
*   `display_name` (text): Tên hiển thị.
*   `photo_url` (text): Link ảnh đại diện.
*   `role` (text): Phân quyền (`'admin'` hoặc `'client'`).

### 4.2. Table: `products`
Lưu trữ thông tin sản phẩm.
*   `id` (text): ID sản phẩm.
*   `name` (text): Tên sản phẩm.
*   `price` (text): Giá sản phẩm (định dạng chuỗi, vd: "450.000đ").
*   `category` (text): Danh mục (Áo, Quần, Váy, Áo khoác, Phụ kiện).
*   `description` (text): Mô tả chi tiết.
*   `images` (jsonb): Danh sách URL hình ảnh.
*   `outfit_suggestions` (jsonb): Danh sách ID các sản phẩm gợi ý phối kèm.

### 4.3. Table: `site_settings`
Lưu trữ cấu hình giao diện động (chỉ có 1 record `id = 'global'`).
*   `id` (text): Primary key (`'global'`).
*   `hero_image` (text): URL ảnh nền trang chủ.
*   `hero_title` (text): Tiêu đề chính.
*   `hero_subtitle` (text): Tiêu đề phụ.
*   `hero_description` (text): Đoạn mô tả ngắn.

## 5. Các tính năng cốt lõi hiện tại (Core Features)
1.  **Xác thực & Phân quyền:** Đăng nhập bằng tài khoản Google (Supabase OAuth). Tự động cấp quyền `admin` cho email chủ sở hữu, các email khác là `client`.
2.  **Quản trị viên (Admin Dashboard):** Thêm, sửa, xóa sản phẩm. Cập nhật giao diện trang chủ (Hero section). Tự động nén ảnh sang AVIF/WebP khi upload.
3.  **Bảo vệ Hình ảnh (Protected Image):** Ngăn chặn việc tải xuống hoặc sao chép hình ảnh sản phẩm và ảnh nền trang chủ.
4.  **Giỏ hàng (Shopping Cart):** Lưu trữ giỏ hàng ở `localStorage`. Sử dụng kỹ thuật `Debounce` (500ms) để tối ưu hiệu năng khi người dùng thay đổi số lượng liên tục.
5.  **Trợ lý ảo & Liên hệ (Floating Actions):** 
    *   *AI Stylist:* Gọi Gemini API để tư vấn phối đồ, màu sắc, phong cách dựa trên ngữ cảnh (hiển thị dạng popup nổi).
    *   *Social Buttons:* Nút liên hệ nhanh qua Zalo và Instagram được thiết kế tối ưu cho cả Desktop và Mobile.
6.  **Giao diện Thích ứng (Responsive Design):** Tối ưu hóa hiển thị trên thiết bị di động (tỷ lệ ảnh 4:5 cho chi tiết sản phẩm, điều hướng mượt mà).

## 6. Lộ trình Nâng cấp (Roadmap)

### Phase 1: Hoàn thiện E-commerce Core (Đang tiến hành)
*   [x] **Tích hợp Supabase Storage:** Upload file ảnh lên Cloud Storage, tối ưu hóa định dạng AVIF/WebP.
*   [x] **Bảo vệ Hình ảnh:** Triển khai cơ chế chống copy ảnh.
*   [ ] **Luồng Thanh toán (Checkout):** Xây dựng form đặt hàng và table `orders` để lưu thông tin đơn hàng.

### Phase 2: Bảo mật & Tối ưu hóa (Sắp tới)
*   [ ] **Row Level Security (RLS):** Khóa chặt database trên Supabase, chỉ cho phép Admin ghi dữ liệu, Client chỉ được đọc sản phẩm và ghi đơn hàng của chính họ.
*   [ ] **Quản lý Đơn hàng (Order Management):** Giao diện cho Admin duyệt đơn và Client theo dõi đơn.

### Phase 3: Scale-up (Tương lai)
*   [ ] **Migrate sang Next.js:** Chuyển đổi sang Server-side Rendering (SSR) để tối ưu hóa SEO (Google Search) và chia sẻ mạng xã hội (Open Graph).
*   [ ] **Tích hợp Cổng thanh toán:** VNPay, MoMo, Stripe.
