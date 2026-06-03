# Nhật ký Thay đổi (Changelog - CHANGELOG) 📜

Tất cả các thay đổi đáng chú ý đối với dự án này sẽ được ghi lại trong tệp này. Dự án tuân thủ nghiêm ngặt Quy tắc Đánh số Phiên bản ngữ nghĩa (Semantic Versioning).

---

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
