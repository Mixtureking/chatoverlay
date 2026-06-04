# Nhật ký Thay đổi (Changelog - CHANGELOG) 📜

Tất cả các thay đổi đáng chú ý đối với dự án này sẽ được ghi lại trong tệp này. Dự án tuân thủ nghiêm ngặt Quy tắc Đánh số Phiên bản ngữ nghĩa (Semantic Versioning).

---

## [1.0.3] - 2026-06-04

### 🚀 Tính năng nổi bật & Tùy chỉnh người dùng (Notification Sounds & Workspace Optimization)
- **Hệ thống âm hiệu tin nhắn mới**: Tích hợp công nghệ tổng hợp âm thanh Web Audio API tiên tiến để phát nhạc chuông thông báo trực tiếp khi có bình luận mới xuất hiện. Hỗ trợ 4 bộ âm mặc định du dương (Synth Đôi, Chuông Ngân, Bong Bóng, và Sci-Fi Bleep) chạy mượt mà ngay cả khi không có kết nối internet, đồng thời cho phép streamer tùy biến sử dụng liên kết âm thanh bên ngoài (Custom URL) hoặc trực tiếp đăng tải tệp âm thanh cá nhân (`.mp3`/`.wav`) với khả năng điều chỉnh âm lượng rực rỡ.
- **Xem trước tối ưu không gian**: Tăng kích thước chiều cao khung nhìn của Live Setup Preview lên gấp đôi (từ 420px lên 840px), mở rộng tầm mắt giúp quan sát tổng quan bố cục và nội dung tin nhắn chạy trên luồng dễ dàng hơn.
- **Cơ chế cập nhật chủ động (Cần xác nhận lưu)**: Giao diện Tùy chỉnh Giao diện sẽ không tự động lưu và gửi thông tin thay đổi tới OBS ngay lập tức để tránh làm phiền người xem stream khi bạn đang setup dở. Nút "Lưu & Đồng bộ" thông minh sẽ xuất hiện một cách mượt mà ở phía dưới phần cấu hình chỉ khi phát hiện bất kỳ tùy biến nào khác biệt so với trạng thái cũ.

### 🧹 Tinh giản giao diện & Dọn dẹp (UI Cleanups)
- **Loại bỏ các thành phần rườm rà**: Đã loại bỏ hoàn toàn nút trợ giúp chấm than (`!`) bên cạnh tiêu đề chính "Youtube Chat Overlay" và gỡ bỏ hoàn toàn thẻ giám sát CPU & RAM để tối giản diện tích, đem lại một phong cách hiển thị cao cấp và tập trung tuyệt đối.

### 🚀 Tính năng nổi bật & Nâng cấp bảo mật (Major Security & Real-Time Sync Sync Upgrade)
- **Mã hóa URL cấu hình bảo mật chống rò rỉ (`?ob=...`)**: Sử dụng thuật toán nén thông minh và mã hóa Base64 an toàn cho URL (URL-safe Base64) hỗ trợ đầy đủ ký ký tự UTF-8 (tiện lợi cho phông chữ tiếng Việt). Giờ đây, các thông tin nhạy cảm của streamer bao gồm `liveChatId` và `apiKey` của YouTube API đều được ẩn giấu hoàn toàn dưới dạng mã khóa bảo mật, loại bỏ hoàn toàn khả năng lộ thông tin cấu hình và API key cá nhân khi Streamer chụp màn hình hay hiển thị liên kết trên sóng livestream.
- **Dẫn hướng trực tiếp tại Trang Gốc (Root Routing)**: Khắc phục triệt để lỗi 404 NOT FOUND phổ biến trên các nền tảng máy chủ tĩnh (như Vercel) bằng cách định cấu hình liên kết OBS trỏ trực tiếp về trang gốc `/` kết hợp tham số mã hóa khóa bảo mật `?ob=...`. Hệ thống sẽ tự động giải mã và áp chế giao diện Overlay tinh chuẩn ngay lập tức, đem lại khả năng tương thích tuyệt hảo trên mọi môi trường máy chủ đám mây.
- **Tự động Đồng bộ hóa Không Gián đoạn (Debounced Live Sync Auto-Updates)**: Thiết lập bộ phát hiện thay đổi tự động (Automatic Settings Syncer) với bộ trễ tối ưu 500ms (Debounce). Mỗi khi streamer thực hiện thay đổi nhỏ trên thanh trượt (slider), vòng chọn màu sắc (color picker) hay hộp kiểm (checkbox), cấu hình mới sẽ lập tức được lưu vào cache của máy chủ ngầm một cách lặng lẽ. Khung overlay bên OBS sẽ cập nhật giao diện hiển thị ngay lập tức mà streamer không cần nhấn nút tải lại, cung cấp dịch vụ điều khiển phản hồi tức thì với độ trễ cực thấp.
- **Cải tiến chu kỳ Polling tin nhắn**: Triển khai cơ hệ đệm tin nhắn thông minh giúp phát hiện sự thay đổi luồng trò chuyện và xóa bớt tin nhắn thừa, giữ tần suất truy xuất của OBS cố định ở mức 4 giây (theo sát thời gian phân trang của YouTube Live Chat) để triệt tiêu lỗi quá tải hạn ngạch API (Quota Limits).

---

## [1.0.2] - 2026-06-03

### 🚀 Tính năng nổi bật & Nâng cấp lớn (Major Features)
- **Cơ chế ghim màn hình Always-On-Top đỉnh cao**: Đưa mức độ ưu tiên ghim của cửa sổ lên cấp độ `"screen-saver"` của Electron kết hợp với việc hiển thị trên mọi Workspace ảo. Giờ đây, overlay sẽ luôn nổi lên trên tất cả ứng dụng khác, kể cả các tựa game đồ họa DirectX/OpenGL hạng nặng chạy ở chế độ toàn màn hình không viền (như *Genshin Impact*), loại bỏ hoàn toàn hiện tượng bị game ẩn hoặc đè lên khi đang chơi.
- **Cơ chế chống mất focus**: Tích hợp sự kiện xử lý `blur` trên Electron Main process để lập tức khôi phục trạng thái ghim Always-on-Top kể cả khi game giành quyền kiểm soát thiết bị.
- **Launcher Atom cố định và tối ưu click-through thích ứng**: Nút hình tròn biểu tượng nguyên tử xoay được cố định vĩnh viễn ở góc trên cùng bên trái màn hình bất kể chế độ locked hay unlocked. Khi locked, ứng dụng sử dụng cờ đặc biệt `{ forward: true }` để theo dõi hover. Khi người dùng di chuột vào hình tròn, overlay tạm thời ngắt click-through để bạn bấm được nút mở giao diện; khi di chuột rời đi, quyền click xuyên thấu được trả lại ngay tức khắc cho game.
- **Bảng điều khiển toàn màn hình đắm chìm**: Thay đổi giao diện cửa sổ tùy chỉnh từ dạng hộp thoại kích thước cố định ở trung tâm sang thiết kế toàn màn hình hoàn chỉnh, mượt mà và trực quan vô song.

## [1.0.1] - 2026-06-03

### 🛠️ Sửa lỗi & Tối ưu hóa (Bug Fixes)
- **Sửa lỗi cú pháp & biên dịch trong App.tsx**: Khắc phục hoàn toàn lỗi phân tách thẻ JSX và biến thể không hợp lệ (lỗi `rootDiv` không tồn tại, lỗi typo `roo if (isDesktopOverlay)`) xảy ra trong quá trình thiết lập Bảng điều khiển không viền.
- **Tối ưu hóa mã nguồn & tương thích hệ thống**: Căn chỉnh chuẩn hóa dự án nhằm đáp ứng hoàn toàn quy chuẩn khắt khe từ trình biên dịch TypeScript (tsc), đảm bảo build hệ thống luôn xanh mượt và tối ưu tốc độ render.

## [1.0.0] - 2026-06-03

Đây là phiên bản khởi đầu đánh dấu một bước chuyển mình lớn từ một ứng dụng điều khiển web đơn thuần sang một giải pháp phần mềm live stream hoàn thiện và có độ liên kết cao (Full-Stack + Desktop).

### 🚀 Tính năng nổi bật & Tạo mới
- **Tạo bảng điều khiển trực quan (Control Panel UI)**: Xây dựng bộ điều chỉnh giao diện (Styling customizer) hoàn mĩ bằng React. Streamer thoải mái tùy biến kích cỡ font, kiểu bong bóng, màu sắc tác giả, huy hiệu đặc vụ hay ẩn/hiện ảnh cá nhân của người xem.
- **Tính năng Đồng bộ Sống (Live Sync Engine)**: Ra mắt cơ chế máy chủ đệm đồng bộ thiết lập. Streamer chỉ cần cấu hình hiển thị, nhấp nút **LƯU THIẾT LẬP & ĐỒNG BỘ** là tệp overlay trong suốt trong OBS tự động cập nhật đổi mới diện mạo tức khắc sau 1 giây, loại bỏ yêu cầu reload nặng nề.
- **Tăng cường Super Chat**: Tiếp nhận cấu hình thu nhập của YouTube API cấp độ gộp (Super Chat Events) để tô vẽ nổi bật vị trí bình luận theo mã màu đặc sắc tương ứng của YouTube.
- **Phục vụ đa kênh API**: Thư viện xử lý phân tích logic URL giúp nhận diện mọi định dạng kết nối buổi phát trực tiếp của YouTube (Kể cả ID video thông thường, liên kết live đầy đủ hoặc video công chiếu trực tiếp Premiere).

### 🛠️ Sửa lỗi & Tối ưu hóa (Bug Fixes)
- **Sửa lỗi Code Signing bị nghẽn (Signtool Stall)**: Khắc phục triệt để lỗi biên dịch gói Windows bị đứng im hay đình trệ ở bước `signing with signtool.exe ... elevate.exe`. Sửa đổi bằng cách thêm `forceCodeSigning: false` vào cấu hình build của `package.json`, bỏ qua quy trình ký chứng chỉ số bắt buộc đối với các nhà phát triển nội bộ hay build cá nhân không sở hữu chứng chỉ bản quyền đắt đỏ của Microsoft.
- **Khắc phục lỗi Đen màn hình / Not Found khi chạy file `.exe` di động (Asset Pathing)**:
  - *Nguyên nhân*: Khi đóng gói ứng dụng Electron Portable dưới dạng file thực thi `.exe`, đường dẫn thư mục hiện tại của Node (`process.cwd()`) bị tách biệt với nơi giải nén tệp tài nguyên thực tế của phần mềm, dẫn đến Express không định vị được thư mục `/dist` và hiển thị trang lỗi đen thui chữ "Not Found".
  - *Giải pháp*: Cải tiến hàm tìm kiếm tài nguyên tĩnh trong tệp khởi tạo `server.ts`. Sử dụng kiểm tra kết hợp hai luồng: Nếu môi trường phát hiện có tệp `index.html` cục bộ tại hướng dẫn của bộ nhớ `__dirname` (Nơi tệp bundle đã biên dịch `server.cjs` sinh sống), server sẽ lấy luôn tọa độ tuyệt đối của `__dirname`/dist làm thư mục tĩnh gốc. Nhờ đó, ứng dụng chạy ổn định và hiển thị giao diện mượt mà hệt như bản xem trước trên Web!
- **Ngăn ngừa rò rỉ XSS**: Tích hợp module xử lý lành mạnh chuỗi tin nhắn và tên người dùng để ngăn chặn tin tặc chèn mã tấn công vào OBS hoặc khung chat trực quan.
