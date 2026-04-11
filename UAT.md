# User Acceptance Testing (UAT) - NIE8 Minimalist Fashion

Dưới đây là kế hoạch kiểm thử chấp nhận người dùng (UAT) cho dự án NIE8. Tài liệu này giúp đảm bảo mọi tính năng hoạt động đúng theo yêu cầu nghiệp vụ và mang lại trải nghiệm tốt nhất cho khách hàng.

## 1. Tổng quan (Overview)
- **Dự án:** NIE8 - Minimalist Fashion Store
- **Mục tiêu:** Kiểm tra tính đúng đắn của luồng mua hàng, quản lý kho và tính năng thông báo (Restock Notification).
- **Vai trò kiểm thử:**
    - **Khách hàng:** Trải nghiệm mua sắm, đăng ký thông báo.
    - **Admin (COO/PO):** Quản lý sản phẩm, đơn hàng và chiến lược nhập kho.

## 2. Các kịch bản kiểm thử chính (Main Test Scenarios)

### A. Luồng Khách hàng (Customer Flow)
1. **Trang chủ & Danh mục:** Kiểm tra hiển thị sản phẩm, lọc theo danh mục.
2. **Chi tiết sản phẩm:** Xem ảnh, chọn size, xem mô tả và chất liệu.
3. **Giỏ hàng & Thanh toán:** Thêm/Xóa sản phẩm, cập nhật số lượng, quy trình đặt hàng.
4. **Đăng ký nhận thông báo (Restock):** Đăng ký email khi sản phẩm/size hết hàng.

### B. Luồng Quản trị (Admin Flow)
1. **Dashboard Overview:** Theo dõi các chỉ số doanh thu, đơn hàng và nhu cầu nhập hàng.
2. **Quản lý sản phẩm:** Thêm mới, chỉnh sửa, xóa và nhập kho hàng loạt (Bulk).
3. **Quản lý đơn hàng:** Cập nhật trạng thái đơn hàng (Chờ xử lý, Đã giao, Hủy).
4. **Nhập kho & Thông báo (Restock Strategy):** Thực hiện nhập kho và chọn chiến lược gửi email thông báo cho khách hàng.
5. **Cài đặt hệ thống:** Thay đổi Hero image, tiêu đề và mô tả cửa hàng.

## 4. Kịch bản kiểm thử chi tiết (Detailed Test Cases)

### 4.1. Edge Cases & Boundary Conditions (Trường hợp biên)
| ID | Kịch bản | Mong đợi |
|:---|:---|:---|
| TC-BC-01 | Đặt hàng với số lượng bằng đúng tồn kho | Đơn hàng thành công, tồn kho về 0, sản phẩm chuyển sang trạng thái "Hết hàng". |
| TC-BC-02 | Nhập kho với số lượng cực lớn (vd: 1,000,000) | Hệ thống xử lý mượt mà, không bị tràn số hoặc lỗi giao diện. |
| TC-BC-03 | Đăng ký Restock cho tất cả các size của 1 sản phẩm | Hệ thống ghi nhận đúng từng size riêng biệt cho cùng 1 email. |
| TC-BC-04 | Tên sản phẩm cực dài hoặc cực ngắn | Giao diện Dashboard và Card sản phẩm vẫn hiển thị đẹp, không bị vỡ layout. |

### 4.2. Negative Testing (Kiểm thử trường hợp sai)
| ID | Kịch bản | Mong đợi |
|:---|:---|:---|
| TC-NT-01 | Đặt hàng khi sản phẩm vừa hết hàng (Race condition) | Thông báo lỗi "Sản phẩm đã hết hàng" và không tạo đơn hàng. |
| TC-NT-02 | Nhập Email sai định dạng khi đăng ký Restock | Hệ thống báo lỗi "Email không hợp lệ" và không cho phép gửi. |
| TC-NT-03 | Admin nhập số lượng âm khi Nhập kho | Hệ thống chặn và yêu cầu nhập số dương (hoặc dùng tính năng điều chỉnh kho riêng). |
| TC-NT-04 | Khách hàng cố tình thêm sản phẩm vào giỏ bằng cách can thiệp code | Backend kiểm tra tồn kho và từ chối nếu không đủ. |

### 4.3. Security Cases (Kiểm thử bảo mật)
| ID | Kịch bản | Mong đợi |
|:---|:---|:---|
| TC-SC-01 | Truy cập trang Admin không qua đăng nhập | Hệ thống chuyển hướng về trang Login hoặc báo lỗi Unauthorized. |
| TC-SC-02 | SQL Injection qua form tìm kiếm hoặc đăng ký | Hệ thống đã được bảo vệ bởi Supabase/PostgreSQL, không thực thi lệnh lạ. |
| TC-SC-03 | XSS qua tên sản phẩm hoặc ghi chú đơn hàng | Các chuỗi `<script>` được escape, không thực thi trên trình duyệt. |
| TC-SC-04 | Thay đổi giá sản phẩm trong request đặt hàng | Backend tính toán lại giá dựa trên Database, không tin tưởng giá từ Client. |

### 4.4. Kiểm thử Chuyên sâu Thương mại Điện tử (E-commerce Core QA)
| ID | Kịch bản (Test Scenario) | Mong đợi (Expected Result) |
|:---|:---|:---|
| TC-EC-01 | **[Mua hàng & Kho]** Thêm vào giỏ khi tồn kho = 1, nhưng sang tab khác lấy user khác mua mất (Tồn kho = 0) | Khi bấm Reload / Checkout, Frontend tự động Clamp số lượng hiển thị về 0 và đẩy khỏi giỏ, Backend chặn giao dịch (Oversell Check). |
| TC-EC-02 | **[Mã giảm giá]** Áp dụng mã Coupon hợp lệ (Fixed & Percentage) | Tổng tiền tự động được tính trừ đúng công thức. Lượt sử dụng mã (Usage Count) tăng lên +1. |
| TC-EC-03 | **[Mã giảm giá]** Áp dụng mã đã cạn giới hạn (`usage_count >= usage_limit`) | Hệ thống báo lỗi "Mã giảm giá đã hết lượt sử dụng" và không cho áp dụng. |
| TC-EC-04 | **[Hóa đơn điện tử]** Tích chọn xuất hóa đơn VAT (Cá nhân/Công ty) tại bước Checkout | Phải hiển thị Form phụ nhập MST, Tên tổ chức. Sau khi mua, thông tin lưu chính xác dưới định dạng JSONB tại cột `invoice_info`. |
| TC-EC-05 | **[Hủy đơn PayOS]** Khách chọn "Hủy thanh toán / Quay lại" trên PayOS QR | Đơn hàng nháy sang `Cancelled`. Kho tức khắc hoàn trả (+1 áo), Lượt giảm giá hoàn trả (-1). |
| TC-EC-06 | **[Hủy tự động]** Khách tạo đơn PayOS rồi hờ hững... đóng luôn trình duyệt (Tạo kẹt kho ảo) | Sau chính xác 15 phút, Robot quét (Vercel Cron) tìm đơn Pending này, Set `Cancelled` và hoàn lại kho tự động, hoàn mã giảm giá. |
| TC-EC-07 | **[Quản lý Đơn]** Admin tự tay hủy đơn hàng từ Admin Dashboard | Hệ thống ghi Log báo cáo Hủy/Hoàn kho xuống sổ cái `stock_movements`. Kho nhảy số dương. |

## 6. Kiểm thử bổ sung (Advanced Testing Scenarios)

### 6.1. Kiểm thử Hiệu năng & Chịu tải (Performance & Load Testing)
| ID | Kịch bản | Mong đợi |
|:---|:---|:---|
| TC-PF-01 | Giả lập 100+ người dùng truy cập cùng lúc | Thời gian phản hồi (Response time) < 2s, không bị sập Database. |
| TC-PF-02 | Tải trang sản phẩm với ảnh chất lượng cao | Ảnh load nhanh, không làm treo trình duyệt. |

### 6.2. Kiểm thử Tương thích & Trải nghiệm (Compatibility & UX Testing)
| ID | Kịch bản | Mong đợi |
|:---|:---|:---|
| TC-UX-01 | Hiển thị trên Mobile (iOS/Android) | Layout không bị vỡ, nút bấm dễ thao tác (touch target > 44px). |
| TC-UX-02 | Độ tương phản màu sắc (Accessibility) | Đạt chuẩn WCAG, dễ đọc cho người thị lực kém. |

### 6.3. Kiểm thử Tích hợp & Dữ liệu (Integration & Data Integrity)
| ID | Kịch bản | Mong đợi |
|:---|:---|:---|
| TC-IT-01 | Thanh toán thất bại/Hủy giữa chừng | Hệ thống xử lý lỗi thanh toán, giỏ hàng vẫn giữ nguyên trạng thái. |
| TC-IT-02 | Email thông báo Restock | Email đến đúng hộp thư đến, định dạng sang trọng, không vào Spam. |
| TC-IT-03 | Khôi phục dữ liệu (Data Backup) | Admin có thể khôi phục sản phẩm/đơn hàng đã xóa nhầm. |
