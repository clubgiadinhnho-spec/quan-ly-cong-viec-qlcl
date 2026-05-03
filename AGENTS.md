# Nhật ký Hệ thống & Quy tắc Thiết kế

## 1. Phong cách Thẻ Nhân Sự (Standard 2026 - Dark Shield)
Đây là thiết kế thẻ nhân sự chính thức của Phòng QLCL - Tân Phú Việt Nam, được tối ưu hóa cho sự hiện đại, bảo mật và chuyên nghiệp.

### Cấu trúc & Kích thước (Frozen Design):
- **Kích thước cố định**: `max-w-[670px]` (Đã tối ưu 7/8 chiều ngang cũ).
- **Bo góc**: `rounded-[48px]` cho khung chính.
- **Bố cục ngang (3 cột)**:
  - Cột 1 (176px): Avatar bo tròn kép, Mã nhân viên (#ID) và QR Code bảo mật.
  - Cột 2 (Linh hoạt): Tên nhân viên (font Extrabold), Chức vụ (Admin/Leader/Staff) và Thông tin liên hệ (Phone, Email Cty, Email Cá nhân).
  - Cột 3 (80px): Các nút chức năng (Quyền, Giả lập, Sửa) và Nút Xóa (Đỏ).

### Màu sắc chủ đạo:
- **Nền chính**: Xanh Navy đậm `#132d6b`.
- **Nền phụ (Input/Button)**: Trắng `#ffffff` hoặc Slate trong suốt.
- **Accent**: Đỏ `#dc2626` (Nút xóa), Xanh dương `#2563eb` (Icon liên hệ).

### Chi tiết bảo mật:
- **Thanh mật khẩu**: Tọa lạc ở dưới cùng, bo góc `rounded-full`, nền trắng, có hiệu ứng "Bảo mật hệ thống" mờ.
- **QR Code**: Đặt trong khung bo góc `rounded-3xl` nền kính mờ.

### Typography:
- **Tên**: `font-black text-2xl` (Uppercase).
- **Mã NV**: `font-mono tracking-tighter`.
- **Liên hệ**: `font-medium text-slate-300`.

### Quy tắc "Đóng băng":
- Không sử dụng `flex-wrap` cho các thành phần chính để tránh nhảy dòng khi zoom.
- Giữ nguyên `max-w` và `min-w` để đảm bảo tỷ lệ hình ảnh không bị biến dạng.

## 2. Ngôn ngữ thiết kế Inochi (Minimalist Zen)
Áp dụng cho toàn bộ giao diện Dashboard và các thành phần UI mới của hệ thống Phòng QLCL Tân Phú Việt Nam.

### Triết lý:
- **"Bên bạn mỗi ngày"**: Giao diện phải thân thiện, dễ tiếp cận nhưng cực kỳ chính xác (đặc thù công việc QA).
- **Minimalism**: Loại bỏ tối đa các chi tiết thừa, tập trung vào dữ liệu công việc và biểu đồ KPIs.

### Màu sắc & Hiệu ứng:
- **Chủ đạo (Primary)**: Xanh dương (#2563eb) hoặc Teal (#14b8a6) - Gợi nhớ đến sự tin cậy và các dòng sản phẩm gia dụng xanh.
- **Nền (Background)**: Sử dụng Slate-50 hoặc Trắng thuần để tạo sự thông thoáng.
- **Bo góc (Radius)**: Các container phải bo góc lớn (`rounded-2xl` hoặc `rounded-[32px]`) tương tự đường nét bo tròn tinh tế của các sản phẩm nhựa cao cấp Inochi.
- **Shadow**: Sử dụng shadow mờ, nhẹ (`shadow-soft` hoặc `shadow-sm`) để tạo chiều sâu mà không gây nặng nề.

### Typography & Icon:
- **Font**: Ưu tiên Inter hoặc Space Grotesk cho các tiêu đề kỹ thuật.
- **Icon**: Sử dụng `lucide-react` với nét mảnh (`strokeWidth={1.5}`) để giữ vẻ thanh thoát.
- **Khoảng cách (Spacing)**: Ưu tiên padding lớn (`p-6` hoặc `p-8`) để dữ liệu "có không gian thở".
