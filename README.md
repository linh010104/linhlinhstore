# 📱 LinhLinhStore - Hệ thống Quản lý Cửa hàng Điện tử


## 📖 Giới thiệu
Đây là **Đồ án Tốt nghiệp** xây dựng hệ thống quản lý bán hàng thiết bị điện tử. Hệ thống bao gồm Website cho khách hàng mua sắm và Ứng dụng quản lý cho admin.

Dự án áp dụng mô hình Client-Server với đầy đủ các chức năng .

## 🚀 Tính năng chính
* **Khách hàng (Web Client):**
    * Xem danh sách sản phẩm, chi tiết sản phẩm.
    * Đăng ký, đăng nhập thành viên.
    * Thêm vào giỏ hàng, đặt hàng online.
    * Xem lịch sử đơn hàng.
* **Quản trị viên (Java App):**
    * Quản lý sản phẩm. 
    * Quản lý danh mục. 
    * Quản lý tài khoản.  
    * Quản lý nhập/xuất kho.
    * Quản lý đơn hàng, duyệt đơn.
    * Thống kê doanh thu theo tháng/quý.

## 🛠 Công nghệ sử dụng
Dự án sử dụng các công nghệ hiện đại:
* **Frontend:** HTML5, CSS3, JavaScript (Giao diện người dùng).
* **Backend:** Node.js, ExpressJS (Xây dựng API).
* **App Quản lý:** Java Swing (Ứng dụng Desktop).
* **Database:** MySQL (Cơ sở dữ liệu).

## ⚙️ Hướng dẫn cài đặt & Chạy thử

### 1. Yêu cầu hệ thống
* Node.js (v14 trở lên).
* Java JDK (v11 trở lên).
* MySQL Server (XAMPP/WAMP).

### 2. Cài đặt Database
* Mở phpMyAdmin, tạo database tên `dientu_store`.
* Import file `dientu_store.sql` 

### 3. Chạy Server (Backend)
```bash
cd dientu-store-api
npm install
npm run dev
