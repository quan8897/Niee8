# User Acceptance Testing (UAT) - NIE8 Minimalist Fashion

Dưới đây là kế hoạch kiểm thử chấp nhận người dùng (UAT) cho dự án NIE8. Tài liệu này giúp đảm bảo mọi tính năng hoạt động đúng theo yêu cầu nghiệp vụ và mang lại trải nghiệm tốt nhất cho khách hàng.

## 1. Tổng quan (Overview)
- **Dự án:** NIE8 - Minimalist Fashion Store
- **Mục tiêu:** Kiểm tra tính đúng đắn của luồng mua hàng, quản lý kho và các tính năng thông minh (AI Stylist, Restock Notification).
- **Vai trò kiểm thử:**
    - **Khách hàng:** Trải nghiệm mua sắm, đăng ký thông báo.
    - **Admin (COO/PO):** Quản lý sản phẩm, đơn hàng và chiến lược nhập kho.

## 2. Các kịch bản kiểm thử chính (Main Test Scenarios)

### A. Luồng Khách hàng (Customer Flow)
1. **Trang chủ & Danh mục:** Kiểm tra hiển thị sản phẩm, lọc theo danh mục.
2. **Chi tiết sản phẩm:** Xem ảnh, chọn size, xem gợi ý phối đồ từ AI.
3. **Giỏ hàng & Thanh toán:** Thêm/Xóa sản phẩm, cập nhật số lượng, quy trình đặt hàng.
4. **Đăng ký nhận thông báo (Restock):** Đăng ký email khi sản phẩm/size hết hàng.
5. **AI Stylist:** Chat với trợ lý ảo để nhận tư vấn thời trang.

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
