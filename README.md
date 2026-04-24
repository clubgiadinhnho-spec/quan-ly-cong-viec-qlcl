# Bảng Theo Dõi Công Việc

Web theo dõi công việc dùng chung cho nhóm 5 người:

- Nhật Trường
- Mỹ Tân
- Phan Tú
- Nhựt Hùng
- Khác

## Chức năng hiện có

- Giao diện dạng bảng theo sát mẫu quản lý công việc.
- Thêm công việc mới ngay trên web.
- Tick vào ô `Xong` để đánh dấu hoàn thành.
- Khi tick xong, công việc tự chuyển sang tab `Việc đã hoàn thành`.
- Lọc theo người thực hiện.
- Tìm nhanh theo mã việc, nội dung, mục tiêu, ghi chú tuần.
- Cập nhật trực tiếp các cột `Diễn tiến tuần trước`, `Trong tuần`, `Cuối tuần` ngay trên từng dòng rồi bấm `Lưu`.
- Có chế độ `demo cục bộ` để chạy ngay.
- Có sẵn cấu trúc để chuyển sang `Supabase miễn phí` nhằm dùng chung qua Internet.

## Các file chính

- `index.html`: giao diện chính
- `styles.css`: giao diện và responsive
- `app.js`: logic thêm việc, lưu việc, tick hoàn thành, cập nhật theo tuần
- `config.js`: file cấu hình local, mặc định đang để chế độ demo
- `config.example.js`: mẫu cấu hình để kết nối Supabase
- `supabase.sql`: script tạo bảng và phân quyền
- `netlify.toml`: cấu hình deploy cho Netlify
- `vercel.json`: cấu hình deploy cho Vercel

## Chạy thử trên máy

Mở trực tiếp file `index.html` bằng trình duyệt để xem bản demo.

Nếu muốn chạy bằng server tĩnh:

```powershell
cd C:\Users\admin\Documents\task-tracker-web
node --watch-path=. --eval "require('http').createServer((req,res)=>require('fs').createReadStream('.'+(req.url==='/'?'/index.html':req.url)).pipe(res)).listen(8080)"
```

Sau đó mở `http://localhost:8080`.

## Dùng chung trên mạng miễn phí

Để 5 người cùng thao tác trên một web, cần:

1. Hosting web tĩnh miễn phí
2. Cơ sở dữ liệu online miễn phí

Phương án nên dùng:

- Hosting: Netlify hoặc Vercel
- Database: Supabase Free

## Cấu hình Supabase

### 1. Tạo project miễn phí

Tạo tại [https://supabase.com](https://supabase.com)

### 2. Chạy file SQL

Mở `SQL Editor` và chạy toàn bộ nội dung file `supabase.sql`.

File này sẽ:

- tạo bảng `tasks`
- tạo các cột theo tuần
- bật Row Level Security
- cho phép nhóm nội bộ đọc/ghi nhanh bằng `anon key`

### 3. Lấy thông tin kết nối

Trong Supabase:

1. Vào `Project Settings`
2. Chọn `API`
3. Copy:
   - `Project URL`
   - `anon public key`

### 4. Gắn cấu hình vào web

Mở file `config.js` và thay nội dung bằng:

```js
window.TASK_TRACKER_SUPABASE = {
  url: "https://YOUR-PROJECT.supabase.co",
  anonKey: "YOUR-ANON-KEY",
};
```

Khi đó web sẽ tự chuyển sang chế độ dữ liệu dùng chung.

## Đưa web lên Netlify miễn phí

### Cách nhanh nhất

1. Tạo tài khoản tại [https://netlify.com](https://netlify.com)
2. Chọn `Add new site`
3. Chọn `Deploy manually`
4. Kéo cả thư mục `task-tracker-web` lên
5. Netlify sẽ cấp subdomain miễn phí dạng:
   `https://ten-ban-chon.netlify.app`

Tên gợi ý:

- `bang-theo-doi-cong-viec.netlify.app`
- `qlcv-team.netlify.app`
- `pqlcl-task-board.netlify.app`

## Đưa web lên Vercel miễn phí

1. Tạo tài khoản tại [https://vercel.com](https://vercel.com)
2. Chọn tạo project mới
3. Upload source hoặc import project
4. Vercel sẽ cấp subdomain miễn phí dạng:
   `https://ten-ban-chon.vercel.app`

## Lưu ý thực tế

- `netlify.app` hoặc `vercel.app` là subdomain miễn phí, không phải domain riêng `.com`.
- Với nhu cầu 5 người dùng nội bộ, Supabase Free là đủ để bắt đầu.
- Nếu sau này cần bảo mật tốt hơn, nên thêm đăng nhập riêng cho từng người.

## Bước triển khai nhanh nhất

1. Tạo project Supabase
2. Chạy `supabase.sql`
3. Điền `config.js`
4. Upload thư mục này lên Netlify
5. Chia link `*.netlify.app` cho cả nhóm
