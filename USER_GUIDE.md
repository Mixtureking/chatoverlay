# Hướng Dẫn Sử Dụng YouTube Chat Overlay & Studio Chuyển Cảnh

Chào mừng bạn đến với **YouTube Chat Overlay**, công cụ toàn diện giúp Streamer quản lý khung chat trực tiếp và thiết lập các màn hình chuyển cảnh chuyên nghiệp ngay trên OBS. Dưới đây là hướng dẫn chi tiết cách sử dụng các tính năng của phần mềm.

---

## 1. Hướng Dẫn Kết Nối Livestream
Tại trang Bảng điều khiển chính (Tab: **Khung Chat Overlay**):
1. Tìm phần **URL Livestream**.
2. Dán đường dẫn Livestream YouTube của bạn (ví dụ: `https://youtube.com/live/ABCD123`) hoặc ID Video vào ô trống.
3. Bấm **KẾT NỐI & TẢI TIN NHẮN**.
4. *Mẹo:* Nếu bạn chưa Live, bạn có thể bật công tắc **Giả lập (Sandbox)** để hệ thống tự động tạo ra các tin nhắn ảo, giúp bạn dễ dàng căn chỉnh màu sắc và kích thước khung chat trước khi phát sóng thật.

---

## 2. Thiết Lập Khung Chat Trên OBS (Chat Overlay)
Để đưa khung chat lơ lửng tuyệt đẹp lên OBS:
1. Nhìn sang cột bên phải của bảng điều khiển, tìm hộp **LINK OBS KHUNG CHAT ĐỘC LẬP**.
2. Bấm nút **Sao chép** (Copy) đường link.
3. Mở phần mềm OBS Studio.
4. Ở mục **Sources**, bấm dấu **+** và chọn **Browser** (Trình duyệt).
5. Đặt tên (ví dụ: `Youtube Chat`) và dán link vừa copy vào ô **URL**.
6. Tùy chỉnh **Width** (Rộng) và **Height** (Cao) sao cho vừa vặn với không gian của bạn (Gợi ý: 400x600).
7. Bấm **OK**.

---

## 3. Tùy Biến Giao Diện Chat (Styler)
Toàn bộ các tùy biến về hiển thị Chat được cung cấp tại Tab **Khung Chat Overlay**:
- **Tùy chỉnh Văn bản & Màu sắc**: Thay đổi phông chữ (Inter, Roboto,...), kích thước chữ, màu chữ, màu nền và độ trong suốt của nền. Bạn cũng có thể chỉnh màu tên người xem, Quản trị viên (Moderator) và Hội viên (Sponsor).
- **Phông Nền (Background)**: Hỗ trợ đổi nền khung chat thành màu Gradient, các Pattern có sẵn (Lưới, sóng) hoặc tự tải lên ảnh/logo thương hiệu của bạn. Hỗ trợ chỉnh độ mờ (Blur) để chữ hiển thị rõ nét hơn.
- **Biểu Tượng Xinh Xắn (Decorations)**: Bật các biểu tượng như Trái tim, Ngôi sao, Tia sét đi kèm với tên người bình luận.
- **Lưu Thay Đổi**: Sau khi thiết kế xong, một bảng thông báo **Chưa lưu thay đổi** sẽ hiện ra ở góc dưới. Bạn cần bấm nút **LƯU THAY ĐỔI** để các cấu hình này được đồng bộ ngay lập tức lên OBS.

---

## 4. Studio Chuyển Cảnh OBS (Screen Transition)
Đây là hệ thống giúp bạn tạo các màn hình chờ chuẩn bị Stream (Streaming Soon), Tạm nghỉ (Be Right Back), hoặc Chuyển cảnh (Changing Scene).

### Cách cài đặt vào OBS:
1. Sang tab **Hiệu ứng Chuyển Trang** bên cột menu trái.
2. Tại góc phải, sao chép **LINK OBS TRANSITION OVERLAY ĐỘC LẬP**.
3. Vào OBS, tạo một **Browser Source** mới (đặt tên ví dụ: `Chuyển Cảnh`).
4. Paste URL vào, đặt kích thước là **Rộng: 1920** và **Cao: 1080**.
5. ⚠️ **Rất Quan Trọng:** Đánh dấu tích vào ô `"Refresh browser when scene becomes active"` để đảm bảo mỗi khi bạn chuyển Scene, Transition sẽ hiển thị mượt mà. Đặt Source này ở lớp trên cùng của Scene.

### Cách sử dụng Transition:
- Hệ thống có sẵn các nút **Chuyển Cảnh Nhanh (Options)**. Khi bạn bấm vào một tùy chọn (ví dụ: `Changing Screen`), một hiệu ứng hoạt hình tràn màn hình sẽ ngay lập tức được phát trên cả bảng điều khiển và trên OBS.
- Mỗi hiệu ứng có thời lượng tự động (Ví dụ: 3 giây). Hết thời gian, rèm sẽ tự động mở ra. Bạn cũng có thể bấm nút **DỪNG LẠI (STOP)** bất cứ lúc nào để buộc tắt hiệu ứng.
- **Chỉnh sửa Hiệu ứng**: Bạn có thể tải lên ảnh Logo/Thương hiệu riêng, thay đổi văn bản hiển thị và chọn các kiểu Animation xé rèm, trượt mượt mà hoặc Glitch kỹ thuật số.

---

## 5. Cài Đặt Chung (General Settings)
Truy cập tab **Cấu Hình Chung** để thiết lập môi trường cá nhân:
- **Ngôn ngữ**: Đổi qua lại giữa Tiếng Việt và Tiếng Anh.
- **Giao diện sáng/tối**: Hệ thống hỗ trợ chế độ Tối (Dark) và chế độ Sáng (Light) với thiết kế Glassmorphism trong suốt và cao cấp.
- **Âm Báo (Buzzer Ring)**: Cấu hình âm thanh "ting ting" khi có tin nhắn chat mới bay vào. Bạn có thể chọn âm thanh hệ thống (Pop, Bell) hoặc tự tải file nhạc MP3 của riêng mình.

---

## 6. Phiên Bản Màn Hình Nền (Desktop Version)
Nếu bạn đang sử dụng phiên bản phần mềm tải về (App cài đặt `exe`):
- Hệ thống hỗ trợ tính năng **Ghim Khung Chat (Always on Top)** vượt qua cả các tựa game Full-screen nặng nhất (như Genshin Impact hay các game DirectX). 
- Biểu tượng **Bánh Răng Nguyên Tử** ở góc trái màn hình giúp bạn "Mở / Khóa xuyên chuột" dễ dàng để di chuyển khung chat ngay trong lúc chơi game mà không bị mất focus.

---
**Chúc bạn có một buổi Livestream bùng nổ! 🎉**
