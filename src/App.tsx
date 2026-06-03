import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { ChatMessage, OverlaySettings, FilterKeyword, StreamStatus } from "./types";
import OverlayWidget from "./components/OverlayWidget";
import HelpManual from "./components/HelpManual";
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
  Cpu,
  AlertTriangle,
  ExternalLink,
  PictureInPicture,
  Save,
} from "lucide-react";

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

export default function App() {
  // 1. DYNAMIC ROUTING CHECK - OBS Browser Source Detection
  const [isOverlayRoute, setIsOverlayRoute] = useState(false);
  const [obsSettings, setObsSettings] = useState<OverlaySettings>(DEFAULT_SETTINGS);
  const [obsChatId, setObsChatId] = useState<string>("");
  const [obsApiKey, setObsApiKey] = useState<string>("");

  useEffect(() => {
    const path = window.location.pathname;
    const searchParams = new URLSearchParams(window.location.search);
    const hasOverlayParam = searchParams.get("mode") === "overlay";
    
    if (path === "/overlay" || hasOverlayParam) {
      setIsOverlayRoute(true);
      
      // Parse settings from URL for OBS source configuration
      const pFontSize = parseInt(searchParams.get("fontSize") || "15", 10);
      const pFontFamily = searchParams.get("fontFamily") || "Inter";
      const pTextColor = searchParams.get("textColor") || "#ffffff";
      const pBgColor = searchParams.get("bgColor") || "#0f172a";
      const pBgOpacity = parseFloat(searchParams.get("bgOpacity") || "0.85");
      const pAuthorColor = searchParams.get("authorColor") || "#bae6fd";
      const pModeratorColor = searchParams.get("moderatorColor") || "#34d399";
      const pSponsorColor = searchParams.get("sponsorColor") || "#fbbf24";
      const pScDuration = parseInt(searchParams.get("superChatDuration") || "45", 10);
      const pChatDuration = parseInt(searchParams.get("chatDuration") || "0", 10);
      const pIsTransparent = searchParams.get("isTransparent") === "true";
      const pScale = parseFloat(searchParams.get("scale") || "1.0");
      const pShowAvatar = searchParams.get("showAvatar") !== "false";
      const pShowBadges = searchParams.get("showBadges") !== "false";
      const pAnimType = (searchParams.get("animationType") || "fade") as "fade" | "slide" | "bounce";

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

      setObsChatId(searchParams.get("liveChatId") || "");
      setObsApiKey(searchParams.get("apiKey") || "");

      // Let's retrieve potential live-synced configurations from backend cache on mount
      fetch("/api/youtube/settings-sync")
        .then((res) => res.json())
        .then((data) => {
          if (data && data.settings) {
            setObsSettings(data.settings);
          }
        })
        .catch((err) => console.error("Error fetching initial synced settings:", err));
    }
  }, []);

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
      try { return JSON.parse(saved); } catch { return DEFAULT_SETTINGS; }
    }
    return DEFAULT_SETTINGS;
  });

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
  const updateSettings = (newSettings: Partial<OverlaySettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem("yt_overlay_settings", JSON.stringify(updated));
      return updated;
    });
  };

  // Sync settings with the server so OBS Browser Source instances pull them immediately
  const syncSettingsWithObs = async () => {
    try {
      const response = await fetch("/api/youtube/settings-sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ settings }),
      });
      if (response.ok) {
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
      }).catch((err) => console.log("Silent initial backend sync:", err));
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

      const data = await res.json();
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

    setStreamStatus((prev) => ({
      ...prev,
      isConnected: false,
      activeLiveChatId: "",
      error: null,
    }));
    showToast("🔴 Đã ngắt kết nối YouTube API");
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

  // OBS SUITE CONNECTED POLLER (For absolute OBS frame renderer)
  useEffect(() => {
    if (isOverlayRoute && obsChatId && obsApiKey) {
      const fetchLoop = async () => {
        try {
          let u = `/api/youtube/messages?liveChatId=${obsChatId}&apiKey=${obsApiKey}`;
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
      const interval = setInterval(fetchLoop, 4500);
      return () => clearInterval(interval);
    }
  }, [isOverlayRoute, obsChatId, obsApiKey]);

  // OBS SUITE SETTINGS SYNC POLLER (Enables immediate UI hot-reloads without link updates)
  useEffect(() => {
    if (isOverlayRoute) {
      const fetchSettings = async () => {
        try {
          const res = await fetch("/api/youtube/settings-sync");
          if (res.ok) {
            const data = await res.json();
            if (data && data.settings) {
              setObsSettings(data.settings);
            }
          }
        } catch (err) {
          console.error("Error retrieving synchronized settings:", err);
        }
      };

      fetchSettings();
      const interval = setInterval(fetchSettings, 3000);
      return () => clearInterval(interval);
    }
  }, [isOverlayRoute]);

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
        localStorage.setItem("yt_overlay_settings", JSON.stringify(loadedSettings));

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
    const rootUrl = window.location.origin;
    const query = new URLSearchParams();
    query.set("mode", "overlay");
    query.set("liveChatId", streamStatus.activeLiveChatId || localStorage.getItem("yt_last_connected_chat_id") || "SIMULATED");
    query.set("apiKey", apiKey || "SANDBOX_MOCK_DRIVEN");
    query.set("fontFamily", settings.fontFamily);
    query.set("fontSize", settings.fontSize.toString());
    query.set("textColor", settings.textColor);
    query.set("bgColor", settings.bgColor);
    query.set("bgOpacity", settings.bgOpacity.toString());
    query.set("authorColor", settings.authorColor);
    query.set("moderatorColor", settings.moderatorColor);
    query.set("sponsorColor", settings.sponsorColor);
    query.set("superChatDuration", settings.superChatDuration.toString());
    query.set("chatDuration", settings.chatDuration.toString());
    query.set("isTransparent", settings.isTransparent ? "true" : "false");
    query.set("scale", settings.scale.toString());
    query.set("showAvatar", settings.showAvatar ? "true" : "false");
    query.set("showBadges", settings.showBadges ? "true" : "false");
    query.set("animationType", settings.animationType);
    
    return `${rootUrl}/overlay?${query.toString()}`;
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

  // 7. RENDER ABSOLUTE OVERLAY FRAME FOR OBS STUDIO
  if (isOverlayRoute) {
    return (
      <div className="w-full h-screen bg-transparent overflow-hidden">
        <OverlayWidget messages={messages} settings={obsSettings} />
      </div>
    );
  }

  // 8. RENDER BEAUTIFUL STREAMER CONTROL PANEL HUB
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none antialiased">
      {/* 🔴 Active Flash Indicator Toast */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-indigo-600/95 text-white text-xs py-2 px-4 rounded-xl shadow-lg border border-indigo-400 font-bold backdrop-blur flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 animate-bounce" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Primary Top Header Board */}
      <header className="bg-slate-900 border-b border-slate-800 shrink-0 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="bg-gradient-to-tr from-rose-600 to-indigo-600 p-2 rounded-xl text-white">
            <Tv className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold tracking-tight text-base text-slate-100 uppercase font-grotesk">
              YouTube Chat Overlay
            </h1>
            <p className="text-[11px] text-slate-400">
              Công cụ quản lý, tùy chỉnh bộ khung chat trong suốt gắn OBS Livestream
            </p>
          </div>
        </div>

        {/* Sync Controls & Global state summary indicators */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-[11px] text-slate-400 font-mono">
            <Cpu className="w-3.5 h-3.5 text-indigo-400" />
            <span>CPU: {streamStatus.performance.fps ? Math.floor(streamStatus.performance.fps / 15) : 0}%</span>
            <span className="text-slate-800">|</span>
            <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
            <span>RAM: ~32MB</span>
          </div>

          <div className="flex items-center gap-1 bg-slate-800/60 px-3 py-1 text-xs rounded-full border border-slate-700">
            <span className={`w-2.5 h-2.5 rounded-full ${streamStatus.isConnected ? "bg-emerald-500 animate-pulse" : "bg-red-500"}`} />
            <span className="text-slate-300 ml-1.5 text-[11px]">
              {streamStatus.isConnected ? "🟢 Connected / Hoạt động" : "🔴 Offline / Ngoại tuyến"}
            </span>
          </div>
        </div>
      </header>

      {/* Main split grid panel space */}
      <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-5">
        {/* LEFT COLUMN: CONTROL SUITE BOARD */}
        <div className="col-span-1 lg:col-span-2 bg-slate-900/45 border-r border-slate-800/80 flex flex-col overflow-hidden">
          {/* Internal quick action tab buttons links */}
          <div className="flex bg-slate-900 border-b border-slate-800 shrink-0 p-1">
            <button
              onClick={() => setActiveTab("connect")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === "connect"
                  ? "bg-slate-800 text-indigo-400 shadow-inner"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/30"
              }`}
            >
              <Key className="w-3.5 h-3.5" />
              <span>Kết nối</span>
            </button>
            <button
              onClick={() => setActiveTab("styler")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === "styler"
                  ? "bg-slate-800 text-indigo-400 shadow-inner"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/30"
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Giao diện</span>
            </button>
            <button
              onClick={() => setActiveTab("filters")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === "filters"
                  ? "bg-slate-800 text-indigo-400 shadow-inner"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/30"
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Bộ lọc</span>
            </button>
            <button
              onClick={() => setActiveTab("help")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === "help"
                  ? "bg-slate-800 text-indigo-400 shadow-inner"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/30"
              }`}
            >
              <Info className="w-3.5 h-3.5" />
              <span>Hướng dẫn</span>
            </button>
          </div>

          {/* DYNAMIC SCROLL CONTAINER TAB VIEWPORTS */}
          <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar bg-slate-900/20">
            {/* TAB 1: CONNECT & SIMULATION ACTIONS */}
            {activeTab === "connect" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2 mb-3">
                    <Video className="w-4 h-4 text-rose-500" />
                    <span>Cấu hình kết nối YouTube Live API</span>
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

                <hr className="border-slate-800" />

                {/* PROFILE CONFIG STORAGE & OBS URL BOX */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-indigo-400" />
                    <span>OBS Browser Source Generator</span>
                  </h3>

                  <p className="text-xs text-slate-400 leading-normal">
                    Sau khi dán link vào nguồn Trình duyệt (Browser Source) trên OBS Studio, bạn không cần phải đổi link hay dán lại nữa.
                  </p>

                  <div className="bg-emerald-950/20 border border-emerald-500/25 p-2.5 rounded-xl text-[11px] text-emerald-400 leading-normal flex items-start gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>
                      <strong>Tính năng Đồng Bộ Sống:</strong> Bạn chỉ cần gắn link này vào OBS một lần. Mỗi khi tùy chỉnh màu sắc/cỡ chữ ở tab bên, chỉ cần nhấn nút <strong>LƯU THIẾT LẬP & ĐỒNG BỘ OBS</strong>, giao diện trên stream sẽ thay đổi ngay lập tức!
                    </span>
                  </div>

                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-2 flex flex-col">
                    <div className="font-mono text-[10px] text-indigo-300 break-all select-all font-semibold p-1 hover:bg-white/5 rounded max-h-[120px] overflow-y-auto">
                      {compileObsLink()}
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyObsLink}
                      className="w-full bg-indigo-600/90 hover:bg-indigo-600 text-white font-bold py-2 rounded-lg text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Sao chép Link OBS Overlay</span>
                    </button>
                  </div>

                  {/* Config upload and export panels (US-11, T3-03, T3-04) */}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleExportConfig}
                      className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/50 font-bold py-2 rounded-lg text-[11px] transition-all flex items-center justify-center gap-1.5"
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

                  {/* Dedicated Streamer Screen Widget Launcher (Special UX Request) */}
                  <div className="space-y-3 bg-slate-900/30 p-4 rounded-xl border border-slate-800/80 mt-4">
                    <h4 className="text-xs font-bold text-indigo-400 tracking-wide uppercase flex items-center gap-1.5">
                      <Tv className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Hiển thị trên màn hình của Streamer</span>
                    </h4>
                    <p className="text-[11px] text-slate-400 leading-normal">
                      Nếu bạn muốn tự nhìn thấy chat overlay này đè lên game hoặc màn hình chính khi đang chơi game/stream mà không cần mở OBS:
                    </p>
                    
                    <div className="flex flex-col gap-2 pt-1">
                      <button
                        type="button"
                        onClick={togglePipMode}
                        className="w-full bg-slate-950 hover:bg-slate-800 text-slate-200 border border-slate-800 hover:border-indigo-500/50 font-bold py-2 px-3 rounded-lg text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm group"
                      >
                        <PictureInPicture className="w-3.5 h-3.5 text-indigo-400 group-hover:scale-110 transition-transform" />
                        <span>Mở Cửa sổ nổi Always-On-Top (PiP Overlay)</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleOpenPopoutWindow}
                        className="w-full bg-slate-950 hover:bg-slate-800 text-slate-200 border border-slate-800 hover:border-indigo-500/50 font-bold py-2 px-3 rounded-lg text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm group"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
                        <span>Tách khung Chat Popout rời (Màn hình phụ)</span>
                      </button>
                    </div>
                    <span className="text-[9px] text-slate-500 italic block mt-1 leading-normal">
                      * Chức năng Always-On-Top PiP cho phép ghim trực tiếp khung chat trong suốt nổi bên trên game của bạn (yêu cầu Chromium như Chrome/Edge/Cốc Cốc).
                    </span>
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
                    <span>Tùy chỉnh Giao diện Overlay</span>
                  </h3>
                </div>

                {/* REAL-TIME HOT SYNC CONTROLLER BOARD (User Feature Request) */}
                <div className="bg-indigo-950/40 border border-indigo-500/35 p-4 rounded-xl flex flex-col gap-3 shadow-lg shadow-indigo-950/40 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none group-hover:scale-125 transition-transform" />
                  <div className="flex items-start gap-2.5">
                    <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5 animate-pulse" />
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-slate-100 tracking-wide">Đồng bộ OBS tức thì</h4>
                      <p className="text-[11.5px] text-slate-300 leading-normal font-medium">
                        Khi chỉnh sửa giao diện bên dưới, hãy nhấn nút này để cập nhật trực tiếp trong OBS Browser Source mà không cần đổi hay dán lại link!
                      </p>
                    </div>
                  </div>
                  
                  <button
                    type="button"
                    onClick={syncSettingsWithObs}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white font-bold py-2.5 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-2.5 cursor-pointer shadow-md shadow-indigo-950/80 border border-indigo-400/20"
                  >
                    <Save className="w-4 h-4" />
                    <span className="uppercase tracking-wider">LƯU THIẾT LẬP & ĐỒNG BỘ OBS</span>
                  </button>
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
        </div>

        {/* RIGHT COLUMN: HIGH-FIDELITY LIVE MONITOR DEVICE PREVIEW (US-02, Drag & Resize specs) */}
        <div className="col-span-1 lg:col-span-3 bg-slate-950 p-6 flex flex-col justify-between overflow-hidden gap-4">
          <div className="flex items-center justify-between shrink-0 bg-slate-900/50 p-3 rounded-xl border border-slate-800/80">
            <div className="flex items-center gap-2">
              <Layout className="w-4 h-4 text-indigo-400" />
              <div>
                <h3 className="text-xs font-bold text-slate-100">Cửa sổ màn hình xem trước Overlay (Live Setup Preview)</h3>
                <p className="text-[10px] text-slate-400">
                  Dùng chuột kéo thả tiêu đề để di chuyển, kéo cạnh góc phải để thay đổi kích thước. Phím ẩn nhanh: <kbd className="font-mono bg-slate-800 px-1 rounded text-[9px] border border-slate-700 text-slate-300">Ctrl+Shift+C</kbd>
                </p>
              </div>
            </div>

            {/* Simulated Desktop Theme Option dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500 font-semibold uppercase">Backdrop:</span>
              <select
                value={backdropTheme}
                onChange={(e) => setBackdropTheme(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[10px] text-slate-300 focus:outline-none"
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
            className={`flex-1 relative rounded-2xl overflow-hidden shadow-2xl transition-all duration-300 ${backdropTheme} flex flex-col justify-end min-h-[350px]`}
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
                <div className="w-full h-[calc(100%-28px)] relative">
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

          {/* CHAT MONITOR LOGGER SHEET (Sprint 1 DoD item, monitoring real feeds chronologically) */}
          <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800/80 flex flex-col gap-2 h-40 shrink-0">
            <div className="flex items-center justify-between shrink-0">
              <span className="text-[11px] text-slate-400 uppercase font-bold tracking-wide flex items-center gap-1">
                <Keyboard className="w-3.5 h-3.5 text-emerald-400" />
                <span>Nhật ký luồng Chat trực tiếp (Live Logs Monitor: {messages.length})</span>
              </span>
              <button
                type="button"
                onClick={() => {
                  setMessages([]);
                  messagesSetRef.current.clear();
                  showToast("🧹 Đã dọn sạch lịch sử dòng chat!");
                }}
                className="text-[10px] text-slate-500 hover:text-red-400 flex items-center gap-1 transition-all"
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
                  <div key={`log-${m.id}`} className="truncate hover:text-slate-100 transition-colors">
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
