# Nhật Ký Thay Đổi (Changelog) 📝

Tất cả các thay đổi đáng chú ý đối với dự án này sẽ được ghi lại trong tệp này. Dự án tuân thủ nghiêm ngặt Quy tắc Đánh số Phiên bản ngữ nghĩa (Semantic Versioning).

---

## [1.0.6] - 2026-06-09

### 🛠️ Sửa lỗi & Tối ưu hóa (Bug Fixes)
- **Sửa triệt để lỗi sập Serverless Function trên Vercel (FUNCTION_INVOCATION_FAILED)**: Giải quyết dứt điểm lỗi nạp module `.ts` bằng kỹ thuật **Pre-Bundling**. Đã di chuyển mã nguồn TypeScript của API về `src/server/api.ts` và tự động biên dịch bằng `esbuild` thành một file JavaScript thuần tự chứa `api/index.js` (dạng ESM, inlined đầy đủ logic của `createApiApp` và `chatInteractivity`) mỗi khi chạy build. Việc đẩy trực tiếp file `api/index.js` đã đóng gói lên Git giúp Vercel thực thi tức thì dưới dạng JS thuần mà không gặp bất kỳ lỗi biên dịch hay định dạng TypeScript nào ở môi trường đám mây.

---

## [1.0.5] - 2026-06-09

### 🚀 Tính năng nổi bật & Nâng cấp lớn (Major Features)
- **Hiển thị Overlay**: Hoàn thành hiển thị giao diện trực quan cho Wheel (Vòng quay), Timer (Đếm ngược thời gian) và Social links (Đường dẫn mạng xã hội).
- **Thiết kế lại toàn bộ giao diện Sprint 7 Dashboard**: Nâng cấp từ giao diện cơ bản sang thiết kế glassmorphism hiện đại với gradient accent neon xanh-tím-hồng, card OBS link có hiệu ứng hover scale, section settings tổ chức rõ ràng theo nhóm chức năng, todo checkbox tùy chỉnh, social link hiển thị nút thao tác khi hover, toast thông báo dạng floating với animation slide-up, và bảng màu chuyên nghiệp tối ưu cho dark mode.
- **Gỡ bỏ Social Links trùng lặp**: Xóa khối Social Links thừa ở đầu trang Sprint 7 Dashboard, giữ lại duy nhất phần quản lý link trong panel Settings.

### 🛠️ Sửa lỗi & Tối ưu hóa (Bug Fixes)
- **Đồng bộ link localhost**: Sửa lỗi lưu trữ link bị sai lệch khi chạy trên `127.0.0.1`, đảm bảo link OBS trên web và trên livestream luôn hiển thị thống nhất là `localhost`.
- **Sửa triệt để lỗi sập Serverless Function trên Vercel (FUNCTION_INVOCATION_FAILED)**: Áp dụng 3 lớp bảo vệ đồng thời: (1) Sử dụng pattern `new Function('m','return import(m)')` để ẩn hoàn toàn module `vite` khỏi mọi static analysis bundler, (2) di chuyển `vite`, `@vitejs/plugin-react`, `@tailwindcss/vite` từ `dependencies` sang `devDependencies` để không cài đặt tại runtime serverless, (3) thêm cấu hình `excludeFiles` trong `vercel.json` loại bỏ dứt khoát các folder `vite`, `esbuild`, `rollup`, `fsevents`, `electron` ra khỏi bundle function.
- **Tắt ghi file log trên môi trường đám mây**: Bỏ qua `fs.appendFileSync` khi phát hiện biến môi trường `VERCEL` để tránh lỗi ghi file trên hệ thống file chỉ-đọc của Lambda.

---

## [1.0.4] - 2026-06-09

### 🚀 Tính năng nổi bật & Nâng cấp lớn (Major Features)
- **Tầng Tương tác & Widget OBS cho Sprint 7**: Thiết lập một lớp widget riêng cho OBS Browser Source với ba route độc lập `/obs-chat`, `/obs-timer`, và `/obs-wheel`. `obs-chat` tích hợp vote A/B, chat roulette, todo list, social links marquee, CSS live editor an toàn và export/import/copy state JSON. `obs-timer` đếm ngược không âm và tự động thay thế bằng text kết thúc khi chạm `00:00`. `obs-wheel` hiển thị wheel of names bằng SVG, ưu tiên lấy danh sách người chat thật khi hệ thống có kết nối live chat.
- **Bộ parser lệnh chat & hệ thống vote**: Bổ sung parser lệnh `!roll <n>`, `!pick`, `!vote A`, `!vote B` trên tầng API backend. Logic vote chống cộng dồn theo `userId`, đảm bảo một người chỉ có một lá phiếu hợp lệ tại một thời điểm.
- **Xuất/nhập trạng thái widget chuẩn hóa**: Chuẩn hóa file JSON xuất ra đúng ba object gốc `todoList`, `customCSS`, và `socialLinks`, đồng thời vẫn duy trì khả năng nạp lại từ payload cũ có wrapper `sprint7` để không phá dữ liệu người dùng hiện có.

### 🛠️ Sửa lỗi & Tối ưu hóa (Bug Fixes)
- **Sửa lỗi timer chạy xuống số âm**: Timer widget được khóa ở `00:00` và thay bằng text kết thúc thay vì tiếp tục giảm sang giá trị âm.
- **Sửa lỗi CSS sai cú pháp gây trắng màn hình**: CSS live editor và cơ chế inject vào `#custom-css-injector` được bảo vệ bằng điều kiện kiểm tra ngoặc nhọn cân bằng, nếu CSS không hợp lệ thì bỏ qua an toàn thay vì làm gãy giao diện.
- **Tách biệt widget khỏi dashboard**: Các widget OBS được render riêng theo route để không lẫn với dashboard điều khiển chính.
- **Wheel of Names ưu tiên dữ liệu thực**: Nếu có `activeLiveChatId` và `apiKey`, wheel widget sẽ tự động lấy danh sách người chat thật từ API YouTube; nếu không có, hệ thống vẫn rơi về danh sách mẫu an toàn để đảm bảo overlay luôn chạy được.

## [1.0.3] - 2026-06-05

### 🚀 Tính năng nổi bật & Nâng cấp lớn (Major Features)
- **Studio Chuyển Cảnh OBS Chuyên Nghiệp (Screen Transition Overlay)**: Đưa tệp Screen Transition trở thành một dạng Overlay OBS Browser độc lập, cung cấp 5 hiệu ứng hoạt ảnh chuyển tiếp cao cấp (🚪 Cửa sập kỹ thuật số Shutter, 💨 Mờ dần Crossfade, ➡️ Trượt ngang Spring Slide, 🔍 Thu phóng Zoom Out, 🔄 Xoay góc 3D Spiral). Streamer hoàn toàn làm chủ thiết kế với tiêu đề, mô tả tùy chọn, và chọn kiểu nền linh hoạt (preset phối Gradient thời thượng, màu đơn sắc, hoặc URL hình ảnh ngoài).
- **Bộ tải Logo thương hiệu Offline (Base64 Logo Uploader)**: Tích hợp trình tải lên logo thương hiệu trực tiếp từ máy tính cá nhân. Ảnh logo sẽ được tự động chuyển đổi sang chuỗi mã hóa Base64 siêu nhẹ gộp thẳng vào thiết lập, giúp OBS Overlay độc mượt mà ngoại tuyến mà không chịu ảnh hưởng của mạng hay đường truyền ngoài.
- **Bàn kích hoạt chuyển cảnh không dây (Trigger OBS Transition)**: Xây dựng bệ phóng kích hoạt chuyển cảnh theo phong cách Stream Deck. Streamer nhấp chọn "Kích hoạt chuyển cảnh OBS" trong bảng điều khiển và sự kiện đồng bộ sẽ được phát ngay lập tức tới mọi luồng Browser Source đang treo trên OBS, nháy phát âm thanh hiệu ứng (bình bong Chime, Pop vui nhộn, hoặc rít kỹ thuật số Sweep) và hoạt cảnh mượt mà trên stream tức thì.
- **Phòng thí nghiệm Motion Sandbox thời gian thực**: Trải nghiệm thực tế ảo hóa WYSIWYG ngay góc bên phải Studio. Streamer dễ dàng kiểm chứng âm thanh, phông chữ, ảnh nền, logo và tốc độ chuyển đổi rèm trực tiếp trước khi áp dụng trên OBS live.

### 🛠️ Sửa lỗi & Tối ưu hóa (Bug Fixes)
- **Tối ưu hiển thị đa thiết bị (Fully Responsive UI)**: Cấu trúc lại giao diện Bảng điều khiển (Control Panel) đảm bảo khả năng tương thích tuyệt vời trên mọi độ phân giải màn hình từ Điện thoại di động, Máy tính bảng (Tablet) cho đến Màn hình viền rộng (PC/Laptop). Các vùng chức năng thông minh tự động thay đổi cấu trúc lưới bento, ẩn/hiện bảng điều khiển phụ và hỗ trợ trượt mượt mà cho trải nghiệm vuốt chạm.
- **Loại bỏ hiệu ứng nhấp nháy trên thanh Điều hướng di động**: Vô hiệu hóa hiệu ứng nhấp nháy (ping/pulse) ở biểu tượng dấu chấm kết nối trên Sidebar Navigator cho giao diện di động, giúp tránh rối mắt và đem lại trải nghiệm nhẹ nhàng, sạch sẽ hơn khi sử dụng.
- **Sửa triệt để lỗi chuyển cảnh lặp vòng trên OBS (Transition Loop & Hot-Reload Fix)**: Thiết kế lại toàn bộ luồng đồng bộ rèm cửa kỹ thuật số (Screen Transition Overlay). Loại bỏ hoàn toàn lỗi vòng lặp đệ quy nháy (flicker overlay) gây đơ Browser Source trên OBS. Tách bạch hoàn toàn biến đếm kích hoạt với luồng render React, giúp mọi hiệu ứng rèm khi bấm chạy mượt mà nguyên khối không đổ trễ.
- **Hợp nhất thiết lập & khử trùng lặp màu điểm nhấn (UI Refactoring)**: Loại bỏ triệt để dải chọn màu điểm nhấn hệ thống trùng lặp trong tab 'Styler'. Thay thế bằng một chiếc Thẻ Điều Hướng Hệ Thống (System Redirect Bridge Card) thông minh hướng dẫn streamers tới 'Cài Đặt Tổng Thể' hoặc 'Studio Chuyển Cảnh', giữ cho giao diện tối giản tinh tế tối đa.
- **Cải tiến sinh liên kết OBS độc lập (Dynamic URL Compiler)**: Tạo hai bộ sinh liên kết an toàn độc lập cho "OBS Chat Overlay" và "OBS Screen Transition Overlay", đi kèm phím sao chép một chạm tiện dụng và hướng dẫn chi tiết.

## [1.0.2] - 2026-06-04

### 🚀 Tính năng mới & Bổ sung nổi bật (New Additions)
- **Hình nền khung chat tùy biến (Background Images)**: Thêm khả năng cá nhân hóa hoàn toàn phông nền chatbox với 4 nguồn ảnh thông minh: họa tiết lưới/mưa chấm nhẹ, các dải màu gradient dốc sống động, liên kết URL hình ảnh ngoài hoặc tệp hình ảnh tải lên trực tiếp từ bộ nhớ máy tính. Streamer cũng có thể tinh chỉnh thanh trượt độ trong suốt (Opacity) và độ nhòe (Blur) để giữ nguyên độ tương phản dễ đọc cho chữ viết chat.
- **Biểu tượng trang trí đồng hành (Tiny Message Icons)**: Tích hợp thư viện biểu tượng trang trí siêu nhỏ đi cùng tin nhắn với 8 icon mặc định cực đẹp (Ngôi sao ⭐, Trái tim ❤️, Lửa cháy 🔥, Pháo hoa ✨, Vương miện 👑, Tay cầm Game 🎮, Tia sét ⚡, Cà phê ☕). Người dùng thoải mái định đoạt vị trí xuất hiện của biểu tượng: Trước tên, Sau tên hoặc Trước nội dung bình luận để tăng độ sinh động cho luồng chat.
- **Hộp "Lưu thay đổi" lơ lửng thông minh (Globally Floating Save Button)**: Loại bỏ toàn bộ các nút lưu tĩnh rải rác ở khắp các phân vùng thiết lập gây bừa bộn. Thay vào đó, một bảng thông báo trạng thái "Chưa lưu thay đổi" hiện đại sẽ tự động hiện lên mượt mà ở góc dưới cùng bên phải màn hình, đồng hành trượt theo con lăn chuột một cách linh hoạt và tự nhiên.

### 🛠️ Sửa lỗi & Tối ưu hóa (Bug Fixes)
- **Sửa lỗi Trắng màn hình do tràn bộ nhớ (QuotaExceeded error & Payload Limits)**: Sửa triệt để lỗi trắng màn hình (cột lỗi sập trang) mỗi khi đăng tải tệp tin âm thanh thông báo hoặc hình nền dung lượng lớn. Nguyên nhân đến từ việc tệp Base64 kích thước lớn vượt quá hạn mức 5MB khắt khe của LocalStorage. Hệ thống đã được nâng cấp lưu trữ Base64 hoàn toàn vào IndexedDB không giới hạn dung lượng, đồng thời nới rộng giới hạn phân tích dữ liệu Express Server lên 15MB, bảo đảm hoạt động thông suốt không bao giờ sập.
- **Khử trùng lặp chuông & Giới hạn phát thử 5 giây**: Sửa lỗi nhạc chuông phát dài vô tận khi nghe thử bằng cách áp đặt cơ chế giới hạn phát tối đa 5 giây đầu tiên. Đồng thời, mỗi khi bấm nút nghe thử mới, hệ thống sẽ tự động dập tắt hoặc dừng ngay luồng âm của lần phát trước đó, chấm dứt hoàn toàn tình trạng chồng đè hỗn tạp tiếng chuông gây khó chịu cho tai người nghe.

## [1.0.1] - 2026-06-03

### 🚀 Triển khai & Phát hành (Deploy App)
- **Triển khai ứng dụng lên môi trường điện toán đám mây**: Cấu hình hoàn chỉnh sản phẩm và phát hành phiên bản web tối ưu hóa tốc độ, sẵn sàng tích hợp thẳng vào nguồn trình duyệt (Browser Source) của OBS Studio.

### 🚀 Tính năng nổi bật & Nâng cấp lớn (Major Features)
- **Cơ chế ghim màn hình Always-On-Top đỉnh cao**: Đưa mức độ ưu tiên ghim của cửa sổ lên cấp độ `"screen-saver"` của Electron kết hợp với việc hiển thị trên mọi Workspace ảo. Giờ đây, overlay sẽ luôn nổi lên trên tất cả ứng dụng khác, kể cả các tựa game đồ họa DirectX/OpenGL hạng nặng đang chạy ở chế độ toàn màn hình không viền (như *Genshin Impact*), loại bỏ hoàn toàn hiện tượng bị game ẩn hoặc đè lên khi đang chơi.
- **Cơ chế chống mất focus**: Tích hợp sự kiện xử lý `blur` trên Electron Main process để lập tức khôi phục trạng thái ghim Always-on-Top kể cả khi game giành quyền kiểm soát thiết bị.
- **Launcher Atom cố định và tối ưu click-through thích ứng**: Nút hình tròn biểu tượng nguyên tử xoay được cố định vĩnh viễn ở góc trên cùng bên trái màn hình bất kể chế độ locked hay unlocked. Khi locked, ứng dụng sử dụng cờ đặc biệt `{ forward: true }` để theo dõi hover. Khi người dùng di chuột vào hình tròn, overlay tạm thời ngắt click-through để bạn bấm được nút mở giao diện; khi di chuột rời đi, quyền click xuyên thấu được trả lại ngay tức khắc cho game.
- **Bảng điều khiển toàn màn hình đắm chìm**: Thay đổi giao diện cửa sổ tùy chỉnh từ dạng hộp thoại kích thước cố định ở trung tâm sang thiết kế toàn màn hình hoàn chỉnh, mượt mà và trực quan vô song.

### 🛠️ Sửa lỗi & Tối ưu hóa (Bug Fixes)
- **Sửa lỗi cú pháp & biên dịch trong App.tsx**: Khắc phục hoàn toàn lỗi phân tách thẻ JSX và biến thể không hợp lệ (lỗi `rootDiv` không tồn tại, lỗi typo `roo if (isDesktopOverlay)`) xảy ra trong quá trình thiết lập Bảng điều khiển không viền.
- **Tối ưu hóa mã nguồn & tương thích hệ thống**: Căn chỉnh chuẩn hóa dự án nhằm đáp ứng hoàn toàn quy chuẩn khắt khe từ trình biên dịch TypeScript (tsc), đảm bảo build hệ thống luôn xanh mượt và tối ưu tốc độ render.

## [1.0.0] - 2026-06-03

Đây là phiên bản khởi đầu đánh dấu một bước chuyển mình lớn từ một ứng dụng điều khiển web đơn thuần sang một giải pháp phần mềm live stream hoàn thiện và có độ liên kết cao (Full-Stack + Desktop).

### 🚀 Tính năng nổi bật & Tạo mới
- **Tạo bảng điều khiển trực quan (Control Panel UI)**: Xây dựng bộ điều chỉnh giao diện (Styling customizer) hoàn mỹ bằng React. Streamer thoải mái tùy biến kích cỡ font, kiểu bong bóng, màu sắc tác giả, huy hiệu đặc vụ hay ẩn/hiện ảnh cá nhân của người xem.
- **Tính năng Đồng bộ Sống (Live Sync Engine)**: Ra mắt cơ chế máy chủ đệm đồng bộ thiết lập. Streamer chỉ cần cấu hình hiển thị, nhấp nút **LƯU THIẾT LẬP & ĐỒNG BỘ** là tệp overlay trong suốt trong OBS tự động cập nhật đổi mới diện mạo tức khắc sau 1 giây, loại bỏ yêu cầu reload nặng nề.
- **Tăng cường Super Chat**: Tiếp nhận cấu hình thu nhập của YouTube API cấp độ gộp (Super Chat Events) để tô vẽ nổi bật vị trí bình luận theo mã màu đặc sắc tương ứng của YouTube.
- **Phục vụ đa kênh API**: Thư viện xử lý phân tích logic URL giúp nhận diện mọi định dạng kết nối buổi phát trực tiếp của YouTube (Kể cả ID video thông thường, liên kết live đầy đủ hoặc video công chiếu trực tiếp Premiere).

### 🛠️ Sửa lỗi & Tối ưu hóa (Bug Fixes)
- **Sửa lỗi Code Signing bị nghẽn (Signtool Stall)**: Khắc phục triệt để lỗi biên dịch gói Windows bị đứng im hay đì trệ ở bước `signing with signtool.exe ... elevate.exe`. Sửa đổi bằng cách thêm `forceCodeSigning: false` vào cấu hình build của `package.json`, bỏ qua quy trình ký chứng chỉ bắt buộc đối với các nhà phát triển nội bộ hay build cá nhân không sở hữu chứng chỉ bản quyền đắt đỏ của Microsoft.
- **Khắc phục lỗi Đen màn hình / Not Found khi chạy file `.exe` di động (Asset Pathing)**:
  - *Nguyên nhân*: Khi đóng gói ứng dụng Electron Portable dưới dạng file thực thi `.exe`, đường dẫn thư mục hiện tại của Node (`process.cwd()`) bị tách biệt với nơi giải nén tệp tài nguyên thực tế của phần mềm, dẫn đến Express không định vị được thư mục `/dist` và hiển thị trang lỗi đen thui chữ "Not Found".
  - *Giải pháp*: Cải tiến hàm tìm kiếm tài nguyên tĩnh trong tệp khởi tạo `server.ts`. Sử dụng kiểm tra kết hợp hai luồng: Nếu môi trường phát hiện có tệp `index.html` cục bộ tại hướng dẫn của bộ nhớ `__dirname` (Nơi tệp bundle đã biên dịch `server.cjs` sinh sống), server sẽ lấy luôn tọa độ tuyệt đối của `__dirname`/dist làm thư mục tĩnh gốc. Nhờ đó, ứng dụng chạy ổn định và hiển thị giao diện mượt mà hết như bản xem trước trên Web!
- **Ngăn ngừa rò rỉ XSS**: Tích hợp module xử lý lành mạnh chuỗi tin nhắn và tên người dùng để ngăn chặn tin tặc chèn mã tấn công vào OBS hoặc khung chat trực quan.

