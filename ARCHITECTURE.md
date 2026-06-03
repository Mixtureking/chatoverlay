# Tài liệu Kiến trúc Hệ thống (Architecture Blueprint - ARCHITECTURE) 🏗️

Tài liệu này giải thích cấu trúc tổ chức mã nguồn, kiến trúc đa tầng (Hybrid Web-plus-Desktop), cách phân chia trách nhiệm giữa Client - Server - Electron, và cơ chế Đồng bộ hoạt động tức thời.

---

## 1. Sơ đồ Kiến trúc Tổng quan (System Overview)

Hệ thống được vận hành dưa trên thiết kế **Full-Stack lai ghép Đóng gói độc lập (Hybrid Architecture with Desktop Wrapper)**:

```
┌────────────────────────────────────────────────────────┐
│               ELECTRON DESKTOP SHELL                   │
│  (Chạy file .exe | Quản lý vòng đời phần mềm máy tính)  │
│                                                        │
│  ┌───────────────────────┐    ┬   ┌─────────────────┐  │
│  │     Backend Server    │    │   │  Frontend App   │  │
│  │ (Compiled Server CJS) │    │   │ (Embedded HTML) │  │
│  │   Express / Node.js   ├────┼──►│  Vite + React   │  │
│  │      Port 3000        │    │   │  Chromium UI    │  │
│  └───────────┬───────────┘    ┴   └────────┬────────┘  │
└──────────────┼─────────────────────────────┼───────────┘
               │ Api Proxy Requests          │ Live Sync Polling
               ▼                             ▼
   ┌───────────────────────┐         ┌───────────────┐
   │  YOUTUBE DATA API v3  │         │  OBS STUDIO   │
   │    (Google Cloud)     │         │ Browser Source│
   └───────────────────────┘         └───────────────┘
```

---

## 2. Hoạt động của 3 Tầng Core Layers

### 2.1 Tầng Thể hiện & Trải nghiệm (Client Presentation Layer)
- **Công nghệ**: React v19, Tailwind CSS v4, Framer Motion (`motion/react`).
- **Nhiệm vụ chính**:
  - **Bảng điều khiển (Control Panel)**: Cho phép streamer thiết lập cấu hình của luồng chat, kết nối tài khoản stream, xem trước danh sách tin nhắn hiện thời.
  - **Khung hiển thị nguồn (OBS Overlay View)**: Được tải trực tiếp từ OBS Studio bằng chế độ overlay (`?mode=overlay` hoặc `/obs-overlay`). Trang này không hiển thị điều khiển bên lề, chỉ chứa tin nhắn chat nền hiển thị trong suốt (Transparent background), liên tục cập nhật/đồng bộ cấu hình style CSS động từ Server nội bộ.

### 2.2 Tầng Proxy & Xử lý Đồng bộ (Server Synchronization Layer)
- **Công nghệ**: Node.js, Express.js.
- **Nêu bật vai trò**:
  - **Giữ API Key an toàn**: Phía React gửi các tham số như livestream video URL hoặc ID; server sẽ tiếp nhận và đính kèm API Key kín của người dùng để tương tác trung gian với máy chủ Google, loại bỏ hoàn toàn khả năng rò rỉ API Key lên trình duyệt client-side công khai.
  - **Bộ nhớ Cache Cấu hình (Settings Sync Cache)**: Khởi tạo biến `cachedOverlaySettings` đóng vai trò là một điểm nút đồng bộ tập trung. Khi bảng điều khiển gửi `POST /api/youtube/settings-sync`, cấu hình CSS sẽ được lưu vào cache. OBS Browser Source định kỳ lấy (`GET`) cấu hình này về và áp dụng trực quan ngay tức khắc mà không cần streamer phải tải lại (Flickerless refresh).

### 2.3 Tầng Ứng dụng Máy tính (Desktop Client Native Wrapper)
- **Công nghệ**: Electron.
- **Tập tin điểm đầu**: `electron-main.cjs`.
- **Nhiệm vụ đóng gói**:
  - Khi ứng dụng khách nhấp đúp vào file `.exe` di động, Electron sẽ chạy đoạn mã chính để khởi tạo máy chủ phụ Express ngầm trên nền (`require("./dist/server.cjs")`).
  - Mở một cửa sổ Chromium an toàn trỏ đến địa chỉ cục bộ `http://localhost:3000` để streamer thiết lập.
  - Hỗ trợ xử lý mở các liên kết bên ngoài (Ví dụ: hướng dẫn lấy API Key trên Google Cloud Console) trực tiếp trên trình duyệt mặc định của hệ điều hành dạng an toàn (`shell.openExternal`).

---

## 3. Cấu trúc Thư mục Dự án

```
├── .env.example                # Khai báo biến môi trường mẫu
├── package.json                # Quản lý dependency, scripts build và cấu hình build Electron
├── tsconfig.json               # Cấu hình kiểm tra kiểu định nghĩa TypeScript
├── vite.config.ts              # Cấu hình đóng gói mã nguồn React 19 tĩnh của Vite
├── server.ts                   # Mã nguồn Backend Express xử lý luồng YouTube, API Sync & Static fallback
├── electron-main.cjs           # File khởi chạy chính của Electron khởi động Server + Window
├── dist/                       # Output biên dịch HTML/JS/CSS tĩnh + server.cjs (CJS format)
│   ├── index.html
│   ├── server.cjs              # File bundle backend bởi esbuild
│   └── assets/
├── dist-electron/              # Output của electron-builder chứa file chương trình .exe di động
│   └── YouTube Chat Overlay.exe  # File ứng dụng chạy trực tiếp trên Windows
└── src/                        # Thư mục chứa mã nguồn Client chính (Vite/React)
    ├── main.tsx                # Điểm mồi ứng dụng React
    ├── index.css               # Globla CSS nhúng phông chữ & Tailwind CSS v4
    ├── types.ts                # Định nghĩa toàn bộ kiểu dữ liệu (Interfaces / Enums)
    ├── App.tsx                 # Giao diện Dashobard điều khiển luồng chat chính
    └── components/
        ├── HelpManual.tsx      # Giao diện Hướng dẫn & cấu hình chi tiết
        └── OverlayWidget.tsx   # Khung hiển thị Overlay tối giản dành cho OBS
```

---

## 4. Thiết kế Xử lý Tìm kiếm Đường dẫn Tĩnh (Fallback Asset Resolver)
Để phần mềm hoạt động trơn tru cả ở môi trường phát triển (`npm run dev`), môi trường Node.js độc lập (`npm run start`), lẫn khi đóng gói trong file nén của Electron (`.exe`), thuật toán tìm kiếm tài nguyên tĩnh được thiết kế linh hoạt trong `server.ts`:

1. Ban đầu, tìm thư mục build mặc định thông qua vị trí hiện tại của Node.js: `process.cwd()/dist`.
2. Nếu không thấy tài nguyên, server tự động kiểm tra xem biến `__dirname` của CommonJS có tồn tại không (Đặc biệt cho gói bundle server đã biên dịch sang file `/dist/server.cjs` hoặc nén trong ASAR của Electron).
3. Đổi vị trí tìm kiếm tệp sang thư mục lân cận trực thuộc tệp thực thi chính để tải tệp `index.html` lên một cách tuyệt đối, tránh triệt để lỗi màn hình đen hoặc thông báo "Not Found" khi chạy file thực thi dán liền `.exe` di động.
