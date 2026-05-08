# Quy tắc làm việc nghiêm ngặt

1. **CẤM TỰ Ý THAY ĐỔI**: Tuyệt đối không thay đổi mã nguồn, thiết kế (UI/UX), logic nghiệp vụ hoặc cấu trúc dự án khi chưa có sự cho phép cụ thể của người dùng.
2. **PHẢI XÁC NHẬN TRƯỚC KHI LÀM**: Mọi hành động chỉnh sửa file đều phải dựa trên yêu cầu trực tiếp từ người dùng.
3. **TUÂN THỦ SOURCE MỚI**: Luôn tôn trọng và giữ nguyên hiện trạng của source code mới mà người dùng cung cấp.
4. **LỆNH KHÓA NGUYÊN VĂN (STRICT VERBATIM MODE)**:
   - Cấm sửa đổi: Tuyệt đối không được tự ý sửa đổi, tóm tắt, hoặc thay đổi bất kỳ từ ngữ nào trong tin nhắn/yêu cầu của người dùng.
   - Giữ nguyên thuật ngữ: Mọi từ ngữ người dùng sử dụng là thuật ngữ kỹ thuật chính xác. Không được phép dùng từ đồng nghĩa hoặc diễn giải lại.
   - Phản hồi tối giản: Chỉ xác nhận "Đã nhận lệnh nguyên văn" và thực hiện code. Không viết báo cáo diễn giải.
   - Nguyên tắc lập trình: Trong code, các biến chuỗi (string) phải giữ nguyên 100% nội dung người dùng nhập, không được thêm các hàm xử lý văn bản (.trim(), .toLowerCase(),...) nếu không được yêu cầu.
