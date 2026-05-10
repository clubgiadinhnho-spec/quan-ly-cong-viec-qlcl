# Quy tắc làm việc nghiêm ngặt

1. **CẤM TỰ Ý THAY ĐỔI**: Tuyệt đối không thay đổi mã nguồn, thiết kế (UI/UX), logic nghiệp vụ hoặc cấu trúc dự án khi chưa có sự cho phép cụ thể của người dùng.
2. **PHẢI XÁC NHẬN TRƯỚC KHI LÀM**: Mọi hành động chỉnh sửa file đều phải dựa trên yêu cầu trực tiếp từ người dùng.
3. **TUÂN THỦ SOURCE MỚI**: Luôn tôn trọng và giữ nguyên hiện trạng của source code mới mà người dùng cung cấp.
4. **LỆNH KHÓA NGUYÊN VĂN (STRICT VERBATIM MODE)**:
   - Cấm sửa đổi: Tuyệt đối không được tự ý sửa đổi, tóm tắt, hoặc thay đổi bất kỳ từ ngữ nào trong tin nhắn/yêu cầu của người dùng.
   - Giữ nguyên thuật ngữ: Mọi từ ngữ người dùng sử dụng là thuật ngữ kỹ thuật chính xác. Không được phép dùng từ đồng nghĩa hoặc diễn giải lại
   - Phản hồi tối giản: Chỉ xác nhận "Đã nhận lệnh nguyên văn" và thực hiện code. Không viết báo cáo diễn giải.
   - Nguyên tắc lập trình: Trong code, các biến chuỗi (string) phải giữ nguyên 100% nội dung người dùng nhập, không được thêm các hàm xử lý văn bản (.trim(), .toLowerCase(),...) nếu không được yêu cầu.

5. **THIẾT QUÂN LUẬT ĐỒNG NHẤT (METRIC INTEGRITY)**:
   - **Đồng bộ hóa tuyệt đối**: Con số trên Sidebar, Dashboard Summary và số dòng thực tế trên Table phải khớp nhau 100%.
   - **Logic lọc chuẩn**:
     - `BẢNG CÔNG VIỆC`: `status === 'APPROVED' && !waitingApproval && !deletedAt`.
     - `TRÌNH DUYỆT`: `waitingApproval === true && !deletedAt`.
     - `ĐỀ XUẤT MỚI`: `status === 'PENDING' && !deletedAt`.
   - **Admin Creation**: Khi Admin tạo Task, phải ép `status: 'APPROVED'` và `waitingApproval: false` để việc xuất hiện ngay tại Bảng công việc.
   - **Master Data Only**: Chỉ đếm các Task gốc (Master), không đếm trùng các bản ghi lịch sử trong `cycleHistory`.

6. **THIẾT QUÂN LUẬT LUÂN HỒI (RECURRENCE LOGIC)**:
   - Khi Task có `recurrence` được duyệt `COMPLETED`, phải dùng `writeBatch` để kết thúc kỳ cũ và sinh kỳ mới với Mã (Code) mới và Hạn (Deadline) mới theo chu kỳ.
   - Tuyệt đối không để mất luồng sinh việc tự động cho các công việc hàng ngày/tuần.

7. **BẢO VỆ THIẾT KẾ ĐÃ TỐI ƯU (UI/UX PROTECT)**:
   - **Sidebar Badge**: Số lượng phải bọc trong `<span translate="no" className="notranslate">`. Badge Sidebar thu nhỏ nằm góc trên bên phải Icon, `z-index` cao, font-black.
   - **Mã hóa công việc**: Đã di chuyển vào `NewProposalsPage`, không đưa ngược lại Sidebar.
   - **Sidebar Layout**: Giữ nguyên cụm Bottom (Color + Profile) và cơ chế hiển thị Icon khi thu nhỏ.
   - **Logo Q**: Giữ nguyên tỉ lệ và hiệu ứng trong cả hai chế độ.

8. **KẾT THÚC PHIÊN LÀM VIỆC**: Khi người dùng yêu cầu "đóng gói" hoặc "nghỉ ngơi", hãy tổng hợp lại các thay đổi quan trọng và đảm bảo các file cấu hình luôn ổn định.
