
## 1. Giới thiệu dự án
Đây là mã nguồn phục vụ cho Đồ án tốt nghiệp. Mục tiêu của dự án là xây dựng một hệ thống thương mại điện tử hoạt động theo mô hình Client-Server, phân tách rõ ràng giữa môi trường mua sắm của khách hàng và môi trường quản trị nội bộ. 

Hệ thống được tích hợp các công nghệ hiện đại như thanh toán trực tuyến (VNPAY), lưu trữ ảnh đám mây (Cloudinary) và bóc tách dữ liệu hóa đơn/tư vấn kinh doanh bằng Trí tuệ nhân tạo (Gemini AI).

**Các thành phần chính:**
- **Backend (Server):** Node.js (Express) — Cung cấp RESTful API.
- **Cơ sở dữ liệu:** MySQL.
- **Frontend (Web Client):** Giao diện khách hàng viết bằng Vanilla JavaScript, HTML, CSS, Bootstrap.

## 2. Yêu cầu môi trường
Để khởi chạy hệ thống, máy tính cần cài đặt:
- **Node.js** (Khuyến nghị v14+ hoặc v16+). Kiểm tra bằng lệnh: `node -v`
- **MySQL Server** (Khuyến nghị dùng XAMPP, MySQL Workbench hoặc DBeaver).

## 3. Hướng dẫn thiết lập Cơ sở dữ liệu (MySQL)
1. Mở hệ quản trị cơ sở dữ liệu MySQL (ví dụ: phpMyAdmin).
2. Tạo một Database mới có tên chính xác là: `dientu_store` (Character set: `utf8mb4_unicode_ci`).
3. Import file `dientu_store.sql` (được đính kèm trong thư mục `database/`) vào cơ sở dữ liệu vừa tạo.

## 4. Hướng dẫn cấu hình và khởi chạy Backend & Web Client
1. Mở Terminal / Command Prompt và di chuyển vào thư mục chứa mã nguồn Web (Backend).
2. Cài đặt các thư viện cần thiết:
   ```bash
   npm install
Cấu hình biến môi trường:

Copy file .env.example và đổi tên thành .env.

Kiểm tra thông số kết nối Database (mặc định API chạy ở cổng 3000):

Đoạn mã
PORT=3000
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASS=
DB_NAME=dientu_store
Khởi chạy Server:

Bash
node app.js hoặc npm run dev
(Hoặc sử dụng lệnh npm start / npm run dev tùy theo cấu hình trong package.json)

Mở trình duyệt và truy cập Web mua sắm tại: http://localhost:3000
