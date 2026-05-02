# Nhật ký Hệ thống & Quy tắc Thiết kế

## 1. Phong cách Thẻ Nhân Sự (Nutifood Staff Card - Ultra-Wide Light)
Đây là thiết kế thẻ nhân sự thế hệ mới, ưu tiên không gian rộng rãi, tông màu sáng và giao diện hiện đại.

### Màu nền thẻ (Light Theme):
- **Admin**: Nền xanh nhạt `#eff6ff`, viền `border-slate-100`.
- **Leader**: Nền cam nhạt `#fff7ed`, viền `border-orange-50`.
- **Staff**: Nền xanh lá nhạt `#f0fdf4`, viền `border-emerald-50`.

### Quy tắc Layout & Spacing:
- **Container**: Luôn sử dụng `max-w-6xl mx-auto` để giới hạn chiều ngang trên màn hình lớn.
- **Padding**: Sử dụng `px-10 py-6` cho thẻ chính để tạo sự thông thoáng.
- **Bo góc**: Thẻ chính bo `rounded-[32px]`, các ô con bo `rounded-2xl`.
- **Thống kê (Stats)**: 
  - Layout: `grid-cols-4` (4 cột ngang).
  - Nội dung: Tiêu đề bên trái, con số căn phải (`text-right`) để tránh bị vướng bởi icon nền.
  - Icon nền: Độ mờ thấp (`opacity-10`), kích thước lớn, đặt ở góc phải dưới.

### Typography:
- **Tiêu đề**: In hoa, cực đậm (`font-black`), tracking hẹp (`tracking-tight`).
- **Nội dung**: Không in nghiêng. Số điện thoại/Mã dùng font Mono.
- **Email cá nhân**: Màu xanh than `#1e3a8a`.

### Cách gọi lại thiết kế:
Khi người dùng yêu cầu: *"Áp dụng phong cách Thẻ Nhân Sự Nutifood"* hoặc *"Lấy layout thẻ ngang đã lưu"*, hãy tuân thủ chính xác các mã màu và cấu trúc grid trên.
