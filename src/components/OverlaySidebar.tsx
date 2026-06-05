import React, { useRef, useEffect, memo } from "react";
import { 
  motion, 
  AnimatePresence 
} from "motion/react";
import { 
  MessageSquare, 
  Send, 
  Trash2, 
  X, 
  Eye, 
  EyeOff, 
  Volume2, 
  Settings, 
  Menu 
} from "lucide-react";
import { ChatMessage, OverlaySettings } from "../types";
import OverlayWidget from "./OverlayWidget";

interface OverlaySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  settings: OverlaySettings;
  onAddTestMessage: () => void;
  onClearMessages: () => void;
  language?: "vi" | "en";
}

const OverlaySidebar = memo(function OverlaySidebar({
  isOpen,
  onClose,
  messages,
  settings,
  onAddTestMessage,
  onClearMessages,
  language = "vi",
}: OverlaySidebarProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [messages]);

  // Handle translation dict
  const text = {
    title: language === "vi" ? "Thanh Bên Chat Overlay" : "Chat Overlay Sidebar",
    subtitle: language === "vi" ? "Khung Dock thu phóng & giám sát thời gian thực" : "Real-time dock monitoring panel",
    clear: language === "vi" ? "Xóa chat" : "Clear Chat",
    testInput: language === "vi" ? "Thử tin nhắn" : "Test Message",
    empty: language === "vi" ? "Chưa có cuộc trò chuyện nào..." : "No active discussion yet...",
    info: language === "vi" ? "Đây là hiển thị gốc khớp hoàn toàn với OBS của bạn." : "Fully matches your live OBS output.",
    dockPosition: language === "vi" ? "Vị trí bảng: DOCK TRÁI" : "Dock Side: LEFT SIDEWAY",
    close: language === "vi" ? "Thu nhỏ" : "Collapse",
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: -380, opacity: 0.95 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -380, opacity: 0.95 }}
          transition={{ type: "spring", stiffness: 240, damping: 25 }}
          className="w-full sm:w-[360px] h-full bg-slate-950/95 border-r border-slate-800/90 flex flex-col z-40 relative shadow-2xl select-none shrink-0 pointer-events-auto"
          id="overlay-chat-sidebar-frame"
        >
          {/* Header Board */}
          <div className="p-4 border-b border-slate-800/80 bg-slate-900/60 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-indigo-400 shrink-0 animate-pulse" />
                <div className="min-w-0">
                  <h3 className="text-xs font-black text-slate-100 uppercase tracking-wider truncate">
                    {text.title}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-semibold truncate leading-none mt-1">
                    {text.subtitle}
                  </p>
                </div>
              </div>

              {/* Close Button Trigger */}
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg bg-slate-950 border border-slate-850 hover:border-red-900/40 text-slate-400 hover:text-red-400 transition-all cursor-pointer active:scale-95"
                title={text.close}
                id="sidebar-close-trigger-btn"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Quick Action Dock Buttons */}
            <div className="grid grid-cols-2 gap-2 mt-4">
              <button
                type="button"
                onClick={onAddTestMessage}
                className="bg-indigo-650 hover:bg-indigo-600 text-white font-extrabold py-2 px-3 rounded-lg text-[10px] flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-lg shadow-indigo-600/15 uppercase active:scale-[0.97]"
                id="sidebar-inject-comment-btn"
              >
                <Send className="w-3 h-3" />
                <span>{text.testInput}</span>
              </button>
              <button
                type="button"
                onClick={onClearMessages}
                className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold py-2 px-3 rounded-lg text-[10px] flex items-center justify-center gap-1.5 transition-all cursor-pointer uppercase active:scale-[0.97]"
                id="sidebar-clear-history-btn"
              >
                <Trash2 className="w-3 h-3 text-rose-400" />
                <span>{text.clear}</span>
              </button>
            </div>
          </div>

          {/* Core Chat Box Dock Panel */}
          <div className="flex-1 overflow-hidden relative p-4 flex flex-col bg-slate-950/60" id="sidebar-widgets-body">
            <div className="flex-1 w-full rounded-xl overflow-hidden border border-slate-800/80 relative flex flex-col bg-slate-950/30">
              <div className="flex-1 h-full overflow-hidden relative">
                <OverlayWidget messages={messages} settings={settings} previewMode={true} />
              </div>
            </div>
          </div>

          {/* Footer Guide Sign */}
          <div className="p-3 border-t border-slate-800/80 bg-slate-900/30 text-[9px] text-slate-500 font-medium text-center shrink-0">
            <span>{text.info}</span>
            <div className="text-indigo-400 font-extrabold mt-1 select-none font-sans uppercase">
              {text.dockPosition}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
});

export default OverlaySidebar;
