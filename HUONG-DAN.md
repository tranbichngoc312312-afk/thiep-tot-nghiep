# Web Thiệp Mời Tốt Nghiệp + Trang Quản Lý (CMS)

- `index.html`: trang thiệp khách xem. Mỗi người một link riêng, ví dụ `.../bich-ngoc`.
- `admin.html`: trang quản lý. Đăng nhập để tạo, sửa và xóa thiệp, tải ảnh, nhạc, và xóa lời chúc.
- Dữ liệu (chữ, ảnh, lời chúc) lưu trên **Supabase** (miễn phí). Web đưa lên **GitHub Pages** (miễn phí).

Khi chưa điền Supabase vào `config.js`, web chạy **chế độ DEMO**: dữ liệu chỉ lưu trên trình duyệt đang dùng. Chế độ này để thử giao diện, chưa gửi bạn bè được.

---

## Bước 1: Tạo project Supabase

1. Vào https://supabase.com, đăng ký và đăng nhập.
2. Bấm **New project**, đặt tên tùy ý (ví dụ `thiep-moi`), đặt mật khẩu database (lưu lại), Region chọn **Southeast Asia (Singapore)**.
3. Đợi khoảng 1–2 phút cho project khởi tạo xong.

## Bước 2: Tạo bảng và kho ảnh

1. Menu bên trái chọn **SQL Editor**, rồi bấm **New query**.
2. Mở file `supabase-setup.sql`, chép **toàn bộ** nội dung, dán vào ô lệnh rồi bấm **Run**.
3. Thấy dòng `Success. No rows returned` là xong.

## Bước 3: Tạo tài khoản admin

1. Menu **Authentication**, chọn **Users**, bấm **Add user**, rồi chọn **Create new user**.
2. Nhập email và mật khẩu của bạn, tick **Auto Confirm User**, rồi bấm **Create user**.
3. (Nên làm) Vào **Authentication**, chọn **Sign In / Providers**, rồi tắt **Allow new users to sign up**.

## Bước 4: Cấp quyền admin cho tài khoản đó

Quay lại **SQL Editor**, mở **New query**, dán đoạn dưới (đổi email thành email bạn vừa tạo) rồi bấm **Run**:

```sql
insert into public.admins (user_id)
select id from auth.users where email = 'email-cua-ban@gmail.com'
on conflict do nothing;
```

## Bước 5: Điền Supabase vào `config.js`

1. Vào **Project Settings**, chọn **API** (hoặc **Data API** / **API Keys**).
2. Chép **Project URL** và khóa **anon public**, dán vào `config.js`:

```js
window.APP_CONFIG = {
  SUPABASE_URL: "https://xxxxxxxx.supabase.co",
  SUPABASE_ANON_KEY: "eyJhbGciOi...",
  DEFAULT_SLUG: ""
};
```

> Khóa **anon** để công khai trong web là bình thường, vì quyền đã khóa bằng SQL ở bước 2.
> **Tuyệt đối không** dán khóa **service_role** vào đây.

## Bước 6: Đưa lên GitHub Pages

1. Trên GitHub, tạo repo mới, ví dụ `thiep-tot-nghiep`, để chế độ **Public**.
2. Đẩy toàn bộ thư mục này lên (mở terminal trong thư mục `Web thư mời`):

```bash
git init
git add .
git commit -m "Thiệp mời tốt nghiệp"
git branch -M main
git remote add origin https://github.com/<ten-tai-khoan>/thiep-tot-nghiep.git
git push -u origin main
```

3. Trong repo, vào **Settings**, chọn **Pages**, mục Source chọn **Deploy from a branch**, branch `main`, thư mục `/ (root)`, rồi bấm **Save**.
4. Đợi 1–2 phút. Web sẽ ở `https://<ten-tai-khoan>.github.io/thiep-tot-nghiep/`

## Bước 7: Tạo thiệp cho bạn và bạn bè

1. Mở `https://<ten-tai-khoan>.github.io/thiep-tot-nghiep/admin.html` và đăng nhập.
2. Bấm **+ Tạo thiệp mới**, nhập tên. Mỗi người một thiệp, mỗi thiệp một **Tên link** riêng.
3. Sửa nội dung, tải ảnh và nhạc. Khung bên phải là bản xem trước, cập nhật ngay khi sửa.
4. Bấm **Lưu** (hoặc Ctrl+S), rồi bấm **Sao chép link** để gửi. Link có dạng:
   `https://<ten-tai-khoan>.github.io/thiep-tot-nghiep/bich-ngoc`
5. Làm thiệp cho bạn khác cùng trường thì bấm **Nhân bản**. Thiệp mới giữ nguyên trường, giờ, địa điểm, bạn chỉ cần đổi tên và ảnh.

Sau này muốn sửa thiệp thì chỉ cần vào `admin.html` sửa rồi bấm Lưu, **không cần** đẩy lại GitHub.

---

## Lưu ý

- **Supabase bản miễn phí tự tạm dừng** nếu project không có ai dùng khoảng 1 tuần. Nếu thiệp báo lỗi không tải được, hãy đăng nhập supabase.com và bấm **Restore project**. Nên vào kiểm tra vài ngày trước ngày gửi thiệp và trước ngày tốt nghiệp.
- Ảnh được tự thu nhỏ trước khi tải lên nên web load nhanh. Ảnh bìa nên là ảnh dọc, ảnh cuộn phim nên là ảnh ngang.
- Album: cứ 3 ảnh xếp thành 1 cụm (2 ảnh nhỏ ở trên, 1 ảnh ngang ở dưới), nên tải số ảnh chia hết cho 3 thì đẹp nhất.
- Nhạc nền phát khi khách chạm vào thiệp lần đầu, vì trình duyệt điện thoại chặn tự phát nhạc.
- Tắt **Hiện công khai** thì link thiệp đó bị ẩn với khách, bạn vẫn sửa được.
- Muốn mở link gốc (không kèm tên) ra thẳng một thiệp, điền tên link đó vào `DEFAULT_SLUG` trong `config.js`.
- Thử trên máy: đừng bấm đúp mở file `.html`. Hãy mở bằng một server tĩnh (ví dụ tiện ích **Live Server** của VS Code), hoặc đẩy lên GitHub Pages rồi thử.

---

## Bán thiệp theo mã kích hoạt

Khách tự đăng ký, nhập mã bạn cấp, rồi được tạo **đúng 1 thiệp** và chỉ sửa được thiệp đó. Khách không tạo thêm, không xóa, không đổi tên link được.

**Cài một lần:**
1. Supabase → **SQL Editor** → **New query** → dán toàn bộ `supabase-ban-thiep.sql` → **Run**.
2. **Authentication → Sign In / Providers**: bật **Allow new users to sign up**. Nên tắt **Confirm email** để khách đăng ký xong dùng được ngay, vì email miễn phí của Supabase chỉ gửi được vài thư mỗi giờ.

**Bán thiệp:**
1. Đăng nhập `admin.html` bằng tài khoản admin, bấm **🔑 Mã kích hoạt**, rồi **Tạo mã** (có thể ghi chú tên khách).
2. Gửi khách link `.../admin.html` và mã, ví dụ `ABCD-EFGH`.
3. Khách: **Đăng ký** → nhập mã + chọn tên link → làm thiệp.
4. Trong danh sách mã, bạn thấy mã nào đã dùng, dùng bởi email nào, link thiệp là gì. Admin vẫn sửa và xóa được mọi thiệp.
