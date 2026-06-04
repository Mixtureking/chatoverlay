import React, { useEffect, useState } from "react";
import { ChatMessage, OverlaySettings } from "../types";
import { Shield, Sparkles, Star, Award } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface OverlayWidgetProps {
  messages: ChatMessage[];
  settings: OverlaySettings;
  previewMode?: boolean; // If true, rendering in the dashboard simulator frame
}

export default function OverlayWidget({
  messages,
  settings,
  previewMode = false,
}: OverlayWidgetProps) {
  const [currentTimestamp, setCurrentTimestamp] = useState(Date.now());
  const [showInitialNotice, setShowInitialNotice] = useState(true);

  // Auto-hide the "Connected / Active" standby notice after 10 seconds of rendering
  useEffect(() => {
    if (previewMode) {
      setShowInitialNotice(false);
      return;
    }
    const timer = setTimeout(() => {
      setShowInitialNotice(false);
    }, 10000);
    return () => clearTimeout(timer);
  }, [previewMode]);

  // Update a ticking timer every second to evaluate message expiration (chatDuration)
  useEffect(() => {
    if (settings.chatDuration <= 0) return;
    const interval = setInterval(() => {
      setCurrentTimestamp(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [settings.chatDuration]);

  // Determine active font classes
  const fontClass =
    settings.fontFamily === "Space Grotesk"
      ? "font-grotesk"
      : settings.fontFamily === "JetBrains Mono"
      ? "font-mono"
      : settings.fontFamily === "Montserrat"
      ? "font-montserrat"
      : settings.fontFamily === "Nunito"
      ? "font-nunito"
      : "font-sans";

  // Filter out expired normal messages (excluding Super Chats from quick expiration if streamer wants)
  const visibleMessages = messages.filter((msg) => {
    if (settings.chatDuration <= 0) return true;
    if (msg.isSuperChat) return true; // keep Super Chats based on superChatDuration, not normal duration
    const ageInSeconds = (currentTimestamp - msg.timestamp) / 1000;
    return ageInSeconds < settings.chatDuration;
  });

  // Get active SuperChats that are still within their pinned age limit
  const activeSuperChats = messages.filter((msg) => {
    if (!msg.isSuperChat) return false;
    const ageInSeconds = (currentTimestamp - msg.timestamp) / 1000;
    return ageInSeconds < settings.superChatDuration;
  });

  // Calculate scaling factor styles with robust fallbacks to prevent NaN / collapsed containers (Security/Design robustness Review)
  const safeScale = typeof settings.scale === "number" && !isNaN(settings.scale) && settings.scale > 0 ? settings.scale : 1.0;
  const safeFontSize = typeof settings.fontSize === "number" && !isNaN(settings.fontSize) && settings.fontSize > 0 ? settings.fontSize : 15;
  const safeBgOpacity = typeof settings.bgOpacity === "number" && !isNaN(settings.bgOpacity) ? settings.bgOpacity : 0.85;

  const overlayScaleStyle = {
    fontSize: `${safeFontSize}px`,
    transform: previewMode ? `none` : `scale(${safeScale})`,
    transformOrigin: "top left",
    width: previewMode ? "100%" : `${100 / safeScale}%`,
    height: previewMode ? "100%" : `${100 / safeScale}%`,
  };

  // Debounce state to avoid running customJs compiles on every single keystroke (avoid browser freezes/crashes when typing)
  const [debouncedCustomJs, setDebouncedCustomJs] = useState(settings.customJs || "");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedCustomJs(settings.customJs || "");
    }, 800);
    return () => clearTimeout(timer);
  }, [settings.customJs]);

  // Target ID mapping based on context
  const containerId = previewMode ? "youtube-chat-overlay-preview" : "youtube-chat-overlay";

  // Sanitize and prefix custom CSS in preview mode to prevent global stylesheet leakage (e.g. body { overflow: hidden; })
  // from hijacking the scrollbars/layout of the main website dashboard.
  const getCleanedCss = () => {
    if (!settings.customCss) return "";
    if (!previewMode) return settings.customCss;

    let css = settings.customCss;
    const prefix = "#youtube-chat-overlay-preview";
    
    // Replace top-level selectors to target the scoped preview element
    css = css.replace(/\bbody\b/g, prefix);
    css = css.replace(/\bhtml\b/g, prefix);
    css = css.replace(/\b:root\b/g, prefix);
    
    // Replace standalone asterisks that could leak
    css = css.replace(/(^\s*|\s*,\s*)\*(?=\s*\{|\s*\,|\s+)/g, `$1${prefix} *`);

    // Force preview container boundary & scrolling safety
    css += `
      ${prefix} {
        max-height: 100% !important;
        overflow: hidden !important;
      }
    `;
    return css;
  };

  // Helper to get font weights and colors
  const getUsernameColor = (msg: ChatMessage) => {
    if (msg.isOwner) return "#f43f5e"; // Rose-500 for streamer owner
    if (msg.isModerator) return settings.moderatorColor || "#34d399";
    if (msg.isSponsor) return settings.sponsorColor || "#fbbf24";
    return settings.authorColor || "#bae6fd";
  };

  // 1. Trigger custom chat updates for custom JS templates
  useEffect(() => {
    if (!settings.useCustomCode) return;
    const triggerUpdate = () => {
      const event = new CustomEvent("onChatUpdate", { detail: visibleMessages });
      window.dispatchEvent(event);
    };

    const timeout = setTimeout(triggerUpdate, 50);
    return () => clearTimeout(timeout);
  }, [visibleMessages, settings.useCustomCode]);

  // 2. Load custom JS script safely inside a sandboxed tracker to prevent event listener and memory resource leakage across typing intervals
  useEffect(() => {
    if (!settings.useCustomCode || !debouncedCustomJs) return;

    // Track created event handlers and timers to clean them up on edits/unmounts
    const registeredListeners: { target: EventTarget; type: string; listener: any; options?: any }[] = [];
    const activeIntervals: number[] = [];
    const activeTimeouts: number[] = [];

    // Sandbox implementations to track and clean up automatically
    const sandboxAddEventListener = (type: string, listener: any, options?: any) => {
      try {
        window.addEventListener(type, listener, options);
        registeredListeners.push({ target: window, type, listener, options });
      } catch (err) {
        console.warn("Sandboxed addEventListener error:", err);
      }
    };

    const sandboxSetInterval = (handler: any, timeout?: number, ...args: any[]) => {
      const id = window.setInterval(handler, timeout, ...args);
      activeIntervals.push(id);
      return id;
    };

    const sandboxSetTimeout = (handler: any, timeout?: number, ...args: any[]) => {
      const id = window.setTimeout(handler, timeout, ...args);
      activeTimeouts.push(id);
      return id;
    };

    const sandboxDocAddEventListener = (type: string, listener: any, options?: any) => {
      try {
        document.addEventListener(type, listener, options);
        registeredListeners.push({ target: document, type, listener, options });
      } catch (err) {
        console.warn("Sandboxed document addEventListener error:", err);
      }
    };

    // Proxy globals so both explicit (window.addEventListener) and implicit (addEventListener) calls are intercepted
    const windowProxy = new Proxy(window, {
      get(target, prop, receiver) {
        if (prop === "addEventListener") return sandboxAddEventListener;
        if (prop === "setInterval") return sandboxSetInterval;
        if (prop === "setTimeout") return sandboxSetTimeout;
        const val = (target as any)[prop];
        if (typeof val === "function") {
          return val.bind(target);
        }
        return val;
      }
    });

    const documentProxy = new Proxy(document, {
      get(target, prop, receiver) {
        if (prop === "addEventListener") return sandboxDocAddEventListener;
        const val = (target as any)[prop];
        if (typeof val === "function") {
          return val.bind(target);
        }
        return val;
      }
    });

    try {
      // Pass the proxy sandboxes as parameters to capture local references in script execution scope
      const wrapperFunc = new Function(
        "window",
        "document",
        "addEventListener",
        "setInterval",
        "setTimeout",
        debouncedCustomJs
      );
      
      wrapperFunc(
        windowProxy,
        documentProxy,
        sandboxAddEventListener,
        sandboxSetInterval,
        sandboxSetTimeout
      );
    } catch (err) {
      console.error("Custom JS execution error inside Sandbox:", err);
    }

    // Cleanup cycle executed immediately before launching updated custom JS runs or on unmount
    return () => {
      registeredListeners.forEach(({ target, type, listener, options }) => {
        try {
          target.removeEventListener(type, listener, options);
        } catch {}
      });
      activeIntervals.forEach((id) => {
        try {
          window.clearInterval(id);
        } catch {}
      });
      activeTimeouts.forEach((id) => {
        try {
          window.clearTimeout(id);
        } catch {}
      });
    };
  }, [debouncedCustomJs, settings.useCustomCode]);

  // Early return if custom code is active
  if (settings.useCustomCode) {
    return (
      <div
        id={containerId}
        className="w-full h-full relative overflow-hidden select-text"
        style={overlayScaleStyle}
      >
        {settings.customCss && (
          <style dangerouslySetInnerHTML={{ __html: getCleanedCss() }} />
        )}
        <div
          className="w-full h-full"
          dangerouslySetInnerHTML={{ __html: settings.customHtml || "" }}
        />
      </div>
    );
  }

  return (
    <div
      id={containerId}
      className={`h-full flex flex-col p-4 select-none overflow-hidden transition-all duration-300 ${fontClass} ${
        settings.isTransparent ? "bg-transparent" : "transparent-bg-panel"
      }`}
      style={{
        ...overlayScaleStyle,
        "--overlay-bg": `${settings.bgColor || "#0f172a"}${Math.round(
          safeBgOpacity * 255
        )
          .toString(16)
          .padStart(2, "0")}`,
      } as React.CSSProperties}
    >
      {/* 🔴 Transient Connected Standby Banner for first-time OBS source confirmations */}
      {messages.length === 0 && showInitialNotice && !previewMode && (
        <div className="absolute inset-x-4 top-4 bg-slate-900/90 backdrop-blur-md border border-indigo-500/30 p-3.5 rounded-xl text-slate-100 flex items-center gap-3 shadow-lg select-none pointer-events-none animate-slide-in font-sans z-50">
          <div className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </div>
          <div className="flex-1 text-[11px] leading-normal font-sans">
            <div className="font-bold text-slate-100 tracking-wide uppercase flex items-center gap-1">
              <span>ĐĂNG NHẬP OVERLAY THÀNH CÔNG</span>
              <span className="text-[9px] bg-indigo-500/20 text-indigo-300 px-1 py-0.5 rounded tracking-normal normal-case">Standby</span>
            </div>
            <p className="text-slate-300 mt-0.5">Khung overlay đã kết nối & sẵn sàng. Đang chờ đợi tin nhắn mới từ YouTube Live Chat...</p>
          </div>
        </div>
      )}

      {/* 👑 Section PINNED SUPER CHATS at the Top */}
      {activeSuperChats.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2 z-10">
          <AnimatePresence>
            {activeSuperChats.map((sc) => (
              <motion.div
                key={`pinned-${sc.id}`}
                initial={{ opacity: 0, y: -20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9, y: -10 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className={`rounded-lg overflow-hidden border p-2 flex items-center gap-2 max-w-sm transition-all shadow-md superchat-glow-${sc.tier}`}
                style={{
                  backgroundColor: sc.superChatColor,
                  borderColor: sc.superChatColor,
                  color: sc.tier === 4 ? "#1e293b" : "#ffffff", // Dark text on bright yellow tier 4
                }}
              >
                {settings.showAvatar && (
                  <img
                    src={sc.authorPhotoUrl}
                    alt={sc.authorName}
                    className="w-8 h-8 rounded-full border border-white/20 object-cover"
                    referrerPolicy="no-referrer"
                  />
                )}
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <span className="truncate max-w-[120px]">
                      {sc.authorName}
                    </span>
                    <Sparkles className="w-3.5 h-3.5 shrink-0" />
                    <span className="bg-white/20 px-1 py-0.5 rounded text-[10px]">
                      {sc.superChatAmountText}
                    </span>
                  </div>
                  <p className="text-[11px] leading-tight mt-0.5 truncate max-w-[200px]">
                    {sc.messageText || "Đã donate!"}
                  </p>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* 💬 Main Chat Message List (always auto-scrolling to the latest) */}
      <div className="flex-1 flex flex-col justify-end overflow-hidden">
        <div className="space-y-2.5 max-h-full overflow-y-auto custom-scrollbar flex flex-col pt-4">
          <AnimatePresence initial={false}>
            {visibleMessages.map((msg) => {
              const uColor = getUsernameColor(msg);

              if (msg.isSuperChat) {
                // Return full rich SuperChat Bubble Card
                return (
                  <motion.div
                    key={msg.id}
                    initial={
                      settings.animationType === "slide"
                        ? { opacity: 0, x: -150 }
                        : settings.animationType === "bounce"
                        ? { opacity: 0, scale: 0.3 }
                        : { opacity: 0 }
                    }
                    animate={
                      settings.animationType === "slide"
                        ? { opacity: 1, x: 0 }
                        : settings.animationType === "bounce"
                        ? { opacity: 1, scale: 1 }
                        : { opacity: 1 }
                    }
                    exit={{ opacity: 0, x: 50, transition: { duration: 0.15 } }}
                    transition={{
                      type: "spring",
                      stiffness: 260,
                      damping: 18,
                    }}
                    className={`rounded-lg overflow-hidden border shadow-lg m-0.5 flex flex-col shrink-0 superchat-glow-${msg.tier}`}
                    style={{
                      borderColor: msg.superChatColor,
                      color: msg.tier === 4 ? "#1e293b" : "#ffffff",
                    }}
                  >
                    {/* Header with Amount */}
                    <div
                      className="p-2.5 flex items-center justify-between font-bold"
                      style={{ backgroundColor: msg.superChatColor }}
                    >
                      <div className="flex items-center gap-2">
                        {settings.showAvatar && (
                          <img
                            src={msg.authorPhotoUrl}
                            alt={msg.authorName}
                            className="w-7 h-7 rounded-full border border-white/30 object-cover"
                            referrerPolicy="no-referrer"
                          />
                        )}
                        <span className="truncate max-w-[150px] text-sm">
                          {msg.authorName}
                        </span>
                      </div>
                      <div className="bg-black/25 px-2 py-0.5 rounded-full text-xs font-mono font-bold tracking-wider">
                        {msg.superChatAmountText}
                      </div>
                    </div>

                    {/* Comment Area */}
                    <div
                      className={`p-2.5 text-sm font-medium ${
                        msg.tier === 4 ? "bg-amber-100" : "bg-black/10"
                      }`}
                      style={{
                        color: msg.tier === 4 ? "#334155" : "inherit",
                        backdropFilter: "blur(2px)",
                      }}
                    >
                      <p className="break-words italic font-medium leading-relaxed">
                        {msg.messageText || "👑 Đã gửi tin nhắn Super Chat!"}
                      </p>
                    </div>
                  </motion.div>
                );
              }

              // Standard Chat Message Layout
              return (
                <motion.div
                  key={msg.id}
                  initial={
                    settings.animationType === "slide"
                      ? { opacity: 0, x: -60 }
                      : settings.animationType === "bounce"
                      ? { opacity: 0, scale: 0.8 }
                      : { opacity: 0 }
                  }
                  animate={
                    settings.animationType === "slide"
                      ? { opacity: 1, x: 0 }
                      : settings.animationType === "bounce"
                      ? { opacity: 1, scale: 1 }
                      : { opacity: 1 }
                  }
                  exit={{ opacity: 0, x: 30, transition: { duration: 0.1 } }}
                  transition={{ type: "spring", stiffness: 350, damping: 25 }}
                  className="flex items-start gap-2 text-sm leading-relaxed p-1 shrink-0 rounded hover:bg-white/5 transition-all"
                >
                  {settings.showAvatar && (
                    <img
                      src={msg.authorPhotoUrl}
                      alt={msg.authorName}
                      className="w-7 h-7 rounded-full border border-white/10 shrink-0 object-cover"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        // Fallback image (Security/Reliability review UT-19)
                        (e.target as HTMLImageElement).src =
                          "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=64&h=64&q=80";
                      }}
                    />
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1 mb-0.5">
                      {/* Name with specific styling */}
                      <span
                        className="font-bold tracking-tight text-ellipsis overflow-hidden whitespace-nowrap"
                        style={{ color: uColor }}
                      >
                        {msg.authorName}
                      </span>

                      {/* Display Creator/Mod Badges if enabled */}
                      {settings.showBadges && (
                        <div className="inline-flex items-center gap-0.5">
                          {msg.isOwner && (
                            <span
                              title="Tác chủ Stream"
                              className="bg-red-500 text-white rounded p-0.5 text-[8px] font-bold tracking-wider uppercase inline-flex items-center"
                            >
                              <Award className="w-2.5 h-2.5" />
                            </span>
                          )}
                          {msg.isModerator && (
                            <span
                              title="Kiểm duyệt viên"
                              className="bg-emerald-500 text-white rounded p-0.5 text-[8px] font-bold tracking-wider uppercase inline-flex items-center"
                            >
                              <Shield className="w-2.5 h-2.5" />
                            </span>
                          )}
                          {msg.isSponsor && (
                            <span
                              title="Hội viên kênh"
                              className="bg-amber-400 text-slate-900 rounded p-0.5 text-[8px] font-bold tracking-wider uppercase inline-flex items-center"
                            >
                              <Star className="w-2.5 h-2.5" fill="currentColor" />
                            </span>
                          )}
                        </div>
                      )}

                      {/* Timing label for preview context/desktop monitoring option */}
                      <span className="text-[10px] text-gray-400 opacity-60 ml-1 font-mono">
                        {new Date(msg.timestamp).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </span>
                    </div>

                    {/* Chat Bubble / Message body block */}
                    <div
                      className="text-sm font-normal break-words whitespace-pre-wrap leading-tight"
                      style={{ color: settings.textColor }}
                    >
                      {msg.messageText}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
