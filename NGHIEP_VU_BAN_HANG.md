# TÀI LIỆU NGHIỆP VỤ BÁN HÀNG & QUẢN LÝ KHO

Tài liệu này mô tả các luồng nghiệp vụ chuẩn đang được áp dụng trong hệ thống thương mại điện tử NIEE8.

## 1. Quản lý Tồn kho theo Size (SKU)
- **Vấn đề trước đây:** Tồn kho chỉ quản lý chung cho 1 sản phẩm, dẫn đến việc khách hàng có thể đặt mua một size đã hết hàng nếu các size khác vẫn còn.
- **Nghiệp vụ hiện tại:** Tồn kho được quản lý chi tiết đến từng biến thể (Size S, M, L, XL). 
- **Quy tắc:**
  - Tổng tồn kho của sản phẩm (`stock_quantity`) = Tổng tồn kho của tất cả các size.
  - Trên giao diện mua hàng, nếu khách chọn một size có tồn kho = 0, nút "Thêm vào giỏ" và "Thanh toán ngay" sẽ bị vô hiệu hóa (hiển thị "Hết size này").

## 2. Trừ kho khi Đặt hàng (Reserve Stock)
- **Quy tắc:** Ngay khi khách hàng nhấn "Hoàn tất đặt hàng" (đối với COD) hoặc thanh toán online thành công, hệ thống sẽ **lập tức trừ số lượng tồn kho** của size tương ứng.
- **Lý do:** Đây là nghiệp vụ "Giữ hàng" (Reserve) để tránh tình trạng bán vượt mức (Overselling) khi có nhiều khách hàng cùng truy cập và mua một sản phẩm.
- **Xử lý kỹ thuật:** Sử dụng hàm (Function) `decrement_stock` trên Supabase để đảm bảo tính toàn vẹn dữ liệu (Atomic Update), tránh lỗi khi có 2 giao dịch diễn ra cùng lúc (Race condition).

## 3. Lịch sử Xuất/Nhập kho (Stock Ledger / Movements)
- **Vấn đề trước đây:** Chỉ có một con số tồn kho duy nhất, không biết được tổng số lượng hàng đã nhập từ trước đến nay là bao nhiêu, và hàng hóa bị hao hụt ở khâu nào.
- **Nghiệp vụ hiện tại:** Mọi biến động về số lượng tồn kho đều được ghi lại vào bảng `stock_movements`.
- **Các loại biến động (Type):**
  - `import`: Nhập hàng mới từ xưởng/nhà cung cấp.
  - `sale`: Xuất bán (khi có đơn hàng mới).
  - `return`: Hoàn kho (khi khách hủy đơn, giao thất bại, hoặc trả hàng).
  - `adjustment`: Điều chỉnh kho (khi kiểm kho phát hiện hư hỏng, mất mát).
- **Lợi ích:** 
  - Tính được **Tổng số lượng đã nhập** bằng cách cộng tổng các bản ghi có type là `import`.
  - Dễ dàng đối soát khi kho bị lệch số lượng.

## 4. Hoàn kho tự động (Auto-restock)
- **Nghiệp vụ:** Khi Admin chuyển trạng thái đơn hàng sang "Đã hủy" (Cancelled), hệ thống sẽ tự động gọi hàm cộng lại số lượng vào kho và ghi log `return`.
- **Xử lý kỹ thuật:** Sử dụng hàm `restore_stock` trên Supabase để đảm bảo cộng đúng số lượng cho từng size của từng sản phẩm trong đơn hàng bị hủy.

## 5. Đăng ký nhận thông báo khi có hàng (Restock Notification)
- **Nghiệp vụ:** Khi một sản phẩm/size hết hàng, khách hàng có thể để lại email để nhận thông báo khi hàng về. Tính năng này giúp đo lường nhu cầu (Demand Forecasting) và thu thập lead.
- **Chiến lược xử lý (Restock Strategy):**
  - **Trường hợp 1: Khách hủy đơn (Rớt lại 1-2 sản phẩm):** Hệ thống sẽ **KHÔNG** gửi email tự động. Số lượng rớt này sẽ được âm thầm cộng lại vào kho.
  - **Trường hợp 2: Admin nhập hàng (Restock):** Khi Admin thực hiện thao tác "Nhập kho", hệ thống sẽ hiển thị số lượng khách đang chờ và cung cấp 3 lựa chọn:
    1. *Không gửi email* (Nhập số lượng quá ít).
    2. *Gửi cho TẤT CẢ* (Nhập số lượng lớn, đủ đáp ứng).
    3. *Chỉ gửi cho [ X ] người đăng ký sớm nhất* (Tạo trải nghiệm VIP, tránh hiệu ứng bầy đàn khi số lượng nhập ít hơn số người chờ).

## 6. Báo cáo & Chiến lược (Admin Dashboard)
- **Nghiệp vụ:** Xây dựng trang Tổng quan (Dashboard) cho Admin để theo dõi các chỉ số quan trọng mỗi ngày.
- **Tính năng:**
  - Thống kê Doanh thu, Số đơn hàng, Tỷ lệ chuyển đổi.
  - Báo cáo Sản phẩm bán chạy nhất (Top-selling).
  - Báo cáo Nhu cầu nhập hàng (Sản phẩm nào đang có nhiều người đăng ký nhận thông báo nhất) để Admin đưa ra quyết định sản xuất/nhập hàng chính xác.

## 7. Các nghiệp vụ cần phát triển thêm trong tương lai
- **Cảnh báo sắp hết hàng (Low Stock Alert):** Thêm ngưỡng cảnh báo (ví dụ: < 5 sản phẩm) để hệ thống tự động báo đỏ.
- **Quản lý Giá vốn (COGS):** Lưu lại giá nhập của từng đợt hàng để tính toán chính xác Lợi nhuận (Profit).
