# Sprint 7 - Version 1.0.3

Sprint 7 adds the interactivity and widget layer for OBS broadcast screens.

## Folder Structure

```text
server.ts
src/server/chatInteractivity.ts
src/components/sprint7/Sprint7Widgets.tsx
src/components/sprint7/sprint7State.ts
src/index.css
src/types.ts
docs/SPRINT7_1.0.3.md
public/doro.png
```

## OBS Widget Routes

Use one Express server and separate OBS browser sources by route:

```text
http://localhost:3000/obs-chat
http://localhost:3000/obs-timer
http://localhost:3000/obs-wheel
```

Each route renders only the matching widget.

## Interactivity APIs

Parse a chat command:

```http
POST /api/interactivity/chat-command
Content-Type: application/json

{
  "userId": "youtube-channel-id",
  "messageText": "!vote A"
}
```

Vote state:

```http
GET /api/interactivity/votes
POST /api/interactivity/votes
DELETE /api/interactivity/votes
```

`POST /api/interactivity/votes` accepts:

```json
{
  "userId": "youtube-channel-id",
  "option": "A"
}
```

Duplicate votes from the same `userId` are rejected and do not increment totals.

## Chat Commands

Supported command formats:

```text
!roll 20
!pick
!vote A
!vote B
```

Messages that do not start with `!` are ignored by the parser.

## Sprint 7 Widget State

The Sprint 7 state exported by the widget and dashboard uses the required top-level keys:

```json
{
  "todoList": [],
  "customCSS": "",
  "socialLinks": {}
}
```

The import flow is backward compatible with older payloads that wrapped the Sprint 7 object under `sprint7`.

## Widgets

### Chat Widget
- Vote bar A/B with real-time updates.
- Chat roulette with `cyberpunk-glitch`.
- Todo list with add, edit, delete, toggle, clear, and reset.
- Social links marquee with add, edit, delete, reset.
- Live CSS editor with safe injection into `#custom-css-injector`.
- Export, import, and copy state JSON.

### Timer Widget
- Countdown timer in `mm:ss`.
- Clamps at `00:00`.
- Displays completion text when finished.

### Wheel Widget
- SVG wheel with proper arc-segment geometry and 60fps rotation.
- Wheel center uses `<g id="center">` with Doro mascot image (`/doro.png`).
- Center counter-rotates to stay upright at all times.
- Prefers live chat authors when YouTube settings are available.
- Falls back to default names safely when not connected.
- Pink arrow pointer indicator at top.
- Multi-color segments with neon glow border.

## CSS Requirements

Implemented selectors:

```css
#custom-css-injector
.cyberpunk-glitch
.arwass-logo
```

`.arwass-logo` uses `object-fit: contain` to preserve the logo ratio.

## Acceptance Checklist

- `GET /obs-chat` renders chat widgets.
- `GET /obs-timer` renders the countdown timer.
- `GET /obs-wheel` renders the wheel only.
- Wheel center contains `<g id="center">` with Doro image `/doro.png`.
- Doro image stays upright (counter-rotating) while wheel spins.
- Timer clamps at `00:00` and then shows done text.
- Todo completed items render with strike-through.
- CSS editor injects valid CSS into `#custom-css-injector`.
- Unbalanced CSS braces are skipped to prevent a blank screen.
- Export/import restores `todoList`, `customCSS`, and `socialLinks`.

---

## Phụ lục Đặc tả Sản phẩm — YouTube Chat Overlay

**Phạm vi bổ sung:** Bộ tiện ích Tương tác & Nâng cấp Giao diện Người dùng  
**Dải mã định danh:** US-41 → US-50 | PP-23 → PP-27 | PB-48 → PB-57 | AC-87 → AC-102 | UT-121 → UT-135

---

## Tính năng nổi bật

### Công cụ tương tác cộng đồng
- **Mini game từ chat** — người xem nhập lệnh `!roll`, `!pick`, `!vote A/B` trong chat, kết quả được phản ánh ngay trên màn hình phát sóng
- **Wheel of names** — chọn người chiến thắng ngẫu nhiên từ tập hợp người đã tham gia, hiển thị hiệu ứng quay vòng trực tiếp trong OBS
- **Chat roulette** — làm nổi bật ngẫu nhiên một bình luận trong luồng chat kèm hiệu ứng đặc biệt
- **Countdown timer** — bộ đếm thời gian "Buổi phát bắt sóng sau X phút" xuất hiện trước khi khởi đầu stream

### Các thành phần hiển thị mở rộng
- **To-do list overlay** — người dẫn stream nhập danh sách công việc, hiển thị tại góc màn hình cho khán giả nắm bắt tiến trình
- **Social links bar** — dải thông tin dạng cuộn giới thiệu trang mạng xã hội, kênh Discord và liên kết ủng hộ

### Tuỳ biến giao diện & Cấu hình chuyên sâu
- **CSS editor trực tiếp** — vùng soạn thảo CSS linh hoạt, áp dụng tức thì mà không cần khởi động lại
- **Sao lưu và tải lại** toàn bộ cài đặt dưới định dạng `.json` nhằm lưu trữ hoặc trao đổi cấu hình với các streamer khác

---

## 1. DANH SÁCH USER STORY PHÁT SINH (Bản cập nhật 1.0.3)

| ID | Vai trò | Yêu cầu chức năng | Mục tiêu đạt được | Độ ưu tiên |
|---|---|---|---|---|
| US-41 | Streamer | Triển khai mini game điều khiển bằng lệnh chat (!roll, !pick, !vote) với kết quả được cập nhật trực tiếp trên overlay | Thúc đẩy mức độ tham gia của người xem và kéo dài thời gian họ ở lại kênh | Must Have |
| US-42 | Streamer | Tích hợp tính năng "Wheel of names" trong đó nhân vật đại diện Doro được đặt tại tâm của bánh xe xoay | Chọn người chiến thắng theo cách thú vị và nhất quán với hình ảnh thương hiệu kênh | Must Have |
| US-43 | Streamer | Kích hoạt "Chat roulette" kết hợp hiệu ứng hình ảnh theo phong cách sci-fi/cyberpunk | Làm nổi bật bất ngờ một bình luận bất kỳ nhằm tạo yếu tố hứng thú và khuyến khích người xem nhắn tin nhiều hơn | Should Have |
| US-44 | Streamer | Đặt bộ đếm ngược ("Bắt đầu phát sóng sau X phút") hiển thị trước khi buổi stream chính thức khai mạc | Người xem nắm rõ thời điểm bắt đầu để không bỏ lỡ nội dung | Must Have |
| US-45 | Streamer | Có thể đặt danh sách nhiệm vụ riêng biệt, hiển thị ở góc màn hình stream | Khán giả dễ dàng bắt kịp tiến trình các mục tiêu đang được thực hiện trong buổi phát sóng | Should Have |
| US-46 | Streamer | Triển khai thanh liên kết mạng xã hội (Instagram, Discord) tích hợp logo Arwass chạy ngang màn hình | Mở rộng tiếp cận trên nhiều kênh. Logo thương hiệu phải giữ nguyên tỷ lệ và không bị biến dạng ở bất kỳ kích thước nào | Must Have |
| US-47 | Streamer | Tích hợp trình soạn thảo CSS nội tuyến ngay trong bảng điều khiển | Tuỳ biến tự do phong cách hiển thị của overlay với phản hồi tức thì, không cần tải lại ứng dụng | Must Have |
| US-48 | Streamer | Xuất/nhập toàn bộ cấu hình hệ thống (kể cả các widget bổ sung) thành tập tin .json | Bảo toàn các thiết lập phức tạp hoặc phổ biến bố cục giao diện cho cộng đồng streamer | Should Have |

---

## 20. VẤN ĐỀ CẦN GIẢI QUYẾT (BỔ SUNG)

| ID | Pain Point | Diễn giải cụ thể | Mức nghiêm trọng | US tương ứng |
|---|---|---|---|---|
| PP-23 | Thiếu hụt tính năng giao tiếp hai chiều theo thời gian thực | Người xem chỉ bình luận một chiều mà không có sự phản hồi trực quan. Người dẫn stream buộc phải dùng công cụ bên ngoài (như wheelofnames.com) và chia sẻ màn hình vào OBS, tạo ra quy trình phức tạp không cần thiết. | Rất cao | US-41, US-42, US-43 |
| PP-24 | Gánh nặng quản lý nguồn trình duyệt trong OBS | Mỗi tiện ích như Countdown timer, To-do list hay Social Bar thường yêu cầu một Browser Source riêng biệt, khiến OBS cồng kềnh và khó duy trì tính nhất quán về giao diện. | Cao | US-44, US-45, US-46 |
| PP-25 | Méo mó hình ảnh thương hiệu | Các widget phổ biến trên internet thường không bảo toàn tỷ lệ logo khi thay đổi kích thước, vi phạm tiêu chuẩn nhận diện thương hiệu đã được thiết lập. | Rất cao | US-46 |
| PP-26 | Hạn chế trong khả năng tùy biến giao diện | Bộ cài đặt giao diện mặc định không thể đáp ứng nhu cầu tùy biến nâng cao. Những streamer am hiểu kỹ thuật cần khả năng nhúng CSS trực tiếp, nhưng công cụ hiện có chưa hỗ trợ cơ chế cập nhật thời gian thực. | Cao | US-47 |

---

## 21. PRODUCT BACKLOG MỤC TIÊU (Sprint 7)

**Tổng khối lượng: 61 Story Points (SP)**, ưu tiên xây dựng tầng Tương tác & tầng Widget.

| ID | Hạng mục | Chi tiết triển khai | US | SP | Mức độ ưu tiên | Status |
|---|---|---|---|---|---|---|
| PB-48 | Chat Command Parser | Bộ máy xử lý regex theo dõi và phân tích cú pháp các lệnh !roll, !pick, !vote A/B từ dòng dữ liệu API chat. | US-41 | 8 | Must Have | ✅ Done |
| PB-49 | Mini Game Render UI | Thành phần giao diện trực tiếp phản ánh kết quả bỏ phiếu (dạng thanh phần trăm) và kết quả xúc xắc (roll) lên màn hình. | US-41 | 8 | Must Have | ✅ Done |
| PB-50 | Wheel of Names Widget | Thành phần vòng quay SVG/Canvas kết hợp nhân vật Doro. Tự động tổng hợp danh sách người dùng đã bình luận để đưa vào vòng quay. | US-42 | 8 | Must Have | ✅ Done |
| PB-51 | Chat Roulette Animation | Cơ chế làm nổi bật bình luận được chọn ngẫu nhiên, áp dụng hiệu ứng thị giác sci-fi/cyberpunk (glitch và viền neon phát sáng). | US-43 | 5 | Should Have | ✅ Done |
| PB-52 | Countdown Timer Widget | Widget hiển thị bộ đếm ngược, hỗ trợ nhập khoảng thời gian (phút/giây) và tự động thay thế nội dung khi hết giờ. | US-44 | 5 | Must Have | ✅ Done |
| PB-53 | To-do List Overlay | Giao diện quản lý nhiệm vụ (thêm/sửa/xóa) tích hợp trong bảng điều khiển, đồng bộ hiển thị danh sách kiểm tra minh bạch lên OBS. | US-45 | 5 | Should Have | ✅ Done |
| PB-54 | Social Links Bar | Dải thông tin dạng cuộn (marquee) hiển thị các liên kết, nhúng logo Arwass với thuộc tính CSS object-fit: contain bắt buộc nhằm bảo toàn tỷ lệ hình ảnh. | US-46 | 5 | Must Have | ✅ Done |
| PB-55 | CSS Live Editor | Vùng soạn thảo tích hợp tô màu cú pháp cơ bản (PrismJS/CodeMirror), tiêm trực tiếp khối `<style>` vào OBS theo thời gian thực thông qua API. | US-47 | 8 | Must Have | ✅ Done |
| PB-56 | Full State JSON Config | Nâng cấp hệ thống xuất/nhập JSON nhằm đóng gói đầy đủ trạng thái của Chat, Timer, Social Bar và CSS Editor. | US-48 | 4 | Should Have | ✅ Done |
| PB-57 | Widget Route Multiplexing | Phân tách các widget thành các đường dẫn URL độc lập (/obs-chat, /obs-timer, /obs-wheel) vận hành trên cùng một Express server. | System | 5 | Must Have | ✅ Done |

---

## 22. TIÊU CHÍ HOÀN THÀNH (DoD) — Sprint 7 (Tương tác & Widget)

| # | Tiêu chí DoD | Cách kiểm tra / Verify | Pass? |
|---|---|---|---|
| 1 | Lệnh chat hoạt động tức thời theo thời gian thực | Nhập !roll 100 trong chat, overlay phản ánh kết quả ngẫu nhiên từ 1-100 trong vòng dưới 1 giây. | [ ] |
| 2 | Vòng quay Wheel of Names hiển thị chính xác | Vòng quay chạy mượt mà ở 60fps, nhân vật Doro xuất hiện sắc nét tại tâm, không có hiện tượng vỡ điểm ảnh. | [ ] |
| 3 | Chat Roulette đúng phong cách thiết kế | Bình luận được chọn phải áp dụng đúng bộ lọc CSS/shader chuẩn sci-fi/cyberpunk (viền phát sáng neon và rung hình glitch nhẹ). | [ ] |
| 4 | Danh sách nhiệm vụ đồng bộ tức thì | Khi thêm nhiệm vụ trong Control Panel, danh sách bên OBS phải được cập nhật ngay lập tức. | [ ] |
| 5 | Logo Arwass được bảo toàn tuyệt đối về tỷ lệ | Dù thay đổi kích thước thanh Social Bar theo hướng nào, logo phải giữ nguyên tỷ lệ ban đầu, không bị kéo dài hoặc nén bẹp. | [ ] |
| 6 | CSS Live Editor hoạt động đúng chức năng | Nhập `body { display: none; }` trong Editor, overlay biến mất tức thì. Xoá nội dung đó, overlay khôi phục lại. | [ ] |
| 7 | Khôi phục hoàn toàn từ JSON | Xuất cấu hình, chuyển sang thiết bị khác, nhập lại -> Toàn bộ Widget, CSS tùy chỉnh và To-do list phải được phục hồi nguyên vẹn. | [ ] |

---

## 23. TIÊU CHÍ CHẤP NHẬN BỔ SUNG (AC-87 → AC-102)

| Mã AC | US tham chiếu | Tình huống kiểm tra | Điều kiện ban đầu | Khi thực hiện | Kết quả kỳ vọng | Mức độ quan trọng |
|---|---|---|---|---|---|---|
| AC-87 | US-41 | Phản hồi lệnh !vote | Người dẫn stream kích hoạt chế độ Bỏ phiếu A/B trong bảng điều khiển | Người xem nhập lệnh !vote A | Thanh tiến trình trên overlay phản ánh tức thì tỷ lệ phần trăm cho lựa chọn A | Critical |
| AC-88 | US-41 | Ngăn chặn bình chọn trùng lặp | Một người dùng đã bỏ phiếu !vote A trước đó | Người dùng đó nhập thêm !vote B | Hệ thống chỉ ghi nhận một lần bỏ phiếu (lần cuối hoặc lần đầu) theo cấu hình, không tính cộng dồn | High |
| AC-89 | US-42 | Wheel of Names hiển thị nhân vật đại diện | Widget Wheel đang được bật và hiển thị trong OBS | Vòng quay bắt đầu hoạt động | Nhân vật Doro hiển thị cố định hoặc với hiệu ứng chuyển động nhẹ tại trung tâm vòng quay | High |
| AC-90 | US-42 | Tính ngẫu nhiên công bằng | Danh sách bình luận có 10 người dùng | Người dẫn stream nhấn nút "Quay" | Vòng quay dừng theo kết quả ngẫu nhiên với xác suất đồng đều, hiển thị tên người chiến thắng qua thông báo popup | Critical |
| AC-91 | US-43 | Hiệu ứng Chat Roulette | Người dẫn stream bật tính năng Chat Roulette | Quá trình chọn dừng lại tại một bình luận cụ thể | Bình luận được làm nổi bật bằng khung viền neon phong cách cyberpunk, hiệu ứng glitch trong 0.5 giây rồi dừng lại | Medium |
| AC-92 | US-44 | Bộ đếm ngược hoạt động chính xác | Bộ đếm được thiết lập với mốc 5 phút | Sau khi 1 phút trôi qua | Màn hình overlay hiện 04:00, tự động thay bằng thông báo kết thúc khi chạm mốc 00:00 | High |
| AC-93 | US-45 | Chuyển đổi trạng thái nhiệm vụ | Nhiệm vụ "Đánh boss" đang được hiển thị trên overlay | Người dẫn stream đánh dấu "Hoàn thành" trong bảng điều khiển | Văn bản "Đánh boss" hiển thị trong OBS được thêm gạch ngang (strike-through) | High |
| AC-94 | US-46 | Bảo toàn tỷ lệ Logo tuyệt đối | Thanh Social Bar đang hiển thị logo Arwass | Vùng chứa được thay đổi từ 100px lên 500px về chiều ngang | Thuộc tính CSS object-fit: contain được áp dụng bắt buộc, logo không bị méo hay nén | Critical |
| AC-95 | US-46 | Thanh liên kết cuộn ngang mượt mà | Thanh Social Bar được bật chế độ cuộn Marquee | Nội dung vượt chiều ngang của overlay | Văn bản và biểu tượng cuộn từ phải qua trái một cách liền mạch (dùng CSS animation) | High |
| AC-96 | US-47 | Nhúng CSS tùy chỉnh tức thời | Overlay đang hoạt động bình thường | Người dùng nhập `.chat-message { background: red; }` vào editor | Khung hiển thị chat đổi màu nền sang đỏ tức thì mà không cần tải lại trang | Critical |
| AC-97 | US-47 | Xử lý lỗi cú pháp CSS không gây sập ứng dụng | Trình soạn thảo CSS đang được mở | Người dùng nhập cú pháp sai (ví dụ: thiếu dấu ngoặc `}`) | Overlay không bị lỗi trắng màn hình, quy tắc CSS sai được bỏ qua một cách kiểm soát | High |
| AC-98 | US-48 | File JSON bao gồm đầy đủ CSS và trạng thái Widget | Thực hiện xuất cấu hình ra file JSON | Kiểm tra nội dung file JSON bằng trình soạn thảo văn bản | File phải bao gồm mảng todoList, đối tượng customCSS và socialLinks | Critical |

---

## 24. DANH MỤC KIỂM THỬ ĐƠN VỊ TOÀN DIỆN (UT-121 → UT-135)

Đảm bảo mức độ phủ mã nguồn (Code Coverage) đầy đủ cho tầng tương tác và logic xử lý Widget.

| Test ID | Thành phần | Ca kiểm thử | Điều kiện đầu vào | Kết quả mong đợi | Loại kiểm thử | Pass |
|---|---|---|---|---|---|---|
| UT-121 | CommandParser | Trích xuất chính xác tham số từ lệnh !roll | Nội dung tin nhắn: `!roll 100` | Hệ thống phải trả về `{ command: 'roll', value: 100 }` | Unit | [ ] |
| UT-122 | CommandParser | Loại bỏ các chuỗi giống lệnh nhưng không đúng định dạng | Nội dung tin nhắn: `tôi vote A nhé` | Kết quả phải là null vì lệnh không bắt đầu bằng ký tự `!` | Unit | [ ] |
| UT-123 | VoteManager | Tính toán tỷ lệ phần trăm đúng | 3 lượt bỏ phiếu cho A và 1 lượt cho B | Kết quả tính toán: A chiếm 75%, B chiếm 25% | Unit | [ ] |
| UT-124 | WheelEngine | Tạo đủ số phân vùng trên vòng quay | Đầu vào là danh sách 5 người dùng | Vòng quay được phân thành 5 phần góc bằng nhau, mỗi phần 72 độ | Unit | [ ] |
| UT-125 | WheelEngine | Nhúng đúng URL ảnh nhân vật đại diện | Cây render SVG được khởi tạo | Phần tử `<img>` với src `/doro.png` được chèn vào vùng center | Unit | [ ] |
| UT-126 | RouletteAnim | Lớp CSS phong cách Cyberpunk được thêm đúng chỗ | Chế độ active, đối tượng đích đã được xác định | `element.classList.contains('cyberpunk-glitch') == true` | Unit | [ ] |
| UT-127 | TimerStore | Ngăn bộ đếm xuống giá trị âm | Thời gian còn lại bằng 0 | Sau khi hàm Tick được gọi, giá trị phải duy trì ở mức 0 | Edge | [ ] |
| UT-128 | TodoStore | Cập nhật trạng thái nhiệm vụ | Đầu vào: task ID = 1, thực hiện toggle trạng thái | Trạng thái nhiệm vụ phải chuyển từ pending thành done | Unit | [ ] |
| UT-129 | SocialBar | Kiểm tra khóa tỷ lệ logo qua CSS | Component React được render | Thuộc tính inline style hoặc lớp CSS phải bắt buộc có `object-fit: contain` | Unit | [ ] |
| UT-130 | CSSEditor | Chèn thẻ style vào DOM | Đầu vào: chuỗi CSS = `body { margin: 0 }` | Trong DOM phải có phần tử `<style id="custom-css-injector">body { margin: 0 }</style>` | Integration | [ ] |
| UT-131 | CSSEditor | Cập nhật hoặc xóa thẻ style | Chuỗi CSS đầu vào được thay đổi | Thẻ style cũ phải bị thay thế, không được tạo ra nhiều thẻ `<style>` thừa trong DOM | Unit | [ ] |
| UT-132 | Multiplexer | Định tuyến /obs-timer phản hồi đúng nội dung | Thực hiện yêu cầu HTTP GET đến /obs-timer | Phải trả về HTML chứa widget Timer, không bao gồm giao diện Chat | Integration | [ ] |
| UT-133 | FullConfigStore | Quá trình xuất JSON không làm mất dữ liệu | Store đang lưu 5 nhiệm vụ To-do, CSS tùy chỉnh và cấu hình Social | Dữ liệu JSON được tuần tự hóa phải chứa đầy đủ các khóa cần thiết | Unit | [ ] |
| UT-134 | E2E | Luồng bỏ phiếu A/B phản ánh lên OBS | Khởi động phiên Vote -> Mô phỏng 3 tin nhắn chat `!vote A` | Trang /obs-chat phải cập nhật thanh Bar A lên 100% trong vòng dưới 1 giây | E2E | [ ] |
| UT-135 | E2E | CSS Editor ghi đè cấu hình trực tiếp | Nhập CSS trong bảng điều khiển để thay đổi font thành monospace | Trang /obs-chat phải áp dụng `font-family: monospace` ngay lập tức | E2E | [ ] |

---

## Verification

Install dependencies first:

```powershell
npm install
npm run lint
npm run dev
```

Open the OBS routes above in a browser or OBS Browser Source.
