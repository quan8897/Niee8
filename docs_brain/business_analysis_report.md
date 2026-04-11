# Phân tích Nghiệp vụ Quản lý Sản phẩm & Quản trị Rủi ro (Nie8)

Bản phân tích này đi sâu vào hành trình của một món đồ từ khi còn là dữ liệu trên giấy cho đến khi nằm trong tủ đồ của khách hàng.

## 1. Vòng đời Sản phẩm (Product Lifecycle)

### Giai đoạn 1: Khai báo Định danh (Identity)
- **Nghiệp vụ:** Admin tạo sản phẩm trên hệ thống (Tên, Mã N8-ID, Giá, Ảnh). 
- **Trạng thái kho:** Lúc này sản phẩm có thực thể nhưng số lượng tồn kho = 0.

### Giai đoạn 2: Nhập kho (Stock In)
- **Nghiệp vụ:** Hàng thực tế về tới kho. Admin thực hiện "Điều chỉnh kho" để tăng số lượng từng Size.
- **Dữ liệu:** Ghi nhận vào Sổ cái `stock_movements` (Type: `import`).

### Giai đoạn 3: Chào bán & Chốt đơn (Sale)
- **Nghiệp vụ:** Khách hàng đặt mua ➔ Thanh toán.
- **Dữ liệu:** Hệ thống tự động trừ kho (Type: `sale`). 
- **Rủi ro:** Đây là điểm nhạy cảm nhất (bán vượt số lượng tồn thực tế).

### Giai đoạn 4: Hoàn tất & Giao hàng (Fulfillment)
- **Nghiệp vụ:** Đóng gói ➔ Ship.
- **Rủi ro:** Hàng trong kho bị lỗi/hỏng trong lúc đóng gói mà trước đó không phát hiện ra.

### Giai đoạn 5: Hậu mãi (Post-Sale)
- **Nghiệp vụ:** Khách nhận hàng thành công HOẶC Trả hàng (do lỗi, đổi size, không ưng).
- **Dữ liệu:** Hoàn kho (Type: `return`) hoặc Ghi nhận hủy bỏ (Type: `damage`).

---

## 2. Ma trận Quản trị Rủi ro & Giải pháp Phần mềm

| Giai đoạn | Rủi ro tiềm ẩn (Risk) | Hệ quả (Impact) | Giải pháp của Nie8 System |
| :--- | :--- | :--- | :--- |
| **Nhập kho** | Nhập sai số lượng hoặc nhầm size giữa S và M. | Sai lệch tồn kho ngay từ đầu, dẫn đến bán hớ hoặc bỏ lỡ cơ hội bán. | **Chức năng Nhập kho riêng biệt:** Yêu cầu chọn Size rõ ràng và hiển thị số tồn cũ để đối chiếu trước khi cộng thêm. |
| **Quản lý** | Nhân viên lỡ tay sửa số tồn kho trong lúc sửa tên/giá sản phẩm. | Mất dấu vết biến động, không biết tại sao kho thiếu/thừa. | **Khóa ô nhập trong Form Sửa:** Chỉ cho phép xem, buộc phải qua "Cổng nhập kho" có ghi chú lý do. |
| **Bán hàng** | 2 khách cùng mua 1 cái áo cuối cùng tại cùng 1 giây. | **Bán vượt (Overselling):** Phải xin lỗi khách và hủy đơn ➔ Mất uy tín thương hiệu. | **Cơ chế Locking Database:** Sử dụng hàm SQL (RPC) để kiểm tra tồn kho tại giây cuối cùng trước khi cho phép thanh toán. |
| **Trả hàng** | Hàng khách trả về bị rách/vấy bẩn nhưng Admin vẫn bấm "Hoàn kho" bừa bãi. | Kho bị "rác", khách sau mua phải hàng hỏng ➔ Khiếu nại. | **Cơ chế Trả hàng 2 bước:** Buộc Admin xác nhận tình trạng hàng (Tốt/Hỏng) trước khi quyết định có cộng lại vào tồn hay không. |
| **Thất thoát** | Hàng bị mất cắp hoặc hư hỏng trong kho (chuột cắn, ẩm mốc...). | Lệch kho thực tế so với sổ sách phần mềm. | **Nút "Xuất hỏng":** Cho phép giảm kho chủ động với lý do cụ thể, giúp cuối tháng tổng kết tỷ lệ hao hụt. |

---

## 3. Kết luận: Triết lý thiết kế của hệ thống Nie8

Để quản lý dễ dàng nhất cho bạn, hệ thống chúng ta đang xây dựng sẽ tuân thủ nguyên tắc:
> **"Dữ liệu tĩnh (Tên, Giá) thì linh hoạt - Dữ liệu động (Tồn kho) thì nghiêm ngặt"**

Sự rạch ròi này có thể khiến bạn tốn thêm 1-2 giây để bấm nút "Nhập kho" thay vì sửa trực tiếp, nhưng nó sẽ tiết kiệm cho bạn **hàng chục tiếng đồng hồ** đi tìm nguyên nhân tại sao kho lệch vào cuối tháng.

**Bạn có bổ sung thêm rủi ro nào mà bạn thường gặp trong thực tế kinh doanh của mình không?** Nếu đây đã là bộ khung quản lý bạn mong muốn, mình sẽ bắt đầu thi công.
