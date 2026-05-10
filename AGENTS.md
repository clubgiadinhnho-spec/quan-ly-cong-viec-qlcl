# Quy tắc làm việc nghiêm ngặt

1. **CẤM TỰ Ý THAY ĐỔI**: Tuyệt đối không thay đổi mã nguồn, thiết kế (UI/UX), logic nghiệp vụ hoặc cấu trúc dự án khi chưa có sự cho phép cụ thể của người dùng.
2. **PHẢI XÁC NHẬN TRƯỚC KHI LÀM**: Mọi hành động chỉnh sửa file đều phải dựa trên yêu cầu trực tiếp từ người dùng.
3. **TUÂN THỦ SOURCE MỚI**: Luôn tôn trọng và giữ nguyên hiện trạng của source code mới mà người dùng cung cấp.
4. **LỆNH KHÓA NGUYÊN VĂN (STRICT VERBATIM MODE)**:
   - Cấm sửa đổi: Tuyệt đối không được tự ý sửa đổi, tóm tắt, hoặc thay đổi bất kỳ từ ngữ nào trong tin nhắn/yêu cầu của người dùng.
   - Giữ nguyên thuật ngữ: Mọi từ ngữ người dùng sử dụng là thuật ngữ kỹ thuật chính xác. Không được phép dùng từ đồng nghĩa hoặc diễn giải lại
   - Phản hồi tối giản: Chỉ xác nhận "Đã nhận lệnh nguyên văn" và thực hiện code. Không viết báo cáo diễn giải.
   - Nguyên tắc lập trình: Trong code, các biến chuỗi (string) phải giữ nguyên 100% nội dung người dùng nhập, không được thêm các hàm xử lý văn bản (.trim(), .toLowerCase(),...) nếu không được yêu cầu.

5. **BẢO VỆ THIẾT KẾ ĐÃ TỐI ƯU (UI/UX PROTECT)**:
   - **Sidebar Badge**: Số thông báo (Badges) trong Sidebar thu nhỏ phải luôn nằm ở góc trên bên phải của Icon, sử dụng `z-index` cao (z-30+) và số liệu font-black để đảm bảo hiển thị rõ nét trên Icon.
   - **Mã hóa công việc**: Chức năng này đã được di chuyển vào trang `NewProposalsPage`, tuyệt đối không đưa ngược lại vào Sidebar chính trừ khi có yêu cầu đặc biệt.
   - **Sidebar Layout**: Giữ nguyên cụm Bottom kết hợp (Color + Profile) và cơ chế hiển thị Icon "Quy trình tác nghiệp" khi thu nhỏ để tối ưu không gian.
   - **Logo Q**: Giữ nguyên tỉ lệ và hiệu ứng của Logo Q trong cả hai chế độ Sidebar.

6. **KẾT THÚC PHIÊN LÀM VIỆC**: Khi người dùng yêu cầu "đóng gói" hoặc "nghỉ ngơi", hãy tổng hợp lại các thay đổi quan trọng và đảm bảo các file cấu hình như metadata.json, package.json luôn ở trạng thái ổn định nhất.
