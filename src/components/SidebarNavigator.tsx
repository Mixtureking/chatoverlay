import React, { memo } from "react";
import { 
  motion, 
  AnimatePresence 
} from "motion/react";
import { 
  MessageSquare, 
  Settings, 
  Sparkles, 
  ChevronLeft,
  ChevronRight,
  Monitor,
  Video,
  Languages,
  Sliders
} from "lucide-react";

interface SidebarNavigatorProps {
  activeRoute: "chat_overlay" | "screen_transition" | "settings";
  setActiveRoute: (route: "chat_overlay" | "screen_transition" | "settings") => void;
  isOpen: boolean;
  onClose: () => void;
  language: "vi" | "en";
  accentColor: string;
}

const SidebarNavigator = memo(function SidebarNavigator({
  activeRoute,
  setActiveRoute,
  isOpen,
  onClose,
  language = "vi",
  accentColor,
}: SidebarNavigatorProps) {

  // Translate static navigation labels
  const text = {
    title: language === "vi" ? "ĐIỀU HƯỚNG CHÍNH" : "MAIN NAVIGATION",
    subTitle: language === "vi" ? "Trung tâm điều khiển" : "Dashboard controls",
    chatOverlay: language === "vi" ? "Khung Chat Overlay" : "Chat Overlay Setup",
    chatOverlayDesc: language === "vi" ? "Kết nối & Tùy biến phông chữ, màu sắc" : "Connection & typography styling",
    screenTransition: language === "vi" ? "Hiệu ứng chuyển trang" : "Screen Transition",
    screenTransitionDesc: language === "vi" ? "Tùy biến hiệu ứng đổi tab & chuyển đổi" : "Tab switching shutter/fade choices",
    settings: language === "vi" ? "Cấu hình chung" : "General Settings",
    settingsDesc: language === "vi" ? "Ngôn ngữ, màu sắc, âm lượng chuông" : "Language, dashboard colors & volume",
    activeLabel: language === "vi" ? "Đang chọn" : "Active",
    collapse: language === "vi" ? "Thu gọn menu" : "Collapse menu",
    systemStatus: language === "vi" ? "HỆ THỐNG TRỰC TUYẾN" : "SYSTEM ONLINE",
  };

  const navItems = [
    {
      id: "chat_overlay" as const,
      title: text.chatOverlay,
      desc: text.chatOverlayDesc,
      icon: MessageSquare,
      color: accentColor,
    },
    {
      id: "screen_transition" as const,
      title: text.screenTransition,
      desc: text.screenTransitionDesc,
      icon: Sparkles,
      color: "#ec4899", // magenta accent
    },
    {
      id: "settings" as const,
      title: text.settings,
      desc: text.settingsDesc,
      icon: Settings,
      color: "#14b8a6", // teal accent
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: -340, opacity: 0.95 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -340, opacity: 0.95 }}
          transition={{ type: "spring", stiffness: 220, damping: 24 }}
          className="w-[280px] sm:w-[300px] h-full bg-slate-950 border-r border-slate-800/80 flex flex-col z-30 relative shadow-2xl shrink-0 pointer-events-auto"
          id="main-sidebar-navigation-bar"
        >
          {/* Header Panel */}
          <div className="p-4 border-b border-slate-900/90 bg-slate-900/40 shrink-0 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div 
                className="w-2.5 h-2.5 rounded-full md:animate-pulse" 
                style={{ backgroundColor: accentColor }} 
              />
              <div className="min-w-0">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                  {text.title}
                </h3>
                <p className="text-[9px] text-slate-500 font-bold mt-1 leading-none">
                  {text.subTitle}
                </p>
              </div>
            </div>

            {/* Collapse switch button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-900/80 border border-slate-800 hover:border-slate-700 hover:text-slate-200 text-slate-400 transition-all cursor-pointer"
              title={text.collapse}
              id="sidebar-navigator-collapse-btn"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Navigation Items List */}
          <div className="flex-1 p-3 space-y-2 overflow-y-auto custom-scrollbar" id="sidebar-navigator-links-container">
            {navItems.map((item) => {
              const isActive = activeRoute === item.id;
              const IconComponent = item.icon;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveRoute(item.id)}
                  className={`w-full text-left p-3.5 rounded-xl transition-all cursor-pointer duration-200 border flex items-start gap-3 relative overflow-hidden group ${
                    isActive 
                      ? "bg-slate-900 border-slate-800/80 shadow-md" 
                      : "bg-transparent border-transparent hover:bg-slate-900/30 hover:border-slate-900 text-slate-400 hover:text-slate-200"
                  }`}
                  id={`nav-item-btn-${item.id}`}
                >
                  {/* Subtle active tab edge glow line */}
                  {isActive && (
                    <motion.div
                      layoutId="sidebarActiveBgBar"
                      className="absolute left-0 top-0 bottom-0 w-1"
                      style={{ backgroundColor: item.color }}
                    />
                  )}

                  {/* Icon layer */}
                  <div 
                    className={`p-2.5 rounded-lg transition-all ${
                      isActive 
                        ? "text-white" 
                        : "bg-slate-900/50 text-slate-500 group-hover:text-slate-350"
                    }`}
                    style={isActive ? { backgroundColor: item.color } : {}}
                  >
                    <IconComponent className="w-4 h-4 shrink-0" />
                  </div>

                  {/* Content textual info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-black tracking-wide uppercase transition-colors ${isActive ? "text-slate-100" : "text-slate-300"}`}>
                        {item.title}
                      </span>
                      {isActive && (
                        <span className="text-[8px] px-1.5 py-0.5 rounded text-white font-extrabold uppercase shrink-0" style={{ backgroundColor: item.color }}>
                          {text.activeLabel}
                        </span>
                      )}
                    </div>
                    <p className={`text-[10px] text-slate-500 font-semibold mt-1 leading-relaxed ${isActive ? "text-slate-400" : "text-slate-500"}`}>
                      {item.desc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Footer Branding panel */}
          <div className="p-4 border-t border-slate-900/90 bg-slate-900/20 text-center shrink-0" id="sidebar-navigator-footer">
            <div className="flex items-center justify-center gap-1.5 text-[8px] font-bold text-slate-500 tracking-widest uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 md:animate-ping inline-block" />
              <span>{text.systemStatus}</span>
            </div>
            <div className="font-mono text-[9px] text-slate-600 mt-1 font-semibold">
              v1.0.2 • Electron-Safe • OBS Ready
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

export default SidebarNavigator;
