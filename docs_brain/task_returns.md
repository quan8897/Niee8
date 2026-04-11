# Task: Thực hiện luồng Trả hàng Minh bạch (Refund & Restock)

Rút gọn hệ thống để đảm bảo quy trình "Hoàn hàng cũ - Mua mới độc lập".

- `[x]` Cập nhật loại dữ liệu (`src/types.ts`): Tập trung vào `returning`, `returned`, `discarded`.
- `[ ]` Tối giản Giao diện Admin (`AdminDashboard.tsx`):
    - `[ ]` Loại bỏ lựa chọn "Đổi hàng" (Exchange) trong Modal.
    - `[ ]` Cập nhật Modal chỉ còn 2 lựa chọn: **Hoàn kho & Hoàn tiền** vs **Hàng lỗi (Không cộng kho)**.
    - `[ ]` Xóa hàm `handleExchangeOrder` và các logic tạo đơn tự động.
- `[ ]` Kiểm tra luồng: Đảm bảo khi bấm "Hoàn kho", hàng được cộng lại và đơn hàng kết thúc minh bạch.
- `[ ]` Hoàn thiện (`walkthrough.md`).
