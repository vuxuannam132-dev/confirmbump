# HƯỚNG DẪN DEPLOY WEB LÊN VERCEL & DATABASE MIỄN PHÍ

Hệ thống đã được thiết kế sẵn sàng 100% để deploy lên **Vercel** kết hợp với **Cơ sở dữ liệu đám mây (Cloud PostgreSQL) hoàn toàn miễn phí** (không cần thẻ tín dụng).

---

## BƯỚC 1: TẠO DATABASE CLOUD MIỄN PHÍ TRÊN NEON (Khuyên Dùng)

**Neon.tech** là dịch vụ Serverless PostgreSQL miễn phí vĩnh viễn tốt nhất hiện nay, tốc độ cực nhanh và kết nối mượt mà với Vercel.

1. Truy cập trang web: **[https://neon.tech](https://neon.tech)**
2. Bấm **Sign Up** và đăng nhập nhanh bằng tài khoản **Google** hoặc **GitHub** (hoàn toàn miễn phí, không yêu cầu thẻ tín dụng).
3. Sau khi đăng nhập, bấm **Create Project**:
   - Project name: Đặt tên tùy ý (ví dụ: `doantruong-bump`).
   - Region: Chọn `Singapore` (để tốc độ tải từ Việt Nam nhanh nhất).
   - Bấm **Create Project**.
4. Tại bảng điều khiển, bạn sẽ thấy mục **Connection Details**:
   - Chọn tab **Connection String**.
   - Sao chép toàn bộ đường dẫn có dạng:
     ```text
     postgresql://neondb_owner:nNxxx...xxx@ep-xyz-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
     ```
   *(Lưu lại đường dẫn này để lát nữa dán vào Vercel làm biến `DATABASE_URL`)*.

> [!NOTE]
> Khi deploy lên, hệ thống sẽ **tự động tạo toàn bộ bảng dữ liệu** và **tự động nạp sẵn tài khoản Admin Tổng (`admin` / `admin123`) cùng 4 Ban**, bạn không cần phải chạy lệnh SQL nào thủ công!

---

## BƯỚC 2 (TÙY CHỌN): LẤY API KEY LƯU ẢNH MIỄN PHÍ IMGBB

> [!TIP]
> **Hệ thống đã có cơ chế tự động:** Nếu bạn không cài ImgBB, ảnh chụp màn hình vẫn được tự động lưu trực tiếp vào Database và hiển thị bình thường!
> Tuy nhiên, nếu muốn tối ưu dung lượng DB, bạn có thể lấy API key ImgBB miễn phí vĩnh viễn (30 giây):

1. Vào trang: **[https://api.imgbb.com/](https://api.imgbb.com/)**
2. Đăng ký/Đăng nhập rồi bấm **Get API Key** -> Copy chuỗi khóa (ví dụ: `4a8f9xxx...`).

---

## BƯỚC 3: ĐƯA DỰ ÁN LÊN GITHUB

Mở cửa sổ dòng lệnh tại thư mục `d:\dowload2\confirmbump` và gõ các lệnh sau để đẩy code lên GitHub của bạn:

```powershell
cd d:\dowload2\confirmbump
git init
git add .
git commit -m "Setup Vercel and Cloud Database"
```

Sau đó tạo 1 Repository mới trên [GitHub.com](https://github.com/new) (chọn Private hoặc Public), rồi liên kết và đẩy lên:

```powershell
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/confirmbump.git
git push -u origin main
```

---

## BƯỚC 4: DEPLOY LÊN VERCEL

1. Truy cập trang chủ: **[https://vercel.com](https://vercel.com)**
2. Đăng nhập bằng tài khoản **GitHub**.
3. Tại giao diện chính (Dashboard), bấm nút **Add New...** ở góc trên bên phải -> Chọn **Project**.
4. Bạn sẽ thấy danh sách Repository GitHub của mình -> Bấm nút **Import** bên cạnh dự án `confirmbump`.
5. Tại màn hình cấu hình dự án (**Configure Project**):
   - **Framework Preset**: Vercel sẽ tự nhận diện là `Vite` (hoặc để mặc định).
   - **Root Directory**: Để nguyên `./`.
   - Mở rộng mục **Environment Variables** (Biến môi trường) và thêm các biến sau:

| Tên biến (Key) | Giá trị (Value) | Giải thích |
| :--- | :--- | :--- |
| `DATABASE_URL` | *(Dán link postgresql:// đã copy ở Bước 1 vào đây)* | Kết nối tới Database Neon Cloud |
| `JWT_SECRET` | `doantruong_secret_bump_2026_xyz` | Chuỗi ký token bảo mật |
| `IMGBB_API_KEY` | *(Khóa ImgBB từ Bước 2 nếu có, hoặc bỏ qua)* | Lưu ảnh screenshot lên Cloud |

6. Bấm nút **Deploy** màu xanh!

---

## BƯỚC 5: HOÀN TẤT & SỬ DỤNG

* Vercel sẽ tự động tải các gói thư viện, biên dịch Frontend React và triển khai API Serverless trong khoảng 1 - 2 phút.
* Khi màn hình pháo hoa xuất hiện 🎉, bạn bấm vào liên kết **Visit** hoặc xem domain có dạng:
  👉 **`https://confirmbump-xyz.vercel.app`**
* Trang web của bạn đã chính thức chạy Online trên Internet 24/7!
* Bạn có thể đăng nhập ngay bằng tài khoản Admin Tổng:
  - **Tên đăng nhập**: `admin`
  - **Mật khẩu**: `admin123`
  - Sau đó đổi mật khẩu hoặc cấp tài khoản cho các thành viên trong Đoàn trường sử dụng.
