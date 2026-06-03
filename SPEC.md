# Tài liệu Đặc tả Kỹ thuật (Technical Specification - SPEC) 📝

Tài liệu này đặc tả chi tiết các yêu cầu chức năng, luồng xử lý dữ liệu, cấu trúc dữ liệu cấu hình, và các API tương tác trong ứng dụng **YouTube Chat OBS Overlay**.

---

## 1. Bản Đồ API nội bộ (Backend Routes Spec)

Mẫu máy chủ Express phía Backend cung cấp các API sau để phục vụ Frontend kết nối tới dịch vụ YouTube API tránh rò rỉ API Key và thực hiện Đồng bộ hóa luồng livestream.

### 1.1 Lấy Active Live Chat ID từ URL video
- **Endpoint**: `POST /api/youtube/live-chat-id`
- **Body Payload**:
```json
{
  "videoUrlOrId": "https://www.youtube.com/watch?v=VIDEO_ID",
  "apiKey": "AIzaSy..."
}
```
- **Xử lý**: 
  1. Trích xuất `VIDEO_ID` từ URL nhập vào bằng biểu thức chính quy (Regex).
  2. Gửi request REST HTTP tới API YouTube: `https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails,snippet&id={VIDEO_ID}&key={API_KEY}`.
  3. Lọc lấy thông tin `activeLiveChatId` chịu trách nhiệm thu thập tin nhắn.
- **Phản hồi thành công (200 OK)**:
```json
{
  "activeLiveChatId": "Cg0KC3ZpZGVvX2lkXz...",
  "videoId": "VIDEO_ID",
  "title": "Tên buổi livestream trực tiếp",
  "channelTitle": "Tên kênh YouTube",
  "viewerCount": 1250
}
```

---

### 1.2 Lấy danh sách tin nhắn chat (Messages Long-Polling)
- **Endpoint**: `GET /api/youtube/messages`
- **Query Parameters**:
  - `liveChatId` (string, bắt buộc): Chat ID cần tải tin nhắn.
  - `apiKey` (string, bắt buộc): Khóa API YouTube hợp lệ.
  - `pageToken` (string, tùy chọn): Token phân trang cho lần lấy dữ liệu tiếp theo.
- **Xử lý**:
  1. Gửi request tới YouTube API: `https://www.googleapis.com/youtube/v3/liveChat/messages?liveChatId={liveChatId}&part=snippet,authorDetails&key={apiKey}&maxResults=100&pageToken={pageToken}`.
  2. Map và chuẩn hóa dữ liệu tin nhắn bao gồm huy hiệu, phân loại Super Chat dựa trên cấp độ tiền mặt (Tiers từ 1 đến 6).
  3. Áp dụng cơ chế lọc mã độc hại XSS (`sanitizeHtml`) cho nội dung tin nhắn và tên người dùng để bảo vệ môi trường hiển thị Web.
- **Phản hồi thành công (200 OK)**:
```json
{
  "messages": [
    {
      "id": "msg-17173920...",
      "authorName": "Coder Pro",
      "authorPhotoUrl": "https://...",
      "messageText": "Xin chào mọi người!",
      "isModerator": false,
      "isOwner": false,
      "isSponsor": true,
      "isVerified": false,
      "isSuperChat": false,
      "superChatColor": "#1565c0",
      "superChatAmountText": "",
      "tier": 1,
      "timestamp": 1717392015000
    }
  ],
  "nextPageToken": "AL9yKbd-LXv...",
  "pollingIntervalMillis": 4000,
  "offlineAt": null
}
```

---

### 1.3 Đồng bộ thiết lập tùy chọn hiển thị (Settings Sync)
Cơ chế cốt lõi để giữ giao diện thiết lập của streamer và hiển thị OBS luôn tương thích mà không cần load lại trình duyệt.

- **Lưu thiết lập (Save/Push Settings)**:
  - **Endpoint**: `POST /api/youtube/settings-sync`
  - **Body Payload**:
  ```json
  {
    "settings": {
      "fontSize": "16px",
      "textColor": "#ffffff",
      "backgroundColor": "rgba(15, 23, 42, 0.8)",
      "badgeVisible": true,
      "animationType": "slide-up",
      "maxMessages": 50,
      "themeType": "modern-slate",
      "superchatOutline": true
    }
  }
  ```
  - **Phản hồi thành công**: `{"success": true, "settings": {...}}`

- **Lấy thiết lập hiện tại (Fetch Settings)**:
  - **Endpoint**: `GET /api/youtube/settings-sync`
  - **Phản hồi**: Trả về dữ liệu JSON của cấu hình đã được lưu trữ (bằng bộ nhớ cache trên Server hoặc mặc định ban đầu).

---

## 2. Đặc tả Mô hình Dữ liệu cấu hình (Configuration Spec)

Dữ liệu thiết lập khung chat bao hàm các thuộc tính sau:

| Thuộc tính | Kiểu dữ liệu | Giá trị mặc định | Giải thích |
| :--- | :--- | :--- | :--- |
| `theme` | `string` | `"dark"` | Giao diện nền bảng điều khiển (`dark` / `light`) |
| `chatTheme` | `string` | `"bubble"` | Kiểu hiển thị bong bóng chat (`bubble`, `clean`, `minimal`, `glassmorphism`) |
| `fontSize` | `number` | `14` | Cỡ chữ hiển thị trong OBS (Đơn vị tính: px) |
| `fontFamily` | `string` | `"Inter"` | Phông chữ chọn lọc (`Inter`, `Space Grotesk`, `JetBrains Mono`) |
| `textColor` | `string` | `"#f8fafc"` | Mã màu hex cho màu chữ nội dung tin nhắn |
| `bgColor` | `string` | `"rgba(15, 23, 42, 0.65)"` | Màu nền của bong bóng chat (Hỗ trợ độ trong suốt RGBA) |
| `accentColor` | `string` | `"#6366f1"` | Màu tạo điểm nhấn (Tên tác giả, biểu tượng, viền) |
| `maxMessages` | `number` | `30` | Lượng tin nhắn tối đa lưu trữ trên màn hình để tránh quá tải RAM của OBS |
| `animationDuration` | `number` | `0.3` | Thời gian kéo dài hoạt ảnh hiển thị tin nhắn (giây) |
| `showBadges` | `boolean` | `true` | Hiển thị biểu hiện đặc biệt của Moderator/Owner/Member/Verified |
| `showAvatars` | `boolean` | `true` | Ẩn/hiển thị ảnh đại diện của người gõ phím |
| `showSuperChatBanner` | `boolean` | `true` | Bật hoạt ảnh đặc biệt khi có Super Chat số tiền lớn |
| `isTitleBold` | `boolean` | `true` | Viết đậm tên người dùng trong khung chat |

---

## 3. Quy chuẩn Bảo mật & Hiệu năng

- **Bảo mật API Key**: Hệ thống tuyệt đối **không chia sẻ API Key đến luồng URL hiển thị của OBS Overlay**. URL dán vào OBS chỉ chứa mã tham chiếu Overlay ID; máy chủ Express lưu giữ API Key an toàn và chỉ thực hiện các yêu cầu API YouTube trực tiếp từ máy chủ (Server-to-Server) bảo bọc an toàn.
- **Ngăn chặn tấn công XSS**: Tên người dùng (`displayName`) và nội dung tin nhắn (`displayMessage`) được lọc sạch qua tiện ích `sanitizeHtml` để loại bỏ thẻ `<script>`, `<iframe>` và mã độc nhúng nguy hiểm.
- **Điều phối Tần suất Polling (Rate Limiting Management)**: Máy chủ tự động tuân thủ cấu hình khoảng thời gian làm mới (`pollingIntervalMillis`) trả về từ phía API YouTube (thường là 4 giây) hoặc thích ứng theo cài đặt tối ưu tối thiểu 2 giây để tránh vượt định mức truy vấn cho phép (API Quota Limit) của tài khoản Google.
