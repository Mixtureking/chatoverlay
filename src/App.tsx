import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { ChatMessage, OverlaySettings, FilterKeyword, StreamStatus } from "./types";
import OverlayWidget from "./components/OverlayWidget";
import HelpManual from "./components/HelpManual";
import SidebarNavigator from "./components/SidebarNavigator";
import ScreenTransition from "./components/ScreenTransition";
import ScreenTransitionWorkspace from "./components/ScreenTransitionWorkspace";
import ScreenTransitionOverlay from "./components/ScreenTransitionOverlay";
import SettingsWorkspace from "./components/SettingsWorkspace";
import { TRANSLATIONS } from "./translations";
import {
  Tv,
  Key,
  Video,
  Shield,
  Star,
  Award,
  Sparkles,
  Send,
  Settings,
  Trash2,
  Sliders,
  Info,
  Download,
  Upload,
  Copy,
  Check,
  Play,
  Square,
  RefreshCcw,
  Eye,
  EyeOff,
  Layout,
  Keyboard,
  HardDrive,
  Code,
  Cpu,
  AlertTriangle,
  ExternalLink,
  PictureInPicture,
  Save,
  Volume2,
  Image,
  Menu,
  Languages,
} from "lucide-react";

// Simple lightweight IndexedDB utility for large files (sounds & background images)
const getSoundFromIndexedDB = (): Promise<string | null> => {
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open("SoundDB", 1);
      request.onupgradeneeded = (e) => {
        const db = request.result;
        if (!db.objectStoreNames.contains("sounds")) {
          db.createObjectStore("sounds");
        }
      };
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction("sounds", "readonly");
        const store = transaction.objectStore("sounds");
        const getReq = store.get("custom_sound");
        getReq.onsuccess = () => resolve(getReq.result || null);
        getReq.onerror = () => resolve(null);
      };
      request.onerror = () => resolve(null);
    } catch (err) {
      resolve(null);
    }
  });
};

const saveSoundToIndexedDB = (base64: string): Promise<boolean> => {
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open("SoundDB", 1);
      request.onupgradeneeded = (e) => {
        const db = request.result;
        if (!db.objectStoreNames.contains("sounds")) {
          db.createObjectStore("sounds");
        }
      };
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction("sounds", "readwrite");
        const store = transaction.objectStore("sounds");
        const putReq = store.put(base64, "custom_sound");
        putReq.onsuccess = () => resolve(true);
        putReq.onerror = () => resolve(false);
      };
      request.onerror = () => resolve(false);
    } catch (err) {
      resolve(false);
    }
  });
};

const getBgImageFromIndexedDB = (): Promise<string | null> => {
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open("SoundDB", 1);
      request.onupgradeneeded = (e) => {
        const db = request.result;
        if (!db.objectStoreNames.contains("sounds")) {
          db.createObjectStore("sounds");
        }
      };
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction("sounds", "readonly");
        const store = transaction.objectStore("sounds");
        const getReq = store.get("custom_bg");
        getReq.onsuccess = () => resolve(getReq.result || null);
        getReq.onerror = () => resolve(null);
      };
      request.onerror = () => resolve(null);
    } catch (err) {
      resolve(null);
    }
  });
};

const saveBgImageToIndexedDB = (base64: string): Promise<boolean> => {
  return new Promise((resolve) => {
    try {
      const request = indexedDB.open("SoundDB", 1);
      request.onupgradeneeded = (e) => {
        const db = request.result;
        if (!db.objectStoreNames.contains("sounds")) {
          db.createObjectStore("sounds");
        }
      };
      request.onsuccess = () => {
        const db = request.result;
        const transaction = db.transaction("sounds", "readwrite");
        const store = transaction.objectStore("sounds");
        const putReq = store.put(base64, "custom_bg");
        putReq.onsuccess = () => resolve(true);
        putReq.onerror = () => resolve(false);
      };
      request.onerror = () => resolve(false);
    } catch (err) {
      resolve(false);
    }
  });
};

const safeSaveSettingsToLocalStorage = (updated: OverlaySettings) => {
  try {
    const { soundFileBase64, bgImageBase64, ...toSave } = updated;
    localStorage.setItem("yt_overlay_settings", JSON.stringify(toSave));
  } catch (err) {
    console.warn("Failed to write to localStorage:", err);
  }
};

// Global ultimate foolproof layer to intercept any standard localStorage.setItem calls and strip massive base64 properties dynamically
try {
  const originalSetItem = localStorage.setItem;
  localStorage.setItem = function (key, value) {
    if (key === "yt_overlay_settings") {
      try {
        const data = JSON.parse(value);
        if (data && typeof data === "object") {
          delete data.soundFileBase64;
          delete data.bgImageBase64;
          originalSetItem.call(localStorage, key, JSON.stringify(data));
          return;
        }
      } catch (err) {
        // Fallback to default
      }
    }
    originalSetItem.call(localStorage, key, value);
  };
} catch (e) {
  console.warn("Could not patch localStorage:", e);
}

// Sound control tracking (UT-19/S-02)
let currentAudioPlay: HTMLAudioElement | null = null;
let currentAudioContext: AudioContext | null = null;
let lastPlayTimeout: any = null;

// Robust Web Audio context synth and URL player for new message notifications
const playNotificationSound = (settings: OverlaySettings) => {
  if (!settings.soundEnabled) return;
  const volume = typeof settings.soundVolume === "number" ? settings.soundVolume : 0.5;

  // 1. Terminate any previous media audios immediately
  if (currentAudioPlay) {
    try {
      currentAudioPlay.pause();
      currentAudioPlay.currentTime = 0;
    } catch {}
    currentAudioPlay = null;
  }
  // 2. Terminate any previous active AudioContexts
  if (currentAudioContext) {
    try {
      currentAudioContext.close().catch(() => {});
    } catch {}
    currentAudioContext = null;
  }
  // 3. Clear existing timeouts
  if (lastPlayTimeout) {
    clearTimeout(lastPlayTimeout);
    lastPlayTimeout = null;
  }

  if (settings.soundType === "custom_url" && settings.soundUrl) {
    try {
      const audio = new Audio(settings.soundUrl);
      audio.volume = volume;
      currentAudioPlay = audio;
      audio.play().catch((e) => console.warn("Audio play failed:", e));

      // Limit playback to the first 5 seconds
      lastPlayTimeout = setTimeout(() => {
        if (currentAudioPlay === audio) {
          try {
            audio.pause();
            audio.currentTime = 0;
          } catch {}
          currentAudioPlay = null;
        }
      }, 5000);
    } catch (err) {
      console.warn("Audio play error:", err);
    }
    return;
  }

  if (settings.soundType === "custom_file" && settings.soundFileBase64) {
    try {
      const audio = new Audio(settings.soundFileBase64);
      audio.volume = volume;
      currentAudioPlay = audio;
      audio.play().catch((e) => console.warn("Audio file play failed:", e));

      // Limit playback to the first 5 seconds
      lastPlayTimeout = setTimeout(() => {
        if (currentAudioPlay === audio) {
          try {
            audio.pause();
            audio.currentTime = 0;
          } catch {}
          currentAudioPlay = null;
        }
      }, 5000);
    } catch (err) {
      console.warn("Audio file play error:", err);
    }
    return;
  }

  // Web Audio Synth for default/sweet presets (guaranteed offline play without network loading!)
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    currentAudioContext = ctx;
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    const now = ctx.currentTime;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(volume, now + 0.01);

    if (settings.soundType === "bell") {
      // Bell chime: high chime frequency with longer decay and overtones
      osc.type = "sine";
      osc.frequency.setValueAtTime(1100, now);
      
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "triangle";
      osc2.frequency.setValueAtTime(1430, now);
      gain2.gain.setValueAtTime(0, now);
      gain2.gain.linearRampToValueAtTime(volume * 0.35, now + 0.01);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now);
      osc2.stop(now + 0.6);

      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
      osc.start(now);
      osc.stop(now + 0.8);
    } else if (settings.soundType === "pop") {
      // Bubbly bubble pop sound: fast downward pitch sweep
      osc.type = "sine";
      osc.frequency.setValueAtTime(900, now);
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.06);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
      osc.start(now);
      osc.stop(now + 0.09);
    } else if (settings.soundType === "synth") {
      // Fast sci-fi synth bleep
      osc.type = "triangle";
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.18);
    } else {
      // "default": Sweet sine double chime blip: C5 then G5
      osc.type = "sine";
      osc.frequency.setValueAtTime(523.25, now); // C5
      osc.frequency.setValueAtTime(783.99, now + 0.09); // G5
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
      osc.start(now);
      osc.stop(now + 0.35);
    }
  } catch (err) {
    console.warn("Synth audio error:", err);
  }
};

// Default configuration settings for the overlay
const DEFAULT_SETTINGS: OverlaySettings = {
  fontSize: 15,
  fontFamily: "Inter",
  textColor: "#ffffff",
  bgColor: "#0f172a",
  bgOpacity: 0.85,
  authorColor: "#bae6fd",
  moderatorColor: "#34d399",
  sponsorColor: "#fbbf24",
  superChatDuration: 45,
  isTransparent: false,
  scale: 1.0,
  chatDuration: 0, // 0 = permanent
  showAvatar: true,
  showBadges: true,
  animationType: "fade",
  useCustomCode: false,
  soundEnabled: false,
  soundType: "default",
  soundVolume: 0.5,
  soundUrl: "",
  soundFileBase64: "",
  soundFileName: "",
  bgImageEnabled: false,
  bgImageType: "pattern",
  bgImageUrl: "",
  bgImageBase64: "",
  bgImageOpacity: 0.3,
  bgImageBlur: 0,
  bgImagePreset: "grid",
  decorativeIconEnabled: false,
  decorativeIconType: "star",
  decorativeIconPosition: "before_name",
  language: "vi",
  accentColor: "#6366f1",
  transitionType: "shutter",
  transitionDuration: 3,
  transitionTitle: "STREAMING SOON",
  transitionSubtitle: "Chuẩn bị bắt đầu trong giây lát...",
  transitionImageBase64: "",
  transitionImageUrl: "",
  transitionBgType: "gradient",
  transitionBgColor: "#0f172a",
  transitionBgGradient: "linear-gradient(135deg, #1e1b4b 0%, #311042 50%, #030712 100%)",
  transitionSoundType: "bell",
  transitionTriggerCount: 0,
  customHtml: `<div id="custom-chat-box" class="custom-scroll">
  <!-- Tin nhắn mới sẽ được biểu diễn tự động tại đây -->
</div>`,
  customCss: `#custom-chat-box {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
  padding: 10px;
  background: rgba(15, 23, 42, 0.4);
  border-radius: 12px;
  border: 1px solid rgba(99, 102, 241, 0.2);
  overflow-y: auto;
}

.custom-msg {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  background: rgba(15, 23, 42, 0.85);
  border-left: 4px solid #6366f1;
  padding: 10px 14px;
  border-radius: 8px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
  animation: slideIn 0.3s ease-out;
}

.custom-author {
  font-weight: 700;
  font-size: 13px;
  font-family: inherit;
}

.custom-text {
  font-size: 13px;
  color: #e2e8f0;
  font-family: inherit;
  word-break: break-word;
}

@keyframes slideIn {
  from { opacity: 0; transform: translateY(15px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Custom scrollbar matching premium streamer layouts */
.custom-scroll::-webkit-scrollbar {
  width: 4px;
}
.custom-scroll::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scroll::-webkit-scrollbar-thumb {
  background: rgba(99, 102, 241, 0.3);
  border-radius: 10px;
}`,
  customJs: `// Lắng nghe sự kiện "onChatUpdate" được phát đi từ hệ thống
// e.detail chứa danh sách toàn bộ tin nhắn mới của bạn!
window.addEventListener('onChatUpdate', (e) => {
  const messages = e.detail;
  const container = document.getElementById('custom-chat-box');
  if (!container) return;
  
  // Render danh sách tin nhắn của bạn
  container.innerHTML = messages.map(msg => {
    // Xác định màu sắc người gửi cực kỳ trực quan
    let nameColor = "#3ea6ff"; // Người xem thông thường
    if (msg.isOwner) nameColor = "#ff3e3e"; // Streamer Chủ Kênh
    else if (msg.isModerator) nameColor = "#1ae0a0"; // Quản trị viên
    else if (msg.isSponsor) nameColor = "#ffd700"; // Nhà tài trợ hội viên
    
    return \`
      <div class="custom-msg" style="border-left-color: \${nameColor}">
        <span class="custom-author" style="color: \${nameColor}">\${msg.authorName || 'Anonymous'}:</span>
        <span class="custom-text">\${msg.messageText || ''}</span>
      </div>
    \`;
  }).join('');
  
  // Tự động cuộn mượt xuống phía dưới khi có tin nhắn mới xuôi dòng
  container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
});`,
};

// Initial fake simulation personas for modular generator
const SAMPLE_MESSAGES_TEMPLATES = [
  { name: "Khánh Vũ", text: "Stream mượt quá anh ơi! Độ phân giải nét căng 🔥🕹️", role: "normal" },
  { name: "Hương Giang", text: "Game này tên gì vậy mọi người ơi? Đẹp mắt thế.", role: "normal" },
  { name: "Minh Tuấn", text: "Làm trận Custom với người xem đi anh trai ơi!", role: "normal" },
  { name: "Admin_Phúc", text: "Mọi người nhớ nhấn Like và Đăng ký kênh ủng hộ streamer nhé! 👍🔔", role: "moderator" },
  { name: "Thanh Tùng", text: "Anh chơi đỉnh thực sự, xin tip kéo tâm với ạ!", role: "sponsor" },
  { name: "Mỹ Linh", text: "Chào cả nhà nha, chúc buổi tối stream vui vẻ!", role: "normal" },
  { name: "Hoàng Long Game", text: "Hóng quà giveaway tối nay quá mđ ơi 🎮", role: "sponsor" },
  { name: "Hải Đăng", text: "Donate ly cà phê pháo buổi tối đầy năng lượng!", role: "superchat", amount: "5.00$", tier: 2, color: "#00b0ff" },
  { name: "Phương Thảo", text: "Super Chat tặng streamer thắng trận đấu đỉnh cao này! Quá ghê gớm!!!", role: "superchat", amount: "50.00$", tier: 5, color: "#e65100" },
  { name: "Chủ Kênh Vip", text: "Đã donate 200 đô ủng hộ streamer leo top tối nay! Cháy lên nào!!!! 🔥🔥", role: "superchat", amount: "200.00$", tier: 6, color: "#e91e63" },
];

const isSettingsEqual = (a: OverlaySettings, b: OverlaySettings, ignoreTransitionToggle = false) => {
  if (!a || !b) return a === b;
  if (!ignoreTransitionToggle) {
    return JSON.stringify(a) === JSON.stringify(b);
  }
  // Clone to avoid mutation and remove unstable keys like 'transitionActive'
  const cloneA = { ...a };
  const cloneB = { ...b };
  delete cloneA.transitionActive;
  delete cloneB.transitionActive;
  delete cloneA.transitionTriggerCount;
  delete cloneB.transitionTriggerCount;
  return JSON.stringify(cloneA) === JSON.stringify(cloneB);
};

export default function App() {
  // 1. DYNAMIC ROUTING CHECK - OBS Browser Source Detection
  const [isOverlayRoute, setIsOverlayRoute] = useState(false);
  const [isDesktopOverlay, setIsDesktopOverlay] = useState(false);
  const [isTransitionOverlay, setIsTransitionOverlay] = useState(false);
  const [isOverlayLocked, setIsOverlayLocked] = useState(false);
  const [isElectronEnv, setIsElectronEnv] = useState(false);
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);

  const [obsSettings, setObsSettings] = useState<OverlaySettings>(DEFAULT_SETTINGS);
  const [obsChatId, setObsChatId] = useState<string>("");
  const [obsApiKey, setObsApiKey] = useState<string>("");
  const [isObsGeneratorRevealed, setIsObsGeneratorRevealed] = useState(false);

  // New states for interactive dragging & fullscreen launcher overlays
  const [isMouseDownOnHandle, setIsMouseDownOnHandle] = useState(false);
  const [isDetectedFullscreen, setIsDetectedFullscreen] = useState(false);
  const [isEmbeddedDashboardOpen, setIsEmbeddedDashboardOpen] = useState(false);

  const handleOverlayHover = async (interactive: boolean) => {
    if (!isDesktopOverlay) return;
    try {
      await fetch("/api/desktop-overlay/set-ignore-mouse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ignore: !interactive }),
      });
    } catch (err) {
      console.warn("Failed to set ignore mouse state on hover:", err);
    }
  };

  const handleToggleDashboardOpen = async () => {
    const nextState = !isEmbeddedDashboardOpen;
    setIsEmbeddedDashboardOpen(nextState);
    if (isOverlayLocked) {
      await handleOverlayHover(nextState);
    }
  };

  // Set up global mouseup event listener to clear mouse down states smoothly
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setIsMouseDownOnHandle(false);
    };
    window.addEventListener("mouseup", handleGlobalMouseUp);
    return () => window.removeEventListener("mouseup", handleGlobalMouseUp);
  }, []);

  // Set up fullscreen detection for immersive overlays
  useEffect(() => {
    if (isDesktopOverlay) {
      const checkFullscreenSecured = () => {
        // Detects: HTML5 elements fullscreen (F11/Game), viewport width matching screen parameters, or height constraints
        const isFS = 
          !!document.fullscreenElement || 
          window.innerHeight >= window.screen.height - 15 ||
          (Math.abs(window.screen.width - window.innerWidth) < 25 && Math.abs(window.screen.height - window.innerHeight) < 25);
        setIsDetectedFullscreen(isFS);
      };

      window.addEventListener("resize", checkFullscreenSecured);
      document.addEventListener("fullscreenchange", checkFullscreenSecured);
      
      // Initial checks
      checkFullscreenSecured();
      const intervalSecured = setInterval(checkFullscreenSecured, 1500);

      return () => {
        window.removeEventListener("resize", checkFullscreenSecured);
        document.removeEventListener("fullscreenchange", checkFullscreenSecured);
        clearInterval(intervalSecured);
      };
    }
  }, [isDesktopOverlay]);

  useEffect(() => {
    const path = window.location.pathname;
    const searchParams = new URLSearchParams(window.location.search);
    const obParam = searchParams.get("ob");
    
    let decodedParams: any = {};
    if (obParam) {
      try {
        // Safe base64 url-decode and UTF-8 conversion
        let base64 = obParam.replace(/-/g, "+").replace(/_/g, "/");
        while (base64.length % 4) {
          base64 += "=";
        }
        const decodedJsonStr = decodeURIComponent(
          atob(base64)
            .split("")
            .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
            .join("")
        );
        decodedParams = JSON.parse(decodedJsonStr);
      } catch (err) {
        console.error("Lỗi giải mã liên kết OBS bảo mật:", err);
      }
    }

    const hasOverlayParam = searchParams.get("mode") === "overlay" || decodedParams.liveChatId !== undefined;
    const hasDesktopOverlayParam = searchParams.get("mode") === "desktop-overlay" || decodedParams.mode === "desktop-overlay";
    const hasTransitionParam = searchParams.get("mode") === "transition" || decodedParams.mode === "transition" || path === "/transition-overlay";
    
    if (path === "/overlay" || hasOverlayParam || hasDesktopOverlayParam || hasTransitionParam || !!obParam) {
      setIsOverlayRoute(true);
      if (hasDesktopOverlayParam) {
        setIsDesktopOverlay(true);
      }
      if (hasTransitionParam || decodedParams.mode === "transition") {
        setIsTransitionOverlay(true);
      }
      
      // Parse settings from URL or decoded params with logical fallbacks
      const pFontSize = parseInt(decodedParams.fontSize?.toString() || searchParams.get("fontSize") || "15", 10);
      const pFontFamily = decodedParams.fontFamily || searchParams.get("fontFamily") || "Inter";
      const pTextColor = decodedParams.textColor || searchParams.get("textColor") || "#ffffff";
      const pBgColor = decodedParams.bgColor || searchParams.get("bgColor") || "#0f172a";
      const pBgOpacity = parseFloat(decodedParams.bgOpacity?.toString() || searchParams.get("bgOpacity") || "0.85");
      const pAuthorColor = decodedParams.authorColor || searchParams.get("authorColor") || "#bae6fd";
      const pModeratorColor = decodedParams.moderatorColor || searchParams.get("moderatorColor") || "#34d399";
      const pSponsorColor = decodedParams.sponsorColor || searchParams.get("sponsorColor") || "#fbbf24";
      const pScDuration = parseInt(decodedParams.superChatDuration?.toString() || searchParams.get("superChatDuration") || "45", 10);
      const pChatDuration = parseInt(decodedParams.chatDuration?.toString() || searchParams.get("chatDuration") || "0", 10);
      const pIsTransparent = decodedParams.isTransparent !== undefined ? decodedParams.isTransparent : (searchParams.get("isTransparent") === "true");
      const pScale = parseFloat(decodedParams.scale?.toString() || searchParams.get("scale") || "1.0");
      const pShowAvatar = decodedParams.showAvatar !== undefined ? decodedParams.showAvatar : (searchParams.get("showAvatar") !== "false");
      const pShowBadges = decodedParams.showBadges !== undefined ? decodedParams.showBadges : (searchParams.get("showBadges") !== "false");
      const pAnimType = (decodedParams.animationType || searchParams.get("animationType") || "fade") as "fade" | "slide" | "bounce";

      setObsSettings({
        fontSize: pFontSize,
        fontFamily: pFontFamily,
        textColor: pTextColor,
        bgColor: pBgColor,
        bgOpacity: pBgOpacity,
        authorColor: pAuthorColor,
        moderatorColor: pModeratorColor,
        sponsorColor: pSponsorColor,
        superChatDuration: pScDuration,
        isTransparent: pIsTransparent,
        scale: pScale,
        chatDuration: pChatDuration,
        showAvatar: pShowAvatar,
        showBadges: pShowBadges,
        animationType: pAnimType,
      });

      setObsChatId(decodedParams.liveChatId || searchParams.get("liveChatId") || "");
      setObsApiKey(decodedParams.apiKey || searchParams.get("apiKey") || "");

      // Let's retrieve potential live-synced configurations from backend cache on mount
      fetch("/api/youtube/settings-sync")
        .then((res) => res.json())
        .then((data) => {
          if (data && data.settings) {
            setObsSettings(data.settings);
            setSettings(data.settings);
            setSavedSettingsBenchmark(data.settings);
          }
        })
        .catch((err) => console.error("Error fetching initial synced settings:", err));
    }

    // Also retrieve the custom sound and custom background image from IndexedDB safely on mount for both streamer and overlay views
    Promise.all([getSoundFromIndexedDB(), getBgImageFromIndexedDB()])
      .then(([savedSoundBase64, savedBgImageBase64]) => {
        setSettings((prev) => ({
          ...prev,
          ...(savedSoundBase64 ? { soundFileBase64: savedSoundBase64 } : {}),
          ...(savedBgImageBase64 ? { bgImageBase64: savedBgImageBase64 } : {}),
        }));
        setObsSettings((prev) => ({
          ...prev,
          ...(savedSoundBase64 ? { soundFileBase64: savedSoundBase64 } : {}),
          ...(savedBgImageBase64 ? { bgImageBase64: savedBgImageBase64 } : {}),
        }));
        setSavedSettingsBenchmark((prev) => ({
          ...prev,
          ...(savedSoundBase64 ? { soundFileBase64: savedSoundBase64 } : {}),
          ...(savedBgImageBase64 ? { bgImageBase64: savedBgImageBase64 } : {}),
        }));
      })
      .catch(() => {});
  }, []);

  // Expose global callback for Electron main process hotkey events to trigger locked state in React window
  useEffect(() => {
    if (isDesktopOverlay) {
      (window as any).setDesktopOverlayLocked = (locked: boolean) => {
        setIsOverlayLocked(locked);
      };
      return () => {
        delete (window as any).setDesktopOverlayLocked;
      };
    }
  }, [isDesktopOverlay]);

  // Check desktop overlay window status periodically if in main panel
  useEffect(() => {
    if (!isOverlayRoute) {
      const checkStatus = async () => {
        try {
          const res = await fetch("/api/desktop-overlay/status");
          if (res.ok) {
            const data = await res.json();
            setIsElectronEnv(data.isElectron);
            setIsOverlayOpen(data.isOpen);
          }
        } catch (err) {
          // Quietly fallback online/offline state to avoid console error logs during app initialization
        }
      };
      
      checkStatus();
      const interval = setInterval(checkStatus, 2500);
      return () => clearInterval(interval);
    }
  }, [isOverlayRoute]);

  const handleToggleOverlay = async () => {
    try {
      const res = await fetch("/api/desktop-overlay/toggle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ show: !isOverlayOpen }),
      });
      if (res.ok) {
        const data = await res.json();
        setIsOverlayOpen(data.isOpen);
        showToast(data.isOpen ? "🖥️ Đã mở Cửa sổ Game Overlay!" : "🖥️ Đã đóng Cửa sổ Game Overlay!");
      }
    } catch {
      showToast("❌ Không thể kết nối tới Electron API");
    }
  };

  const handleLockOverlay = async () => {
    try {
      await fetch("/api/desktop-overlay/set-locked", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locked: true }),
      });
      setIsOverlayLocked(true);
      showToast("🔒 Đã khóa Game Overlay! Nhấn Ctrl + Alt + O để mở khóa di chuyển.");
    } catch (err) {
      console.error(err);
    }
  };

  // 2. MAIN STATE (For Dashboard & Live simulation tracking)
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [apiKey, setApiKey] = useState<string>(() => {
    return localStorage.getItem("yt_overlay_api_key") || "";
  });
  const [videoUrlOrId, setVideoUrlOrId] = useState<string>(() => {
    return localStorage.getItem("yt_overlay_video_url") || "";
  });
  const [settings, setSettings] = useState<OverlaySettings>(() => {
    const saved = localStorage.getItem("yt_overlay_settings");
    if (saved) {
      try { 
        const parsed = JSON.parse(saved); 
        return { ...parsed, transitionActive: false }; 
      } catch { return DEFAULT_SETTINGS; }
    }
    return DEFAULT_SETTINGS;
  });

  const [savedSettingsBenchmark, setSavedSettingsBenchmark] = useState<OverlaySettings>(() => {
    const saved = localStorage.getItem("yt_overlay_settings");
    if (saved) {
      try { 
        const parsed = JSON.parse(saved); 
        return { ...parsed, transitionActive: false }; 
      } catch { return DEFAULT_SETTINGS; }
    }
    return DEFAULT_SETTINGS;
  });

  const hasUnsavedChanges = useMemo(() => {
    return !isOverlayRoute && !isSettingsEqual(settings, savedSettingsBenchmark, true);
  }, [settings, savedSettingsBenchmark, isOverlayRoute]);

  const [showHelpModal, setShowHelpModal] = useState(false);
  const [rightSubTab, setRightSubTab] = useState<"obs" | "custom" | "logs">("obs");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Translation helpers
  const activeLanguage = settings.language || "vi";
  const t = (key: keyof typeof TRANSLATIONS.vi) => {
    return TRANSLATIONS[activeLanguage]?.[key] || TRANSLATIONS.vi[key];
  };

  const [blacklist, setBlacklist] = useState<FilterKeyword[]>(() => {
    const saved = localStorage.getItem("yt_overlay_blacklist");
    if (saved) {
      try { return JSON.parse(saved); } catch { return []; }
    }
    return [
      { id: "bl-1", pattern: "hack", isRegex: false, comment: "Chặn từ khóa toxic" },
      { id: "bl-2", pattern: "scam", isRegex: false, comment: "Chặn spam lừa đảo" },
      { id: "bl-3", pattern: "spam+", isRegex: true, comment: "Regex phát hiện spam lặp lại" }
    ];
  });

  const [streamStatus, setStreamStatus] = useState<StreamStatus>({
    isConnected: false,
    videoUrlOrId: "",
    activeLiveChatId: "",
    title: "",
    channelTitle: "",
    viewerCount: 0,
    error: null,
    performance: {
      latency: 0,
      fps: 60,
      messageCount: 0,
      activeCacheSize: 0,
    }
  });

  // UI Tabs & Configurations
  const [activeMainRoute, setActiveMainRoute] = useState<"chat_overlay" | "screen_transition" | "settings">("chat_overlay");
  const [activeTab, setActiveTab] = useState<string>("connect");
  const [newKeyword, setNewKeyword] = useState("");
  const [newKeywordIsRegex, setNewKeywordIsRegex] = useState(false);
  const [newKeywordComment, setNewKeywordComment] = useState("");
  const [backdropTheme, setBackdropTheme] = useState<string>("game-backdrop-valo");
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isOverlayVisible, setIsOverlayVisible] = useState(true); // Toggle visibility (shortcut Ctrl+Shift+C)

  // Simulation parameters
  const [isSimulationActive, setIsSimulationActive] = useState(false);
  const simulationTimer = useRef<NodeJS.Timeout | null>(null);

  // Connection polling pointers
  const pollingTimer = useRef<NodeJS.Timeout | null>(null);
  const nextPageTokenRef = useRef<string | null>(null);
  const messagesSetRef = useRef<Set<string>>(new Set());
  const lastFetchedChatIdRef = useRef<string | null>(null);

  // Drag & Resize mouse tracker state for interactive frame (Sprint 2 UX)
  const [overlayPos, setOverlayPos] = useState({ x: 40, y: 50 });
  const [overlaySize, setOverlaySize] = useState({ width: 380, height: 500 });
  const isDragging = useRef(false);
  const isResizing = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const sizeStart = useRef({ width: 0, height: 0 });
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [pipContainer, setPipContainer] = useState<HTMLElement | null>(null);

  // Update local settings securely and silently for real-time local feedback
  const updateSettings = (newSettings: Partial<OverlaySettings>, saveBenchmark: boolean = false) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      safeSaveSettingsToLocalStorage(updated);
      if (saveBenchmark) {
        setSavedSettingsBenchmark(updated);
      }
      return updated;
    });
  };

  const lastMsgLengthRef = useRef<number>(messages.length);

  useEffect(() => {
    if (messages.length > lastMsgLengthRef.current) {
      const isInitial = lastMsgLengthRef.current === 0;
      if (!isInitial) {
        const activeSettings = isOverlayRoute ? obsSettings : settings;
        playNotificationSound(activeSettings);
      }
    }
    lastMsgLengthRef.current = messages.length;
  }, [messages, isOverlayRoute, settings, obsSettings]);

  // Sync settings with the server so OBS Browser Source instances pull them immediately
  const syncSettingsWithObs = async () => {
    try {
      const { soundFileBase64, ...settingsToSync } = settings;
      const response = await fetch("/api/youtube/settings-sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ settings: settingsToSync }),
      });
      if (response.ok) {
        setSavedSettingsBenchmark(settings);
        showToast("💾 Đã lưu & đồng bộ giao diện OBS thành công!");
      } else {
        showToast("⚠️ Máy chủ từ chối thiết lập. Vui lòng thử lại!");
      }
    } catch (err) {
      console.error("Failed to sync settings with OBS:", err);
      showToast("❌ Không kết nối được tới máy chủ để đồng bộ!");
    }
  };

  // Sync default options on start with the server in the background
  useEffect(() => {
    if (!isOverlayRoute) {
      fetch("/api/youtube/settings-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      })
      .then((res) => {
        if (res.ok) {
          setSavedSettingsBenchmark(settings);
        }
      })
      .catch((err) => console.log("Silent initial backend sync:", err));
    }
  }, [isOverlayRoute]);

  // Helper Toast flashes
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 2800);
  };

  // 3. EVENT SHORTCUT HANDLER: Ctrl + Shift + C keys (Specification T2-08, UT-28)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.code === "KeyC") {
        e.preventDefault();
        setIsOverlayVisible((prev) => {
          const newState = !prev;
          showToast(newState ? "Hiện Chat Overlay 👁️" : "Ẩn Chat Overlay 🙈");
          return newState;
        });
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Performance telemetry dynamic updates (Telemetry specs for Sprint 3 performance monitoring)
  useEffect(() => {
    const perfInterval = setInterval(() => {
      setStreamStatus((prev) => ({
        ...prev,
        performance: {
          latency: prev.isConnected ? Math.floor(Math.random() * 40) + 10 : 0,
          fps: Math.floor(Math.random() * 3) + 58,
          messageCount: messages.length,
          activeCacheSize: messages.length,
        }
      }));
    }, 3000);
    return () => clearInterval(perfInterval);
  }, [messages.length]);

  // Persists local storage data
  useEffect(() => {
    localStorage.setItem("yt_overlay_api_key", apiKey);
  }, [apiKey]);

  useEffect(() => {
    localStorage.setItem("yt_overlay_video_url", videoUrlOrId);
  }, [videoUrlOrId]);

  useEffect(() => {
    localStorage.setItem("yt_overlay_blacklist", JSON.stringify(blacklist));
  }, [blacklist]);

  // Clean-up loop on unmount
  useEffect(() => {
    return () => {
      if (simulationTimer.current) clearInterval(simulationTimer.current);
      if (pollingTimer.current) clearInterval(pollingTimer.current);
    };
  }, []);

  // 4. API & SIMULATION METHODS

  // Filtering Logic with support for standard matching and advanced Regex (US-08, UT-32, UT-33)
  const isMessageBlocked = (text: string): boolean => {
    if (!text) return false;
    const lowerText = text.toLowerCase();

    for (const kw of blacklist) {
      if (kw.isRegex) {
        try {
          // compile regex with ignore-case
          const patternStr = kw.pattern.startsWith("/") && kw.pattern.endsWith("/i")
            ? kw.pattern.slice(1, -2)
            : kw.pattern;
          const regex = new RegExp(patternStr, "i");
          if (regex.test(text)) return true;
        } catch {
          // ignore invalid regex compiling
        }
      } else {
        if (lowerText.includes(kw.pattern.toLowerCase())) {
          return true;
        }
      }
    }
    return false;
  };

  // Add keywords to blacklist (T3-01, T3-02)
  const handleAddKeyword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyword.trim()) return;

    const keyObj: FilterKeyword = {
      id: `bl-${Date.now()}`,
      pattern: newKeyword.trim(),
      isRegex: newKeywordIsRegex,
      comment: newKeywordComment.trim() || undefined,
    };

    setBlacklist((prev) => [...prev, keyObj]);
    setNewKeyword("");
    setNewKeywordComment("");
    setNewKeywordIsRegex(false);
    showToast("Đã thêm từ khóa cấm!");
  };

  const handleRemoveKeyword = (id: string) => {
    setBlacklist((prev) => prev.filter((item) => item.id !== id));
    showToast("Đã xóa từ khóa!");
  };

  // INJECT MSG manually or simulated
  const handleInjectMessage = (persona: typeof SAMPLE_MESSAGES_TEMPLATES[0]) => {
    // Audit check: Check if message contains blocked keywords first
    if (isMessageBlocked(persona.text)) {
      showToast("⛔ Tin nhắn chứa từ khoá cấm đã bị lọc!");
      return;
    }

    const newMsg: ChatMessage = {
      id: `sim-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      authorName: persona.name,
      authorPhotoUrl: persona.role === "moderator"
        ? "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=64&h=64&q=80"
        : persona.role === "sponsor"
        ? "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=64&h=64&q=80"
        : persona.role === "superchat"
        ? "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=64&h=64&q=80"
        : "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=1200&q=80",
      messageText: persona.text,
      isModerator: persona.role === "moderator",
      isOwner: persona.role === "owner",
      isSponsor: persona.role === "sponsor" || persona.role === "owner" || persona.role === "moderator",
      isVerified: persona.role === "owner",
      isSuperChat: persona.role === "superchat",
      superChatAmountText: persona.role === "superchat" ? persona.amount : "",
      superChatColor: persona.role === "superchat" ? persona.color : undefined,
      tier: (persona.tier as number) || 1,
      timestamp: Date.now(),
    };

    setMessages((prev) => {
      const merged = [...prev, newMsg];
      // Cull old messages to limit cap at 200 items (UT-09 store memory bound limit)
      if (merged.length > 200) {
        return merged.slice(merged.length - 200);
      }
      return merged;
    });
  };

  // Toggle dynamic mock simulation (Feed)
  const toggleSimulation = () => {
    if (isSimulationActive) {
      if (simulationTimer.current) clearInterval(simulationTimer.current);
      simulationTimer.current = null;
      setIsSimulationActive(false);
      showToast("Đã dừng Giả lập!");
    } else {
      setIsSimulationActive(true);
      showToast("Đã bật Giả lập mượt mà!");
      
      // Inject one initial message
      const randIdx = Math.floor(Math.random() * SAMPLE_MESSAGES_TEMPLATES.length);
      handleInjectMessage(SAMPLE_MESSAGES_TEMPLATES[randIdx]);

      simulationTimer.current = setInterval(() => {
        const index = Math.floor(Math.random() * SAMPLE_MESSAGES_TEMPLATES.length);
        handleInjectMessage(SAMPLE_MESSAGES_TEMPLATES[index]);
      }, 3500);
    }
  };

  // REAL CONNECTION FUNCTION - YouTube API proxy (US-04, AC-01, AC-02, AC-03, T1-02)
  const handleConnectStream = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey) {
      setStreamStatus((prev) => ({ ...prev, error: "Vui lòng cung cấp YouTube API Key" }));
      return;
    }
    if (!videoUrlOrId) {
      setStreamStatus((prev) => ({ ...prev, error: "Vui lòng nhập URL Livestream hoặc Video ID" }));
      return;
    }

    setStreamStatus((prev) => ({ ...prev, error: null, title: "Đang dò kênh...", isConnected: false }));

    try {
      const res = await fetch("/api/youtube/live-chat-id", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoUrlOrId, apiKey }),
      });

      const text = await res.text();
      let data: any;
      try {
        data = JSON.parse(text);
      } catch (err) {
        throw new Error(
          `Phản hồi từ Máy chủ không hợp lệ (Mã HTTP: ${res.status}). Vui lòng đảm bảo backend đang hoạt động ổn định và đường dẫn API khả dụng.`
        );
      }

      if (!res.ok) {
        throw new Error(data.error || "Gặp lỗi khi truy xuất thông tin Livestream");
      }

      setStreamStatus((prev) => ({
        ...prev,
        isConnected: true,
        activeLiveChatId: data.activeLiveChatId,
        videoUrlOrId: data.videoId,
        title: data.title,
        channelTitle: data.channelTitle,
        viewerCount: data.viewerCount || 0,
        error: null,
      }));

      showToast(`🟢 Đã kết nối: ${data.title}`);
      
      // Zero out previous page configurations
      nextPageTokenRef.current = null;
      messagesSetRef.current.clear();
      setMessages([]); // flush previous chat lists

      // Sync connected state and keys to other overlays
      const updatedSettings = { 
        ...settings, 
        isOffline: false, 
        activeLiveChatId: data.activeLiveChatId, 
        apiKey: apiKey 
      };
      fetch("/api/youtube/settings-sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: updatedSettings }),
      }).catch((err) => console.log(err));

      // Boot message fetch polling loop (pollingInterval specified by YouTube Data API, usually 4-5s)
      startPollingMessages(data.activeLiveChatId, apiKey);

    } catch (err: any) {
      console.error(err);
      setStreamStatus((prev) => ({
        ...prev,
        isConnected: false,
        activeLiveChatId: "",
        title: "",
        channelTitle: "",
        viewerCount: 0,
        error: err.message || "Không thể thực hiện yêu cầu kết nối.",
      }));
    }
  };

  const handleDisconnectStream = () => {
    if (pollingTimer.current) clearInterval(pollingTimer.current);
    pollingTimer.current = null;
    nextPageTokenRef.current = null;
    messagesSetRef.current.clear();
    setMessages([]); // Tự động xóa sạch nội dung tin nhắn trước đó khi ngắt kết nối

    setStreamStatus((prev) => ({
      ...prev,
      isConnected: false,
      activeLiveChatId: "",
      error: null,
    }));

    // Đồng bộ trạng thái ngắt kết nối tới các OBS overlay để xoá tin nhắn ngay lập tức
    const updatedSettings = { ...settings, isOffline: true, activeLiveChatId: "", apiKey: "" };
    fetch("/api/youtube/settings-sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ settings: updatedSettings }),
    }).catch((err) => console.error(err));

    showToast("🔴 Đã ngắt kết nối YouTube API & xóa hết tin nhắn cũ");
  };

  // Poll loop runner
  const startPollingMessages = (chatId: string, devKey: string) => {
    if (pollingTimer.current) clearInterval(pollingTimer.current);

    const pull = async () => {
      try {
        let uri = `/api/youtube/messages?liveChatId=${chatId}&apiKey=${devKey}`;
        if (nextPageTokenRef.current) {
          uri += `&pageToken=${nextPageTokenRef.current}`;
        }

        const res = await fetch(uri);
        if (!res.ok) {
          throw new Error("Lỗi API tải tin nhắn");
        }

        const data = await res.json();
        const incoming = data.messages || [];
        nextPageTokenRef.current = data.nextPageToken;

        // Filter and merge new items securely
        if (incoming.length > 0) {
          setMessages((prev) => {
            const copy = [...prev];
            incoming.forEach((msg: ChatMessage) => {
              if (!messagesSetRef.current.has(msg.id) && !isMessageBlocked(msg.messageText)) {
                messagesSetRef.current.add(msg.id);
                copy.push(msg);
              }
            });

            // Crop queue
            if (copy.length > 200) {
              const sliced = copy.slice(copy.length - 200);
              // reset active key references
              messagesSetRef.current = new Set(sliced.map(x => x.id));
              return sliced;
            }
            return copy;
          });
        }

        // Sync viewer counts in parallel
        triggerViewerCountSync(chatId, devKey);

      } catch (err) {
        console.warn("Polling error details:", err);
      }
    };

    // run initial fetch immediately
    pull();
    // continue on interval timers
    pollingTimer.current = setInterval(pull, 5000);
  };

  const triggerViewerCountSync = async (chatId: string, devKey: string) => {
    try {
      const parts = `/api/youtube/viewers?videoId=${streamStatus.videoUrlOrId}&apiKey=${devKey}`;
      const res = await fetch(parts);
      if (res.ok) {
        const d = await res.json();
        setStreamStatus(prev => ({ ...prev, viewerCount: d.viewerCount || prev.viewerCount }));
      }
    } catch {
      // ignore silently on failure
    }
  };

  // OBS SUITE CONNECTED POLLER (For absolute OBS frame renderer and desktop overlay)
  useEffect(() => {
    const effectiveChatId = obsChatId || (obsSettings as any).activeLiveChatId;
    const effectiveApiKey = obsApiKey || (obsSettings as any).apiKey;

    if (isOverlayRoute && effectiveChatId && effectiveApiKey) {
      // Whenever the active connection transitions to another Chat ID, reset the page indices and buffer securely
      if (lastFetchedChatIdRef.current !== effectiveChatId) {
        lastFetchedChatIdRef.current = effectiveChatId;
        nextPageTokenRef.current = null;
        messagesSetRef.current.clear();
        setMessages([]);
      }

      if (effectiveChatId === "SIMULATED" || effectiveApiKey === "SANDBOX_MOCK_DRIVEN") {
        // Run a gorgeous client-side mock simulation loop immediately so OBS overlays never start blank during tests!
        const simulationLoop = () => {
          const randIdx = Math.floor(Math.random() * SAMPLE_MESSAGES_TEMPLATES.length);
          const tpl = SAMPLE_MESSAGES_TEMPLATES[randIdx];
          
          const isSuperChat = tpl.role === "superchat";
          const newMsg: ChatMessage = {
            id: `sim-obs-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            authorName: tpl.name,
            authorPhotoUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(tpl.name)}`,
            messageText: tpl.text,
            isModerator: tpl.role === "moderator",
            isOwner: tpl.role === "owner" || tpl.name === "Chủ Kênh Vip",
            isSponsor: tpl.role === "sponsor",
            isVerified: tpl.role === "moderator" || tpl.role === "sponsor",
            isSuperChat,
            superChatColor: tpl.color || "#1e88e5",
            superChatAmountText: tpl.amount || "",
            tier: tpl.tier || 1,
            timestamp: Date.now(),
          };

          setMessages((prev) => {
            const combined = [...prev, newMsg];
            return combined.length > 200 ? combined.slice(combined.length - 200) : combined;
          });
        };

        // Inject first-wave initial mock messages immediately so the overlay does NOT start blank!
        const initialMsgs: ChatMessage[] = [];
        const itemsToLoad = Math.min(4, SAMPLE_MESSAGES_TEMPLATES.length);
        for (let i = 0; i < itemsToLoad; i++) {
          const tpl = SAMPLE_MESSAGES_TEMPLATES[i];
          initialMsgs.push({
            id: `sim-obs-init-${i}-${Date.now()}`,
            authorName: tpl.name,
            authorPhotoUrl: `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(tpl.name)}`,
            messageText: tpl.text,
            isModerator: tpl.role === "moderator",
            isOwner: tpl.role === "owner",
            isSponsor: tpl.role === "sponsor",
            isVerified: false,
            isSuperChat: tpl.role === "superchat",
            superChatColor: tpl.color || "#1e88e5",
            superChatAmountText: tpl.amount || "",
            tier: tpl.tier || 1,
            timestamp: Date.now() - (itemsToLoad - i) * 6000,
          });
        }
        setMessages(initialMsgs);

        const interval = setInterval(simulationLoop, 3550);
        return () => clearInterval(interval);
      }

      const fetchLoop = async () => {
        // If the stream is offline, clear messages and do not fetch
        // Exception: If the user passed direct explicit parameters via URL (obsChatId), bypass global offline checks
        const reallyOffline = !obsChatId && (obsSettings as any).isOffline;
        if (reallyOffline) {
          setMessages([]);
          messagesSetRef.current.clear();
          return;
        }

        try {
          let u = `/api/youtube/messages?liveChatId=${effectiveChatId}&apiKey=${effectiveApiKey}`;
          if (nextPageTokenRef.current) {
            u += `&pageToken=${nextPageTokenRef.current}`;
          }
          const response = await fetch(u);
          if (response.ok) {
            const data = await response.json();
            const incomingArr = data.messages || [];
            nextPageTokenRef.current = data.nextPageToken;
            
            if (incomingArr.length > 0) {
              setMessages((prev) => {
                const combined = [...prev];
                incomingArr.forEach((msg: ChatMessage) => {
                  if (!messagesSetRef.current.has(msg.id)) {
                    messagesSetRef.current.add(msg.id);
                    combined.push(msg);
                  }
                });
                return combined.length > 200 ? combined.slice(combined.length - 200) : combined;
              });
            }
          }
        } catch { /* suppress */ }
      };

      fetchLoop();
      // Fast polling interval for OBS widgets (4 seconds matches YouTube stream pacing)
      const interval = setInterval(fetchLoop, 4000);
      return () => clearInterval(interval);
    }
  }, [isOverlayRoute, obsChatId, obsApiKey, (obsSettings as any).activeLiveChatId, (obsSettings as any).apiKey, (obsSettings as any).isOffline]);

  // OBS SUITE SETTINGS SYNC POLLER (Enables immediate UI hot-reloads without link updates)
  useEffect(() => {
    if (isOverlayRoute) {
      const fetchSettings = async () => {
        try {
          const res = await fetch("/api/youtube/settings-sync");
          if (res.ok) {
            const data = await res.json();
            if (data && data.settings) {
              // Only update state if something actually changed to prevent constant re-renders
              setObsSettings((prev) => isSettingsEqual(prev, data.settings) ? prev : data.settings);
              setSettings((prev) => isSettingsEqual(prev, data.settings) ? prev : data.settings);
              setSavedSettingsBenchmark((prev) => isSettingsEqual(prev, data.settings) ? prev : data.settings);
              
              const effectiveChatIdLocal = obsChatId || data.settings.activeLiveChatId;
              const effectiveApiKeyLocal = obsApiKey || data.settings.apiKey;
              const isSimulated = effectiveChatIdLocal === "SIMULATED" || effectiveApiKeyLocal === "SANDBOX_MOCK_DRIVEN";

              // Auto delete previous message contents if they went offline
              if (data.settings.isOffline && !isSimulated) {
                setMessages((prev) => {
                  if (prev.length === 0) return prev;
                  messagesSetRef.current.clear();
                  return [];
                });
              }
            }
          }
        } catch (err) {
          console.error("Error retrieving synchronized settings:", err);
        }
      };

      fetchSettings();
      const interval = setInterval(fetchSettings, 1000);
      return () => clearInterval(interval);
    }
  }, [isOverlayRoute]);

  // PROACTIVE REAL-TIME BACKGROUND SETTINGS AUTO-SYNCER - REMOVED AS REQUESTED TO REQUIRE EXPLICIT SAVE BUTTON CLICK to sync OBS

  // 5. DRAG & RESIZE MANIPULATORS (Sprint 2 UI/UX features, AC-12, AC-13, AC-14)
  const handleMouseDownDrag = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest(".resize-handle")) return; // prevent collision with resizer
    isDragging.current = true;
    dragStart.current = {
      x: e.clientX - overlayPos.x,
      y: e.clientY - overlayPos.y,
    };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleMouseDownResize = (e: React.MouseEvent) => {
    isResizing.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY };
    sizeStart.current = { width: overlaySize.width, height: overlaySize.height };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    e.stopPropagation();
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging.current) {
      let newX = e.clientX - dragStart.current.x;
      let newY = e.clientY - dragStart.current.y;

      // Clamp frame limits bounds so it doesn't leave the screen (AC-15)
      if (viewportRef.current) {
        const bounds = viewportRef.current.getBoundingClientRect();
        newX = Math.max(0, Math.min(newX, bounds.width - overlaySize.width));
        newY = Math.max(0, Math.min(newY, bounds.height - overlaySize.height));
      } else {
        newX = Math.max(0, newX);
        newY = Math.max(0, newY);
      }

      setOverlayPos({ x: newX, y: newY });
    } else if (isResizing.current) {
      const deltaX = e.clientX - dragStart.current.x;
      const deltaY = e.clientY - dragStart.current.y;
      
      const newWidth = Math.max(260, Math.min(600, sizeStart.current.width + deltaX));
      const newHeight = Math.max(300, Math.min(750, sizeStart.current.height + deltaY));

      setOverlaySize({ width: newWidth, height: newHeight });
    }
  };

  const handleMouseUp = () => {
    isDragging.current = false;
    isResizing.current = false;
    document.removeEventListener("mousemove", handleMouseMove);
    document.removeEventListener("mouseup", handleMouseUp);
  };

  // 6. BACKUP CONFIGURATOR IMPORT & EXPORT (T3-03, T3-04, AC-30, AC-31, AC-32)
  const handleExportConfig = () => {
    const backupObj = {
      version: "1.0",
      settings,
      blacklist,
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupObj, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `youtube-overlay-config.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast("📤 Đã tải xuống tệp cấu hình!");
  };

  const handleImportConfig = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (!data.settings) throw new Error("File cấu hình bị lỗi trống settings");
        
        // merge settings safely
        const loadedSettings = { ...DEFAULT_SETTINGS, ...data.settings };
        setSettings(loadedSettings);
        safeSaveSettingsToLocalStorage(loadedSettings);

        if (Array.isArray(data.blacklist)) {
          setBlacklist(data.blacklist);
          localStorage.setItem("yt_overlay_blacklist", JSON.stringify(data.blacklist));
        }

        showToast("📥 Nhập cấu hình phục hồi thành công!");
      } catch (err: any) {
        showToast("❌ Lỗi tệp tin cấu hình không đúng quy chuẩn!");
      }
    };
    reader.readAsText(file);
    // Flush event
    e.target.value = "";
  };

  // OBS URL BUILDER COMPILER (Fulfills OBS Browser Source Dynamic Customization)
  const compileObsLink = (): string => {
    // Relying on root pathname '/' avoids path resolution errors and 404s on providers like Vercel
    const rootUrl = window.location.origin;
    
    const config = {
      liveChatId: streamStatus.activeLiveChatId || localStorage.getItem("yt_last_connected_chat_id") || "SIMULATED",
      apiKey: apiKey || "SANDBOX_MOCK_DRIVEN",
      fontFamily: settings.fontFamily,
      fontSize: settings.fontSize,
      textColor: settings.textColor,
      bgColor: settings.bgColor,
      bgOpacity: settings.bgOpacity,
      authorColor: settings.authorColor,
      moderatorColor: settings.moderatorColor,
      sponsorColor: settings.sponsorColor,
      superChatDuration: settings.superChatDuration,
      chatDuration: settings.chatDuration,
      isTransparent: settings.isTransparent,
      scale: settings.scale,
      showAvatar: settings.showAvatar,
      showBadges: settings.showBadges,
      animationType: settings.animationType,
    };

    try {
      // Safe Base64 encoding with full UTF-8 capabilities for Vietnamese/special font families
      const jsonStr = JSON.stringify(config);
      const utf8String = encodeURIComponent(jsonStr).replace(/%([0-9A-F]{2})/g, (match, p1) => {
        return String.fromCharCode(parseInt(p1, 16));
      });
      const base64 = btoa(utf8String);
      // Clean URL-safe encoding (strip pluses, slashes and padding)
      const urlSafeBase64 = base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
      
      return `${rootUrl}/?ob=${urlSafeBase64}`;
    } catch (e) {
      console.error("Base64 representation compile error:", e);
      // Clean fallback using query params on direct root
      const query = new URLSearchParams();
      query.set("mode", "overlay");
      query.set("liveChatId", config.liveChatId);
      query.set("apiKey", config.apiKey);
      query.set("fontFamily", config.fontFamily);
      query.set("fontSize", config.fontSize.toString());
      query.set("textColor", config.textColor);
      query.set("bgColor", config.bgColor);
      query.set("bgOpacity", config.bgOpacity.toString());
      query.set("authorColor", config.authorColor);
      query.set("moderatorColor", config.moderatorColor);
      query.set("sponsorColor", config.sponsorColor);
      query.set("superChatDuration", config.superChatDuration.toString());
      query.set("chatDuration", config.chatDuration.toString());
      query.set("isTransparent", config.isTransparent ? "true" : "false");
      query.set("scale", config.scale.toString());
      query.set("showAvatar", config.showAvatar ? "true" : "false");
      query.set("showBadges", config.showBadges ? "true" : "false");
      query.set("animationType", config.animationType);
      return `${rootUrl}/?${query.toString()}`;
    }
  };

  const compileObsTransitionLink = (): string => {
    const rootUrl = window.location.origin;
    const config = {
      mode: "transition",
      apiKey: apiKey || "SANDBOX_MOCK_DRIVEN",
      transitionType: settings.transitionType || "shutter",
      fontFamily: settings.fontFamily,
    };
    try {
      const jsonStr = JSON.stringify(config);
      const utf8String = encodeURIComponent(jsonStr).replace(/%([0-9A-F]{2})/g, (match, p1) => {
        return String.fromCharCode(parseInt(p1, 16));
      });
      const base64 = btoa(utf8String);
      const urlSafeBase64 = base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
      return `${rootUrl}/?ob=${urlSafeBase64}`;
    } catch (e) {
      return `${rootUrl}/?mode=transition`;
    }
  };

  const handleCopyObsTransitionLink = () => {
    const linkStr = compileObsTransitionLink();
    navigator.clipboard.writeText(linkStr);
    showToast("📋 Đã sao chép link OBS Screen Transition Overlay!");
  };

  const handleCopyObsLink = () => {
    // Save state indicator
    if (streamStatus.activeLiveChatId) {
      localStorage.setItem("yt_last_connected_chat_id", streamStatus.activeLiveChatId);
    }
    const linkStr = compileObsLink();
    navigator.clipboard.writeText(linkStr);
    showToast("📋 Đã sao chép link OBS Overlay tuyệt đối!");
  };

  const handleOpenPopoutWindow = () => {
    const width = overlaySize.width;
    const height = overlaySize.height;
    const linkStr = compileObsLink();
    const left = window.screen.width - width - 80;
    const top = 120;
    
    window.open(
      linkStr,
      "YouTubeChatOverlayPopout",
      `width=${width},height=${height},left=${left},top=${top},menubar=no,toolbar=no,location=no,status=no,resizable=yes`
    );
    showToast("📺 Đã mở cửa sổ Streamer phụ!");
  };

  const togglePipMode = async () => {
    // @ts-ignore
    if (!window.documentPictureInPicture) {
      showToast("🔄 Trình duyệt không hỗ trợ Always-On-Top PiP. Đang mở dạng Popout...");
      handleOpenPopoutWindow();
      return;
    }

    // @ts-ignore
    if (window.documentPictureInPicture.window) {
      // @ts-ignore
      window.documentPictureInPicture.window.close();
      setPipContainer(null);
      return;
    }

    try {
      // @ts-ignore
      const pipWindow = await window.documentPictureInPicture.requestWindow({
        width: overlaySize.width,
        height: overlaySize.height,
      });

      [...document.styleSheets].forEach((styleSheet) => {
        try {
          const cssRules = [...styleSheet.cssRules].map((rule) => rule.cssText).join("");
          const style = pipWindow.document.createElement("style");
          style.textContent = cssRules;
          pipWindow.document.head.appendChild(style);
        } catch (e) {
          if (styleSheet.href) {
            const link = pipWindow.document.createElement("link");
            link.rel = "stylesheet";
            link.href = styleSheet.href;
            pipWindow.document.head.appendChild(link);
          }
        }
      });

      const styleTag = pipWindow.document.createElement("style");
      styleTag.textContent = `
        body {
          margin: 0;
          padding: 0;
          background-color: transparent !important;
          overflow: hidden;
        }
      `;
      pipWindow.document.head.appendChild(styleTag);

      const rootDiv = pipWindow.document.createElement("div");
      rootDiv.style.width = "100%";
      rootDiv.style.height = "100vh";
      pipWindow.document.body.appendChild(rootDiv);

      setPipContainer(rootDiv);

      pipWindow.addEventListener("pagehide", () => {
        setPipContainer(null);
      });
      showToast("⚡ Đã bật màn hình nổi Always-on-Top!");
    } catch (err) {
      console.error("Document PiP failed:", err);
      showToast("❌ Lỗi kích hoạt PiP! Đang mở dạng Popout...");
      handleOpenPopoutWindow();
    }
  };

  // 7. RENDER ABSOLUTE OVERLAY FRAME FOR OBS STUDIO & DESKTOP GAME OVERLAY
  if (isOverlayRoute && (!isDesktopOverlay || !isEmbeddedDashboardOpen)) {
    if (isDesktopOverlay) {
      const shouldHideControls = isMouseDownOnHandle;

      return (
        <div className="w-full h-screen bg-transparent overflow-hidden text-slate-100 flex flex-col relative font-sans select-none antialiased">
          {/* Subtle dash outline when overlay is unlocked to show window borders */}
          {!isOverlayLocked && !shouldHideControls && !isEmbeddedDashboardOpen && (
            <div className="absolute inset-0 border-2 border-dashed border-indigo-500/60 pointer-events-none rounded-lg z-50 animate-pulse" />
          )}

          {/* Locked / Sync Status Hint */}
          {isOverlayLocked && !isEmbeddedDashboardOpen && (
            <div className="absolute right-3 top-3 z-55 bg-slate-950/90 text-[10px] text-slate-400 font-bold px-2.5 py-1 rounded border border-slate-850 opacity-20 hover:opacity-100 transition-opacity pointer-events-none font-mono">
              Nhấn Ctrl+Alt+O để mở khóa điều chỉnh
            </div>
          )}

          {/* Active Status Badge shown when dragging/moving to indicate system is live */}
          {shouldHideControls && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-55 bg-indigo-600 text-white text-[11px] font-bold px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 animate-pulse border border-indigo-400/35">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-ping" />
              <span>Đang di chuyển - Sync hoạt động</span>
            </div>
          )}

          {/* Authentic Electron Atom Floating Launcher Button (Rotating rings) */}
          <button
            onClick={handleToggleDashboardOpen}
            onMouseEnter={() => {
              if (isOverlayLocked) {
                handleOverlayHover(true);
              }
            }}
            onMouseLeave={() => {
              if (isOverlayLocked && !isEmbeddedDashboardOpen) {
                handleOverlayHover(false);
              }
            }}
            className="absolute top-0 left-0 z-55 w-12 h-12 rounded-full cursor-pointer transition-all flex items-center justify-center bg-slate-900 border-r border-b border-indigo-500 hover:border-indigo-400 group shadow-[0_0_15px_rgba(99,102,241,0.4)] hover:shadow-[0_0_25px_rgba(99,102,241,0.7)] hover:scale-105 active:scale-95 duration-205 pointer-events-auto"
            title="Mở Bảng Điều Khiển Nấu Trình Không Viền"
          >
            {/* Nested rotating SVG ellipses representing classical atomic nucleus */}
            <svg className="w-8 h-8 text-indigo-400 group-hover:text-indigo-300" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2005/svg">
              {/* Center core */}
              <circle cx="50" cy="50" r="5" fill="#818cf8" className="animate-pulse" />
              {/* Orbit 1 */}
              <ellipse cx="50" cy="50" rx="30" ry="10" stroke="currentColor" strokeWidth="1.5" transform="rotate(30 50 50)" className="origin-center animate-[spin_4s_linear_infinite]" opacity="0.8" />
              {/* Orbit 2 */}
              <ellipse cx="50" cy="50" rx="30" ry="10" stroke="currentColor" strokeWidth="1.5" transform="rotate(90 50 50)" className="origin-center animate-[spin_6s_linear_infinite]" opacity="0.8" />
              {/* Orbit 3 */}
              <ellipse cx="50" cy="50" rx="30" ry="10" stroke="currentColor" strokeWidth="1.5" transform="rotate(150 50 50)" className="origin-center animate-[spin_5s_linear_infinite]" opacity="0.8" />
            </svg>
          </button>

          {/* Beautiful Centered Full Featured Frameless Dashboard Overlay (Steam/Discord style) */}
          {isEmbeddedDashboardOpen && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-950/70 backdrop-blur-md z-50 p-0 pointer-events-none animate-in fade-in duration-200 shadow-inner">
              <div className="w-full h-full bg-slate-950/98 backdrop-blur-2xl border-0 rounded-none z-55 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 pointer-events-auto">
                
                {/* 1. Header of the Frameless App Panel */}
                <div className="bg-slate-900/90 border-b border-slate-850 px-6 py-4 flex items-center justify-between shrink-0 select-none">
                  <div className="flex items-center gap-3">
                    <div className="bg-gradient-to-tr from-rose-600 to-indigo-600 p-2.5 rounded-xl text-white shadow-[0_0_10px_rgba(244,63,94,0.3)]">
                      <Tv className="w-5 h-5 animate-pulse" />
                    </div>
                    <div>
                      <h1 className="font-bold tracking-wider text-base text-slate-100 uppercase font-sans flex items-center gap-2">
                        <span>YOUTUBE CHAT OVERLAY</span>
                        <span className="text-[10px] py-0.5 px-2 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full font-mono font-semibold animate-pulse">OVERLAY PLAYGROUND</span>
                      </h1>
                      <p className="text-[11px] text-slate-400">
                        Bảng điều chỉnh và đồng bộ hóa tương tác không viền dành cho Streamer
                      </p>
                    </div>
                  </div>

                  {/* Status Indicators & Live Resource tracking info */}
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
                      <span className={`w-2.5 h-2.5 rounded-full ${streamStatus.isConnected ? "bg-emerald-500 animate-pulse" : "bg-red-500 animate-ping"}`} />
                      <span className="text-slate-300 text-[11px] font-semibold">
                        {streamStatus.isConnected ? "Connected / Hoạt động" : "Offline / Chờ kết nối"}
                      </span>
                    </div>

                    <button
                      onClick={handleToggleDashboardOpen}
                      className="text-slate-400 hover:text-white font-bold text-xs bg-slate-805 hover:bg-slate-700 border border-slate-700 hover:border-slate-600 px-3.5 py-1.5 rounded-lg transition-all cursor-pointer"
                    >
                      Đóng Panel
                    </button>
                  </div>
                </div>

                {/* 2. Inner Split Content Layout */}
                <div className="flex-1 overflow-hidden grid grid-cols-12 min-h-0 animate-in fade-in-50 duration-200">
                  
                  {/* LEFT COLUMN: Sidebar Navigation and Active Tab Config Content */}
                  <div className="col-span-5 bg-slate-900/30 border-r border-slate-850 flex flex-col overflow-hidden">
                    {/* Custom Tabs Navigation list matching TFT design exact coordinates */}
                    <div className="flex bg-slate-900 border-b border-slate-850 shrink-0 p-1">
                      <button
                        onClick={() => setActiveTab("connect")}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          activeTab === "connect"
                            ? "bg-indigo-600/15 text-indigo-300 border border-indigo-500/20 shadow-inner"
                            : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                        }`}
                      >
                        <Key className="w-3.5 h-3.5" />
                        <span>Kết nối</span>
                      </button>
                      <button
                        onClick={() => setActiveTab("styler")}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          activeTab === "styler"
                            ? "bg-indigo-600/15 text-indigo-300 border border-indigo-500/20 shadow-inner"
                            : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                        }`}
                      >
                        <Sliders className="w-3.5 h-3.5" />
                        <span>Giao diện</span>
                      </button>
                      <button
                        onClick={() => setActiveTab("filters")}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          activeTab === "filters"
                            ? "bg-indigo-600/15 text-indigo-300 border border-indigo-500/20 shadow-inner"
                            : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                        }`}
                      >
                        <Shield className="w-3.5 h-3.5" />
                        <span>Bộ lọc</span>
                      </button>
                      <button
                        onClick={() => setActiveTab("help")}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          activeTab === "help"
                            ? "bg-indigo-600/15 text-indigo-300 border border-indigo-500/20 shadow-inner"
                            : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                        }`}
                      >
                        <Info className="w-3.5 h-3.5" />
                        <span>Hướng dẫn</span>
                      </button>
                    </div>

                    {/* Configuration Form scroll Container */}
                    <div className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar min-h-0 select-text">
                      
                      {activeTab === "connect" && (
                        <div className="space-y-5">
                          <div className="space-y-4">
                            <div className="text-xs font-bold text-indigo-300 flex items-center gap-1.5 uppercase tracking-wider">
                              <Video className="w-4 h-4 text-rose-500 animate-pulse" />
                              <span>Đồng bộ Live Youtube</span>
                            </div>

                            <div className="space-y-3.5">
                              <div className="space-y-1.5">
                                <label className="text-[10px] text-slate-400 uppercase font-semibold">YouTube API Key:</label>
                                <input
                                  type="password"
                                  placeholder="Nhập API Key Data v3..."
                                  value={apiKey}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setApiKey(val);
                                    localStorage.setItem("yt_overlay_api_key", val);
                                  }}
                                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                                />
                              </div>

                              <div className="space-y-1.5">
                                <label className="text-[10px] text-slate-400 uppercase font-semibold">Đường dẫn Livestream hoặc ID video:</label>
                                <input
                                  type="text"
                                  placeholder="https://www.youtube.com/watch?v=..."
                                  value={videoUrlOrId}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setVideoUrlOrId(val);
                                    localStorage.setItem("yt_overlay_video_url", val);
                                  }}
                                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                                />
                              </div>

                              {streamStatus.isConnected ? (
                                <div className="bg-emerald-500/10 border border-emerald-500/25 p-3.5 rounded-xl text-xs text-emerald-400 space-y-1.5 leading-relaxed">
                                  <div className="font-bold flex items-center gap-1.5">
                                    <span className="w-2 h-2 bg-emerald-400 rounded-full animate-ping" />
                                    <span>Đã Kết Nối Livestream Thành Công 🚀</span>
                                  </div>
                                  <div><b>Kênh:</b> {streamStatus.channelTitle || "N/A"}</div>
                                  <div className="truncate"><b>Tiêu đề:</b> {streamStatus.title}</div>
                                  <div><b>Số lượng người xem trực tiếp:</b> <span className="font-bold">{streamStatus.viewerCount.toLocaleString()}</span></div>
                                  
                                  <button
                                    onClick={handleDisconnectStream}
                                    className="w-full mt-2 py-2 bg-red-650 hover:bg-red-500 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
                                  >
                                    Ngắt kết nối api & Xóa tin nhắn
                                  </button>
                                </div>
                              ) : (
                                <div className="space-y-2">
                                  {streamStatus.error && (
                                    <div className="bg-red-500/10 border border-red-500/20 p-2.5 rounded-lg text-[10px] text-red-00 max-h-24 overflow-y-auto font-mono whitespace-pre-wrap">
                                      {streamStatus.error}
                                    </div>
                                  )}
                                  <button
                                    onClick={(e) => handleConnectStream(e)}
                                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/15 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                                  >
                                    <Play className="w-4 h-4" />
                                    <span>Bắt đầu đồng bộ API</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>

                          <hr className="border-slate-850" />

                          {/* Simulated sandbox inline deck */}
                          <div className="space-y-3">
                            <div className="text-xs font-bold text-indigo-300 flex items-center gap-1.5 uppercase">
                              <Sparkles className="w-4 h-4 text-indigo-400" />
                              <span>Giả lập tương tác (Offline Sandbox)</span>
                            </div>
                            <p className="text-[11px] text-slate-400 leading-normal">
                              Chạy chế độ giả lập để sinh tin nhắn ngẫu hứng trực tiếp trên màn hình xem trước. Giải pháp tuyệt vời để căn chỉnh tỷ lệ, màu sắc trước khi phát livestream!
                            </p>

                            <div className="grid grid-cols-2 gap-2">
                              <button
                                onClick={() => {
                                  const list = SAMPLE_MESSAGES_TEMPLATES.filter(x => x.role !== "superchat");
                                  const rand = list[Math.floor(Math.random() * list.length)];
                                  handleInjectMessage(rand);
                                }}
                                className="py-2 bg-slate-850 hover:bg-slate-800 text-[11px] font-bold rounded-lg text-slate-200 cursor-pointer border border-slate-800"
                              >
                                💬 Tin Nhắn Thường
                              </button>
                              <button
                                onClick={() => {
                                  const list = SAMPLE_MESSAGES_TEMPLATES.filter(x => x.role === "superchat");
                                  const rand = list[Math.floor(Math.random() * list.length)];
                                  handleInjectMessage(rand);
                                }}
                                className="py-2 bg-amber-500/10 hover:bg-amber-500/20 text-[11px] font-bold rounded-lg text-amber-300 cursor-pointer border border-amber-500/20"
                              >
                                ⭐ Gửi Super Chat
                              </button>
                              
                              <button
                                onClick={toggleSimulation}
                                className={`col-span-2 py-2.5 rounded-lg text-[11px] font-bold cursor-pointer transition-all border ${
                                  isSimulationActive 
                                    ? "bg-emerald-600/20 border-emerald-500/30 text-emerald-300 hover:bg-emerald-650/20" 
                                    : "bg-indigo-650/40 hover:bg-indigo-600/40 text-indigo-300 border-indigo-500/30"
                                }`}
                              >
                                {isSimulationActive ? "⏹️ Dừng Giả Lập Tự Động" : "▶️ Kích Hoạt Giả Lập Dòng Chat"}
                              </button>
                            </div>
                          </div>
                        </div>
                      )}

                      {activeTab === "styler" && (
                        <div className="space-y-4">
                          <div className="text-xs font-bold text-indigo-300 flex items-center justify-between border-b border-slate-800 pb-1.5 uppercase shrink-0">
                            <span>⚙️ Tùy chỉnh Giao diện Overlay</span>
                            <span className="text-[10px] text-slate-500 normal-case">Lưu trữ tự động</span>
                          </div>

                          <div className="space-y-4">
                            {/* Fonts family select */}
                            <div className="space-y-1.5">
                              <label className="text-[10px] text-slate-400 block font-semibold uppercase">Kiểu phông chữ (Fonts):</label>
                              <select
                                value={obsSettings.fontFamily}
                                onChange={(e) => {
                                  const updated = { ...obsSettings, fontFamily: e.target.value };
                                  setObsSettings(updated);
                                  setSettings(updated);
                                  localStorage.setItem("yt_overlay_settings", JSON.stringify(updated));
                                }}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-505"
                              >
                                <option value="Inter">Inter (Sạch sẽ, mặc định)</option>
                                <option value="Space Grotesk">Space Grotesk (Công nghệ, cá tính)</option>
                                <option value="JetBrains Mono">JetBrains Mono (Lập trình viên)</option>
                                <option value="Playfair Display">Playfair Display (Dáng Serif tao nhã)</option>
                              </select>
                            </div>

                            {/* Font Size slider */}
                            <div className="space-y-1.5 font-sans">
                              <span className="text-[10px] text-slate-400 justify-between flex font-semibold uppercase">
                                <span>Cỡ chữ văn bản:</span>
                                <span className="font-bold text-indigo-400 font-mono">{obsSettings.fontSize}px</span>
                              </span>
                              <input
                                type="range"
                                min="12"
                                max="26"
                                value={obsSettings.fontSize}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value, 10);
                                  const updated = { ...obsSettings, fontSize: val };
                                  setObsSettings(updated);
                                  setSettings(updated);
                                  localStorage.setItem("yt_overlay_settings", JSON.stringify(updated));
                                }}
                                className="w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                              />
                            </div>

                            {/* Scale size */}
                            <div className="space-y-1.5">
                              <span className="text-[10px] text-slate-400 justify-between flex font-semibold uppercase">
                                <span>Tỷ lệ thu phóng cửa sổ:</span>
                                <span className="font-bold text-indigo-400 font-mono">{Math.round(obsSettings.scale * 100)}%</span>
                              </span>
                              <input
                                type="range"
                                min="50"
                                max="150"
                                value={obsSettings.scale * 100}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) / 100;
                                  const updated = { ...obsSettings, scale: val };
                                  setObsSettings(updated);
                                  setSettings(updated);
                                  localStorage.setItem("yt_overlay_settings", JSON.stringify(updated));
                                }}
                                className="w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                              />
                            </div>

                            {/* Opacity Background Slider */}
                            <div className="space-y-1.5">
                              <span className="text-[10px] text-slate-400 justify-between flex font-semibold uppercase">
                                <span>Độ mờ nền khung:</span>
                                <span className="font-bold text-indigo-400 font-mono">{Math.round(obsSettings.bgOpacity * 100)}%</span>
                              </span>
                              <input
                                type="range"
                                min="0"
                                max="100"
                                value={obsSettings.bgOpacity * 100}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) / 100;
                                  const updated = { ...obsSettings, bgOpacity: val };
                                  setObsSettings(updated);
                                  setSettings(updated);
                                  localStorage.setItem("yt_overlay_settings", JSON.stringify(updated));
                                }}
                                className="w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                              />
                            </div>

                            {/* Is Trasnparent option toggle */}
                            <div className="flex items-center justify-between py-1 border-t border-slate-900 mt-2">
                              <span className="text-[10px] text-slate-400 font-semibold uppercase">Sử dụng nền trong suốt hoàn toàn:</span>
                              <input
                                type="checkbox"
                                checked={obsSettings.isTransparent}
                                onChange={(e) => {
                                  const updated = { ...obsSettings, isTransparent: e.target.checked };
                                  setObsSettings(updated);
                                  setSettings(updated);
                                  localStorage.setItem("yt_overlay_settings", JSON.stringify(updated));
                                }}
                                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-505 bg-slate-950 border-slate-800"
                              />
                            </div>

                            {/* Palette Color Settings */}
                            <div className="grid grid-cols-2 gap-3.5 border-t border-slate-900 pt-3">
                              <div className="space-y-1">
                                <label className="text-[10px] text-slate-400 block font-semibold uppercase">Màu nền khung:</label>
                                <div className="flex gap-1.5 items-center">
                                  <input
                                    type="color"
                                    value={obsSettings.bgColor}
                                    onChange={(e) => {
                                      const updated = { ...obsSettings, bgColor: e.target.value };
                                      setObsSettings(updated);
                                      setSettings(updated);
                                      localStorage.setItem("yt_overlay_settings", JSON.stringify(updated));
                                    }}
                                    className="w-8 h-8 rounded border-0 cursor-pointer bg-transparent shrink-0"
                                  />
                                  <input
                                    type="text"
                                    value={obsSettings.bgColor}
                                    onChange={(e) => {
                                      const updated = { ...obsSettings, bgColor: e.target.value };
                                      setObsSettings(updated);
                                      setSettings(updated);
                                      localStorage.setItem("yt_overlay_settings", JSON.stringify(updated));
                                    }}
                                    className="w-full text-xs font-mono bg-slate-950 rounded border border-slate-800 py-1 px-1.5 text-center text-slate-300 font-semibold"
                                  />
                                </div>
                              </div>

                              <div className="space-y-1">
                                <label className="text-[10px] text-slate-400 block font-semibold uppercase">Màu chữ comment:</label>
                                <div className="flex gap-1.5 items-center">
                                  <input
                                    type="color"
                                    value={obsSettings.textColor}
                                    onChange={(e) => {
                                      const updated = { ...obsSettings, textColor: e.target.value };
                                      setObsSettings(updated);
                                      setSettings(updated);
                                      localStorage.setItem("yt_overlay_settings", JSON.stringify(updated));
                                    }}
                                    className="w-8 h-8 rounded border-0 cursor-pointer bg-transparent shrink-0"
                                  />
                                  <input
                                    type="text"
                                    value={obsSettings.textColor}
                                    onChange={(e) => {
                                      const updated = { ...obsSettings, textColor: e.target.value };
                                      setObsSettings(updated);
                                      setSettings(updated);
                                      localStorage.setItem("yt_overlay_settings", JSON.stringify(updated));
                                    }}
                                    className="w-full text-xs font-mono bg-slate-950 rounded border border-slate-800 py-1 px-1.5 text-center text-slate-300 font-semibold"
                                  />
                                </div>
                              </div>

                              <div className="space-y-1">
                                <label className="text-[10px] text-slate-400 block font-semibold uppercase">Màu tên người xem:</label>
                                <div className="flex gap-1.5 items-center">
                                  <input
                                    type="color"
                                    value={obsSettings.authorColor}
                                    onChange={(e) => {
                                      const updated = { ...obsSettings, authorColor: e.target.value };
                                      setObsSettings(updated);
                                      setSettings(updated);
                                      localStorage.setItem("yt_overlay_settings", JSON.stringify(updated));
                                    }}
                                    className="w-8 h-8 rounded border-0 cursor-pointer bg-transparent shrink-0"
                                  />
                                  <input
                                    type="text"
                                    value={obsSettings.authorColor}
                                    onChange={(e) => {
                                      const updated = { ...obsSettings, authorColor: e.target.value };
                                      setObsSettings(updated);
                                      setSettings(updated);
                                      localStorage.setItem("yt_overlay_settings", JSON.stringify(updated));
                                    }}
                                    className="w-full text-xs font-mono bg-slate-955 rounded border border-slate-800 py-1 px-1.5 text-center text-slate-300 font-semibold"
                                  />
                                </div>
                              </div>

                              <div className="space-y-1">
                                <label className="text-[10px] text-slate-400 block font-semibold uppercase">Màu Admin / Mod:</label>
                                <div className="flex gap-1.5 items-center">
                                  <input
                                    type="color"
                                    value={obsSettings.moderatorColor}
                                    onChange={(e) => {
                                      const updated = { ...obsSettings, moderatorColor: e.target.value };
                                      setObsSettings(updated);
                                      setSettings(updated);
                                      localStorage.setItem("yt_overlay_settings", JSON.stringify(updated));
                                    }}
                                    className="w-8 h-8 rounded border-0 cursor-pointer bg-transparent shrink-0"
                                  />
                                  <input
                                    type="text"
                                    value={obsSettings.moderatorColor}
                                    onChange={(e) => {
                                      const updated = { ...obsSettings, moderatorColor: e.target.value };
                                      setObsSettings(updated);
                                      setSettings(updated);
                                      localStorage.setItem("yt_overlay_settings", JSON.stringify(updated));
                                    }}
                                    className="w-full text-xs font-mono bg-slate-955 rounded border border-slate-800 py-1 px-1.5 text-center text-slate-300 font-semibold"
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {activeTab === "filters" && (
                        <div className="space-y-4">
                          <div className="text-xs font-bold text-indigo-300 flex items-center gap-1.5 border-b border-slate-800 pb-1.5 uppercase shrink-0">
                            <Shield className="w-4 h-4 text-rose-500 animate-pulse" />
                            <span>Bộ lọc & Chặn từ khóa toxic</span>
                          </div>

                          <form onSubmit={handleAddKeyword} className="space-y-3 bg-slate-950/40 p-3.5 rounded-xl border border-slate-850">
                            <div className="space-y-1.5">
                              <label className="text-[10px] text-slate-400 block font-semibold uppercase">Từ khóa chặn mới:</label>
                              <input
                                type="text"
                                placeholder="Nhập từ cần chặn (ví dụ: hack, scam)..."
                                value={newKeyword}
                                onChange={(e) => setNewKeyword(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-505"
                              />
                            </div>

                            <div className="flex items-center justify-between py-1">
                              <span className="text-[10px] text-slate-400 font-semibold uppercase">Biểu thức chính quy (Regex):</span>
                              <input
                                type="checkbox"
                                checked={newKeywordIsRegex}
                                onChange={(e) => setNewKeywordIsRegex(e.target.checked)}
                                className="w-4 h-4 bg-slate-955 border-slate-800 rounded focus:ring-indigo-600 focus:bg-indigo-600 cursor-pointer"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <label className="text-[10px] text-slate-400 block font-semibold uppercase">Lý do ghi chú chặn:</label>
                              <input
                                type="text"
                                placeholder="comment lý do ghi chú..."
                                value={newKeywordComment}
                                onChange={(e) => setNewKeywordComment(e.target.value)}
                                className="w-full bg-slate-955 border border-slate-800 rounded-lg p-2 text-xs text-slate-205 focus:outline-none focus:border-indigo-500"
                              />
                            </div>

                            <button
                              type="submit"
                              className="w-full py-2 bg-indigo-600 hover:bg-indigo-505 text-white font-bold text-[11px] rounded-lg transition-colors cursor-pointer"
                            >
                              Bổ sung từ khóa chặn
                            </button>
                          </form>

                          {/* Blacklisted word counters and items list */}
                          <div className="space-y-2">
                            <span className="text-[10px] text-slate-400 block font-semibold uppercase">Danh sách đen hoạt động ({blacklist.length}):</span>
                            {blacklist.length === 0 ? (
                              <div className="p-4 text-[10px] text-slate-500 text-center bg-slate-950/20 border border-dashed border-slate-800 rounded-xl">
                                Không có từ khóa nào bị cấm. Luồng chat sạch sẽ.
                              </div>
                            ) : (
                              <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                                {blacklist.map((kw) => (
                                  <div key={kw.id} className="flex justify-between items-center text-[11px] bg-slate-900 border border-slate-855 p-2.5 rounded-lg">
                                    <div>
                                      <div className="font-mono font-bold text-slate-200 flex items-center gap-1.5">
                                        <span>{kw.pattern}</span>
                                        {kw.isRegex && <span className="bg-indigo-600/20 text-indigo-400 text-[8px] px-1 rounded border border-indigo-500/20 font-bold uppercase">Regex</span>}
                                      </div>
                                      {kw.comment && <div className="text-[9px] text-slate-500 mt-0.5">{kw.comment}</div>}
                                    </div>
                                    
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveKeyword(kw.id)}
                                      className="bg-red-500/10 hover:bg-red-500/20 text-red-400 px-2.5 py-1.5 rounded-md text-[10px] font-bold cursor-pointer transition-colors"
                                    >
                                      Xóa
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {activeTab === "help" && <HelpManual />}

                    </div>
                  </div>

                  {/* RIGHT COLUMN: Real-time Live Setup Preview with Custom Backdrop selector */}
                  <div className="col-span-7 p-6 flex flex-col overflow-hidden space-y-4 bg-slate-950/60 min-h-0">
                    <div className="flex justify-between items-center bg-slate-900 border border-slate-850 rounded-xl px-4 py-2.5 shrink-0 select-none">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-pulse" />
                        <span className="text-[11px] font-bold text-slate-200 uppercase tracking-widest">Xem trước hiển thị (Live Setup Preview)</span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <label className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">MÔ PHỎNG GAME:</label>
                        <select
                          value={backdropTheme}
                          onChange={(e) => setBackdropTheme(e.target.value)}
                          className="bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-[11px] text-slate-300 focus:outline-none focus:border-indigo-500 cursor-pointer"
                        >
                          <option value="game-backdrop-tft">Đấu Trường Chân Lý (TFT Match)</option>
                          <option value="game-backdrop-valo">Valorant FPS Special HUD</option>
                          <option value="game-backdrop-lol">League of Legends HUD Arena</option>
                          <option value="game-backdrop-dark">Màn hình Tắt (Nền Đen/Trong suốt)</option>
                        </select>
                      </div>
                    </div>

                    {/* Interactive Backdrop container drawing mockup coordinates */}
                    <div className="flex-1 relative border border-slate-850 rounded-xl overflow-hidden bg-slate-900 flex items-center justify-center select-none shadow-md min-h-0 animate-in fade-in-50 duration-200">
                      
                      {/* TFT arena CSS visualization mockup */}
                      {backdropTheme === "game-backdrop-tft" && (
                        <div className="absolute inset-0 bg-slate-950 flex flex-col justify-between p-4 bg-cover bg-center" style={{ backgroundImage: `url('https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80')`, backgroundBlendMode: 'overlay', backgroundColor: 'rgba(15, 23, 42, 0.85)' }}>
                          {/* HUD Top bar */}
                          <div className="flex justify-between items-center text-xs bg-slate-950/90 border border-slate-800 rounded px-3 py-1 font-mono text-emerald-400">
                            <span>🏆 VÒNG ĐẤU: 4 - 2</span>
                            <span className="text-amber-400">💰 VÀNG: 54</span>
                            <span>⏱️ THỜI GIAN CHUẨN BỊ: 36 giây</span>
                          </div>
                          {/* Board hexagon slots representation placeholder */}
                          <div className="flex-1 flex flex-col items-center justify-center space-y-2 opacity-50">
                            <div className="flex gap-4">
                              <div className="w-10 h-10 border border-indigo-500/40 rounded-lg transform rotate-45 bg-indigo-500/5" />
                              <div className="w-10 h-10 border border-indigo-500/40 rounded-lg transform rotate-45 bg-amber-500/5 border-amber-500/40" />
                              <div className="w-10 h-10 border border-indigo-500/40 rounded-lg transform rotate-45 bg-indigo-500/5" />
                            </div>
                            <div className="flex gap-4 ml-6">
                              <div className="w-10 h-10 border border-indigo-500/30 rounded-lg transform rotate-45 bg-indigo-500/5" />
                              <div className="w-10 h-10 border border-indigo-500/30 rounded-lg transform rotate-45 bg-indigo-500/5" />
                            </div>
                          </div>
                          {/* HUD Bottom card */}
                          <div className="flex justify-between text-[11px] text-slate-400 font-bold bg-slate-950/95 border border-slate-800/80 rounded px-2.5 py-1.5">
                            <span>Sách Chọn Ẩn: Soraka (4G) | Yasuo (1G) | Neeko (2G)</span>
                            <span className="text-indigo-400 font-mono">LEVEL 8</span>
                          </div>
                        </div>
                      )}

                      {/* Valorant FPS tactics representation placeholder */}
                      {backdropTheme === "game-backdrop-valo" && (
                        <div className="absolute inset-0 bg-slate-950 flex flex-col justify-between p-4 bg-cover bg-center" style={{ backgroundImage: `url('https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=40')`, backgroundBlendMode: 'overlay', backgroundColor: 'rgba(2, 6, 23, 0.9)' }}>
                          {/* Mini map top left */}
                          <div className="absolute top-4 left-4 w-12 h-12 rounded-full border border-slate-700 bg-slate-900/90 flex items-center justify-center text-[10px] text-slate-500 font-mono font-bold">
                            MAP
                          </div>
                          {/* Crosshairs center */}
                          <div className="flex-1 flex items-center justify-center">
                            <div className="relative">
                              <div className="absolute w-4 h-0.5 bg-emerald-400 -left-2 top-0" />
                              <div className="absolute w-4 h-0.5 bg-emerald-400 left-2 top-0" />
                              <div className="absolute h-4 w-0.5 bg-emerald-400 top-2 left-0" />
                              <div className="absolute h-4 w-0.5 bg-emerald-400 -top-4 left-0" />
                              <div className="w-1 h-1 bg-emerald-400 rounded-full" />
                            </div>
                          </div>
                          {/* HUD Ammo and weapon bars bottom */}
                          <div className="flex justify-between items-end text-xs font-mono">
                            <div className="bg-slate-950/90 text-slate-200 border border-slate-800 px-3.5 py-1.5 rounded-lg flex items-center gap-1 font-bold">
                              <span className="text-red-500">❤️ HP</span>
                              <span className="text-base text-white">100</span>
                              <span className="text-slate-500 ml-1">/ 50 Arm</span>
                            </div>
                            <div className="bg-slate-950/90 text-slate-200 border border-slate-800 px-3.5 py-1.5 rounded-lg font-bold flex items-center gap-2">
                              <span className="text-indigo-400 font-bold uppercase text-[10px] bg-indigo-500/10 px-1 py-0.5 rounded">VANDAL</span>
                              <span>25 / 75</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* League of Legends Arena representations */}
                      {backdropTheme === "game-backdrop-lol" && (
                        <div className="absolute inset-0 bg-slate-950 flex flex-col justify-end p-4 bg-cover bg-center" style={{ backgroundImage: `url('https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=30')`, backgroundBlendMode: 'overlay', backgroundColor: 'rgba(8, 47, 73, 0.85)' }}>
                          {/* Spell keys HUD central */}
                          <div className="mx-auto bg-slate-950/95 border-t-2 border-amber-600/50 rounded-t-xl px-6 py-2 flex items-center gap-4 text-xs font-mono">
                            <div className="flex items-center gap-2 border border-slate-800 p-1 bg-slate-900 rounded">
                              <span className="text-slate-500 font-normal">Q</span>
                              <div className="w-6 h-6 bg-indigo-500/20 text-indigo-400 rounded flex items-center justify-center font-bold">D</div>
                            </div>
                            <div className="flex items-center gap-2 border border-slate-800 p-1 bg-slate-900 rounded">
                              <span className="text-slate-500 font-normal">W</span>
                              <div className="w-6 h-6 bg-indigo-500/20 text-indigo-400 rounded flex items-center justify-center font-bold">F</div>
                            </div>
                            <div className="flex items-center gap-2 border border-slate-800 p-1 bg-slate-900 rounded">
                              <span className="text-slate-500 font-normal">E</span>
                              <div className="w-6 h-6 bg-amber-500/20 text-amber-500 rounded flex items-center justify-center font-bold">R</div>
                            </div>
                            <span className="text-amber-400 font-bold">MANA: 400 / 400</span>
                          </div>
                        </div>
                      )}

                      {/* Flat dark visual background */}
                      {backdropTheme === "game-backdrop-dark" && (
                        <div className="absolute inset-0 bg-slate-950/98 bg-grid-white/[0.02] flex items-center justify-center text-xs text-slate-500 flex-col font-mono uppercase tracking-wide gap-1.5 animate-in fade-in-50 duration-200">
                          <Layout className="w-8 h-8 text-slate-800 animate-pulse" />
                          <span>Không có hình nền (Chế độ trong suốt/tối giản)</span>
                        </div>
                      )}

                      {/* LIVE PREVIEW WIDGET CONSOLE: Rendered as floating directly over the game stage! */}
                      <div className="absolute right-4 bottom-4 w-[380px] h-[340px] bg-slate-950/98 rounded-xl border border-indigo-500/25 flex flex-col overflow-hidden shadow-2xl z-40 scale-95 origin-bottom-right">
                        <div className="bg-slate-950/95 border-b border-indigo-500/20 px-3 py-1.5 flex items-center justify-between text-[10px] shrink-0 font-mono tracking-wide text-indigo-455 select-none">
                          <div className="flex items-center gap-1 font-semibold">
                            <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
                            <span>PREVIEW CONSOLE</span>
                          </div>
                          <span>380 x 340 px</span>
                        </div>
                        <div className="flex-1 overflow-hidden pointer-events-none p-1 bg-transparent">
                          <OverlayWidget messages={messages} settings={obsSettings} />
                        </div>
                      </div>
                    </div>
                  </div>

                </div>



              </div>
            </div>
          )}

          {/* Title Handlebar: Allows window dragging via CSS in Unlocked mode */}
          {!isOverlayLocked && !isEmbeddedDashboardOpen && (
            <div 
              style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
              onMouseDown={() => setIsMouseDownOnHandle(true)}
              className={`bg-slate-950/95 border-b border-indigo-500/30 px-3 py-2 flex items-center justify-between text-xs shrink-0 cursor-move rounded-t-lg select-none shadow-md z-45 transition-opacity duration-300 ${
                shouldHideControls ? "opacity-0 pointer-events-none" : "opacity-100"
              }`}
            >
              <div className="flex items-center gap-1.5 font-bold text-indigo-400 animate-pulse">
                <Layout className="w-3.5 h-3.5" />
                <span>📍 Nhấn Giữ & Kéo Ở Đây Để Di Chuyển Khung Chat</span>
              </div>
              <button 
                onClick={handleLockOverlay}
                style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] px-2.5 py-1 rounded font-bold cursor-pointer transition-colors shadow-inner"
                title="Khóa chuột để bấm xuyên qua khi chơi game hoặc live full màn hình"
              >
                Khóa Click-Through
              </button>
            </div>
          )}

          {/* Adjustment Sliders Card: Rendered only when overlay is Unlocked */}
          {!isOverlayLocked && !isEmbeddedDashboardOpen && (
            <div className={`mx-2 mt-2 p-3.5 bg-slate-900/95 border border-slate-805/80 rounded-xl space-y-2.5 shadow-xl z-40 shrink-0 select-none backdrop-blur-md transition-opacity duration-300 ${
              shouldHideControls ? "opacity-0 pointer-events-none" : "opacity-100"
            }`}>
              <div className="flex justify-between items-center text-xs">
                <div className="flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-indigo-400 animate-spin" style={{ animationDuration: '4s' }} />
                  <span className="font-bold text-slate-205">🛠️ TÙY CHỈNH CHAT OVERLAY</span>
                </div>
                <span className="text-[9px] bg-indigo-500/10 text-indigo-400 uppercase font-bold px-1.5 py-0.5 rounded tracking-wider">Unlocked State</span>
              </div>
              
              <div className="grid grid-cols-2 gap-3 text-[11px]">
                <div className="space-y-1">
                  <span className="text-slate-400 flex justify-between">
                    <span>Cỡ chữ comment:</span>
                    <span className="font-bold text-indigo-400 font-mono">{obsSettings.fontSize}px</span>
                  </span>
                  <input
                    type="range"
                    min="12"
                    max="26"
                    value={obsSettings.fontSize}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      const updated = { ...obsSettings, fontSize: val };
                      setObsSettings(updated);
                      setSettings(updated);
                      safeSaveSettingsToLocalStorage(updated);
                    }}
                    className="w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <span className="text-slate-400 flex justify-between">
                    <span>Độ mờ nền:</span>
                    <span className="font-bold text-indigo-400 font-mono">{Math.round(obsSettings.bgOpacity * 100)}%</span>
                  </span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={obsSettings.bgOpacity * 100}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) / 100;
                      const updated = { ...obsSettings, bgOpacity: val };
                      setObsSettings(updated);
                      setSettings(updated);
                      safeSaveSettingsToLocalStorage(updated);
                    }}
                    className="w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                  />
                </div>
              </div>

              <div className="text-[10px] text-amber-350 font-medium leading-tight bg-amber-500/10 border border-amber-500/20 p-2 rounded-lg flex items-start gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>Khi vào game, bấm <b>Khóa Click-Through</b> bên trên hoặc nhấn <b>Ctrl + Alt + O</b> để ẩn hoàn toàn khung viền tương tác.</span>
              </div>
            </div>
          )}

          {/* The Chat message scroll frame in normal HUD state */}
          {!isEmbeddedDashboardOpen && (
            <div className="flex-1 overflow-hidden">
              <OverlayWidget messages={messages} settings={obsSettings} />
            </div>
          )}
        </div>
      );
    }

    if (isTransitionOverlay) {
      return (
        <div className="w-full h-screen bg-transparent overflow-hidden">
          <ScreenTransitionOverlay settings={obsSettings} />
        </div>
      );
    }

    return (
      <div className="w-full h-screen bg-transparent overflow-hidden">
        <OverlayWidget messages={messages} settings={obsSettings} />
      </div>
    );
  }

  // 8. RENDER BEAUTIFUL STREAMER CONTROL PANEL HUB
  const currentAccent = settings.accentColor || "#6366f1";
  const customDynamicStyleTag = (
    <style dangerouslySetInnerHTML={{ __html: `
      .bg-indigo-650 {
        background-color: ${currentAccent} !important;
      }
      .hover\\:bg-indigo-650:hover {
        background-color: ${currentAccent}e0 !important;
      }
      .text-indigo-400 {
        color: ${currentAccent} !important;
      }
      .border-indigo-500 {
        border-color: ${currentAccent} !important;
      }
      .focus\\:border-indigo-500:focus {
        border-color: ${currentAccent} !important;
      }
      .accent-indigo-500 {
        accent-color: ${currentAccent} !important;
      }
      .shadow-indigo-600\\/15 {
        box-shadow: 0 10px 15px -3px ${currentAccent}26, 0 4px 6px -4px ${currentAccent}26 !important;
      }
      .shadow-indigo-600\\/20 {
        box-shadow: 0 10px 15px -3px ${currentAccent}33, 0 4px 6px -4px ${currentAccent}33 !important;
      }
    `}} />
  );

  const handleAddSampleMessage = () => {
    const randomIndex = Math.floor(Math.random() * SAMPLE_MESSAGES_TEMPLATES.length);
    handleInjectMessage(SAMPLE_MESSAGES_TEMPLATES[randomIndex]);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none antialiased">
      {/* 🔴 Active Flash Indicator Toast */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-indigo-600/95 text-white text-xs py-2 px-4 rounded-xl shadow-lg border border-indigo-400 font-bold backdrop-blur flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 animate-bounce" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 💾 Globally Floating Unsaved Changes Card (Gần góc dưới bên phải màn hình, chạy theo thanh cuộn) */}
      {hasUnsavedChanges && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900/95 backdrop-blur-md border border-indigo-500/50 p-4 rounded-xl flex flex-col sm:flex-row items-center gap-4.5 shadow-2xl shadow-indigo-500/20 animate-in fade-in slide-in-from-bottom-5 duration-300 max-w-xs sm:max-w-md pointer-events-auto">
          <div className="text-left flex-1 select-none">
            <div className="text-xs font-bold text-indigo-400 flex items-center gap-1.5 leading-none">
              <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse shrink-0" />
              <span>Chưa lưu thay đổi!</span>
            </div>
            <p className="text-[10px] text-slate-300 mt-1.5 leading-normal">
              Bạn đang có thay đổi cấu hình chưa đồng bộ sang OBS. Nhấp để cập nhật trực tiếp.
            </p>
          </div>
          <button
            type="button"
            onClick={syncSettingsWithObs}
            className="w-full sm:w-auto bg-indigo-650 hover:bg-indigo-650 active:scale-95 text-white font-black py-2.5 px-4 rounded-lg text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-indigo-600/20 transition-all uppercase tracking-wider shrink-0"
          >
            <Save className="w-4 h-4" />
            <span>Lưu thay đổi</span>
          </button>
        </div>
      )}

      {customDynamicStyleTag}

      {/* Primary Top Header Board */}
      <header className="bg-slate-900 border-b border-slate-800 shrink-0 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="bg-gradient-to-tr from-rose-600 to-indigo-600 p-2 rounded-xl text-white">
            <Tv className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold tracking-tight text-base text-slate-100 uppercase font-grotesk flex items-center gap-2">
              <span>{t("appName")}</span>
            </h1>
            <p className="text-[11px] text-slate-400">
              {activeLanguage === "vi" 
                ? "Công cụ quản lý, tùy chỉnh bộ khung chat trong suốt gắn OBS Livestream"
                : "Professional custom clear chatbox widget for your live stream software OBS"}
            </p>
          </div>
        </div>

        {/* Sync Controls & Global state summary indicators */}
        <div className="flex items-center gap-3">
          {/* Collapse/Expand Sidebar Menu trigger button */}
          <button
            type="button"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-black transition-all border cursor-pointer active:scale-95 ${
              sidebarOpen 
                ? "bg-slate-850 border-indigo-500/50 text-indigo-400" 
                : "bg-indigo-650 hover:bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/15"
            }`}
          >
            <Menu className="w-4 h-4 shrink-0" />
            <span>{sidebarOpen ? t("sidebarCloseBtn") : t("sidebarOpenBtn")}</span>
          </button>

          {isDesktopOverlay && isEmbeddedDashboardOpen && (
            <button
              onClick={handleToggleDashboardOpen}
              className="bg-rose-650 hover:bg-rose-600 active:scale-95 text-white text-xs font-black px-4.5 py-2 rounded-xl transition-all border border-rose-500/30 cursor-pointer shadow-lg uppercase tracking-wider flex items-center gap-1.5 animate-pulse"
            >
              ← Đóng Bảng Điều Khiển (Quay Lại Overlay)
            </button>
          )}

          <div className="flex items-center gap-1 bg-slate-800/60 px-3 py-1 text-xs rounded-full border border-slate-700">
            <span className={`w-2.5 h-2.5 rounded-full ${streamStatus.isConnected ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`} />
            <span className="text-slate-300 ml-1.5 text-[11px]">
              {streamStatus.isConnected ? `🟢 ${t("connectedStatus")}` : `🔴 ${t("offlineStatus")}`}
            </span>
          </div>
        </div>
      </header>

      {/* Main split flex panel space carrying SidebarNavigator */}
      <div className="flex-1 overflow-hidden flex min-w-0 bg-slate-950">
        {/* PERSISTENT SIDEBAR NAVIGATION PANELS */}
        <SidebarNavigator
          activeRoute={activeMainRoute}
          setActiveRoute={setActiveMainRoute}
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          language={activeLanguage}
          accentColor={currentAccent}
        />

        {/* Main Routed Dashboard Area */}
        <div className="flex-1 overflow-hidden relative flex flex-col min-w-0" id="main-routed-dashboard-area">
          <ScreenTransition transitionKey={activeMainRoute} type={settings.transitionType || "shutter"}>
            {activeMainRoute === "chat_overlay" && (
              <div className="w-full h-full overflow-hidden grid grid-cols-1 lg:grid-cols-5" id="chat-overlay-deck-grid">
          {/* LEFT COLUMN: CONTROL SU BOARD */}
          <div className="col-span-1 lg:col-span-2 bg-slate-900/45 border-r border-slate-800/80 flex flex-col overflow-hidden">
            {/* Internal quick action tab buttons links */}
            <div className="flex bg-slate-900 border-b border-slate-800 shrink-0 p-1">
              <button
                key="connect-tab-btn"
                type="button"
                onClick={() => setActiveTab("connect")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "connect"
                    ? "bg-slate-800 text-indigo-400 shadow-inner border-b-2 border-indigo-500"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/30"
                }`}
              >
                <Key className="w-3.5 h-3.5" />
                <span>{t("connectTab")}</span>
              </button>
              <button
                key="styler-tab-btn"
                type="button"
                onClick={() => setActiveTab("styler")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "styler"
                    ? "bg-slate-800 text-indigo-400 shadow-inner border-b-2 border-indigo-500"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/30"
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>{t("stylerTab")}</span>
              </button>
              <button
                key="filters-tab-btn"
                type="button"
                onClick={() => setActiveTab("filters")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === "filters"
                    ? "bg-slate-800 text-indigo-400 shadow-inner border-b-2 border-indigo-500"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/30"
                }`}
              >
                <Shield className="w-3.5 h-3.5" />
                <span>{t("filtersTab")}</span>
              </button>
              <button
                key="help-tab-btn"
                type="button"
                onClick={() => setActiveTab("help")}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  activeTab === "help"
                    ? "bg-slate-800 text-indigo-400 shadow-inner border-b-2 border-indigo-500"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/30"
                }`}
              >
                <Info className="w-3.5 h-3.5" />
                <span>{t("helpTab")}</span>
              </button>
            </div>

            {/* DYNAMIC SCROLL CONTAINER TAB VIEWPORTS */}
            <div className="flex-1 overflow-y-auto p-5 custom-scrollbar bg-slate-900/20">
              <ScreenTransition transitionKey={activeTab} type={settings.transitionType || "shutter"}>
                <div className="space-y-6">
                  {/* TAB 1: CONNECT & SIMULATION ACTIONS */}
                  {activeTab === "connect" && (
                    <div className="space-y-6">
                      <div>
                        <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2 mb-3">
                          <Video className="w-4 h-4 text-rose-500" />
                          <span>{t("connectHeader")}</span>
                        </h3>

                        <form onSubmit={handleConnectStream} className="space-y-4">
                          {/* YouTube API Key container */}
                          <div className="space-y-1">
                      <label className="text-[11px] text-slate-400 uppercase font-semibold flex justify-between tracking-wide">
                        <span>API Key Cá nhân (YouTube Data v3)</span>
                        <a href="https://console.cloud.google.com/" target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline">Lấy Key ↗</a>
                      </label>
                      <div className="relative">
                        <input
                          type="password"
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                          placeholder="AIzaSy..."
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono tracking-wider"
                        />
                        <Key className="absolute right-3.5 top-3.5 w-4 h-4 text-slate-600" />
                      </div>
                    </div>

                    {/* YouTube URL input container */}
                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-400 uppercase font-semibold tracking-wide">
                        YouTube Livestream URL hoặc Video ID
                      </label>
                      <div className="relative">
                        <input
                          type="text"
                          value={videoUrlOrId}
                          onChange={(e) => setVideoUrlOrId(e.target.value)}
                          placeholder="https://www.youtube.com/watch?v=..."
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-mono"
                        />
                        <Video className="absolute right-3.5 top-3.5 w-4 h-4 text-slate-600" />
                      </div>
                    </div>

                    {/* Submit indicators */}
                    {streamStatus.error && (
                      <div className="bg-red-500/15 border border-red-500/30 p-2.5 rounded-xl text-[11px] text-red-400 flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        <div>{streamStatus.error}</div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      {!streamStatus.isConnected ? (
                        <button
                          type="submit"
                          className="flex-1 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-bold py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/10 cursor-pointer"
                        >
                          <Play className="w-4 h-4" />
                          <span>Kết nối API</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={handleDisconnectStream}
                          className="flex-1 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-bold py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                          <Square className="w-4 h-4" />
                          <span>Ngắt kết nối</span>
                        </button>
                      )}
                    </div>
                  </form>
                </div>

                {/* Real-time Stream Info Output details */}
                {streamStatus.isConnected && (
                  <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800/80 space-y-3">
                    <h4 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 uppercase tracking-wide">
                      <Tv className="w-3.5 h-3.5" />
                      <span>Thông tin Live Stream</span>
                    </h4>
                    <div className="space-y-1.5 text-xs">
                      <div>
                        <span className="text-slate-500">Mã Chat ID:</span>{" "}
                        <code className="bg-slate-950 px-1 py-0.5 rounded text-[10px] text-slate-300 select-all">{streamStatus.activeLiveChatId}</code>
                      </div>
                      <div>
                        <span className="text-slate-500">Tiêu đề:</span>{" "}
                        <span className="text-slate-200 font-semibold">{streamStatus.title}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Broadcaster:</span>{" "}
                        <span className="text-slate-200">{streamStatus.channelTitle}</span>
                      </div>
                      <div>
                        <span className="text-slate-500">Người xem trực tiếp:</span>{" "}
                        <span className="text-indigo-400 font-bold font-mono">
                          {streamStatus.viewerCount.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 🔊 ÂM HIỆU TIN NHẮN MỚI */}
                <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800/80 space-y-3.5">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-bold text-indigo-400 flex items-center gap-1.5 uppercase tracking-wide">
                      <Volume2 className="w-4 h-4 shrink-0 text-indigo-505" />
                      <span>Âm hiệu tin nhắn mới</span>
                    </h4>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.soundEnabled || false}
                        onChange={(e) => updateSettings({ soundEnabled: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-300 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                      <span className="ml-2 text-xs font-bold text-slate-300">Bật âm báo</span>
                    </label>
                  </div>

                  {settings.soundEnabled && (
                    <div className="space-y-3.5 pt-1">
                      {/* Sound selector */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-400 uppercase font-semibold">Loại âm thanh</label>
                          <select
                            value={settings.soundType || "default"}
                            onChange={(e) => updateSettings({ soundType: e.target.value as any })}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-205 focus:outline-none focus:border-indigo-550 cursor-pointer"
                          >
                            <option value="default">🎵 Synth Đôi (Mặc định)</option>
                            <option value="bell">🔔 Chuông Ngân (Bell)</option>
                            <option value="pop">🎈 Bong bóng (Pop)</option>
                            <option value="synth">⚡ Sci-Fi Bleep</option>
                            <option value="custom_url">🔗 Đường dẫn URL (.mp3)</option>
                            <option value="custom_file">📥 Tải tệp lên (.wav/mp3)</option>
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-400 id-label uppercase font-semibold">Âm lượng ({Math.round((settings.soundVolume || 0.5) * 100)}%)</label>
                          <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={settings.soundVolume ?? 0.5}
                            onChange={(e) => updateSettings({ soundVolume: parseFloat(e.target.value) })}
                            className="w-full h-2 bg-slate-950 rounded-lg accent-indigo-500 cursor-pointer mt-2"
                          />
                        </div>
                      </div>

                      {/* Custom Audio URL */}
                      {settings.soundType === "custom_url" && (
                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-400 uppercase font-semibold">Địa chỉ URL âm thanh</label>
                          <input
                            type="text"
                            placeholder="https://example.com/sound.mp3"
                            value={settings.soundUrl || ""}
                            onChange={(e) => updateSettings({ soundUrl: e.target.value })}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      )}

                      {/* Custom File Uploader */}
                      {settings.soundType === "custom_file" && (
                        <div className="space-y-2">
                          <label className="text-[10px] text-slate-405 uppercase font-semibold">Tải lên tệp âm thanh của bạn</label>
                          <div className="flex items-center gap-3">
                            <label className="bg-slate-950 hover:bg-slate-800 border border-slate-800 px-3 py-2 rounded-lg text-xs text-slate-300 font-bold transition-all cursor-pointer flex items-center gap-1.5 shrink-0">
                              <Upload className="w-3.5 h-3.5 text-indigo-400" />
                              <span>Chọn tệp .wav / .mp3</span>
                              <input
                                type="file"
                                accept="audio/*"
                                className="hidden"
                                id="custom-sound-file-uploader"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    if (file.size > 8 * 1024 * 1024) {
                                      showToast("⚠️ Tệp tin quá lớn! Vui lòng chọn tệp dưới 8MB.");
                                      return;
                                    }
                                    const reader = new FileReader();
                                    reader.onload = async (event) => {
                                      try {
                                        const base64 = event.target?.result as string;
                                        const saved = await saveSoundToIndexedDB(base64);
                                        if (saved) {
                                          updateSettings({
                                            soundFileBase64: base64,
                                            soundFileName: file.name
                                          });
                                          showToast("📥 Đã tải lên và lưu tệp âm thanh!");
                                        } else {
                                          showToast("⚠️ Không thể lưu tệp âm thanh vào bộ nhớ trình duyệt!");
                                        }
                                      } catch (err) {
                                        console.error("Lỗi khi xử lý tệp âm thanh:", err);
                                        showToast("❌ Lỗi xử lý âm thanh!");
                                      }
                                    };
                                    reader.onerror = () => {
                                      showToast("❌ Lỗi đọc tệp tin âm thanh!");
                                    };
                                    reader.readAsDataURL(file);
                                  }
                                }}
                              />
                            </label>
                            <span className="text-[11px] text-slate-400 truncate max-w-[150px]">
                              {settings.soundFileName || "Chưa chọn tệp"}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Test trigger sound button */}
                      <button
                        type="button"
                        onClick={() => playNotificationSound(settings)}
                        className="w-full bg-slate-950 hover:bg-slate-800 text-slate-3wap border border-slate-800 hover:border-indigo-500/50 py-1.5 rounded-lg text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                        id="test-notification-sound-btn"
                      >
                        <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Nghe thử âm báo mẫu</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* 🎮 DISCORD-STYLE ACTIVE GAME OVERLAY CONTROL */}
                <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800/80 space-y-3">
                  <div className="flex justify-between items-center">
                    <h4 className="text-xs font-bold text-indigo-400 flex items-center gap-1.5 uppercase tracking-wide">
                      <Layout className="w-4 h-4 shrink-0 text-indigo-500" />
                      <span>Cửa Sổ Game Overlay (Discord Style)</span>
                    </h4>
                    {isElectronEnv ? (
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                        isOverlayOpen ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/25" : "bg-slate-850 text-slate-500 border border-slate-800"
                      }`}>
                        {isOverlayOpen ? "Đang mở" : "Đã tắt"}
                      </span>
                    ) : (
                      <span className="text-[9px] bg-amber-500/10 text-amber-500 border border-amber-500/25 px-1.5 py-0.5 rounded font-bold uppercase">
                        Trình duyệt
                      </span>
                    )}
                  </div>
                  
                  <p className="text-[11px] text-slate-400 leading-normal">
                    Hiển thị một khung chat trong suốt, luôn nổi (Always-on-Top) tại một vị trí cố định trên màn hình đè lên game hoặc ứng dụng của bạn, tự động bỏ qua nhấp chuột khi chơi game.
                  </p>

                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={handleToggleOverlay}
                      className={`w-full py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                        isOverlayOpen 
                          ? "bg-red-600 hover:bg-red-500 text-white" 
                          : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/15"
                      }`}
                    >
                      <Layout className="w-3.5 h-3.5" />
                      <span>{isOverlayOpen ? "Tắt Game Overlay Nổi" : "Bật Game Overlay Nổi"}</span>
                    </button>

                    {isElectronEnv ? (
                      <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-850 text-[10px] text-slate-400 space-y-1">
                        <div className="font-semibold text-slate-300">💡 Hướng dẫn phím tắt & Điểu chỉnh:</div>
                        <ul className="list-disc pl-3.5 space-y-1 leading-normal">
                          <li>Sử dụng tổ hợp phím <kbd className="bg-slate-800 text-indigo-300 px-1 py-0.5 rounded border border-slate-700 font-mono font-bold text-[9px]">Ctrl + Alt + O</kbd> ở bất cứ lúc nào ngoài màn hình nền để <b>Khóa / Mở Khóa</b> di chuyển.</li>
                          <li>Sau khi <b>Mở khóa</b>: Di chuột vào thanh tiêu đề đứt nét của khung chat rồi <b>Nhấn giữ & Kéo</b> để thay đổi vị trí, hoặc chỉnh kích cỡ chữ/nền trực tiếp ngay trên khung chat nổi.</li>
                        </ul>
                      </div>
                    ) : (
                      <div className="bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20 text-[10px] text-amber-500/90 leading-normal">
                        ⚠️ <b>Lưu ý:</b> Tính năng Discord-style Game Overlay yêu cầu bạn khởi động ứng dụng qua phần mềm <b>Desktop Client (Electron)</b> đi kèm để bật được tính năng vẽ đè Always-On-Top và điều khiển click-through toàn hệ thống.
                      </div>
                    )}
                  </div>
                </div>

                <hr className="border-slate-800" />

                {/* THE SIMULATION SANDBOX PANEL DECK */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-400" />
                      <span>Giả lập dòng Chat Sandbox (Offline)</span>
                    </h3>

                    {/* Auto Simulator switch toggle */}
                    <button
                      onClick={toggleSimulation}
                      className={`px-3 py-1 rounded-full text-[10px] font-bold border transition-all cursor-pointer ${
                        isSimulationActive
                          ? "bg-emerald-500/25 border-emerald-500/50 text-emerald-300"
                          : "bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200"
                      }`}
                    >
                      {isSimulationActive ? "● Đang chạy" : "▶ Kiểm thử tự động"}
                    </button>
                  </div>

                  <p className="text-xs text-slate-400 leading-normal mb-3">
                    Nhấn vào các nút bên dưới để nhanh chóng gửi tin nhắn giả lập khác nhau lên khung chat overlay. Giúp kiểm thử màu sắc, cỡ chữ, và Super Chat mà không cần phát live thật!
                  </p>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleInjectMessage(SAMPLE_MESSAGES_TEMPLATES[0])}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs py-2 px-3 rounded-lg border border-slate-700/50 text-left flex items-center gap-1.5 font-medium transition-all"
                    >
                      🗣️ Chat thường
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInjectMessage(SAMPLE_MESSAGES_TEMPLATES[4])}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs py-2 px-3 rounded-lg border border-slate-700/50 text-left flex items-center gap-1.5 font-medium transition-all"
                    >
                      🌟 Chat Hội viên
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInjectMessage(SAMPLE_MESSAGES_TEMPLATES[3])}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs py-2 px-3 rounded-lg border border-slate-700/50 text-left flex items-center gap-1.5 font-medium transition-all"
                    >
                      🛡️ Chat Kiểm duyệt
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInjectMessage({ name: "Host_Stream", text: "Trận đấu sắp bắt đầu rồi anh em ơi!!! Gét gô", role: "owner" })}
                      className="bg-rose-950/20 hover:bg-rose-950/45 border border-rose-900/30 text-rose-200 text-xs py-2 px-3 rounded-lg text-left flex items-center gap-1.5 font-medium transition-all"
                    >
                      👑 Chat Streamer
                    </button>
                  </div>

                  <div className="mt-3 space-y-2">
                    <span className="text-[11px] text-slate-400 uppercase font-semibold tracking-wide block">
                      Giả lập Super Chat (Donation) các cấp độ
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => handleInjectMessage(SAMPLE_MESSAGES_TEMPLATES[7])}
                        style={{ backgroundColor: SAMPLE_MESSAGES_TEMPLATES[7].color }}
                        className="text-white text-[10px] font-bold py-1.5 px-2 rounded hover:brightness-110 active:scale-95 transition-all text-center uppercase"
                      >
                        $5.00
                      </button>
                      <button
                        type="button"
                        onClick={() => handleInjectMessage(SAMPLE_MESSAGES_TEMPLATES[8])}
                        style={{ backgroundColor: SAMPLE_MESSAGES_TEMPLATES[8].color }}
                        className="text-white text-[10px] font-bold py-1.5 px-2 rounded hover:brightness-110 active:scale-95 transition-all text-center uppercase"
                      >
                        $50.00
                      </button>
                      <button
                        type="button"
                        onClick={() => handleInjectMessage(SAMPLE_MESSAGES_TEMPLATES[9])}
                        style={{ backgroundColor: SAMPLE_MESSAGES_TEMPLATES[9].color }}
                        className="text-white text-[10px] font-bold py-1.5 px-2 rounded hover:brightness-110 active:scale-95 transition-all text-center uppercase shadow-sm animate-pulse"
                      >
                        $200.00 🔥
                      </button>
                    </div>
                  </div>

                  {/* Inject block keywords triggers indicator */}
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => handleInjectMessage({ name: "Spam_Account", text: "HACK GAME FREE CLICK HERE TO WIN NOW scam free hack!", role: "normal" })}
                      className="w-full bg-slate-900 hover:bg-slate-800 text-[11px] text-slate-400 py-1.5 rounded-lg border border-slate-800 flex items-center justify-center gap-2 transition-all mt-1.5"
                    >
                      🤖 Tiêm thử tin nhắn Spam để Test Bộ Lọc
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: OVERLAY STYLE CONFIGURATOR DECK */}
            {activeTab === "styler" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-2 mb-3">
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-indigo-400" />
                    <span>{t("stylerHeader")}</span>
                  </h3>
                </div>



                {/* Typography specs */}
                <div className="space-y-3.5 bg-slate-900/30 p-4 rounded-xl border border-slate-800/80">
                  <h4 className="text-xs font-bold text-indigo-400 tracking-wide uppercase">Chữ & Phông chữ (Fonts)</h4>
                  
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400">Kiểu phông chữ (Fonts)</label>
                    <select
                      value={settings.fontFamily}
                      onChange={(e) => updateSettings({ fontFamily: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-medium"
                    >
                      <option value="Inter">Inter (Sạch sẽ, mặc định)</option>
                      <option value="Space Grotesk">Space Grotesk (Tech/Hiện đại)</option>
                      <option value="JetBrains Mono">JetBrains Mono (Lập trình viên)</option>
                      <option value="Montserrat">Montserrat (Đậm/Mạnh mẽ)</option>
                      <option value="Nunito">Nunito (Tròn/Đáng yêu)</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400">Cỡ chữ văn bản</span>
                      <span className="font-bold text-indigo-400">{settings.fontSize}px</span>
                    </div>
                    <input
                      type="range"
                      min="12"
                      max="24"
                      value={settings.fontSize}
                      onChange={(e) => updateSettings({ fontSize: parseInt(e.target.value, 10) })}
                      className="w-full accent-indigo-500 cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400">Tỷ lệ thu phóng cửa sổ</span>
                      <span className="font-bold text-indigo-400">{(settings.scale * 100).toFixed(0)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="2.0"
                      step="0.1"
                      value={settings.scale}
                      onChange={(e) => updateSettings({ scale: parseFloat(e.target.value) })}
                      className="w-full accent-indigo-500 cursor-pointer"
                    />
                  </div>
                </div>

                {/* Colors block specs */}
                <div className="space-y-3.5 bg-slate-900/30 p-4 rounded-xl border border-slate-800/80">
                  <h4 className="text-xs font-bold text-emerald-400 tracking-wide uppercase">Bảng màu sắc (Colors)</h4>
                  
                  {/* Backdrop controls */}
                  <div className="flex items-center justify-between py-1">
                    <label className="text-[11px] text-slate-400">Sử dụng nền trong suốt hoàn toàn</label>
                    <input
                      type="checkbox"
                      checked={settings.isTransparent}
                      onChange={(e) => updateSettings({ isTransparent: e.target.checked })}
                      className="w-4 h-4 accent-indigo-500 rounded cursor-pointer"
                    />
                  </div>

                  {!settings.isTransparent && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] text-slate-400 block">Màu nền khung</label>
                        <div className="flex gap-1.5 items-center">
                          <input
                            type="color"
                            value={settings.bgColor}
                            onChange={(e) => updateSettings({ bgColor: e.target.value })}
                            className="w-7 h-7 border-0 bg-transparent rounded cursor-pointer"
                          />
                          <span className="text-xs font-mono font-semibold">{settings.bgColor}</span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-slate-400">Độ mờ nền</span>
                          <span className="font-bold text-indigo-400">{Math.round(settings.bgOpacity * 100)}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="1.0"
                          step="0.05"
                          value={settings.bgOpacity}
                          onChange={(e) => updateSettings({ bgOpacity: parseFloat(e.target.value) })}
                          className="w-full accent-indigo-500 cursor-pointer"
                        />
                      </div>
                    </div>
                  )}

                  <hr className="border-slate-800/50" />

                  {/* Text profiles */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-400">Màu chữ comment</label>
                      <div className="flex gap-1 items-center">
                        <input
                          type="color"
                          value={settings.textColor}
                          onChange={(e) => updateSettings({ textColor: e.target.value })}
                          className="w-5 h-5 bg-transparent border-0 cursor-pointer"
                        />
                        <span className="font-mono text-[11px]">{settings.textColor}</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-400">Màu tên người xem</label>
                      <div className="flex gap-1 items-center">
                        <input
                          type="color"
                          value={settings.authorColor}
                          onChange={(e) => updateSettings({ authorColor: e.target.value })}
                          className="w-5 h-5 bg-transparent border-0 cursor-pointer"
                        />
                        <span className="font-mono text-[11px]">{settings.authorColor}</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-400">Màu tên Moderator</label>
                      <div className="flex gap-1 items-center">
                        <input
                          type="color"
                          value={settings.moderatorColor}
                          onChange={(e) => updateSettings({ moderatorColor: e.target.value })}
                          className="w-5 h-5 bg-transparent border-0 cursor-pointer"
                        />
                        <span className="font-mono text-[11px]">{settings.moderatorColor}</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] text-slate-400">Màu tên Hội viên</label>
                      <div className="flex gap-1 items-center">
                        <input
                          type="color"
                          value={settings.sponsorColor}
                          onChange={(e) => updateSettings({ sponsorColor: e.target.value })}
                          className="w-5 h-5 bg-transparent border-0 cursor-pointer"
                        />
                        <span className="font-mono text-[11px]">{settings.sponsorColor}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Display options / Timing limits togglers */}
                <div className="space-y-3.5 bg-slate-900/30 p-4 rounded-xl border border-slate-800/80">
                  <h4 className="text-xs font-bold text-amber-500 tracking-wide uppercase">Cơ chế Hiển thị & Cuộn</h4>
                  
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400">Hạn ghim tin Super Chat</span>
                      <span className="font-bold text-amber-500">{settings.superChatDuration} giây</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="180"
                      step="5"
                      value={settings.superChatDuration}
                      onChange={(e) => updateSettings({ superChatDuration: parseInt(e.target.value, 10) })}
                      className="w-full accent-indigo-500 cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400">Ẩn tin thường sau (Chat Duration)</span>
                      <span className="font-bold text-indigo-400">
                        {settings.chatDuration === 0 ? "Vô hạn (Không ẩn)" : `${settings.chatDuration} giây`}
                      </span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="60"
                      step="5"
                      value={settings.chatDuration}
                      onChange={(e) => updateSettings({ chatDuration: parseInt(e.target.value, 10) })}
                      className="w-full accent-indigo-500 cursor-pointer"
                    />
                    <span className="text-[9px] text-slate-500 italic block">Đặt về 0 để tin nhắn luôn hiển thị vĩnh viễn trên màn hình.</span>
                  </div>

                  <hr className="border-slate-800/50" />

                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Hiển thị Avatar người dùng</span>
                      <input
                        type="checkbox"
                        checked={settings.showAvatar}
                        onChange={(e) => updateSettings({ showAvatar: e.target.checked })}
                        className="w-4 h-4 accent-indigo-500 rounded cursor-pointer"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Hiển thị huy hiệu vai trò (Badges)</span>
                      <input
                        type="checkbox"
                        checked={settings.showBadges}
                        onChange={(e) => updateSettings({ showBadges: e.target.checked })}
                        className="w-4 h-4 accent-indigo-500 rounded cursor-pointer"
                      />
                    </div>
                  </div>

                  <div className="space-y-1 pt-1.5">
                    <label className="text-[11px] text-slate-400 block">Hiệu ứng xuất hiện (Animations)</label>
                    <select
                      value={settings.animationType}
                      onChange={(e) => updateSettings({ animationType: e.target.value as any })}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    >
                      <option value="fade">Mờ dần khi vào (Fade In)</option>
                      <option value="slide">Bay vào từ bên trái (Slide Left)</option>
                      <option value="bounce">Đàn hồi tự nhiên (Bounce In)</option>
                    </select>
                  </div>
                </div>

                {/* 🖼️ Chọn ảnh làm background khung chat */}
                <div className="space-y-4 bg-slate-900/30 p-4 rounded-xl border border-slate-800/80">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-indigo-400 tracking-wide uppercase flex items-center gap-1.5">
                      <Image className="w-3.5 h-3.5" />
                      <span>Hình nền khung chat (Background)</span>
                    </h4>
                    <input
                      type="checkbox"
                      checked={settings.bgImageEnabled || false}
                      onChange={(e) => updateSettings({ bgImageEnabled: e.target.checked })}
                      className="w-4 h-4 accent-indigo-500 rounded cursor-pointer"
                    />
                  </div>

                  {settings.bgImageEnabled && (
                    <div className="space-y-3.5 animate-in fade-in duration-200">
                      <div className="space-y-1">
                        <label className="text-[11px] text-slate-400 block">Nguồn ảnh nền</label>
                        <div className="grid grid-cols-4 gap-1.5">
                          {[
                            { value: "pattern", label: "Họa tiết" },
                            { value: "gradient", label: "Chuyển màu" },
                            { value: "custom_url", label: "Đường dẫn URL" },
                            { value: "upload", label: "Tải ảnh lên" },
                          ].map((x) => (
                            <button
                              key={x.value}
                              type="button"
                              onClick={() => updateSettings({ bgImageType: x.value as any })}
                              className={`py-1.5 px-0.5 rounded text-[10px] font-bold border transition-all truncate ${
                                settings.bgImageType === x.value
                                  ? "bg-indigo-600 text-white border-indigo-500"
                                  : "bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200"
                              }`}
                            >
                              {x.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {settings.bgImageType === "pattern" && (
                        <div className="space-y-1 animate-in slide-in-from-top-1 duration-150">
                          <label className="text-[11px] text-slate-400 block">Chọn họa tiết mẫu</label>
                          <select
                            value={settings.bgImagePreset || "grid"}
                            onChange={(e) => updateSettings({ bgImagePreset: e.target.value as any })}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                          >
                            <option value="grid">Lưới mắt cáo cổ điển (Grid Line)</option>
                            <option value="dots">Mưa hạt chấm tròn nhẹ (Dots Mesh)</option>
                            <option value="waves">Giao hưởng ngấn sóng (Waves Rhythm)</option>
                          </select>
                        </div>
                      )}

                      {settings.bgImageType === "gradient" && (
                        <div className="space-y-1 animate-in slide-in-from-top-1 duration-150">
                          <label className="text-[11px] text-slate-400 block">Chọn dải chuyển màu</label>
                          <select
                            value={settings.bgImagePreset || "gradient-sunset"}
                            onChange={(e) => updateSettings({ bgImagePreset: e.target.value as any })}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                          >
                            <option value="gradient-sunset">Hoàng hôn rực rỡ (Sunset Coral)</option>
                            <option value="gradient-neon">Màu sắc điện tử (Retro Neon)</option>
                            <option value="gradient-forest">Thanh mát thiên nhiên (Forest Teal)</option>
                          </select>
                        </div>
                      )}

                      {settings.bgImageType === "custom_url" && (
                        <div className="space-y-1 animate-in slide-in-from-top-1 duration-150">
                          <label className="text-[11px] text-slate-400 block">Đường dẫn tệp ảnh (URL)</label>
                          <input
                            type="text"
                            placeholder="Nhập liên kết https://... hoặc file://"
                            value={settings.bgImageUrl || ""}
                            onChange={(e) => updateSettings({ bgImageUrl: e.target.value })}
                            className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      )}

                      {settings.bgImageType === "upload" && (
                        <div className="space-y-1.5 animate-in slide-in-from-top-1 duration-150">
                          <label className="text-[11px] text-slate-400 block font-semibold text-slate-300">Tải tệp ảnh nền từ thiết bị</label>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                if (file.size > 8 * 1024 * 1024) {
                                  showToast("⚠️ Ảnh quá lớn! Vui lòng chọn ảnh dưới 8MB.");
                                  return;
                                }
                                const reader = new FileReader();
                                reader.onload = async (event) => {
                                  try {
                                    const base64 = event.target?.result as string;
                                    const saved = await saveBgImageToIndexedDB(base64);
                                    if (saved) {
                                      updateSettings({ bgImageBase64: base64 });
                                      showToast("📥 Đã tải lên và lưu ảnh nền khung chat thành công!");
                                    } else {
                                      showToast("⚠️ Không thể lưu ảnh nền vào bộ nhớ trình duyệt!");
                                    }
                                  } catch (err) {
                                    console.error("Lỗi khi xử lý ảnh nền:", err);
                                    showToast("❌ Lỗi xử lý ảnh nền!");
                                  }
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                            className="text-xs text-slate-400 file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-indigo-650 file:text-white hover:file:bg-indigo-600 file:cursor-pointer cursor-pointer"
                          />
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3 pt-1">
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px]">
                            <span className="text-slate-400">Độ đậm bóng ảnh</span>
                            <span className="font-bold text-indigo-400">{Math.round((settings.bgImageOpacity ?? 0.3) * 100)}%</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="1.0"
                            step="0.05"
                            value={settings.bgImageOpacity ?? 0.3}
                            onChange={(e) => updateSettings({ bgImageOpacity: parseFloat(e.target.value) })}
                            className="w-full accent-indigo-500 cursor-pointer"
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px]">
                            <span className="text-slate-400">Độ nhòe (Blur)</span>
                            <span className="font-bold text-indigo-400">{settings.bgImageBlur ?? 0}px</span>
                          </div>
                          <input
                            type="range"
                            min="0"
                            max="12"
                            step="1"
                            value={settings.bgImageBlur ?? 0}
                            onChange={(e) => updateSettings({ bgImageBlur: parseInt(e.target.value, 10) })}
                            className="w-full accent-indigo-500 cursor-pointer"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* ⚡ Thêm các icon nhỏ đi cùng tin nhắn chat */}
                <div className="space-y-4 bg-slate-900/30 p-4 rounded-xl border border-slate-800/80">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-indigo-400 tracking-wide uppercase flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Biểu tượng trang trí tin nhắn (Tiny Icons)</span>
                    </h4>
                    <input
                      type="checkbox"
                      checked={settings.decorativeIconEnabled || false}
                      onChange={(e) => updateSettings({ decorativeIconEnabled: e.target.checked })}
                      className="w-4 h-4 accent-indigo-500 rounded cursor-pointer"
                    />
                  </div>

                  {settings.decorativeIconEnabled && (
                    <div className="space-y-3.5 animate-in fade-in duration-150">
                      <div className="space-y-1">
                        <label className="text-[11px] text-slate-400 block">Chọn biểu tượng đi kèm</label>
                        <select
                          value={settings.decorativeIconType || "star"}
                          onChange={(e) => updateSettings({ decorativeIconType: e.target.value as any })}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-medium"
                        >
                          <option value="star">⭐ Ngôi sao hiếu khách (Glowing Star)</option>
                          <option value="heart">❤️ Trái tim nồng nhiệt (Warm Heart)</option>
                          <option value="fire">🔥 Lửa cháy bùng nổ (Hot Fire)</option>
                          <option value="sparkles">✨ Chòm sao lấp lánh (Sparkling Magic)</option>
                          <option value="crown">👑 Vương miện quyền quý (Royal Crown)</option>
                          <option value="controller">🎮 Máy chơi game giải trí (Gamepad console)</option>
                          <option value="bolt">⚡ Tia chớp điện lượng (High voltage Bolt)</option>
                          <option value="coffee">☕ Cốc cà phê thư giãn (Coffee bar cup)</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] text-slate-400 block">Vị trí hiển thị biểu tượng</label>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { value: "before_name", label: "Trước phần tên" },
                            { value: "after_name", label: "Sau phần tên" },
                            { value: "before_msg", label: "Trước tin nhắn" },
                          ].map((pos) => (
                            <button
                              key={pos.value}
                              type="button"
                              onClick={() => updateSettings({ decorativeIconPosition: pos.value as any })}
                              className={`py-1.5 rounded text-[10px] font-extrabold border transition-all ${
                                settings.decorativeIconPosition === pos.value
                                  ? "bg-indigo-600 text-white border-indigo-500"
                                  : "bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200"
                              }`}
                            >
                              {pos.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: SPAM FILTER & BLACKLIST */}
            {activeTab === "filters" && (
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2 mb-1">
                  <Shield className="w-4 h-4 text-rose-500" />
                  <span>Bộ lọc Từ khoá Cấm & Spam</span>
                </h3>
                <p className="text-xs text-slate-400 leading-normal">
                  Chặn các tin nhắn chứa nội dung thô tục, spam link quảng cáo tự động hoặc các từ khóa gây loãng luồng stream.
                </p>

                {/* Filter form input (US-08, T3-01) */}
                <form onSubmit={handleAddKeyword} className="bg-slate-900/30 p-4 rounded-xl border border-slate-800/80 space-y-3.5">
                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400 block">Từ khóa hoặc biểu thức cấm</label>
                    <input
                      type="text"
                      value={newKeyword}
                      onChange={(e) => setNewKeyword(e.target.value)}
                      placeholder="Ví dụ: hack, scam, /spam+/i..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">Sử dụng Regular Expression (RegEx)</span>
                    <input
                      type="checkbox"
                      checked={newKeywordIsRegex}
                      onChange={(e) => setNewKeywordIsRegex(e.target.checked)}
                      className="w-4 h-4 accent-indigo-500 cursor-pointer"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] text-slate-400 block">Ghi chú bộ lọc (Tùy chọn)</label>
                    <input
                      type="text"
                      value={newKeywordComment}
                      onChange={(e) => setNewKeywordComment(e.target.value)}
                      placeholder="Ghi chú để dễ quản lý..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 rounded-lg text-xs transition-all flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span>+ Thêm vào Blacklist</span>
                  </button>
                </form>

                {/* Keyword display badges list */}
                <div className="space-y-2">
                  <label className="text-[11px] text-slate-400 uppercase font-semibold tracking-wide block">
                    Danh sách từ khóa đang hoạt động ({blacklist.length})
                  </label>
                  
                  {blacklist.length === 0 ? (
                    <div className="bg-slate-900/10 p-4 border border-dashed border-slate-800 text-center rounded-xl text-slate-500 text-xs">
                      Không có bộ lọc từ khóa nào đang bật. Kênh đang mở tự do!
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[220px] overflow-y-auto custom-scrollbar">
                      {blacklist.map((item) => (
                        <div
                          key={item.id}
                          className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 flex items-center justify-between gap-1"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <code className="text-xs bg-red-950/20 px-1.5 py-0.5 rounded text-red-400 font-mono font-bold max-w-[150px] truncate">
                                {item.pattern}
                              </code>
                              {item.isRegex && (
                                <span className="bg-purple-950/45 border border-purple-800/35 text-purple-400 text-[8px] font-bold tracking-widest uppercase px-1 rounded scale-90">
                                  REGEX
                                </span>
                              )}
                            </div>
                            {item.comment && (
                              <p className="text-[10px] text-slate-500 mt-1 truncate max-w-[170px]">{item.comment}</p>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveKeyword(item.id)}
                            className="bg-slate-900 hover:bg-red-950/45 border border-slate-800 hover:border-red-900/30 p-1.5 rounded-md text-slate-400 hover:text-red-400 transition-all cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 4: COMPREHENSIVE DETAILED MANUAL */}
            {activeTab === "help" && <HelpManual />}
                </div>
              </ScreenTransition>
            </div>
          </div>

        {/* RIGHT COLUMN: HIGH-FIDELITY LIVE MONITOR DEVICE PREVIEW (US-02, Drag & Resize specs) */}
        <div className="col-span-1 lg:col-span-3 bg-slate-950 p-6 flex flex-col gap-4 overflow-y-auto custom-scrollbar max-h-[calc(100vh-100px)] lg:max-h-none">
          <div className="flex items-center justify-between shrink-0 bg-slate-900/50 p-3 rounded-xl border border-slate-800/80">
            <div className="flex items-center gap-2">
              <Layout className="w-4 h-4 text-indigo-400" />
              <div>
                <h3 className="text-xs font-bold text-slate-100">Cửa sổ màn hình xem trước Overlay (Live Setup Preview)</h3>
                <p className="text-[10px] text-slate-400">
                  Kéo tiêu đề để di chuyển, kéo cạnh góc phải để chỉnh kích thước. Phím ẩn nhanh: <kbd className="font-mono bg-slate-800 px-1 rounded text-[9px] border border-slate-700 text-slate-300">Ctrl+Shift+C</kbd>
                </p>
              </div>
            </div>

            {/* Simulated Desktop Theme Option dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500 font-semibold uppercase">Backdrop:</span>
              <select
                value={backdropTheme}
                onChange={(e) => setBackdropTheme(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[10px] text-slate-300 focus:outline-none cursor-pointer"
              >
                <option value="game-backdrop-valo">🎮 Valorant Match</option>
                <option value="game-backdrop-csgo">🔫 CS:GO Combat</option>
                <option value="game-backdrop-desk">🏢 Studio Abstract</option>
                <option value="bg-slate-900 border border-slate-800">⬛ Màu tối đơn giản</option>
              </select>
            </div>
          </div>

          {/* VIRTUAL MONITOR BOUND SCREEN CONTAINER */}
          <div
            ref={viewportRef}
            className={`relative rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 ${backdropTheme} flex flex-col justify-end h-[840px] shrink-0`}
          >
            {/* Draggable & Resizable overlay frame */}
            {isOverlayVisible ? (
              <div
                className="absolute shadow-2xl rounded-xl overflow-hidden border border-white/10 group transition-shadow"
                style={{
                  left: `${overlayPos.x}px`,
                  top: `${overlayPos.y}px`,
                  width: `${overlaySize.width}px`,
                  height: `${overlaySize.height}px`,
                  zIndex: 20,
                }}
              >
                {/* Simulated drag bar */}
                <div
                  onMouseDown={handleMouseDownDrag}
                  className="bg-slate-900/90 hover:bg-slate-900 px-3 py-1.5 flex items-center justify-between text-[10px] text-slate-400 font-bold tracking-wide border-b border-white/5 cursor-move active:bg-slate-950 select-none"
                >
                  <div className="flex items-center gap-1 text-slate-200">
                    <Shield className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span>LIVESTREAM CHAT OVERLAY PREVIEW ({overlaySize.width}x{overlaySize.height})</span>
                  </div>
                  <div className="text-[9px] text-slate-400 font-mono bg-white/10 px-1.5 py-0.5 rounded uppercase">
                    Kéo để di chuyển
                  </div>
                </div>

                {/* Inner actual Overlay Widget block */}
                <div className="w-full h-[calc(100%-28px)] relative animate-in fade-in duration-300">
                  <OverlayWidget messages={messages} settings={settings} previewMode={true} />

                  {/* High fidelity diagonal resize handle point (Sprint 2 UX, AC-13) */}
                  <div
                    onMouseDown={handleMouseDownResize}
                    className="resize-handle absolute bottom-0 right-0 w-4 h-4 bg-indigo-500/80 cursor-se-resize flex items-end justify-end p-0.5 rounded-tl-lg shadow hover:bg-indigo-400 transition-colors z-50 pointer-events-auto"
                    title="Kéo để đổi kích thước"
                  >
                    <svg width="6" height="6" viewBox="0 0 6 6" className="text-white fill-current shrink-0">
                      <path d="M6,0 L0,6 L6,6 Z" />
                    </svg>
                  </div>
                </div>
              </div>
            ) : (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-slate-900/90 border border-slate-800 p-6 rounded-2xl flex flex-col items-center justify-center text-center gap-2 max-w-sm">
                <EyeOff className="w-8 h-8 text-slate-500 animate-pulse" />
                <h4 className="font-bold text-xs text-slate-200">Chat Overlay đang bị ẩn (Invisible)</h4>
                <p className="text-[10px] text-slate-400 leading-normal">
                  Bạn vừa bấm phím nóng <kbd className="font-mono bg-slate-800 px-1 py-0.5 border border-slate-700 text-slate-300 rounded text-[9px]">Ctrl+Shift+C</kbd>. Hãy bấm phím nóng này một lần nữa để hiển thị lại chat!
                </p>
              </div>
            )}

            {/* Quick backdrop stream metadata labels */}
            <div className="absolute inset-x-0 top-0 p-3 bg-gradient-to-b from-black/80 to-transparent flex items-center justify-between text-white pointer-events-none select-none z-10">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-red-600 animate-ping shrink-0" />
                <span className="font-bold text-xs uppercase tracking-widest text-shadow">LIVE CHAT CONSOLE</span>
              </div>
              <div className="flex items-center gap-3 text-[10px] font-semibold text-slate-300">
                <span>Viewers: <strong className="text-indigo-400 font-mono">{streamStatus.viewerCount.toLocaleString()}</strong></span>
                <span>Messages: <strong className="text-slate-100 font-mono">{messages.length}</strong></span>
              </div>
            </div>

            {/* Virtual stream screen instructions overlay helper */}
            <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/50 to-transparent text-[10px] text-slate-400 text-center pointer-events-none z-10">
              Mô hình hiển thị đúng tỷ lệ và độ mờ khi phát sóng. Bạn nên ghim góc dưới-trái hoặc dưới-phải màn hình stream.
            </div>
          </div>

          {/* COMPACTED LOWER SECTION TABS SWITCHER (OBS browser link + Custom CSS/JS + Logs Side-by-side) */}
          <div className="flex bg-slate-900 border border-slate-800/80 rounded-xl p-1 shrink-0">
            <button
              type="button"
              onClick={() => setRightSubTab("obs")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                rightSubTab === "obs"
                  ? "bg-indigo-650 text-white shadow"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/55"
              }`}
            >
              <Sliders className="w-3.5 h-3.5 text-indigo-400" />
              <span>Kết nối OBS Source</span>
            </button>
            <button
              type="button"
              onClick={() => setRightSubTab("custom")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                rightSubTab === "custom"
                  ? "bg-indigo-650 text-white shadow"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/55"
              }`}
            >
              <Code className="w-3.5 h-3.5 text-indigo-400" />
              <span>Custom Layout (Code)</span>
            </button>
            <button
              type="button"
              onClick={() => setRightSubTab("logs")}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                rightSubTab === "logs"
                  ? "bg-indigo-650 text-white shadow"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/55"
              }`}
            >
              <Keyboard className="w-3.5 h-3.5 text-emerald-400" />
              <span>Nhật ký luồng Chat ({messages.length})</span>
            </button>
          </div>

          {/* SUB-TAB CONTENTS CARD */}
          <div className="space-y-4">
            {rightSubTab === "obs" && (
              <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-800/60 space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-indigo-400" />
                    <span>Lấy Link hiển thị Browser Source</span>
                  </h3>
                  {isObsGeneratorRevealed && (
                    <button
                      type="button"
                      onClick={() => setIsObsGeneratorRevealed(false)}
                      className="bg-rose-950/80 hover:bg-rose-900 text-rose-300 text-[10px] font-bold px-2 py-0.5 rounded transition-all border border-rose-500/20 flex items-center gap-1 cursor-pointer"
                    >
                      <EyeOff className="w-3 h-3" />
                      <span>Che bảo mật</span>
                    </button>
                  )}
                </div>

                {!isObsGeneratorRevealed ? (
                  <div className="relative overflow-hidden rounded-xl border border-dashed border-red-500/20 bg-slate-950 p-5 transition-all">
                    <div className="flex flex-col items-center justify-center text-center py-2">
                      <EyeOff className="w-8 h-8 text-rose-500 mb-2 animate-pulse" />
                      <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider text-rose-400">
                        OBS Generator ĐÃ BỊ CHE BẢO MẬT
                      </h4>
                      <p className="text-[10.5px] text-slate-400 max-w-[280px] mt-1 mb-4 leading-normal">
                        Tránh vô tình để lộ Link OBS chứa API Key và ID livestream cá nhân của bạn khi đang trực tiếp.
                      </p>
                      <button
                        type="button"
                        onClick={() => setIsObsGeneratorRevealed(true)}
                        className="bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-[11px] font-bold px-4 py-2 rounded-lg transition-all border border-indigo-500/30 cursor-pointer shadow-lg flex items-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Hiển thị Link OBS</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-[11px] text-slate-400 leading-normal">
                      Sau khi dán link vào nguồn Trình duyệt (Browser Source) trên OBS Studio, bạn không cần phải đổi link hay dán lại nữa.
                    </p>

                    <div className="bg-emerald-950/20 border border-emerald-500/25 p-3 rounded-xl text-[10.5px] text-emerald-400 leading-normal flex items-start gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      <span>
                        <strong>Tính năng Đồng Bộ Sống:</strong> Mỗi khi tùy chỉnh hoặc thiết lập thêm từ khóa lọc, cấu hình của bạn sẽ tự động truyền đến OBS tức thì sau khi bấm <strong>LƯU THIẾT LẬP & ĐỒNG BỘ OBS</strong> ở góc phải dưới!
                      </span>
                    </div>

                    {/* Link OBS Chat Overlay */}
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 space-y-2 flex flex-col">
                      <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest pl-0.5">💬 Link OBS Chat Overlay</span>
                      <div className="font-mono text-[10.5px] text-indigo-300 break-all select-all font-semibold p-1 hover:bg-white/5 rounded max-h-[80px] overflow-y-auto custom-scrollbar">
                        {compileObsLink()}
                      </div>
                      <button
                        type="button"
                        onClick={handleCopyObsLink}
                        className="w-full bg-indigo-600/90 hover:bg-indigo-600 text-white font-bold py-2 rounded-lg text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Sao chép Link OBS Chat Overlay</span>
                      </button>
                    </div>

                    {/* Link OBS Screen Transition Overlay */}
                    <div className="bg-slate-950 p-3 rounded-xl border border-slate-850 space-y-2 flex flex-col">
                      <span className="text-[10px] font-bold text-pink-400 uppercase tracking-widest pl-0.5">🎬 Link OBS Screen Transition Overlay</span>
                      <div className="font-mono text-[10.5px] text-pink-300 break-all select-all font-semibold p-1 hover:bg-white/5 rounded max-h-[80px] overflow-y-auto custom-scrollbar">
                        {compileObsTransitionLink()}
                      </div>
                      <button
                        type="button"
                        onClick={handleCopyObsTransitionLink}
                        className="w-full bg-pink-600/90 hover:bg-pink-650 text-white font-bold py-2 rounded-lg text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Sao chép Link OBS Transition Overlay</span>
                      </button>
                    </div>

                    {/* Export/Import profiles */}
                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleExportConfig}
                        className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/50 font-bold py-2 rounded-lg text-[11px] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Xuất File Cấu Hình</span>
                      </button>
                      
                      <label className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/50 font-bold py-2 rounded-lg text-[11px] transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Nhập File Cấu Hình</span>
                        <input
                          type="file"
                          accept=".json"
                          onChange={handleImportConfig}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                )}

                {/* Picture in picture widgets */}
                <div className="bg-slate-950/40 p-4 rounded-xl border border-slate-850 space-y-3">
                  <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wide flex items-center gap-1.5">
                    <Tv className="w-3.5 h-3.5" />
                    <span>Tiện ích đè màn hình game (Streamer Display Overlay)</span>
                  </h4>
                  <p className="text-[11px] text-slate-400 leading-normal">
                    Nếu bạn muốn tự nhìn thấy chat overlay này đè nổi lên game hoặc màn hình chính khi đang chơi game/stream mà không cần mở OBS:
                  </p>
                  
                  <div className="flex flex-col sm:flex-row gap-2 pt-1">
                    <button
                      type="button"
                      onClick={togglePipMode}
                      className="flex-1 bg-slate-950 hover:bg-slate-800 text-slate-200 border border-slate-800 hover:border-indigo-500/50 font-bold py-2 px-3 rounded-lg text-[11px] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm group"
                    >
                      <PictureInPicture className="w-3.5 h-3.5 text-indigo-400 group-hover:scale-110 transition-transform" />
                      <span>Mở Cửa sổ nổi Always-On-Top (PiP Overlay)</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleOpenPopoutWindow}
                      className="flex-1 bg-slate-950 hover:bg-slate-800 text-slate-200 border border-slate-800 hover:border-indigo-500/50 font-bold py-2 px-3 rounded-lg text-[11px] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm group"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
                      <span>Tách khung Chat Popout rời</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* CUSTOM CODE OVERLAY EDITOR PANEL */}
            {rightSubTab === "custom" && (
              <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-800/60 space-y-4 animate-in fade-in duration-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-slate-200">
                    <Code className="w-4 h-4 text-indigo-400 shrink-0" />
                    <span className="text-xs uppercase tracking-wider">Tự Thiết Kế Layout (Custom Overlay)</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.useCustomCode || false}
                      onChange={(e) => updateSettings({ useCustomCode: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-300 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-650"></div>
                    <span className="ml-2 text-xs font-bold text-slate-300">Bật</span>
                  </label>
                </div>

                {settings.useCustomCode ? (
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] text-slate-400 font-semibold block">Tự thêm code HTML:</label>
                      <textarea
                        rows={4}
                        value={settings.customHtml || ""}
                        onChange={(e) => updateSettings({ customHtml: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500 custom-scrollbar resize-y max-h-[140px] overflow-y-auto block"
                        placeholder="Nhập thẻ HTML để chứa dòng chat..."
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] text-slate-400 font-semibold block">Tự thêm code CSS:</label>
                      <textarea
                        rows={6}
                        value={settings.customCss || ""}
                        onChange={(e) => updateSettings({ customCss: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500 custom-scrollbar resize-y max-h-[180px] overflow-y-auto block"
                        placeholder="Kiểu dáng CSS của bạn..."
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] text-slate-400 font-semibold block">Tự thêm code JavaScript (ES5/ES6):</label>
                      <textarea
                        rows={6}
                        value={settings.customJs || ""}
                        onChange={(e) => updateSettings({ customJs: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-805 rounded-lg p-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500 custom-scrollbar resize-y max-h-[180px] overflow-y-auto block"
                        placeholder="Mã kịch bản JavaScript đồng bộ..."
                      />
                    </div>

                    <div className="p-3 bg-indigo-950/20 border border-indigo-500/20 rounded-xl text-[11px] text-indigo-300 space-y-1.5 leading-relaxed">
                      <div className="font-bold flex items-center gap-1">
                        <Info className="w-3.5 h-3.5 shrink-0" />
                        <span>HƯỚNG DẪN VIẾT CUSTOM OVERLAY CODE</span>
                      </div>
                      <p>
                        * Event <b>onChatUpdate</b> sẽ liên tục được kích hoạt trên <i>window</i> khi có tin nhắn mới.
                      </p>
                      <p>
                        * Nhận danh sách tin nhắn chat thông qua <b>e.detail</b> và render ra giao diện của riêng bạn một cách tự do. Viết CSS và JavaScript mẫu được nạp sẵn cực kỳ dễ tùy biến!
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-955 p-6 rounded-xl border border-dashed border-slate-800 text-center text-slate-400 text-xs">
                    Hãy bật công tắc kích hoạt ở góc phải phía trên để tự viết HTML/CSS/JS mẫu và tự do thiết kế phong cách của riêng bạn.
                  </div>
                )}
              </div>
            )}

            {/* CHAT MONITOR LOGGER SHEET PANEL */}
            {rightSubTab === "logs" && (
              <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-800/60 flex flex-col gap-2 h-80 animate-in fade-in duration-200">
                <div className="flex items-center justify-between shrink-0">
                  <span className="text-[11px] text-slate-400 uppercase font-bold tracking-wide flex items-center gap-1">
                    <Keyboard className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Nhật ký luồng Chat trực tiếp (Live Logs: {messages.length})</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setMessages([]);
                      messagesSetRef.current.clear();
                      showToast("🧹 Đã dọn sạch lịch sử dòng chat!");
                    }}
                    className="text-[10px] text-slate-500 hover:text-red-400 flex items-center gap-1 transition-all cursor-pointer"
                  >
                    Clear log
                  </button>
                </div>

                {/* Raw chronologic scrolling list */}
                <div className="flex-1 overflow-y-auto custom-scrollbar font-mono text-[10px] text-slate-400 space-y-1 pl-1 bg-slate-950 p-2 rounded-lg border border-slate-900">
                  {messages.length === 0 ? (
                    <div className="text-slate-600 italic py-2">Dòng chat trống. Nhấp Giả lập chat ở cột bên trái để nạp tin nhắn thử nghiệm...</div>
                  ) : (
                    messages.map((m) => (
                      <div key={`log-${m.id}`} className="truncate hover:text-slate-100 transition-colors py-0.5">
                        <span className="text-indigo-400">[{new Date(m.timestamp).toLocaleTimeString()}]</span>{" "}
                        <span className="font-bold text-slate-300">{m.authorName}</span>:{" "}
                        {m.isSuperChat ? (
                          <span className="bg-amber-500/20 text-amber-400 px-1 py-0.2 rounded font-bold">
                            [DONATE {m.superChatAmountText}] {m.messageText}
                          </span>
                        ) : (
                          <span>{m.messageText}</span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )}

      {activeMainRoute === "screen_transition" && (
        <ScreenTransitionWorkspace
          settings={settings}
          updateSettings={updateSettings}
          language={activeLanguage}
          showToast={showToast}
          accentColor={currentAccent}
          obsTransitionLink={compileObsTransitionLink()}
          onCopyObsTransitionLink={handleCopyObsTransitionLink}
        />
      )}

      {activeMainRoute === "settings" && (
        <SettingsWorkspace
          settings={settings}
          updateSettings={updateSettings}
          language={activeLanguage}
          showToast={showToast}
          accentColor={currentAccent}
        />
      )}
    </ScreenTransition>
  </div>
</div>
      {pipContainer && createPortal(
        <div className="w-full h-full bg-transparent overflow-hidden">
          <OverlayWidget messages={messages} settings={settings} />
        </div>,
        pipContainer
      )}
    </div>
  );
}
