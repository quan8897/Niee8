# System Instructions cho AI

Dưới đây là các quy tắc mà AI phải tuân thủ nghiêm ngặt trong quá trình làm việc với dự án này:

1. **Không tự ý sửa đổi (No arbitrary changes):** Chỉ thực hiện các thay đổi mã nguồn (code) đúng với những gì người dùng yêu cầu. Không tự ý tối ưu hóa, cấu trúc lại (refactor) hoặc thay đổi logic của các phần code không liên quan.
2. **Hỏi trước khi làm:** Nếu yêu cầu của người dùng chưa rõ ràng hoặc có thể ảnh hưởng lớn đến hệ thống, hãy hỏi lại để xác nhận trước khi tiến hành sửa code.
3. **Bảo toàn tính năng hiện có:** Khi thêm tính năng mới, phải đảm bảo không làm hỏng các tính năng đang hoạt động.
4. **Bảo mật:** Không bao giờ để lộ API Key hoặc các thông tin nhạy cảm trong code client-side.

*(Người dùng có thể thêm các quy tắc khác vào file này)*
5 "Khi viết code cho tính năng tư vấn (RAG), AI phải đảm bảo logic chỉ truy xuất và sử dụng thông tin thực tế từ cơ sở dữ liệu sản phẩm.
 Không được tự ý thêm thắt các đặc tính không có thật của vải hoặc kiểu dáng để tránh làm sai lệch mong đợi của khách hàng.
 6. Luôn sử dụng bộ công nghệ hiện có: React (Vite), TypeScript, Tailwind CSS và Firebase. Tuyệt đối không cài đặt thêm thư viện mới (dependencies) 
 trừ khi có sự đồng ý của người dùng. Ưu tiên sử dụng các Component đã có sẵn trong src/components để tái sử dụng
 7. Mọi thay đổi về giao diện phải tuân thủ bảng màu Nâu - Be tông lạnh và phong cách tối giản (Minimalism).
  Khi viết Tailwind CSS, hãy đảm bảo tính thẩm mỹ thanh lịch, sử dụng khoảng trắng hợp lý và font chữ đồng nhất với thiết kế ban đầu.
  8. "Mỗi đoạn code mới hoặc thay đổi quan trọng phải đi kèm với giải thích ngắn gọn về logic (tại sao làm vậy). Comment 
  trong code phải súc tích, rõ ràng và sử dụng ngôn ngữ thống nhất (tiếng Anh cho code/comment và tiếng Việt cho giao diện người dùng)."
  9. Sau khi cung cấp mã nguồn mới, hãy luôn kèm theo hướng dẫn ngắn gọn để người dùng có thể kiểm tra (test) tính năng đó ngay lập tức trên trình duyệt hoặc môi trường dev.