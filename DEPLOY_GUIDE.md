# Hướng dẫn Triển khai Shop NIEE8 lên Production (Railway + Supabase)

Tài liệu này hướng dẫn bạn từng bước để đưa website NIEE8 từ môi trường phát triển lên môi trường kinh doanh thực tế với Domain riêng.

---

## 1. Chuẩn bị tài khoản
Bạn cần có tài khoản tại các nền tảng sau:
*   **GitHub:** Để lưu trữ mã nguồn.
*   **Railway.app:** Để chạy Server (Express + React).
*   **Supabase.com:** Để quản lý Database, Auth và Ảnh sản phẩm.
*   **PayOS.vn:** Để nhận tiền thanh toán.
*   **Google AI Studio:** Để lấy Gemini API Key.

---

## 2. Đưa mã nguồn lên GitHub
1.  Tạo một Repository mới trên GitHub (để ở chế độ **Private** nếu bạn muốn bảo mật).
2.  Tải mã nguồn từ AI Studio về máy tính của bạn.
3.  Đẩy code lên GitHub:
    ```bash
    git init
    git add .
    git commit -m "Initial commit"
    git branch -M main
    git remote add origin <link-github-cua-ban>
    git push -u origin main
    ```

---

## 3. Triển khai lên Railway.app
1.  Truy cập [Railway.app](https://railway.app/) và đăng nhập bằng GitHub.
2.  Nhấn **New Project** -> **Deploy from GitHub repo**.
3.  Chọn Repository `niee8` bạn vừa tạo.
4.  Railway sẽ tự động nhận diện và bắt đầu build. **Lưu ý:** Lúc này sẽ bị lỗi vì chưa có Biến môi trường.

---

## 4. Cấu hình Biến môi trường (Variables)
Vào tab **Variables** trên Railway và thêm đầy đủ các biến sau (Copy từ file `.env` của bạn):

### Nhóm Supabase (Dữ liệu)
*   `VITE_SUPABASE_URL`: URL của dự án Supabase.
*   `VITE_SUPABASE_ANON_KEY`: Anon Key của Supabase.

### Nhóm PayOS (Thanh toán)
*   `PAYOS_CLIENT_ID`: Lấy từ Dashboard PayOS.
*   `PAYOS_API_KEY`: Lấy từ Dashboard PayOS.
*   `PAYOS_CHECKSUM_KEY`: Lấy từ Dashboard PayOS.

### Nhóm AI & Hệ thống
*   `GEMINI_API_KEY`: Mã API Gemini của bạn.
*   `NODE_ENV`: Đặt là `production`.

---

## 5. Cấu hình Webhook PayOS (Cực kỳ quan trọng)
Để hệ thống tự động nhận biết khách đã trả tiền:
1.  Trên Railway, vào tab **Settings** -> **Domains** -> Nhấn **Generate Domain** (hoặc thêm Domain riêng của bạn).
2.  Giả sử domain của bạn là `https://niee8.vn`.
3.  Truy cập [Dashboard PayOS](https://portal.payos.vn/).
4.  Tìm phần **Webhook URL** và dán địa chỉ sau:
    `https://niee8.vn/api/payos-webhook`
5.  Nhấn **Lưu**.

---

## 6. Trỏ Domain riêng (Nếu có)
1.  Tại tab **Settings** của Railway, phần **Domains**, nhấn **Custom Domain**.
2.  Nhập domain bạn đã mua (ví dụ: `niee8.vn`).
3.  Railway sẽ cung cấp cho bạn một bản ghi CNAME hoặc A.
4.  Bạn vào trang quản lý Domain (như Mat Bao, Pavietnam, Cloudflare...) và cấu hình theo hướng dẫn của Railway.

---

## 7. Kiểm tra sau khi triển khai
*   Truy cập domain của bạn.
*   Thử nhắn tin với AI Stylist.
*   Thử đặt một đơn hàng 2.000đ (chế độ Test) để xem link PayOS có hoạt động không.
*   Kiểm tra xem ảnh sản phẩm có hiển thị đúng từ Supabase Storage không.

---

## Lưu ý bảo mật
*   **KHÔNG BAO GIỜ** chia sẻ các mã API Key cho bất kỳ ai.
*   Nếu bạn thay đổi giá sản phẩm, hãy thay đổi trực tiếp trên bảng `products` của Supabase, website sẽ tự cập nhật.

**Chúc bạn kinh doanh hồng phát! 🚀**
