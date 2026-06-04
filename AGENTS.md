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
   - **Mã hóa công việc**: Đã di chuyển vào `NewProposalsPage`, không đưa ngược lại Sidebar.
   - **Sidebar Layout**: Giữ nguyên cụm Bottom (Color + Profile) và cơ chế hiển thị Icon khi thu nhỏ.
   - **Logo Q**: Giữ nguyên tỉ lệ và hiệu ứng trong cả hai chế độ.
   - **Định dạng ngày tháng (Date Format Guide)**: Tuyệt đối rà soát và hiển thị tất cả các mốc ngày tháng trong phân khu văn phòng dưới định dạng `dd/mm/yy` chuẩn Việt Nam thay vì định dạng máy tính `yyyy-mm-dd` thô kệch.

8. **KẾT THÚC PHIÊN LÀM VIỆC**: Khi người dùng yêu cầu "đóng gói" hoặc "nghỉ ngơi", hãy tổng hợp lại các thay đổi quan trọng và đảm bảo các file cấu hình luôn ổn định.

9. **CƠ CHẾ TUẦN TRA ĐẶC BIỆT (SUPERVISOR PATROL SCROLL LOGIC)**:
   Để đảm bảo tính năng "Tuần tra Giám sát (Supervisor Patrol)" luôn hoạt động mượt mà, cuộn chính xác dòng/thẻ công việc đang tuần tra lên giữa màn hình trên mọi thiết bị mà không bị giật, lag hay xung đột render, toàn bộ hệ thống phải sử dụng và duy trì thuật toán sau trong `src/hooks/useSupervisorPatrol.ts`:

   ```ts
   // Client AUTO-SCROLL/JUMP & HIGHLIGHT trace logic for worker devices
   useEffect(() => {
     if (!supState.isActive || !supState.currentTaskId || activeTab !== 'tasks') return;

     // 1. Phép thử nhiều bước (Multi-step attempts) để giải quyết bất đồng bộ của React Render / Firestore Sync
     const scrollAttempts = [100, 300, 600, 1000, 1500, 2000];
     const timers = scrollAttempts.map(delay => {
       return setTimeout(() => {
         const idToMatch = supState.currentTaskId;
         if (!idToMatch) return;

         const baseIdToMatch = idToMatch.split('_cycle_')[0];

         // 2. Định nghĩa các Candidate IDs linh hoạt cho cả PC (Bảng biểu/Dòng) và Mobile (Thẻ/Card)
         const candidates = [
           `task-card-${idToMatch}`,
           `task-${idToMatch}`,
           `task-row-${idToMatch}`,
           `task-card-${baseIdToMatch}`,
           `task-${baseIdToMatch}`,
           `task-row-${baseIdToMatch}`
         ];

         let element: HTMLElement | null = null;
         for (const id of candidates) {
           const el = document.getElementById(id);
           // Chỉ chọn phần tử thực sự hiển thị (không lấy các DOM ẩn của Responsive layout)
           if (el && (el.offsetWidth > 0 || el.offsetHeight > 0)) {
             element = el;
             break;
           }
         }

         if (!element) {
           // Dự phòng bằng Truy vấn thuộc tính (Property query selectors)
           const queries = [
             `[id^="task-card-${idToMatch}"]`,
             `[id^="task-${idToMatch}"]`,
             `[id^="task-row-${idToMatch}"]`,
             `[id^="task-card-${baseIdToMatch}"]`,
             `[id^="task-${baseIdToMatch}"]`,
             `[id^="task-row-${baseIdToMatch}"]`,
             `[id*="${baseIdToMatch}"]`
           ];
           for (const q of queries) {
             const el = document.querySelector(q) as HTMLElement;
             if (el && (el.offsetWidth > 0 || el.offsetHeight > 0)) {
               element = el;
               break;
             }
           }
         }

         if (element) {
           const rect = element.getBoundingClientRect();
           const elementCenter = rect.top + rect.height / 2;
           const viewportCenter = window.innerHeight / 2;

           // 3. Cơ chế Khóa chống giật (Anti-stutter lock): Con trỏ Thẻ/Dòng đang nằm đúng vùng trung tâm viewport
           // sẽ KHÔNG bị kích hoạt cuộn lại nữa, loại bỏ xung đột giật cục khi người dùng đang xem.
           if (lastScrolledTaskIdRef.current === idToMatch) {
             if (Math.abs(elementCenter - viewportCenter) < 120) {
               return;
             }
           }

           // Ghi nhận ID đã cuộn thành công
           lastScrolledTaskIdRef.current = idToMatch;

           try {
             // 4. Gọi phương thức cuộn bản địa chuẩn, đưa phần tử vào CĂN GIỮA (center) viewport
             element.scrollIntoView({ behavior: 'smooth', block: 'center' });
           } catch (scrollErr) {
             console.error("Scroll failed: ", scrollErr);
           }
         }
       }, delay);
     });

     return () => {
       timers.forEach(t => clearTimeout(t));
     };
   }, [supState.currentTaskId, supState.isActive, activeTab]);
   ```

   **Các điểm cốt lõi các AI khác cần tuân thủ:**
   * **Multi-attempts schedule**: Phải hẹn giờ lặp lại từ 100ms tới 2000ms để chờ dữ liệu nạp và render xong.

10. **KIỂM SOÁT HẠN NGẠCH ROBOT S.U.P (QUOTA CONTROL MECHANISM)**:
    Để tối ưu hóa chi phí và kiểm soát hoạt động AI, hệ thống kiểm soát hạn ngạch (Quota control panel) tích hợp trực tiếp với Firestore tại đường dẫn `settings/supervisor_state` với hai trường dữ liệu chính:
    - `dailyQuotaUsed`: Số lượng request Gemini đã gọi thành công trong ngày.
    - `dailyQuotaMax`: Giới hạn tối đa số request Gemini được phép trong ngày (mặc định: 30 lượt).

    **Cơ chế hoạt động:**
    - **Lọc trước khi chạy (Toggle Guard)**: Khi nhấp kích hoạt S.U.P trong `togglePatrol`, nếu `dailyQuotaUsed >= dailyQuotaMax`, hệ thống sẽ chặn không cho bật tuần tra và hiện thông báo yêu cầu khôi phục Quota.
    - **Kiểm soát bám sát sườn (Execution Guard)**: Trong chuỗi tuần tra, trước mỗi lần gọi `callGemini(systemPromptAndQuery)`, hệ thống sẽ truy xuất Firestore thời gian thực để check quota. Nếu quota chạm giới hạn, hệ thống tự động sinh trạng thái Robot Job sạc pin, ngăn chặn gọi API trả phí ngoài mong muốn.
    - **Ghi nhận sử dụng**: Khi API Gemini phản hồi thành công cấu trúc JSON chuẩn, hệ thống tự động tăng `dailyQuotaUsed` lên 1 lượt.
    - **Nút tương tác nhanh (Admin Control)**: Admins được cung cấp hai công cụ ngay sát nút S.U.P:
      * **RESET**: Nhấp để khôi phục số lượt sử dụng trong ngày về 0 (`dailyQuotaUsed = 0`).
      * **+10**: Tăng dung lượng pin hạn ngạch tối đa trong ngày thêm 10 lượt (`dailyQuotaMax += 10`).
   * **Visibility checking**: `el.offsetWidth > 0 || el.offsetHeight > 0` ngăn chọn nhầm các block ẩn ở chế độ Mobile/PC khác kích thước màn hình.
   * **Anti-stutter guard**: Phải dùng `ref` (`lastScrolledTaskIdRef`) so sánh khoảng cách tới tâm viewport (`Math.abs(elementCenter - viewportCenter) < 120`), không được gọi liên tiếp `.scrollIntoView()` vô tội vạ làm hủy hiệu ứng chuyển động mượt mà của trình duyệt.
