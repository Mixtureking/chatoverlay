# Tài liệu Kiến trúc Hệ thống (Architecture Blueprint) 🏗️

Tài liệu này giải thích cấu trúc tổ chức mã nguồn, kiến trúc đa tầng (Hybrid Web-plus-Desktop), cách phân chia trách nhiệm giữa Client - Server - Electron, các cơ chế bảo mật mã hóa URL và Đồng bộ hóa thời gian thực tự động của ứng dụng.

---

## 1. Sơ đồ Kiến trúc Tổng quan (System Overview)

Hệ thống được vận hành dựa trên thiết kế **Full-Stack lai ghép Đóng gói độc lập (Hybrid Architecture with Desktop Wrapper)**:

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
│  │  (Settings Cache API) │    │   │                 │  │
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

## 2. Hoạt động của các Tầng Cốt lõi (Core Layers)

### 2.1 Tầng Thể hiện & Trải nghiệm (Client Presentation Layer)
- **Công nghệ**: React v18, Tailwind CSS v4, Framer Motion (`motion/react`).
- **Nhiệm vụ chính**:
  - **Bảng điều khiển (Control Panel)**: Cung cấp giao diện trực quan cho phép điều chỉnh màu sắc, cỡ chữ, phông dạng, bật/tắt avatar, huy hiệu hoặc tùy biến mã HTML/CSS/JS mở rộng.
  - **Khung hiển thị nguồn (OBS Overlay View)**: Được nạp thẳng vào OBS Studio thông qua đường dẫn bảo mật. Bộ lọc trong suốt tự động lọc tin nhắn và thực hiện chuyển động mượt mà.

### 2.2 Tầng Bảo mật & Giải mã URL (Security & URL Obfuscation Layer)
Để bảo vệ quyền riêng tư tối đa cho streamer và ngăn ngừa lỗi 404 NOT FOUND trên môi trường đám mây (Vercel, Netlify):
1. **Kiến trúc Mã hóa Một nguồn (Base64url Configuration Obfuscator)**:
   Khi streamer cấu chỉnh diện mạo, hệ thống tập hợp toàn bộ cấu hình (bao gồm `liveChatId`, `apiKey`, `fontSize`, `theme`, v.v.) vào một đối tượng JSON. Sau đó, nó áp dụng chu trình mã hóa byte UTF-8 và chuyển đổi thành một khóa Base64 an toàn cho URL (URL-safe string / loại bỏ `+`, `/`, `=`):
   ```
   [JSON Settings Space] ──► [UTF-8 String Buffer] ──► [Base64 Encoded Key] ──► [URL Parameter ob=...]
   ```
2. **Kiến trúc Giải mã Thích ứng (Decoding Middleware & Fallback Router)**:
   Thay vì sử dụng liên kết con `/overlay` dễ gây 404 trên các dịch vụ lưu trữ tĩnh nếu không cấu hình URL rewrite, OBS Browser Source sử dụng đường dẫn gốc `/?ob=...`. Tại trang gốc, React sẽ phát hiện sự hiện diện của tham số `ob`, tự giải mã sang JSON ban đầu và cấu hình khởi động widget overlay trong suốt ngay lập tức.

### 2.3 Tầng Đồng bộ hóa Tự động Debounced (Real-Time Background Sync Layer)
- **Tình trạng cũ**: Streamer phải bấm nút "CẬP NHẬT" thủ công để đồng bộ giao diện sang OBS.
- **Giải pháp Kiến trúc mới**:
  - Tích hợp một **Auto-Syncer** sử dụng cơ chế trì hoãn cuộc gọi (Debounce 500ms) tại Dashboard điều khiển. 
  - Mỗi khi một giá trị trượt, một ô tích hay bảng màu thay đổi, hệ thống sẽ tự động gởi yêu cầu `POST /api/youtube/settings-sync` ngầm lên cache lưu trữ của Server.
  - Phía OBS Overlay Client định kỳ gửi yêu cầu `GET` lên cache này sau mỗi 3 giây để đồng bộ giao diện hiển thị tức thời, mang lại cảm giác thiết lập mượt mà, trực quan với độ trễ cực thấp mà không làm nghẽn năng lực xử lý của trình duyệt hay máy chủ.

### 2.4 Tầng Proxy API (Server Networking Layer)
- **Công nghệ**: Node.js, Express.js.
- **Nhiệm vụ**:
  - Giáp bảo vệ API Key nhờ hoạt động thu thập trung gian. Client gửi tin nhắn qua proxy, giữ API Key ở vùng an toàn.
  - Quản lý bộ đệm và tần suất gọi tin nhắn từ YouTube Live Chat (chu kỳ 4 giây bổ sung phân trang `nextPageToken`) để vượt qua các cơ chế giới hạn khắt khe của Google.

### 2.5 Tầng Ứng dụng Desktop (Desktop Wrapper)
- **Công nghệ**: Electron.
- **Tương tác**: Kích hoạt máy chủ Express cục bộ thông qua file bundle `/dist/server.cjs` và duy trì cửa sổ Always-On-Top với cơ chế xuyên thấu chuột (Click-through) thông minh cho streamer khi chơi game.

### 2.6 Tầng Chuyển Cảnh Hoạt Ảnh Kịch Tính (OBS Screen Transition Layer)
- **Công nghệ**: React v18, Framer Motion (`motion/react`), HTML5 Web Audio.
- **Nội dung & Cách vận hành**:
  - **Khung overlay chuyển cảnh độc lập**: Được thiết lập qua đường dẫn an toàn Base64 với tham số `mode=transition` hoặc `/transition-overlay`, hoạt động hệt như một thẻ rèm động trên OBS Browser Source.
  - **Kích phát & Đồng bộ vô tuyến**: Khi một sự thay đổi tăng trị số `transitionTriggerCount` được đẩy lên qua proxy, Client OBS Overlay bắt tín hiệu ngay lập tức, tự động sập rèm kỹ thuật số, phát Sound FX tương thích (tiếng chuông dập dốc, organic pop hoặc rít kỹ thuật số) và hiển thị tiêu đề, mô tả thương hiệu lớn kèm logo Base64 sắc nét. Hoạt ảnh gỡ rèm tự động kích hoạt sau `transitionDuration` giây, mở lộ toàn bộ cảnh game phía dưới.

---

## 3. Cấu trúc Thư mục Dự án và Định dạng Sắp xếp

```
├── .env.example                # Khai báo các biến môi trường mẫu
├── .gitignore                  # Chỉ định tài nguyên không lưu trữ (node_modules, build artifacts)
├── ARCHITECTURE.md             # Tài liệu Kiến trúc Hệ thống (Xem file hiện tại)
├── CHANGELOG.md                # Nhật ký Thay đổi chi tiết qua các phiên bản
├── SPEC.md                     # Đặc tả kỹ thuật chi tiết về cấu trúc dữ liệu và API
├── README.md                   # Hướng dẫn cài đặt và sử dụng ứng dụng nhanh gọn
├── package.json                # Trình quản lý dependencies và các kịch bản build/đóng gói
├── tsconfig.json               # Quy tắc kiểm tra kiểu và biên dịch của TypeScript
├── vite.config.ts              # Công cụ cấu hình đóng gói mã tĩnh cho React
├── server.ts                   # Máy chủ full-stack Express xử lý API YouTube, Cache Sync & tĩnh fallback
├── electron-main.cjs           # File khởi chạy chính của Desktop Electron
├── dist/                       # Mã nguồn biên dịch Ready-for-Deployment
│   ├── index.html              # Tệp cấu trúc chính phục vụ khách hàng và OBS
│   ├── server.cjs              # File bundle backend bởi esbuild chạy độc lập
│   └── assets/                 # Các mã nguồn JS/CSS nén tối thiểu
└── src/                        # Thư mục mã nguồn client-side React
    ├── main.tsx                # Khởi tạo React Virtual DOM
    ├── index.css               # Chứa Tailwind CSS v4 và nhập phông chữ hiển thị
    ├── types.ts                # Định nghĩa các Interfaces và Enums phục vụ kiểu dữ liệu an toàn
    ├── App.tsx                 # Giao diện cốt lõi (Bảng điều khiển và bộ mồi Router)
    └── components/
        ├── HelpManual.tsx      # Tài liệu Hướng dẫn tương tác cho streamer trên giao diện
        └── OverlayWidget.tsx   # Widget hiển thị Khung chat trong suốt dành riêng cho OBS
```

---

## 4. Thiết kế Fallback Asset Resolver (Khắc phục Đen màn hình OBS)
Khi chạy file portable `.exe` đóng gói, Node.js sẽ giải nén mã ra một thư mục tạm thời khác biệt với thư mục chạy lệnh (`process.cwd()`). Máy chủ Express được tối ưu hóa để tự động chuyển vùng tìm kiếm thư mục tĩnh `/dist` sang vùng của file `__dirname` nếu không tìm thấy tệp tin HTML gốc, đảm bảo tính ổn định tối cao, triệt tiêu lỗi hiển thị đen thui hay trang trống trên ứng dụng OBS của các streamer.
