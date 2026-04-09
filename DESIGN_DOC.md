# 📘 TÀI LIỆU THIẾT KẾ HỆ THỐNG (System Design Document)
# NIEE8 — Nền tảng Thương mại Điện tử Thời trang Tối giản

> **Phiên bản:** 2.0 (Next.js Migration Edition)  
> **Cập nhật lần cuối:** 2026-04-10  
> **Trạng thái:** Đang chuyển đổi sang Next.js 14 App Router  

---

## 1. TỔNG QUAN DỰ ÁN (Project Overview)

**NIEE8** là một nền tảng thương mại điện tử (E-commerce) dành cho **thời trang nữ phong cách Minimalist (Tối giản)**. Thương hiệu hướng tới phân khúc khách hàng nữ từ 18–35 tuổi, yêu thích vẻ đẹp thanh lịch và tinh tế.

### Điểm nhấn khác biệt:
- **AI Stylist** tích hợp sẵn — Tư vấn phối đồ cá nhân hóa theo số đo, hoàn cảnh.
- **Giao diện Lookbook** — Trải nghiệm mua sắm như đang lướt tạp chí thời trang.
- **Bảo vệ hình ảnh** — Ngăn chặn copy ảnh sản phẩm vi phạm bản quyền.
- **Quản lý kho theo SKU** — Tồn kho chính xác đến từng Size (S/M/L/XL).

---

## 2. NGĂN XẾP CÔNG NGHỆ (Tech Stack — Next.js Migration)

| Lớp | Công nghệ | Ghi chú |
|---|---|---|
| **Framework** | Next.js 14 (App Router) | Thay thế Vite/React SPA |
| **Ngôn ngữ** | TypeScript | Strict mode |
| **Styling** | Tailwind CSS v4 | Giữ nguyên design tokens |
| **Animation** | Framer Motion (motion) | Giữ nguyên toàn bộ |
| **Icons** | Lucide React | Giữ nguyên |
| **Database** | Supabase (PostgreSQL) | Giữ nguyên |
| **Auth** | Supabase Auth (Google OAuth) | Giữ nguyên |
| **Storage** | Supabase Storage | Giữ nguyên |
| **AI** | Google Gemini 2.0 Flash | Ẩn key bằng Server Route |
| **Thanh toán** | PayOS | Xử lý qua Server Route |
| **Hosting** | Vercel | Giữ nguyên, tương thích Next.js |
| **Email** | Resend (sắp tích hợp) | Thông báo restock |

---

## 3. KIẾN TRÚC HỆ THỐNG (Architecture)

### 3.1. Mô hình cũ (Vite SPA — ĐÃ LOẠI BỎ)
```
Browser → React SPA → Supabase (trực tiếp)
                    → Gemini API (lộ key)
                    → PayOS (lộ secret)
```

### 3.2. Mô hình mới (Next.js App Router — MỤC TIÊU)
```
Browser → Next.js Server Components (SSR/SSG)
              ↓
        Supabase (server-side, ẩn key)
              ↓  
        Next.js API Route Handlers (Server)
              ├── /api/ai        → Gemini API (ẩn key tuyệt đối)
              ├── /api/checkout  → secure_checkout RPC (atomic)
              ├── /api/webhook/payos → Xác thực thanh toán
              └── /api/cron/cleanup  → Dọn đơn hàng hết hạn
```

### 3.3. Cấu trúc thư mục Next.js mục tiêu
```
/app
  /(store)              ← Route group cho khách hàng
    /page.tsx           ← Trang chủ (SSR, SEO)
    /products/[id]/page.tsx ← Chi tiết sản phẩm (SSG)
    /cart/page.tsx      ← Giỏ hàng
    /checkout/page.tsx  ← Thanh toán
    /order/[id]/page.tsx ← Theo dõi đơn hàng
  /(admin)              ← Route group cho admin
    /dashboard/page.tsx ← Trang quản trị (protected)
  /api
    /ai/route.ts        ← AI Stylist endpoint (server)
    /checkout/route.ts  ← Tạo đơn + trừ kho (server)
    /webhook/payos/route.ts ← PayOS callback
    /cron/cleanup/route.ts  ← Hủy đơn hết hạn
  /layout.tsx           ← Root layout
  /globals.css          ← CSS tokens (giữ nguyên)
/components
  /ui/                  ← Shared UI atoms
  /store/               ← Store-specific components
  /admin/               ← Admin-only components
/lib
  /supabase/
    /server.ts          ← Supabase client (Server Component)
    /client.ts          ← Supabase client (Browser)
  /utils.ts             ← Helpers
/types
  /index.ts             ← TypeScript interfaces
```

---

## 4. THIẾT KẾ GIAO DIỆN (UI Design System)

### 4.1. Color Palette (Màu sắc — Giữ nguyên)
```css
--color-nie8-bg:        #F5EEE5   /* Nền kem ấm */
--color-nie8-primary:   #5C4D3F   /* Nâu đất đặc trưng */
--color-nie8-secondary: #9E8C78   /* Nâu trung tính */
--color-nie8-accent:    #D8CEBF   /* Kem nhạt nhấn */
--color-nie8-text:      #5C4D3F   /* Chữ chính */
--color-nie8-white:     #FFFFFF   /* Trắng tinh */
```

### 4.2. Typography (Chữ viết — Giữ nguyên)
```css
--font-serif: "Cormorant Garamond"  /* Tiêu đề sang trọng */
--font-sans:  "Montserrat"          /* Nội dung hiện đại */
```

### 4.3. Components Inventory (Danh sách 20 Components hiện có)

| Component | Loại | Di chuyển |
|---|---|---|
| `Header.tsx` | Layout | Client Component |
| `Footer.tsx` | Layout | Server Component |
| `Hero.tsx` | Section | Server Component (fetch settings) |
| `ProductGrid.tsx` | Feature | Server + Client (filter/cart) |
| `Cart.tsx` | Feature | Client Component |
| `Checkout.tsx` | Feature | Client Component |
| `OrderTracking.tsx` | Feature | Client Component |
| `AIStylist.tsx` | Feature | Client Component |
| `AdminDashboard.tsx` | Admin | Client Component (protected) |
| `AdminLogin.tsx` | Admin | Client Component |
| `AuthModal.tsx` | Auth | Client Component |
| `FloatingActions.tsx` | UI | Client Component |
| `ErrorBoundary.tsx` | Utility | Client Component |
| `ProtectedImage.tsx` | UI | Client Component |
| `MixMatchCanvas.tsx` | Feature | Client Component |
| `MoodConsultant.tsx` | Feature | Client Component |
| `VirtualMeasurement.tsx` | Feature | Client Component |
| `Feedback.tsx` | Feature | Server Component |
| `UATDashboard.tsx` | Dev Tool | Xóa trên Production |

---

## 5. CẤU TRÚC DỮ LIỆU (Database Schema — Supabase PostgreSQL)

### 5.1. Table: `profiles`
Phân quyền người dùng (liên kết với Supabase Auth).
| Cột | Kiểu | Ghi chú |
|---|---|---|
| `id` | uuid (PK) | Khớp với `auth.users.id` |
| `email` | text | Email đăng nhập |
| `display_name` | text | Tên hiển thị |
| `photo_url` | text | Ảnh đại diện |
| `role` | text | `'admin'` hoặc `'client'` |

### 5.2. Table: `products`
| Cột | Kiểu | Ghi chú |
|---|---|---|
| `id` | text (PK) | Slug dạng `"ao-thun-co-tron"` |
| `name` | text | Tên sản phẩm |
| `price` | text | **TODO:** Đổi sang `numeric` |
| `category` | text | Áo / Quần / Váy / Áo khoác / Phụ kiện |
| `description` | text | Mô tả chi tiết |
| `images` | jsonb | Mảng URL ảnh |
| `outfit_suggestions` | jsonb | Mảng ID sản phẩm gợi ý phối |
| `stock_quantity` | integer | Tổng kho (tất cả size) |
| `stock_by_size` | jsonb | `{"S": 10, "M": 5, "L": 0, "XL": 2}` |
| `created_at` | timestamp | Tự động |

### 5.3. Table: `orders`
| Cột | Kiểu | Ghi chú |
|---|---|---|
| `id` | text (PK) | Mã đơn hàng (timestamp-based) |
| `user_id` | uuid (FK) | Liên kết `profiles.id` (nullable) |
| `customer_name` | text | Tên khách |
| `customer_phone` | text | SĐT (dùng tra cứu đơn) |
| `customer_address` | text | Địa chỉ giao hàng |
| `customer_city` | text | Tỉnh/Thành phố |
| `items` | jsonb | Mảng `CartItem` đã mua |
| `total_amount` | numeric | Tổng tiền (VNĐ) |
| `status` | text | `pending / processing / shipping / completed / cancelled` |
| `payment_method` | text | `'cod'` hoặc `'payos'` |
| `created_at` | timestamp | Tự động |

### 5.4. Table: `stock_movements` (Sổ cái kho)
| Cột | Kiểu | Ghi chú |
|---|---|---|
| `id` | uuid (PK) | |
| `product_id` | text (FK) | Liên kết `products.id` |
| `size` | text | S / M / L / XL |
| `quantity` | integer | Âm = xuất, Dương = nhập |
| `type` | text | `import / sale / return / adjustment` |
| `reference_id` | text | Mã đơn hàng |
| `note` | text | Ghi chú |
| `created_at` | timestamp | Tự động |

### 5.5. Table: `stock_notifications` (Đăng ký báo hàng về)
| Cột | Kiểu | Ghi chú |
|---|---|---|
| `id` | uuid (PK) | |
| `product_id` | text (FK) | |
| `email` | text | Email nhận thông báo |
| `size` | text | Size đăng ký |
| `status` | text | `pending / notified` |
| `created_at` | timestamp | |

### 5.6. Table: `site_settings` (Cấu hình giao diện)
| Cột | Kiểu | Ghi chú |
|---|---|---|
| `id` | text (PK) | Luôn là `'global'` |
| `hero_image` | text | URL ảnh banner trang chủ |
| `hero_title` | text | Tiêu đề lớn |
| `hero_subtitle` | text | Tiêu đề phụ |
| `hero_description` | text | Đoạn mô tả ngắn |

---

## 6. NGHIỆP VỤ BÁN HÀNG (Business Logic)

### 6.1. Luồng Thanh toán An toàn (Checkout Flow)
```
Khách bấm "Hoàn tất đặt hàng"
    ↓
Client gọi POST /api/checkout (Server Route Handler)
    ↓
Server mở Transaction → Supabase RPC: secure_checkout()
    ├── Kiểm tra tồn kho từng item (FOR UPDATE lock)
    ├── Nếu hết hàng → ROLLBACK → Trả lỗi 400
    ├── Insert đơn hàng → orders table
    ├── Cập nhật stock_by_size - quantity
    └── Ghi log → stock_movements (type: 'sale')
    ↓
Nếu PayOS: Server tạo PayOS link → Trả URL về Client
Nếu COD: Server trả success → Client hiển thị xác nhận
```

### 6.2. Xác thực Thanh toán PayOS (Webhook)
```
PayOS gọi POST /api/webhook/payos
    ↓
Server xác thực HMAC signature
    ↓
Cập nhật orders.status = 'processing'
    ↓
Gửi email xác nhận (Resend — TODO)
```

### 6.3. Hoàn kho tự động khi Hủy đơn
```
Admin đổi status → 'cancelled'
    ↓
Supabase Trigger hoặc API Route gọi restore_stock()
    ↓
Cộng lại stock vào stock_by_size
    ↓
Ghi log → stock_movements (type: 'return')
```

### 6.4. Cron Job Dọn Đơn Hàng Bỏ Rơi
```
Vercel Cron mỗi 15 phút gọi GET /api/cron/cleanup
    ↓
Tìm orders status='pending' AND created_at < NOW() - 30min
    ↓
Batch update status='cancelled'
    ↓
Gọi restore_stock() cho từng đơn bị hủy
```

---

## 7. BẢO MẬT (Security)

### 7.1. Supabase Row Level Security (RLS)
| Bảng | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| `products` | Tất cả | Admin only | Admin only | Admin only |
| `orders` | Chỉ đơn của mình | Tất cả (tạo đơn) | Admin only | Admin only |
| `profiles` | Chỉ profile của mình | Hệ thống | Chính chủ | Admin only |
| `stock_movements` | Admin only | DEFINER (RPC) | Không | Không |
| `site_settings` | Tất cả | Admin only | Admin only | Không |
| `stock_notifications` | Chỉ của mình | Tất cả | Hệ thống | Chính chủ |

### 7.2. API Key Security
- `GEMINI_API_KEY` — Chỉ tồn tại ở Server (Vercel Env Var), không bao giờ expose ra Client.
- `PAYOS_API_KEY`, `PAYOS_CLIENT_ID`, `PAYOS_CHECKSUM_KEY` — Chỉ ở Server.
- `SUPABASE_SERVICE_ROLE_KEY` — Chỉ ở Server (dùng cho RLS bypass khi cần).
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — An toàn expose ra Client.

### 7.3. Phân quyền Admin
- Quyền Admin được xác định bằng cột `role = 'admin'` trong bảng `profiles` trên Supabase.
- **Không** hardcode email admin ở Frontend.
- Server kiểm tra quyền bằng `supabase.auth.getUser()` trước mọi thao tác ghi dữ liệu nhạy cảm.

---

## 8. SEO & METADATA (Next.js generateMetadata)

| Trang | Title | Description | OG Image |
|---|---|---|---|
| Trang chủ | `NIEE8 — Giản Đơn & Thanh Lịch` | Thương hiệu thời trang nữ... | Hero image |
| Chi tiết sản phẩm | `{Tên sản phẩm} — NIEE8` | {Mô tả sản phẩm} | Ảnh sản phẩm đầu tiên |
| Giỏ hàng | `Giỏ hàng — NIEE8` | — | Logo |
| Theo dõi đơn | `Đơn #{id} — NIEE8` | — | Logo |

---

## 9. LỘ TRÌNH CHUYỂN ĐỔI NEXT.JS (Migration Roadmap)

### ✅ Phase 0 — Đã hoàn thành (Bản Vite)
- [x] Toàn bộ UI Components (20 components)
- [x] Supabase integration (Auth, DB, Storage)
- [x] PayOS payment flow (test mode)
- [x] AI Stylist (Gemini 2.0 Flash)
- [x] Admin Dashboard đầy đủ
- [x] Image AVIF/WebP optimization
- [x] Serverless Function `api/ai.ts` (ẩn API Key)
- [x] SQL: `secure_checkout` RPC (atomic transaction)
- [x] SQL: RLS policies cho products, site_settings

### 🚧 Phase 1 — Khung xương Next.js (Hiện tại)
- [ ] Khởi tạo dự án Next.js 14 App Router
- [ ] Cấu hình Tailwind CSS, giữ nguyên design tokens
- [ ] Tạo `lib/supabase/server.ts` và `lib/supabase/client.ts`
- [ ] Root `layout.tsx` với font Cormorant + Montserrat
- [ ] Di chuyển `globals.css` với color tokens

### ⬜ Phase 2 — Trang khách hàng (Store)
- [ ] `/app/page.tsx` — Trang chủ Server Component (SSR)
- [ ] `/app/products/[id]/page.tsx` — Chi tiết sản phẩm (SSG)
- [ ] Di chuyển `Header`, `Footer`, `Hero`, `ProductGrid`
- [ ] Di chuyển `Cart`, `Checkout`, `OrderTracking`

### ⬜ Phase 3 — API Routes (Server Security)
- [ ] `/api/ai/route.ts` — AI Chat endpoint
- [ ] `/api/checkout/route.ts` — Tạo đơn hàng atomic
- [ ] `/api/webhook/payos/route.ts` — Xác thực PayOS
- [ ] `/api/cron/cleanup/route.ts` — Dọn đơn hết hạn

### ⬜ Phase 4 — Admin Dashboard
- [ ] `/app/(admin)/dashboard/page.tsx`
- [ ] Middleware bảo vệ route admin
- [ ] Di chuyển `AdminDashboard.tsx`

### ⬜ Phase 5 — SEO & Polish
- [ ] `generateMetadata()` cho từng trang
- [ ] Open Graph image cho sản phẩm
- [ ] `sitemap.xml` động
- [ ] `robots.txt`
- [ ] Cron job Vercel (`vercel.json`)

---

## 10. BIẾN MÔI TRƯỜNG (Environment Variables)

```env
# === PUBLIC (an toàn expose ra Browser) ===
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx

# === SERVER ONLY (tuyệt đối không NEXT_PUBLIC_) ===
GEMINI_API_KEY=AIzaXXX
PAYOS_CLIENT_ID=xxx
PAYOS_API_KEY=xxx
PAYOS_CHECKSUM_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxx
CRON_SECRET=random-secret-string-for-cron-auth
```

---

## 11. CHECKLIST TRIỂN KHAI PRODUCTION (Pre-launch)

- [ ] Tất cả biến môi trường đã cấu hình trên Vercel
- [ ] Chạy `supabase-uat-fixes.sql` trên Supabase SQL Editor
- [ ] RLS đã bật cho tất cả các bảng
- [ ] Test mua hàng COD thành công (trừ kho đúng)
- [ ] Test mua hàng PayOS thành công (Webhook xác thực)
- [ ] Test mua khống (vượt tồn kho) → Hệ thống chặn đúng
- [ ] Test AI Stylist chat → Phản hồi từ Server (không lộ key)
- [ ] Test Admin Dashboard → Chỉ truy cập được khi role=admin
- [ ] Google Search Console đã submit sitemap
- [ ] Domain đã cấu hình (nếu có)
