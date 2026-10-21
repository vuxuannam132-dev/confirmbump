# ĐOÀN TRƯỜNG - HỆ THỐNG XÁC NHẬN (CONFIRM) BUMP BÀI MẠNG XÃ HỘI

Hệ thống chuyên biệt dành cho tổ chức Đoàn trường (40 - 100 thành viên) quản lý và theo dõi việc tương tác (like, share, comment, bump bài) trên **Facebook, Instagram, TikTok** thuộc 4 phân ban:
1. 📢 **Ban Truyền thông**
2. 🎨 **Ban Thiết kế**
3. 👥 **Ban Nhân sự**
4. 📦 **Ban Hậu cần**

---

## 1. Triển Khai Lên Vercel & Cloud Database Miễn Phí

Hệ thống đã được cấu hình sẵn sàng cho **Vercel** và **Neon / Supabase PostgreSQL**. 
👉 Xem hướng dẫn chi tiết từng bước tại file: **[HUONG_DAN_DEPLOY_VERCEL.md](./HUONG_DAN_DEPLOY_VERCEL.md)**

* **Database Cloud**: Sử dụng **Neon.tech** (PostgreSQL miễn phí vĩnh viễn, không cần thẻ tín dụng).
* **Server & Frontend**: Deploy trực tiếp lên **Vercel** miễn phí, tốc độ cao.
* **Tự động khởi tạo**: Khi deploy, hệ thống tự động tạo toàn bộ bảng dữ liệu và nạp sẵn tài khoản Admin Tổng (`admin` / `admin123`) cùng 4 Ban.

---

## 2. Hướng Dẫn Chạy Thử Trên Localhost

### Cách 1: Nhấp đúp chuột chạy file (Nhanh nhất)
1. Mở thư mục `confirmbump` trên máy tính.
2. Nhấp đúp chuột vào file: **`chay-web.bat`**
3. Mở trình duyệt truy cập: **`http://localhost:5000`**

### Cách 2: Chạy bằng dòng lệnh
```bash
# Cài đặt thư viện (nếu mới tải về)
npm install

# Khởi chạy toàn bộ hệ thống
node server/index.js
```
👉 Mở trình duyệt truy cập: **`http://localhost:5000`**

---

## 3. Danh Sách Tài Khoản Nạp Sẵn Để Test Ngay

Tại màn hình đăng nhập có sẵn **Nút Test Nhanh (1 Click)** cho các vai trò:

| Vai Trò | Tên Đăng Nhập | Mật Khẩu | Phân Ban | Quyền Hạn |
| :--- | :--- | :--- | :--- | :--- |
| **Admin Tổng** | `admin` | `admin123` | Toàn đoàn | Toàn quyền: Đăng task, duyệt confirm, cấp user/admin 2, đổi ban, xuất Excel toàn hệ thống |
| **Admin Cấp 2** | `admin_truyenthong` | `admin123` | Ban Truyền thông | Nhận & làm task, theo dõi tiến độ ban, thêm/xóa user ban mình, xuất Excel ban mình |
| **Admin Cấp 2** | `admin_thietke` | `admin123` | Ban Thiết kế | Tương tự cho Ban Thiết kế |
| **Admin Cấp 2** | `admin_nhansu` | `admin123` | Ban Nhân sự | Tương tự cho Ban Nhân sự |
| **Admin Cấp 2** | `admin_haucan` | `admin123` | Ban Hậu cần | Tương tự cho Ban Hậu cần |
| **Thành viên** | `user_tt` | `user123` | Ban Truyền thông | Bấm link bài đăng, nộp ảnh confirm, nộp bù 3 ngày, xem lịch sử cá nhân |
| **Thành viên** | `user_tk` | `user123` | Ban Thiết kế | Tương tự cho Ban Thiết kế |
