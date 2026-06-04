# Nhật ký Thay đổi (Changelog - CHANGELOG) 📜

Tất cả các thay đổi đáng chú ý đối với dự án này sẽ được ghi lại trong tệp này. Dự án tuân thủ nghiêm ngặt Quy tắc Đánh số Phiên bản ngữ nghĩa (Semantic Versioning).

---

## [1.0.2] - 2026-06-04

### 🚀 Tính năng mới & Bổ sung nổi bật (New Additions)
- **Hình nền khung chat tùy biến (Background Images)**: Thêm khả năng cá nhân hóa hoàn toàn phông nền chatbox với 4 nguồn ảnh thông minh: họa tiết lưới/mưa chấm nhẹ, các dải màu gradient dốc sống động, liên kết URL hình ảnh ngoài hoặc tệp hình ảnh tải lên trực tiếp từ bộ nhớ máy tính. Streamer cũng có thể tinh chỉnh thanh trượt độ trong suốt (Opacity) và độ nhòe (Blur) để giữ nguyên độ tương phản dễ đọc cho chữ viết chat.
- **Biểu tượng trang trí đồng hành (Tiny Message Icons)**: Tích hợp thư viện biểu tượng trang trí siêu nhỏ đi cùng tin nhắn với 8 icon mặc định cực đẹp (Ngôi sao ⭐, Trái tim ❤️, Lửa cháy 🔥, Pháo hoa ✨, Vương miện 👑, Tay cầm Game 🎮, Tia sét ⚡, Cà phê ☕). Người dùng thoải mái định đoạt vị trí xuất hiện của biểu tượng: Trước tên, Sau tên hoặc Trước nội dung bình luận để tăng độ sinh động cho luồng chat.
- **Hộp "Lưu thay đổi" lơ lửng thông minh (Globally Floating Save Button)**: Loại bỏ toàn bộ các nút lưu tĩnh rải rác ở khắp các phân vùng thiết lập gây bừa bộn. Thay vào đó, một bảng thông báo trạng thái "Chưa lưu thay đổi" hiện đại sẽ tự động hiện lên mượt mà ở góc dưới cùng bên phải màn hình, đồng hành trượt theo con lăn chuột một cách linh hoạt và tự nhiên.

### 🛠️ Sửa lỗi & Tối ưu hóa (Bug Fixes)
- **Sửa lỗi Trắng màn hình do tràn bộ nhớ (QuotaExceeded error & Payload Limits)**: Sửa triệt để lỗi trắng màn hình (cột lỗi sập trang) mỗi khi đăng tải tệp tin âm thanh thông báo hoặc hình nền dung lượng lớn. Nguyên nhân đến từ việc tệp Base64 kích thước lớn vượt quá hạn mức 5MB khắt khe của LocalStorage. Hệ thống đã được nâng cấp lưu trữ Base64 hoàn toàn vào IndexedDB không giới hạn dung lượng, đồng thời nới rộng giới hạn phân tích dữ liệu Express Server lên 15MB, bảo đảm hoạt động thông suốt không bao giờ sập.
- **Khử trùng lặp chuông & Giới hạn phát thử 5 giây**: Sửa lỗi nhạc chuông phát dài vô tận khi nghe thử bằng cách áp đặt cơ chế giới hạn phát tối đa 5 giây đầu tiên. Đồng thời, mỗi khi bấm phím nghe thử mới, hệ thống sẽ tự động dập tắt hoặc dừng ngay luồng âm của lần phát trước đó, chấm dứt hoàn toàn tình trạng chồng đè hỗn tạp tiếng chuông gây khó chịu cho tai người nghe.

## [1.0.1] - 2026-06-03

### 🚀 Triển khai & Phát hành (Deploy App)
- **Triển khai ứng dụng lên môi trường điện toán đám mây**: Cấu hình hoàn chỉnh sản phẩm và phát hành phiên bản web tối ưu hóa tốc độ, sẵn sàng tích hợp thẳng vào nguồn trình duyệt (Browser Source) của OBS Studio.

### 🚀 Tính năng nổi bật & Nâng cấp lớn (Major Features)
- **Cơ chế ghim màn hình Always-On-Top đỉnh cao**: Đưa mức độ ưu tiên ghim của cửa sổ lên cấp độ `"screen-saver"` của Electron kết hợp với việc hiển thị trên mọi Workspace ảo. Giờ đây, overlay sẽ luôn nổi lên trên tất cả ứng dụng khác, kể cả các tựa game đồ họa DirectX/OpenGL hạng nặng chạy ở chế độ toàn màn hình không viền (như *Genshin Impact*), loại bỏ hoàn toàn hiện tượng bị game ẩn hoặc đè lên khi đang chơi.
- **Cơ chế chống mất focus**: Tích hợp sự kiện xử lý `blur` trên Electron Main process để lập tức khôi phục trạng thái ghim Always-on-Top kể cả khi game giành quyền kiểm soát thiết bị.
- **Launcher Atom cố định và tối ưu click-through thích ứng**: Nút hình tròn biểu tượng nguyên tử xoay được cố định vĩnh viễn ở góc trên cùng bên trái màn hình bất kể chế độ locked hay unlocked. Khi locked, ứng dụng sử dụng cờ đặc biệt `{ forward: true }` để theo dõi hover. Khi người dùng di chuột vào hình tròn, overlay tạm thời ngắt click-through để bạn bấm được nút mở giao diện; khi di chuột rời đi, quyền click xuyên thấu được trả lại ngay tức khắc cho game.
- **Bảng điều khiển toàn màn hình đắm chìm**: Thay đổi giao diện cửa sổ tùy chỉnh từ dạng hộp thoại kích thước cố định ở trung tâm sang thiết kế toàn màn hình hoàn chỉnh, mượt mà và trực quan vô song.

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
