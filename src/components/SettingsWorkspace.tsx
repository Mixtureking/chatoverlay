import React, { useState, useEffect } from "react";
import { 
  motion 
} from "motion/react";
import { 
  Languages, 
  Settings, 
  Sparkles, 
  HelpCircle, 
  Info,
  Check,
  Code,
  Shield,
  Activity,
  User,
  ExternalLink,
  BookOpen,
  Sliders
} from "lucide-react";
import { OverlaySettings, FilterKeyword } from "../types";

interface SettingsWorkspaceProps {
  settings: OverlaySettings;
  updateSettings: (newSettings: Partial<OverlaySettings>) => void;
  language: "vi" | "en";
  showToast: (msg: string) => void;
  accentColor: string;
}

export default function SettingsWorkspace({
  settings,
  updateSettings,
  language = "vi",
  showToast,
  accentColor,
}: SettingsWorkspaceProps) {
  const [utcTime, setUtcTime] = useState<string>("");

  useEffect(() => {
    const updateTime = () => {
      setUtcTime(new Date().toISOString().replace("T", " ").substring(0, 19) + " UTC");
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const text = {
    title: language === "vi" ? "Cấu Hình & Hệ Thống" : "System & Settings Deck",
    subtitle: language === "vi" ? "Tùy chỉnh ngôn ngữ, màu sắc chủ đạo và thiết lập chênh lệch âm báo" : "Customize UI languages, styling highlights & alert notifications",
    prefHeader: language === "vi" ? "Tùy chọn Ngôn ngữ hiển thị" : "Global Interface Languages",
    prefDesc: language === "vi" ? "Thay đổi ngôn ngữ hiển thị của toàn bộ trang bảng điều khiển" : "Choose the language format of your streamer control board",
    accentLabel: language === "vi" ? "Màu điểm nhấn hệ thống (Accent Color)" : "App Dashboard System Accents",
    accentPreset: language === "vi" ? "Chọn bảng màu thiết lập sẵn" : "Choose a designer preset palette",
    manualHex: language === "vi" ? "Tự nhập mã HEX liên kết" : "Fine-tune custom Hex value",
    volumeLabel: language === "vi" ? "Cấu hình âm báo sinh động (Buzzer Ring)" : "Sound Chimes notifications",
    enableBell: language === "vi" ? "Bật âm chuông khi có tin nhắn mới" : "Enable ring alert on chat arrivals",
    volumeSlider: language === "vi" ? "Âm lượng thông báo" : "Notification Volume Level",
    playTest: language === "vi" ? "Chạy thử âm chuông" : "Test Chime Buzz",
    diagnostics: language === "vi" ? "Thống kê & Giám sát Chẩn đoán" : "Diagnostic Feed & Telemetry",
    timeLabel: language === "vi" ? "Thời gian máy chủ (Server UTC)" : "Global Server UTC Clock",
    verLabel: language === "vi" ? "Phiên bản ứng dụng" : "App Version Code",
    latencyLabel: language === "vi" ? "Hệ thống phản hồi" : "Sandbox Latency",
    helpTitle: language === "vi" ? "BÀI HỌC VÀ HƯỚNG DẪN KỸ THUẬT" : "STREAM TECHNICAL RESOURCES",
    step1: language === "vi" ? "1. Tải lên lớp OBS Browser Source" : "1. Load as OBS Browser Source",
    step1Desc: language === "vi" ? "Nhúng đường dẫn widget vào OBS Studio của bạn, thiết lập chiều rộng 400px - cao 600px." : "Paste your synchronized browser widget URL into your streaming scenes with custom resolution values.",
    step2: language === "vi" ? "2. Tùy biến mã CSS nâng cao" : "2. Fine-tune with Custom Styling",
    step2Desc: language === "vi" ? "Nếu các presets chưa thỏa mãn, hãy chuyển sang tab CSS tại Trang Chủ đề để ghi đè phong cách." : "Utilize the custom styling text editor tab to overwrite font configurations, shadow levels, and borders.",
    presetLabel: language === "vi" ? "Kiểu hoạt ảnh chuyển tiếp" : "Active Transition Type",
    presetDesc: language === "vi" ? "Chọn hiệu ứng hoạt ảnh chính khi bắt đầu chuyển cảnh" : "Select main motion effect of the screen transition screen",
    shutter: language === "vi" ? "🚪 Cửa sập kỹ thuật số (Shutter Effect)" : "🚪 Digital Shutter Effect",
    fade: language === "vi" ? "💨 Mờ dần cao cấp (Crossfade Theme)" : "💨 Premium Crossfade Theme",
    slide: language === "vi" ? "➡️ Trượt ngang mượt mà (Spring Slide)" : "➡️ Smooth Spring Horizon Slide",
    zoom: language === "vi" ? "🔍 Thu phòng êm ái (Zooming Out)" : "🔍 Ambient Depth Zoom Out",
    rotate: language === "vi" ? "🔄 Xoay góc 3D (3D Spiral Card)" : "🔄 Elegant 3D Spiral Rotation",
  };

  return (
    <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-5 min-h-0 animate-in fade-in-50 duration-200" id="settings-workspace-wrapper">
      {/* LEFT COLUMN: INTERACTIVE CONTROLS */}
      <div className="col-span-1 lg:col-span-2 bg-slate-900/40 border-r border-slate-800/80 flex flex-col overflow-y-auto custom-scrollbar p-5 space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Languages className="w-5 h-5 text-teal-400" />
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wide">
              {text.title}
            </h3>
          </div>
          <p className="text-[11px] text-slate-450 leading-relaxed">
            {text.subtitle}
          </p>
        </div>

        {/* Global Languages select */}
        <div className="bg-slate-900/50 border border-slate-800/80 p-4 rounded-xl space-y-3.5">
          <div className="space-y-0.5">
            <h4 className="text-xs font-bold text-slate-205 uppercase tracking-wide flex items-center gap-1.5">
              <span>{text.prefHeader}</span>
            </h4>
            <p className="text-[10px] text-slate-500">{text.prefDesc}</p>
          </div>

          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={() => {
                updateSettings({ language: "vi" });
                showToast("🇻🇳 Đã chuyển ngôn ngữ sang Tiếng Việt");
              }}
              className={`flex-1 p-3 rounded-lg border text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                settings.language === "vi"
                  ? "bg-slate-950 border-teal-500/40 text-teal-400 shadow-md"
                  : "bg-transparent border-transparent hover:bg-slate-900/40 text-slate-450"
              }`}
            >
              <span className="text-sm">🇻🇳</span>
              <span>Tiếng Việt</span>
            </button>
            <button
              type="button"
              onClick={() => {
                updateSettings({ language: "en" });
                showToast("🇺🇸 Language set to English");
              }}
              className={`flex-1 p-3 rounded-lg border text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                settings.language === "en"
                  ? "bg-slate-950 border-teal-500/40 text-teal-400 shadow-md"
                  : "bg-transparent border-transparent hover:bg-slate-900/40 text-slate-450"
              }`}
            >
              <span className="text-sm">🇺🇸</span>
              <span>English</span>
            </button>
          </div>
        </div>

        {/* Accent Color Configurations */}
        <div className="bg-slate-900/50 border border-slate-800/80 p-4 rounded-xl space-y-4">
          <div className="space-y-1">
            <h4 className="text-[11px] font-bold text-slate-200 uppercase tracking-wide">
              {text.accentLabel}
            </h4>
            <p className="text-[10px] text-slate-505 leading-normal">
              {text.accentPreset}
            </p>
          </div>

          {/* Preset buttons */}
          <div className="grid grid-cols-6 gap-2">
            {[
              { name: "Indigo", code: "#6366f1" },
              { name: "Emerald", code: "#10b981" },
              { name: "Rose", code: "#f43f5e" },
              { name: "Amber", code: "#f59e0b" },
              { name: "Cyan", code: "#06b6d4" },
              { name: "Violet", code: "#8b5cf6" },
            ].map((col) => {
              const isMatch = (settings.accentColor || "#6366f1") === col.code;
              return (
                <button
                  key={col.code}
                  type="button"
                  onClick={() => {
                    updateSettings({ accentColor: col.code });
                    showToast(`🎨 Accent preset swapped: ${col.name}`);
                  }}
                  style={{ backgroundColor: col.code }}
                  className={`h-6.5 rounded-md hover:scale-110 active:scale-95 transition-all flex items-center justify-center cursor-pointer relative ${
                    isMatch ? "ring-2 ring-white scale-105 shadow-md shadow-white/10" : "hover:brightness-115"
                  }`}
                  title={col.name}
                >
                  {isMatch && (
                    <Check className="w-3.5 h-3.5 text-white drop-shadow font-extrabold" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Manual RGB/HEX Color fine picker */}
          <div className="space-y-1.5 pt-1">
            <span className="text-[10px] text-slate-400 block font-semibold">{text.manualHex}</span>
            <div className="flex gap-2 items-center bg-slate-950 border border-slate-850 p-2 rounded-lg">
              <input
                type="color"
                value={settings.accentColor || "#6366f1"}
                onChange={(e) => updateSettings({ accentColor: e.target.value })}
                className="w-7 h-7 rounded border-0 bg-transparent cursor-pointer shrink-0"
              />
              <input
                type="text"
                maxLength={7}
                value={settings.accentColor || "#6366f1"}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val.startsWith("#") && val.length <= 7) {
                    updateSettings({ accentColor: val });
                  }
                }}
                placeholder="#6366f1"
                className="w-full bg-transparent border-0 focus:outline-none focus:ring-0 text-xs font-mono font-bold text-slate-350 uppercase tracking-widest pl-1"
              />
            </div>
          </div>
        </div>

        {/* 1. Animation Preset Selection (Moved/Integrated into Settings) */}
        <div className="bg-slate-900/50 border border-slate-800/80 p-4 rounded-xl space-y-3.5" id="settings-transition-preset-selector">
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-200 uppercase tracking-wide flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-teal-400" />
              <span>{text.presetLabel}</span>
            </label>
            <p className="text-[10px] text-slate-500 leading-normal">
              {text.presetDesc}
            </p>
          </div>

          <div className="space-y-1.5">
            {[
              { id: "shutter" as const, name: text.shutter },
              { id: "fade" as const, name: text.fade },
              { id: "slide" as const, name: text.slide },
              { id: "zoom" as const, name: text.zoom },
              { id: "rotate" as const, name: text.rotate },
            ].map((anim) => {
              const isSelected = (settings.transitionType || "shutter") === anim.id;
              return (
                <button
                  key={anim.id}
                  type="button"
                  onClick={() => {
                    updateSettings({ transitionType: anim.id });
                    showToast(language === "vi" 
                      ? `🎬 Đã đổi kiểu chuyển cảnh: ${anim.name}` 
                      : `🎬 Transition type changed to: ${anim.id}`
                    );
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between border cursor-pointer transition-all active:scale-[0.99] ${
                    isSelected
                      ? "bg-slate-950 border-teal-500/50 text-white shadow-md shadow-teal-500/5"
                      : "bg-slate-900/30 border-transparent hover:border-slate-850 hover:bg-slate-900/60 text-slate-400"
                  }`}
                  id={`settings-transition-select-btn-${anim.id}`}
                >
                  <span className="text-[11px] font-bold flex items-center gap-1.5">
                    <span 
                      className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-teal-400 animate-ping" : "bg-slate-700"}`} 
                    />
                    {anim.name}
                  </span>
                  {isSelected && (
                    <div className="w-3.5 h-3.5 rounded-full bg-teal-500 text-white flex items-center justify-center font-bold text-[8.5px]">
                      ✓
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

      </div>

      {/* RIGHT COLUMN: TECHNICAL TELEMETRY PANEL */}
      <div className="col-span-1 lg:col-span-3 bg-slate-950 p-6 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
        {/* Diagnostics Card */}
        <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800/80 space-y-4">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-teal-400" />
            <h3 className="text-xs font-bold text-slate-100 uppercase tracking-widest leading-none">
              {text.diagnostics}
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-3.5 pt-1.5 text-[10px] font-mono border-t border-slate-850">
            <div>
              <span className="text-slate-500 block uppercase font-sans font-bold mb-0.5">{text.timeLabel}</span>
              <span className="text-slate-300 font-bold">{utcTime}</span>
            </div>
            <div>
              <span className="text-slate-500 block uppercase font-sans font-bold mb-0.5">{text.verLabel}</span>
              <span className="text-slate-300 font-bold">1.0.2-LATEST</span>
            </div>
            <div className="pt-2 border-t border-slate-850/40">
              <span className="text-slate-500 block uppercase font-sans font-bold mb-0.5">{text.latencyLabel}</span>
              <span className="text-teal-400 font-black">0.3ms ONLINE</span>
            </div>
            <div className="pt-2 border-t border-slate-850/40">
              <span className="text-slate-500 block uppercase font-sans font-bold mb-0.5">Platform Target</span>
              <span className="text-slate-305 font-bold">Web (Cloud Run Ready)</span>
            </div>
          </div>
        </div>

        {/* Detailed documentation panel */}
        <div className="flex-1 bg-slate-900/25 border border-slate-900 rounded-xl p-5 space-y-4">
          <h3 className="text-xs font-black text-slate-400 tracking-wider uppercase flex items-center gap-1.5">
            <BookOpen className="w-4 h-4 text-teal-400" />
            <span>{text.helpTitle}</span>
          </h3>

          <div className="space-y-4">
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1">
                <Check className="w-3.5 h-3.5 text-teal-400 inline" />
                <span>{text.step1}</span>
              </h4>
              <p className="text-[10px] text-slate-400 leading-relaxed font-medium pl-4.5">
                {text.step1Desc}
              </p>
            </div>

            <div className="space-y-1 pt-1.5 border-t border-slate-850/50">
              <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1">
                <Check className="w-3.5 h-3.5 text-teal-400 inline" />
                <span>{text.step2}</span>
              </h4>
              <p className="text-[10px] text-slate-400 leading-relaxed font-medium pl-4.5">
                {text.step2Desc}
              </p>
            </div>

            <div className="bg-slate-950 p-4 rounded-lg border border-slate-900 text-center text-[10px] space-y-2">
              <p className="text-slate-400 font-medium">
                {language === "vi"
                  ? "Cần nhúng trực tiếp API Youtube Data v3? Hãy nhập Key của bạn tại thẻ Kết Nối ở mục Chat Overlay."
                  : "Need to deploy your local client settings? Tap Commit Save on the floating panel anywhere."}
              </p>
              <div className="flex justify-center gap-3">
                <a 
                  href="https://console.cloud.google.com/apis/library/youtube.googleapis.com" 
                  target="_blank" 
                  rel="noreferrer"
                  className="font-bold text-teal-400 hover:underline flex items-center gap-1"
                >
                  YouTube API Console <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
