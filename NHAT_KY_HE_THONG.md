# 📓 NHẬT KÝ HỆ THỐNG - QC MANAGEMENT SYSTEM (TÂN PHÚ VIỆT NAM)

Tài liệu này là sự hợp nhất giữa Nhật ký Trò chuyện và Nhật ký Thay đổi của hệ thống, ghi lại toàn bộ lộ trình phát triển, các yêu cầu kỹ thuật và lịch sử tương tác.

---

## 🏗️ 1. YÊU CẦU & VẤN ĐỀ KỸ THUẬT ĐÃ GIẢI QUYẾT

### 🎯 Yêu cầu chính
- Xây dựng hệ thống quản lý công việc và báo cáo hiệu suất (Dashboard).
- Tính năng Group Chat (Nhóm) và Direct Messages (Cá nhân).
- Tính năng Báo cáo tháng: Lưu nháp và Trích xuất PDF chính thức.
- Đồng bộ dữ liệu nhân sự (Staff) từ hằng số vào Firebase.

### 🛠️ Các giải pháp kỹ thuật tiêu biểu
- **Lỗi hiển thị PDF (oklch)**: html2canvas không hỗ trợ hệ màu oklch của Tailwind v4. Đã ép kiểu toàn bộ template in về màu HEX theo yêu cầu.
- **Lỗi CORS Logo**: Logo được chuyển sang định dạng CSS (Div có nền màu và chữ "TP") để đảm bảo luôn xuất được PDF mà không bị chặn bởi trình duyệt.
- **Lỗi Quyền Firebase**: Cập nhật rules để cho phép Admin/Manager lưu báo cáo chính thức.
- **Căn chỉnh PDF**: Sử dụng cấu trúc `<table>` HTML truyền thống cho template in để đảm bảo các cột dữ liệu (STT, Mã CV, Phụ trách, Giải trình) luôn thẳng hàng và có border rõ nét.

### 📜 Hướng dẫn sử dụng tính năng PDF
- Nút "Trích xuất PDF" sẽ thực hiện 2 việc:
  1. Lưu một Snapshot báo cáo vào lịch sử hệ thống (Firestore).
  2. Tự động tải xuống file PDF định dạng A4 với bố cục chuyên nghiệp.
- Nếu hệ thống báo "Lỗi quyền Firebase" khi lưu lịch sử, file PDF vẫn sẽ được tạo ra để đảm bảo công việc không bị gián đoạn.

---

## 📝 2. NHẬT KÝ THAY ĐỔI CHI TIẾT (CHANGELOG)

### 📝 Cập nhật mới nhất: 29/04/2026

#### 🔹 Nâng cấp Hệ thống Báo cáo (Report Management)
- **Tích hợp Biểu đồ (Recharts):** Thêm biểu đồ tròn (Pie Chart) tình trạng công việc và biểu đồ cột (Bar Chart) hiệu suất nhân sự giúp trực quan hóa dữ liệu KPIs.
- **Trí tuệ nhân tạo (Gemini AI):** Tích hợp AI để tự động phân tích dữ liệu công việc trong tháng, đưa ra nhận định khách quan và đề xuất cải tiến.
- **Hệ thống Phê duyệt:** Thêm trạng thái `PENDING`, `APPROVED`, `REJECTED` cho báo cáo chính thức. Cho phép Trưởng phòng/Admin để lại nhận xét (Manager Comment) và duyệt báo cáo trực tiếp trên giao diện.
- **Lọc dữ liệu thông minh:** Tự động lọc Task theo tháng/năm đã chọn và luôn ưu tiên hiển thị các vấn đề nổi cộm (Highlighted).

#### 🔹 Cải thiện Giao diện & Trải nghiệm người dùng (UI/UX)
- **Header Header:** Thiết kế lại thanh tiêu đề trang báo cáo với hiệu ứng kính (Glassmorphism), sticky (cố định khi cuộn) và khả năng tương tác tốt hơn.
- **Fix lỗi hiển thị:** Xử lý triệt để vấn đề tiêu đề bị che khuất trên các thiết bị.
- **Xuất PDF chuyên nghiệp:** Tối ưu hóa mẫu in (Print Template) với bố cục chuẩn văn bản hành chính Việt Nam (Tiêu ngữ, Chữ ký, Đóng dấu).

#### 🔹 Chỉnh sửa logic Hoạt động & Thông báo
- **Hoạt động dựa trên sự kiện (Activity-based Chat):** Hệ thống hiển thị thông báo góc dưới màn hình khi có tin nhắn mới hoặc thảo luận công việc thay vì tự động mở khung Chat gây phiền toái.
- **Tối ưu hóa Trang chủ:** Thiết lập Bảng công việc (Task Board) làm trọng tâm.

#### 🔹 Tùy biến Nhắc nhở sức khỏe (Health Reminders)
- **Quản lý linh hoạt:** Thêm trình quản lý nhắc nhở trực tiếp trong Hồ sơ cá nhân. Cho phép người dùng tự cấu hình: Bật/tắt, tần suất (phút), nội dung lời nhắn, thời gian tự đóng và tên cấu hình hiển thị.

#### 🔹 Quản lý nhân sự & Báo cáo (HR Management)
- **Hồ sơ năng lực (CV Highlights):** Bổ sung trường thông tin CV và kinh nghiệm làm việc cho từng nhân sự. Dữ liệu này giúp Gemini có cơ sở tư vấn chuyên môn sâu hơn khi giao việc hoặc xử lý sự cố.
- **Xuất báo cáo nhân sự:** Tích hợp tính năng xuất danh sách nhân sự ra định dạng CSV (Excel tương thích), bao gồm đầy đủ thông tin liên hệ, chức vụ và tóm tắt năng lực để phục vụ quản lý ngoại tuyến.
- **Hệ thống Avatar thông minh (Smart Avatar):** Chuyển đổi toàn bộ hệ thống sang sử dụng Component Avatar đồng nhất. Tự động khắc phục lỗi ảnh không tải được (broken image) bằng cơ chế fallback sang ảnh Procedural dựa trên tên người dùng. Fix lỗi hiển thị avatar cụ thể cho nhân sự Nguyễn Kiều Phan Tú.

#### 🔹 Quy trình phê duyệt & Bảo mật (Approval Workflow)
- **Cơ chế gửi yêu cầu (Staff):** Trưởng nhóm và nhân sự khi muốn chốt hoàn thành hoặc xóa công việc sẽ gửi yêu cầu thay vì thực hiện trực tiếp. Cột Thao tác hiện "Gửi Hoàn Thành" và "Yêu cầu Xóa".
- **Hệ thống phê duyệt (Manager):** Trưởng phòng nhận thông báo tức thì khi có yêu cầu mới. Trên bảng công việc sẽ xuất hiện các nút "Duyệt HT", "Duyệt Xóa" hoặc "Từ chối" để kiểm soát chất lượng và dữ liệu.
- **Minh bạch trạng thái:** Hiển thị nhãn "Chờ duyệt HT" hoặc "Chờ duyệt xóa" trên tác vụ để nhân viên theo dõi tiến độ phê duyệt.

#### 🔹 Giao tiếp thời gian thực (Real-time Communication)
- **Tự động mở khung Chat:** Cập nhật logic đồng bộ hóa tin nhắn. Khi có nhân sự nhắn tin trực tiếp (Direct Message) hoặc thảo luận trong công việc (Task Comment), khung chat sẽ tự động trượt ra để người dùng phản hồi ngay lập tức.
- **Tự động dọn dẹp Thông báo:** Khi người dùng mở một khung chat (Trực tiếp, Nhóm, hoặc Công việc), các thông báo tương ứng ở góc màn hình sẽ tự động biến mất, không cần xóa thủ công.
- **Khung chat phong cách Truyện tranh (Comic Style Chat):** Tái thiết kế khung chat trao đổi công việc theo phong cách bong bóng hội thoại, hiển thị ngay tại vị trí công việc. Cho phép người dùng kéo thả tự do 360 độ với phần "đuôi" (mũi tên chỉ điểm) luôn tự động hướng về điểm neo của công việc, giúp duy trì ngữ cảnh trao đổi mà không gây choán màn hình.

#### 🔹 Tùy biến Hình ảnh & Avatar
- **Cập nhật Avatar từ máy tính:** Thay thế cơ chế nhập link URL bằng chức năng tải ảnh trực tiếp. Tích hợp công cụ cắt ảnh (Crop) để đảm bảo avatar luôn vừa vặn, đồng nhất và tiết kiệm dung lượng lưu trữ (Base64 optimized).
- **Đồng bộ hóa Avatar toàn hệ thống:** Đảm bảo khi người dùng thay đổi ảnh đại diện trong Hồ sơ, tất cả các vị trí hiển thị (Bảng công việc, Chat nhóm, Tin nhắn trực tiếp) đều được cập nhật tức thì.

#### 🔹 Khắc phục lỗi kỹ thuật (Hotfixes)
- **Đồng bộ hóa Bootstrap:** Tinh chỉnh logic khởi tạo trong `App.tsx` để tránh các vòng lặp cập nhật khi dữ liệu Firestore đã sẵn sàng.
- **Chuẩn hóa định dạng Ngày/Tháng/Năm:** Đồng nhất định dạng `DD/MM/YYYY` trên toàn bộ hệ thống (Bảng CV, Excel, PDF).
- **Sửa lỗi TypeError:** Khắc phục lỗi sập ứng dụng khi truy cập thuộc tính `undefined` trong lịch sử Task.
- **Bảo mật & Tối ưu truy vấn (Direct Messages):** Khắc phục triệt để lỗi "Permission denied" và yêu cầu Index bằng cách:
  - Chia nhỏ truy vấn thành 2 luồng riêng biệt (Tin nhắn đã gửi và Tin nhắn đã nhận) để phù hợp hoàn hảo với Security Rules.
  - Loại bỏ `orderBy` phía Firestore (vốn đòi hỏi Composite Index phức tạp) và thực hiện sắp xếp dữ liệu (Sort) trực tiếp bằng JavaScript trên Client, giúp hệ thống hoạt động ngay lập tức mà không cần cấu hình thêm trên Firebase Console.
- **Xử lý dữ liệu:** Đảm bảo các Task được gán đúng mốc thời gian (Month/Year) ngay cả khi không có `actualEndDate`.

---

## 💬 3. LỊCH SỬ TRAO ĐỔI (CHAT LOGS)

**Người dùng (User):** "Nhìn vào Console, tôi thấy lỗi 'Missing or insufficient permissions'. Hãy sửa firestore.rules và thêm lệnh console.log vào handleExportPDF..."
**AI:** Đã thực hiện cập nhật Rules và thêm log kiểm tra.

**Người dùng (User):** "Lỗi 'Attempting to parse an unsupported color function oklch' khi chạy trên Vercel. Hãy sửa lỗi màu và đơn giản hóa PDF..."
**AI:** Đã thêm hàm `cleanColors` để xóa bỏ màu oklch và cấu hình lại html2canvas.

**Người dùng (User):** "Vẫn bị lỗi oklch và lỗi quyền Firebase. Hãy thay đổi hệ màu sang HEX hoàn toàn, sửa Logo CORS và căn chỉnh PDF bằng Table..."
**AI:** Đã thiết kế lại toàn bộ Template in bằng `<table>`, ép kiểu màu HEX (`#ffffff`, `#1e40af`, v.v.), và thay Logo bằng CSS để tránh lỗi CORS.

**Người dùng (User):** "Nút PDF đã hoạt động! Hãy mở quyền tuyệt đối cho Admin trong firestore.rules và thêm hiệu ứng Loading khi nhấn nút..."
**AI:** Đã cập nhật rules mở rộng và thêm `setIsExportingPDF` với icon `Clock` xoay tròn.

**Người dùng (User):** "Xuất toàn bộ nội dung chat ra một file word giúp tôi nhé."
**AI:** Đã khởi tạo và cập nhật nhật ký hệ thống.

**Người dùng (User):** "Tôi thấy nó vẫn báo lỗi mà" (kèm ảnh chụp console Warning).
**AI:** Đã xác định nguyên nhân kép (Security Rules matching và Composite Index). Đã giải quyết bằng cách tách thành 2 listener đơn giản và thực hiện sort trên Client. Hệ thống hiện đã sạch lỗi console.

**Người dùng (User):** "Tôi muốn tùy chỉnh thời gian nhắc nhở uống nước..."
**AI:** Đã thiết kế lại toàn bộ nhắc nhở và thêm tính năng tùy biến trong Profile.

**Người dùng (User):** "Tôi đã cho 2 bạn này đăng ký lại nhưng app vẫn nhớ thông tin cũ và tự sửa hiển thị như hình. Tuy nhiên vẫn đăng nhập được."
**AI:** Xác định lỗi ghi đè dữ liệu mẫu do logic Bootstrap quá gắt. Đã sửa App.tsx để ưu tiên dữ liệu Firestore và cập nhật constants.ts với Avatar vui tươi hơn.

---
*Ngày cập nhật cuối cùng: 29/04/2026*
