# Tài liệu Đặc tả Kỹ thuật (Technical Specification - SPEC) 📝

Tài liệu này đặc tả chi tiết các yêu cầu chức năng, luồng xử lý dữ liệu, định cấu hình mã hóa bảo mật, và hệ thống các API nội bộ phục vụ cho ứng dụng **YouTube Chat OBS Overlay**.

---

## 1. Bản Đồ API nội bộ (Backend API Specifications)

Máy chủ Express phía Backend cung cấp các API để thực hiện Đồng bộ hóa luồng livestream, trung chuyển dữ liệu chat an toàn của YouTube và duy trì bộ đệm cấu hình.

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
  1. Thẩm định kết nối và thực hiện tải từ YouTube Live Chat API: `https://www.googleapis.com/youtube/v3/liveChat/messages?liveChatId={liveChatId}&part=snippet,authorDetails&key={apiKey}&maxResults=100&pageToken={pageToken}`.
  2. Lọc thông tin, sắp xếp và chuẩn hóa các trường thông tin tác giả, avatar, thẻ quyền Moderator/Hội viên/Chủ kênh và dữ liệu đóng góp Super Chat.
  3. Áp dụng cơ chế lọc mã độc hại XSS (`sanitizeHtml`) cho nội dung tin nhắn và tên người dùng để bảo vệ môi trường hiển thị Web.
- **Phản hồi thành công (200 OK)**:
```json
{
  "messages": [
    {
      "id": "msg-17173920...",
      "authorName": "Steamer Pro",
      "authorPhotoUrl": "https://...",
      "messageText": "Giao diện overlay đẹp quá ad ơi! 🔥",
      "isModerator": false,
      "isOwner": false,
      "isSponsor": true,
      "isVerified": false,
      "isSuperChat": false,
      "superChatColor": "",
      "superChatAmountText": "",
      "tier": 1,
      "timestamp": 1717392015000
    }
  ],
  "nextPageToken": "AL9yKbd-LXv...",
  "pollingIntervalMillis": 4000
}
```

---

### 1.3 Đồng bộ thiết lập tùy chọn hiển thị (Settings Sync)
Giúp đồng hồ thiết lập của streamer và hiển thị OBS luôn tương thích và tức thời thông qua bộ nhớ đệm (Cache) trên Server mà không cần ép tải lại nguồn trình duyệt.

- **Lưu thiết lập (Save/Push Settings - Tự động gọi Debounced ngầm)**:
  - **Endpoint**: `POST /api/youtube/settings-sync`
  - **Body Payload**:
  ```json
  {
    "settings": {
      "fontSize": 15,
      "fontFamily": "Inter",
      "textColor": "#ffffff",
      "bgColor": "#0f172a",
      "bgOpacity": 0.85,
      "authorColor": "#bae6fd",
      "moderatorColor": "#34d399",
      "sponsorColor": "#fbbf24",
      "superChatDuration": 45,
      "chatDuration": 0,
      "isTransparent": false,
      "scale": 1,
      "showAvatar": true,
      "showBadges": true,
      "animationType": "fade",
      "useCustomCode": false,
      "customHtml": "",
      "customCss": "",
      "customJs": ""
    }
  }
  ```
  - **Phản hồi thành công**: `{"success": true, "settings": {...}}`

- **Lấy thiết lập hiện tại (Fetch Settings)**:
  - **Endpoint**: `GET /api/youtube/settings-sync`
  - **Phản hồi**: Trả về dữ liệu JSON của cấu hình đã được lưu trữ (bằng bộ nhớ cache trên Server hoặc mặc định ban đầu).

---

## 2. Đặc tả thuật toán Mã hóa & Giải mã URL (`?ob=...`)

Để giấu các tham số nhạy cảm của Streamer và triệt tiêu lỗi 404 trên các nhà mạng Static hosting, hệ thống sử dụng thuật toán nén thông tin mã hóa một dòng như sau:

### 2.1 Cơ chế Đóng mã (Encoding Client-Side)
Toàn bộ thông tin cấu hình và kết nối được lưu thành một chuỗi JSON. Để tránh lỗi vỡ font tiếng Việt từ các trường văn bản, chuỗi được chuyển sang chuỗi an toàn nhị phân trước khi chuyển Base64:
```typescript
const jsonStr = JSON.stringify(config);
// Hỗ trợ đầy đủ UTF-8 cho phông chữ tiếng Việt hoặc ký hiệu đặc biệt
const utf8String = encodeURIComponent(jsonStr).replace(/%([0-9A-F]{2})/g, (match, p1) => {
  return String.fromCharCode(parseInt(p1, 16));
});
const base64 = btoa(utf8String);
// Chuyển Base64 sang dạng an toàn với các liên kết internet (URL Safe Base64)
const urlSafeBase64 = base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
return `${rootUrl}/?ob=${urlSafeBase64}`;
```

### 2.2 Cơ chế Giải mã (Decoding Client-Side)
Khi OBS mở đường dẫn gởi kèm `?ob=...`, mã được chuyển đổi ngược, tự phục hồi cấu hình và áp dụng ngay tại chỗ:
```typescript
let base64 = obParam.replace(/-/g, "+").replace(/_/g, "/");
while (base64.length % 4) {
  base64 += "=";
}
const decodedJsonStr = decodeURIComponent(
  atob(base64)
    .split("")
    .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
    .join("")
);
const decodedParams = JSON.parse(decodedJsonStr);
```

---

## 3. Quy chuẩn Bảo mật & Hiệu năng

- **Bảo mật tối cao cho API Key**: Nhờ thuật toán mã hóa `ob`, không một ai có thể nhìn thấy API Key hoặc Chat ID của streamer bằng mắt thường khi liên kết hiển thị trên OBS hoặc lúc chụp ảnh màn hình, chống rò rỉ và lạm dụng API ngoài ý muốn.
- **Cơ chế Chống XSS**: Sử dụng hàm thanh lọc tin nhắn đầu vào nhằm loại bỏ dấu hiệu của các thẻ HTML độc hại, bảo vệ bảng hiển thị của stream khỏi các sự cố chiếm quyền hay spam nội dung phá hoại.
- **Tối ưu băng thông**: Polling được đồng bộ chặt chẽ ở chu kỳ 4 giây cho tin nhắn, và 3 giây cho cài đặt tự động cập nhật, bảo đảm tốc độ phản hồi tức thì mà vẫn giữ được sự ổn định cho máy chủ và nằm gọn trong phạm vi hạn ngạch miễn phí của YouTube API.

---

## 4. Các trường Cấu hình Chuyển Cảnh (Screen Transition Schema Specifications)

Để lưu giữ dồi dào cấu hình cá nhân hóa và quản lý hoạt ảnh/âm thanh đồng bộ, mô hình dữ liệu `OverlaySettings` mở rộng thêm các trường điều chỉnh chuyển cảnh cụ thể sau đây:

### 4.1 Cấu trúc Dữ liệu Chuyển Cảnh (Properties Models)
- **transitionDuration** (`number`): Thời gian duy trì hiển thị rèm màn hình chuyển tiếp (mặc định: `3` giây, hỗ trợ điều chỉnh từ `1`đến `10` giây).
- **transitionTitle** (`string`): Nhãn văn bản chính đóng vai trò làm Tiêu đề trung tâm (ví dụ: `LIVE STARTING SOON`, `BE RIGHT BACK`).
- **transitionSubtitle** (`string`): Văn bản dòng phụ chú ý (ví dụ: `Chuẩn bị bắt đầu trong giây lát...`).
- **transitionBgType** (`"gradient" | "solid" | "custom_image"`): Định nghĩa chế độ phủ hình nền của phòng chuyển cảnh.
- **transitionBgColor** (`string`): Mã Hex màu đơn sắc được chọn nếu dòng `transitionBgType` sống ở trạng thái `"solid"`.
- **transitionBgGradient** (`string`): Lệnh CSS phối Gradient đa sắc nếu dòng `transitionBgType` sống ở trạng thái `"gradient"`.
- **transitionImageUrl** (`string`): URL liên kết ngoài ảnh nền của streamer.
- **transitionImageBase64** (`string`): Dữ liệu Base64 ảnh Logo chính diện lưu trữ trực tiếp ngoại tuyến.
- **transitionSoundType** (`"none" | "bell" | "pop" | "synth"`): Chỉ định tệp âm thanh phản hồi (bell bính bong, pop tách nghịch ngợm, hoặc sweep kỹ thuật số cao cấp) vang lên đồng thời khi sập rèm.
- **transitionTriggerCount** (`number`): Số lần gia tăng kích phát lệnh. Đóng vai trò là khóa trị số gia tăng. Mỗi khi khóa này tăng lên 1 đơn vị, tất cả các máy Client OBS Overlay đang Long-Polling bắt được sự thay đổi sẽ phát lệnh trigger hoạt cảnh sập rèm và phát chớp Sound FX ngay lập tức.

### 4.2 Nguyên lý Đồng bộ Tải Trọng Kích Phát OBS (Global Event Broadcast)
Bảng điều khiển streamer và OBS Browser Source giao tiếp qua API đồng bộ cấu hình `/api/youtube/settings-sync`:
1. **Lệnh Kích hoạt**: Khi nhấp chọn nút "Kích hoạt chuyển cảnh OBS", Controller sẽ cộng giá trị `transitionTriggerCount` lên `1` đơn vị rồi POST lên server.
2. **OBS Phản xạ**: Overlay OBS chat / transition liên tục thăm dò chu kỳ lấy cấu hình mới. Ngay khi trị số `transitionTriggerCount` thay đổi so với trị số cục bộ hiện tại, OBS sập rèm che bóng toàn phần, phát chớp tín hiệu âm thanh tương ứng, và gỡ rèm sau khoảng thời gian `transitionDuration` giây hoàn toàn đồng bộ, mở ra cảnh game mới mẻ cực kỳ mượt mà.

