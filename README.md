# YouTube Chat OBS Overlay Controller 🎥💬

Ứng dụng full-stack (React + Express + Electron) tinh gọn, mạnh mẽ và bảo mật tối cao giúp các streamer YouTube tùy chỉnh, quản lý và hiển thị khung chat trực tiếp (YouTube Live Chat) lên luồng livestream của mình thông qua nguồn Trình duyệt (Browser Source) trong OBS Studio.

---

## ✨ Điểm cải tiến & Tính năng nổi bật mới

1. **🔒 Mã hóa liên kết OBS Bảo mật tuyệt đối (`?ob=...`)**:
   - Khắc phục nguy cơ lộ thông tin nhậy cảm (như `liveChatId` và YouTube `apiKey` cá nhân) khi streamer cài đặt hoặc chia sẻ giao diện màn hình.
   - Toàn bộ thiết lập, mã kết nối và khóa API được nén cứng, chuyển mã nhị phân UTF-8 và mã hóa sang định dạng **URL-Safe Base64** tuyệt đẹp.

2. **🌐 Đẫn hướng trực tiếp trang gốc (Zero Routing Error)**:
   - Các nền tảng đám mây tĩnh (như Vercel) dễ phát sinh lỗi **404 NOT FOUND** khi truy cập trực tiếp các đường dẫn phụ như `/overlay`.
   - Bằng cách cấu trúc liên kết OBS dưới dạng `/?ob=[code]` chạy thẳng từ trang gốc, ứng dụng triệt tiêu hoàn toàn lỗi 404, bảo đảm tải overlay mượt mà trong bất kể môi trường lưu trữ nào.

3. **⚡ Tự động Đồng bộ hóa Không Gián đoạn (Debounced Live Auto-Sync)**:
   - Loại bỏ thao tác phải nhấp nút "Cập Nhật" hoặc "Save" thủ công hằng ngày của Streamer.
   - Bảng điều khiển tích hợp bộ quản lý thay đổi tự động được hoãn trễ 500ms (Debounce). Mỗi khi thực hiện điều chỉnh (kéo núm cỡ chữ, chọn bảng màu chữ, bấm nút bật avatar...), cấu hình tự lưu ngầm vào Server Cache. Khung hiển thị OBS tự nạp giao diện cập nhật sau dưới 3 giây một cách lặng lẽ.

4. **👑 Super Chat Đa Tiers Cao Cấp**:
   - Tự chọn dải màu khung nổi bật cho các hạn mức ủng hộ, duy trì hoạt ảnh ghim tin nhắn đầu bảng chuyên nghiệp giống hệt trải nghiệm trên nền tảng YouTube gốc.

5. **🎬 Studio Chuyển Cảnh Siêu Cấp (Screen Transition Overlay)**:
   - Sáng tạo và thiết kế các màn chuyển cảnh (Stingers/Transitions) thương hiệu đỉnh cao ngay trên trình duyệt OBS.
   - Hỗ trợ 5 hoạt ảnh hoạt họa động cao cấp, tệp âm thanh hiệu ứng (bính bong, pop, quét sóng kĩ thuật số), nền tùy biến (màu đơn sắc, dốc màu Gradient óng ánh, ảnh nền URL hoặc Logo Base64 thiết kế riêng).
   - Kích hoạt không dây từ xa tức thời chỉ với một lần click nhanh trên giao diện điều khiển, sập rèm che đậy và gỡ rèm chuyển tiếp cảnh trò chơi vô cùng ảo diệu.

---

## 🛠️ Hướng dẫn cài đặt & Chạy ứng dụng

Yêu cầu máy tính của bạn đã cài đặt sẵn **Node.js LTS (phiên bản khuyến nghị v18 trở lên)**.

### 1. Cài đặt các gói phụ thuộc
Giải nén mã nguồn, mở Terminal hoặc Command Prompt tại thư mục dự án và chạy:
```bash
npm install
```

### 2. Chạy ứng dụng chế độ phát triển (Development)
Khởi chạy cả backend và frontend (Vite) đồng thời để chỉnh sửa mã nguồn:
```bash
npm run dev
```
Sau đó truy cập địa chỉ điều khiển: `http://localhost:3000` trên trình duyệt web.

### 3. Xem trước ứng dụng trên giao diện Desktop (Electron)
Kiểm tra hoạt động của app dưới dạng phần mềm máy tính:
```bash
npm run build
npm run electron
```

---

## 📦 Hướng dẫn đóng gói thành file `.exe` cho Windows

Để biên dịch toàn bộ dự án thành duy nhất 1 file chương trình chạy di động **`YouTube Chat Overlay.exe`** (dạng Portable không cần cài đặt), hãy thực hiện:

### Lệnh đóng gói tự động:
```bash
npm run build:win
```
*Lưu ý:* Quy trình này tự động chạy:
1. Biên dịch client-side của React thành các tập tin tĩnh trong `/dist`.
2. Bundles `server.ts` thành `/dist/server.cjs` thông qua phần mềm siêu tốc `esbuild`.
3. Khởi tạo `electron-builder` để tạo ra một file thực thi Windows ổn định bên trong thư mục **`dist-electron/`**.

### Sản phẩm thu được:
Sau khi build hoàn tất, bạn sẽ nhận được file `.exe` nằm trong thư mục:
`dist-electron/YouTube Chat Overlay.exe`.

---

## 🌐 Hướng dẫn kết nối vào OBS Studio

### 💬 1. Thiết lập Cửa Sổ Chat (OBS Chat Overlay)
1. **Bật ứng dụng lên** (hoặc chạy app qua file `.exe` / dòng lệnh `npm run dev`).
2. Nhập **YouTube API Key** của bạn và **Video URL/ID** của luồng Livestream hiện tại hoặc bật chế độ Giả Lập (Simulate) để kiểm tra giao diện.
3. Bấm **Bắt đầu đồng bộ** để khởi động bộ dò trò chuyện.
4. Chuyển sang tab **Thiết lập giao diện (Style CSS)** để căn chỉnh kích thước font, bảng màu sắc phù hợp với layout luồng stream của bạn.
5. Nhấp nút **Sao chép Link OBS Overlay** ở trên cùng đầu trang. Bạn sẽ nhận được liên kết bảo mật có dạng: `http://localhost:3000/?ob=eyJs...`
6. Mở **OBS Studio** -> Ấn nút **Dấu cộng (+)** ở khung Nguồn (Sources) -> Chọn **Trình duyệt (Browser)** -> Đặt tên (ví dụ: `YouTube Chat Overlay`).
7. Dán đường link vừa sao chép vào ô **URL**. Thiết lập kích cỡ hiển thị rộng/cao phù hợp (Ví dụ: rộng `400px`, cao `650px`) rồi nhấn **OK**.

---

### 🎬 2. Thiết lập Màn Chuyển Cảnh Studio (Screen Transition Overlay)
1. Nhấp chọn mục **Studio Chuyển Cảnh** ở thanh bên điều hướng (Sidebar).
2. Tự thiết kế phong cách rèm của bạn: chỉnh sửa tiêu đề (Title), mô tả (Subtitle), tốc độ duy trì rèm, dốc màu nền, phông chữ hoặc đăng tải trực tiếp logo thương hiệu của riêng bạn từ ổ cứng.
3. Nhấp nút **Sao chép Link OBS Transition** ở khung hướng dẫn mồi liên kết. Bạn sẽ có đường dẫn mã hóa an toàn chuyên biệt có định dạng: `http://localhost:3000/?ob=eyJs...` (đã tích hợp tham số kích hoạt chế độ screen transition).
4. Mở **OBS Studio** -> Ấn nút **Dấu cộng (+)** ở khung Nguồn (Sources) -> Chọn **Trình duyệt (Browser)** -> Đặt tên (ví dụ: `OBS Screen Transition overlay`).
5. Dán liên kết vừa nhận được vào ô **URL**. Thiết lập kích thước full-screen bao phủ máy quay của bạn (Ví dụ: rộng `1920px`, cao `1080px` cho luồng chuẩn HD) rồi nhấn **OK**.
6. **Kích hoạt không cấu dây**: Bây giờ, mỗi khi bạn muốn chuyển luồng cảnh chơi game, chuyển tiếp giờ giải lao hay bắt đầu/kết thúc stream, chỉ cần quay về Dashboard, nhấp nút **Kích hoạt chuyển cảnh OBS**. Ngay tức khắc, nguồn trình duyệt trên OBS sẽ sập rèm hoạt họa mượt mà, vang hiệu ứng âm thanh và mở toang cảnh game mới của bạn vô cùng sống động và tuyệt mỹ!

---

### 🚀 Đồng bộ hóa và cập nhật tức thời
Bây giờ, mỗi khi bạn thay đổi bất kỳ thông số giao diện tại Dashboard, khung hiển thị tương ứng trên OBS Studio sẽ tự động thay đổi theo ngay lập tức sau 1-3 giây mà không cần thao tác reload thủ công, đem tới hệ sinh thái điều khiển livesteam trọn vẹn và tối tân vô song!

