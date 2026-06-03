import React from "react";
import { Key, Video, Tv, Keyboard, Smartphone, Code, Heart } from "lucide-react";

export default function HelpManual() {
  return (
    <div className="space-y-6 text-slate-300 pr-1 select-text">
      {/* Introduction Banner */}
      <div className="bg-slate-800/40 p-4 rounded-xl border border-slate-700/50 flex items-start gap-3">
        <Tv className="w-8 h-8 text-indigo-400 shrink-0 mt-0.5" />
        <div>
          <h4 className="font-bold text-slate-100 text-sm mb-1">
            Bộ Lọc & Nhúng Overlay Livestream Chuyên Nghiệp
          </h4>
          <p className="text-xs text-slate-400 leading-normal">
            Ứng dụng hỗ trợ hiển thị chat YouTube thời gian thực lên màn hình của Streamer hoặc tích hợp trực tiếp vào OBS Studio dưới dạng nguồn Web (Browser Source). Quá trình kết nối diễn ra an toàn qua Local API Key.
          </p>
        </div>
      </div>

      {/* Accordion Steps list */}
      <div className="space-y-4">
        {/* Step 1 */}
        <div className="bg-slate-800/25 p-4 rounded-xl border border-slate-700/30">
          <div className="flex items-center gap-2 mb-2 text-indigo-400 font-bold text-xs tracking-wider uppercase">
            <Key className="w-4 h-4" />
            <span>BƯỚC 1: Lấy YouTube API Key miễn phí</span>
          </div>
          <ol className="list-decimal list-inside space-y-1.5 text-xs text-slate-400 pl-1 leading-relaxed">
            <li>Truy cập <a href="https://console.cloud.google.com/" target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline">Google Cloud Console</a>.</li>
            <li>Tạo một dự án mới (New Project) hoặc chọn dự án hiện có.</li>
            <li>Tìm kiếm thư viện và bật thư viện <strong>YouTube Data API v3</strong>.</li>
            <li>Đi tới thẻ <strong>Credentials</strong> &rarr; Chọn <strong>Create Credentials</strong> &rarr; Chọn <strong>API Key</strong>.</li>
            <li>Sao chép khóa API này để sử dụng kết nối trong ứng dụng. Khóa được bảo mật lưu trữ cục bộ trên máy tính của bạn (localStorage).</li>
          </ol>
        </div>

        {/* Step 2 */}
        <div className="bg-slate-800/25 p-4 rounded-xl border border-slate-700/30">
          <div className="flex items-center gap-2 mb-2 text-emerald-400 font-bold text-xs tracking-wider uppercase">
            <Video className="w-4 h-4" />
            <span>BƯỚC 2: Xác định YouTube Stream ID</span>
          </div>
          <p className="text-xs text-slate-400 mb-2 leading-relaxed pl-1">
            Hệ thống hỗ trợ nhập cả URL nguyên bản của Livestream hoặc ID video 11 ký tự. Các liên kết hợp lệ ví dụ:
          </p>
          <ul className="list-disc list-inside text-[11px] text-slate-400 pl-3 space-y-1 bg-slate-900/40 p-2 rounded-lg border border-slate-800 font-mono">
            <li>https://www.youtube.com/watch?v=ab12cd34ef5</li>
            <li>https://www.youtube.com/live/ab12cd34ef5</li>
            <li>https://youtu.be/ab12cd34ef5</li>
            <li>Hoặc chỉ cần mã ID: <span className="text-emerald-400">ab12cd34ef5</span></li>
          </ul>
        </div>

        {/* Step 3 */}
        <div className="bg-slate-800/25 p-4 rounded-xl border border-slate-700/30">
          <div className="flex items-center gap-2 mb-2 text-amber-500 font-bold text-xs tracking-wider uppercase">
            <Code className="w-4 h-4" />
            <span>BƯỚC 3: Cách thêm nguồn Overlay vào OBS Studio</span>
          </div>
          <ol className="list-decimal list-inside space-y-1.5 text-xs text-slate-400 pl-1 leading-relaxed">
            <li>Cấu hình giao diện overlay theo sở thích (Cỡ chữ, Phông chữ, Màu nền, Độ mờ, v.v.).</li>
            <li>Nhấn vào nút <strong className="text-slate-200">"Sao chép link OBS Overlay"</strong> ở mục tạo link để lưu URL cấu hình.</li>
            <li>Mở phần mềm <strong>OBS Studio</strong> (hoặc Streamlabs OBS / vMix).</li>
            <li>Tại mục <strong>Sources (Nguồn)</strong> &rarr; Nhấp chuột phải chọn <strong>Add (Thêm)</strong> &rarr; Chọn <strong>Browser (Trình duyệt)</strong>.</li>
            <li>Đặt tên nguồn (ví dụ: <span className="text-amber-500 font-semibold">Live YT Chat</span>).</li>
            <li>Dán liên kết đã sao chép vào trường <strong>URL</strong>.</li>
            <li>Thiết lập kích thước tiêu chuẩn đề xuất: Chiều rộng (Width) <strong>450</strong>, Chiều cao (Height) <strong>700</strong>.</li>
            <li>Đánh dấu chọn mục <strong>"Refresh browser when scene becomes active"</strong> để tự động khởi động kết nối khi bạn chuyển cảnh. Hoặc dọn dẹp Custom CSS trong OBS để có độ mượt trong suốt tuyệt đối.</li>
          </ol>
        </div>

        {/* Step 4 */}
        <div className="bg-slate-800/25 p-4 rounded-xl border border-slate-700/30">
          <div className="flex items-center gap-2 mb-2 text-rose-400 font-bold text-xs tracking-wider uppercase">
            <Keyboard className="w-4 h-4" />
            <span>BƯỚC 4: Các phím tắt & Tiêu chí vận hành</span>
          </div>
          <ul className="list-disc list-inside space-y-1 text-xs text-slate-400 pl-1 leading-relaxed">
            <li>Bấm phím tắt <kbd className="px-1.5 py-0.5 bg-slate-800 text-slate-100 rounded text-[10px] font-mono border border-slate-600">Ctrl + Shift + C</kbd> để ẩn hoặc hiện nhanh vùng xem thử Overlay trên màn hình dashboard mà không cần di chuyển chuột.</li>
            <li>Bộ lọc từ khóa cấm hỗ trợ cấu trúc chữ thường lẫn chữ HOA hoặc sử dụng mã đặc biệt <strong>RegEx</strong> (Ví dụ: <code className="text-rose-400 font-mono">/spam+/i</code>) ngăn chặn từ xa các tin nhắn spam gây nhiễu buổi phát sóng.</li>
            <li>Các thiết lập lưu trữ cục bộ trong tệp tin <code className="text-emerald-400">overlay-config.json</code> giúp phục hồi nhanh chóng và sao lưu cài đặt sang phiên live tiếp theo chỉ với một cú nhấp chuột.</li>
          </ul>
        </div>
      </div>

      {/* Footer support credits */}
      <div className="pt-2 text-center text-[10px] text-slate-500 border-t border-slate-800 flex items-center justify-center gap-1">
        <span>Xây dựng cho Cộng đồng Streamer Việt Nam</span>
        <Heart className="w-3 h-3 text-red-500 fill-current" />
        <span>v1.0 (Lark Base Sprint DoD)</span>
      </div>
    </div>
  );
}
