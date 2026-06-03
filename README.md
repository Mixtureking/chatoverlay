# YouTube Chat OBS Overlay Controller 🎥💬

Ứng dụng full-stack (React + Express + Electron) tinh gọn và mạnh mẽ giúp các streamer YouTube tùy chỉnh, quản lý và hiển thị khung chat trực tiếp (YouTube Live Chat) lên luồng livestream của mình thông qua nguồn Trình duyệt (Browser Source) trong OBS Studio.

Tích hợp tính năng **Đồng bộ Sống (Live Synchronization)**: Streamer chỉ cần dán link OBS một lần duy nhất vào OBS. Mỗi khi đổi màu sắc, cỡ chữ hay hiệu ứng hiển thị tại giao diện điều khiển, giao diện hiển thị trên stream sẽ được cập nhật ngay lập tức mà không cần tải lại nguồn (reload Browser Source).

---

## ✨ Tính năng chính

- **Cấu hình trực quan (Control Panel)**: Thay đổi màu sắc nền, màu chữ, kích cỡ font, khoảng cách hiển thị, ẩn/hiển thị huy hiệu (moderator, member, verified), các hiệu ứng hoạt ảnh xuất hiện của tin nhắn bằng Framer Motion (`motion`).
- **Tốc độ Đồng bộ Sống (Live Sync)**: Sử dụng API đồng bộ hóa lưu trữ cấu hình trên server, giúp màn hình OBS tự động cập nhật cấu hình thiết lập tức thời mà không làm ảnh hưởng hay ngắt quãng tin nhắn chat trên livestream.
- **Hỗ trợ Super Chat nổi bật**: Tự động nhận diện thiết lập Tiers của YouTube Super Chat và tô điểm màu sắc viền/background cao cấp theo quy chuẩn của YouTube.
- **Ứng dụng Desktop Portable (.exe)**: Đóng gói hoàn chỉnh thành một phần mềm độc lập dành cho Windows giúp streamer tiện mở rộng, chạy mượt mà ngay trên máy tính mà không cần cài đặt phức tạp.

---

## 🛠️ Hướng dẫn cài đặt & Chạy ứng dụng

Yêu cầu máy tính của bạn đã cài đặt sẵn **Node.js LTS (phiên bản khuyến nghị v18 trở lên)**.

### 1. Cài đặt các gói phụ thuộc
Giải nén mã nguồn, mở Terminal hoặc Command Prompt tại thư mục dự án và chạy:
```bash
npm install
```

### 2. Chạy ứng dụng chế độ Phát triển (Development)
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
`dist-electron/YouTube Chat Overlay.exe` (Dung lượng khoảng ~70-100MB do bao hàm sẵn runtime tối giản của Chromium và Node.js).

---

## 🌐 Cách kết nối vào OBS Studio

1. **Bật ứng dụng lên** (hoặc chạy app qua file `.exe` / dòng lệnh `npm run dev`).
2. Nhập **YouTube API Key** của bạn và **Video URL/ID** của luồng Livestream hiện tại.
3. Bấm **Bắt đầu đồng bộ**.
4. Chuyển sang tab **Thiết lập giao diện (Style CSS)** để căn chỉnh kích thước font, bảng màu sắc phù hợp với layout luồng stream của bạn.
5. Sao chép **Đường dẫn liên kết OBS Overlay**.
6. Mở **OBS Studio** -> Ấn nút **Dấu cộng (+)** ở khung Nguồn (Sources) -> Chọn **Trình duyệt (Browser)**.
7. Dán đường link vừa sao chép vào ô **URL**. Thiết lập kích cỡ hiển thị rộng/cao phù hợp (Ví dụ: `width: 400`, `height: 600`) rồi nhấn **OK**.
8. Mỗi khi bạn sửa CSS hoặc màu sắc trên Dashboard của app, chỉ cần nhấn nút **LƯU THIẾT LẬP & ĐỒNG BỘ** trên bảng điều khiển. Giao diện OBS sẽ cập nhật trực tiếp sau 1 giây!

---

## 📂 Các cổng kết nối & Thiết lập

- Mặc định ứng dụng chạy trên cổng kết nối nội bộ: `3000`.
- Nếu tích hợp lên OBS của các thiết bị khác hoặc mạng nội bộ, hãy thay `localhost` bằng địa chỉ IP máy tính nội mạng của bạn (Ví dụ: `http://192.168.1.5:3000/obs-overlay`).
