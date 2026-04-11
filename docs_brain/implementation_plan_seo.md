# Implementation Plan: Tối ưu hóa SEO toàn diện cho Niee8

Mục tiêu: Đưa các sản phẩm của Niee8 lên top tìm kiếm Google, tối ưu hóa hiển thị trên mạng xã hội và sửa các lỗi kỹ thuật về Sitemap.

## User Review Required

> [!IMPORTANT]
> **Chiến lược Dynamic URL**: Mình đề xuất tạo thêm các trang sản phẩm tĩnh (`/product/[id]`) song song với giao diện Modal hiện tại. Điều này giúp mỗi sản phẩm có một URL riêng biệt để Google index, nhưng vẫn giữ được trải nghiệm mượt mà cho người dùng.

## Proposed Changes

### 1. Metadata & Social Sharing (Header Optimization)

#### [MODIFY] [layout.tsx](file:///c:/Users/ACER/Downloads/dự án kinh doanh quần áo/Niee8_temp/app/layout.tsx)
- Thêm `metadataBase` để xử lý ảnh OpenGraph chuẩn xác.
- Bổ sung thẻ `canonical` để tránh trùng lặp nội dung.
- Thêm hình ảnh đại diện (OG Image) mặc định cho thương hiệu.
- Cấu hình `themeColor` và `icons` (Favicon).

### 2. Dữ liệu cấu trúc (Structured Data)

#### [MODIFY] [StoreClient.tsx](file:///c:/Users/ACER/Downloads/dự án kinh doanh quần áo/Niee8_temp/app/StoreClient.tsx)
- Tích hợp **JSON-LD (Schema.org)**: Khai báo danh sách sản phẩm (`ItemList`) và chi tiết từng sản phẩm (`Product`) bao gồm tên, giá, mô tả và tình trạng kho hàng. Google sẽ dùng dữ liệu này để hiển thị giá và đánh giá ngay trên trang tìm kiếm.

### 3. Sitemap & Robots (Indexing Fix)

#### [MODIFY] [sitemap.ts](file:///c:/Users/ACER/Downloads/dự án kinh doanh quần áo/Niee8_temp/app/sitemap.ts)
- Sửa lại logic sinh URL để khớp với cấu trúc thực tế của website.
- Tối ưu hóa `priority` cho các sản phẩm hot.

#### [MODIFY] [robots.txt](file:///c:/Users/ACER/Downloads/dự án kinh doanh quần áo/Niee8_temp/app/robots.txt)
- Đảm bảo Google Bot được phép truy cập tất cả tài nguyên hình ảnh để index vào Google Images.

### 4. Semantic HTML (Accessibility)

#### [MODIFY] [ProductGrid.tsx] (Đang nghiên cứu vị trí chính xác)
- Đảm bảo thẻ `<h1>` duy nhất trên trang chủ là tên thương hiệu "Niee8".
- Bổ sung thẻ `alt` mô tả sản phẩm cho tất cả hình ảnh để tối ưu hóa tìm kiếm bằng hình ảnh.

## Open Questions

- Bạn đã có sẵn một tấm hình đẹp nhất (ví dụ ảnh bìa Lookbook) để làm **Ảnh đại diện mặc định** khi chia sẻ link website lên Facebook chưa? Nếu chưa, mình có thể dùng `generate_image` để tạo một ảnh sang trọng theo phong cách Nâu-Be của quán.

## Verification Plan

### Automated Tests
- Sử dụng **Google Rich Results Test** để kiểm tra tính hợp lệ của JSON-LD.
- Kiểm tra file `sitemap.xml` trực tiếp trên trình duyệt để đảm bảo không còn link 404.

### Manual Verification
- Chia sẻ link lên Facebook Debugger để kiểm tra hiển thị Thumbnail.
- Kiểm tra cấu trúc thẻ Heading (H1-H4) qua SEO Browser Extension.
