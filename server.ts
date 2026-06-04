import express from "express";
import path from "path";
import dns from "dns";
import fs from "fs";

// Ensure DNS resolution works correctly in sandboxed environments
dns.setDefaultResultOrder && dns.setDefaultResultOrder("ipv4first");

const app = express();
const PORT = 3000;

app.use(express.json());

// Helper to clean up HTML strings to prevent XSS (Security Review SC-02)
function sanitizeHtml(text: string): string {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Extract Video ID from popular Youtube URL formats
function extractVideoId(input: string): string {
  const trimmed = input.trim();
  // If it's already a 11-char ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }
  // Standard url: https://www.youtube.com/watch?v=VIDEO_ID
  const watchMatch = trimmed.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (watchMatch) return watchMatch[1];
  // Live page url: https://www.youtube.com/live/VIDEO_ID
  const liveMatch = trimmed.match(/\/live\/([a-zA-Z0-9_-]{11})/);
  if (liveMatch) return liveMatch[1];
  // Short URL: https://youtu.be/VIDEO_ID
  const shortMatch = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (shortMatch) return shortMatch[1];
  // Embed: https://www.youtube.com/embed/VIDEO_ID
  const embedMatch = trimmed.match(/\/embed\/([a-zA-Z0-9_-]{11})/);
  if (embedMatch) return embedMatch[1];

  return trimmed;
}

// API Route 1: Get Active Live Chat ID & Broadcast Info from Video ID
app.post("/api/youtube/live-chat-id", async (req, res): Promise<any> => {
  const { videoUrlOrId, apiKey } = req.body;

  if (!videoUrlOrId) {
    return res.status(400).json({ error: "Thiếu thông tin Video URL hoặc ID" });
  }

  if (!apiKey) {
    return res.status(400).json({ error: "Thiếu YouTube API Key" });
  }

  const videoId = extractVideoId(videoUrlOrId);

  try {
    const url = `https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails,snippet&id=${videoId}&key=${apiKey}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const message = errorData?.error?.message || "Lỗi API từ Google";
      const status = response.status;
      return res.status(status).json({ error: `Google API Error (${status}): ${message}` });
    }

    const data = await response.json();
    if (!data.items || data.items.length === 0) {
      return res.status(404).json({ error: "Không tìm thấy video. Vui lòng kiểm tra lại URL hoặc ID." });
    }

    const videoItem = data.items[0];
    const liveStreamingDetails = videoItem.liveStreamingDetails;
    const snippet = videoItem.snippet;

    if (!liveStreamingDetails) {
      return res.status(400).json({ 
        error: "Đây không phải là video Livestream hoặc video công chiếu trực tiếp." 
      });
    }

    const activeLiveChatId = liveStreamingDetails.activeLiveChatId;
    if (!activeLiveChatId) {
      return res.status(400).json({ 
        error: "Livestream này đã kết thúc hoặc không có khung chat trực tiếp nào đang hoạt động." 
      });
    }

    res.json({
      activeLiveChatId,
      videoId,
      title: snippet.title,
      channelTitle: snippet.channelTitle,
      viewerCount: liveStreamingDetails.concurrentViewers ? parseInt(liveStreamingDetails.concurrentViewers, 10) : 0,
    });
  } catch (error: any) {
    console.error("Error fetching live-chat-id:", error);
    res.status(500).json({ error: `Lỗi máy chủ kết nối YouTube: ${error.message}` });
  }
});

// API Route 2: Fetch Live Chat Messages and Stream Details
app.get("/api/youtube/messages", async (req, res): Promise<any> => {
  const { liveChatId, apiKey, pageToken } = req.query;

  if (!liveChatId || !apiKey) {
    return res.status(400).json({ error: "Thiếu tham số liveChatId hoặc apiKey" });
  }

  try {
    let url = `https://www.googleapis.com/youtube/v3/liveChat/messages?liveChatId=${liveChatId}&part=snippet,authorDetails&key=${apiKey}&maxResults=100`;
    if (pageToken) {
      url += `&pageToken=${pageToken}`;
    }

    const response = await fetch(url);
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const message = errorData?.error?.message || "Lỗi khi lấy tin nhắn chat";
      return res.status(response.status).json({ error: `YouTube API Error: ${message}` });
    }

    const data = await response.json();
    
    // Parse Google response items into local clean ChatMessage items
    const rawItems = data.items || [];
    const messages = rawItems.map((item: any) => {
      const snippet = item.snippet || {};
      const author = item.authorDetails || {};
      
      const isSuperChat = snippet.type === "superChatEvent";
      let superChatDetails = null;
      let tier = 1;
      let superChatColor = "#1e88e5"; // default blue

      if (isSuperChat && snippet.superChatDetails) {
        const amountMicros = snippet.superChatDetails.amountMicros || 0;
        const amountDisplayString = snippet.superChatDetails.amountDisplayString || "";
        const currency = snippet.superChatDetails.userComment || "USD";
        
        // Define tiers based on micros conversion ($1 = 1,000,000 micros roughly)
        const amountVal = amountMicros / 1000000;
        if (amountVal >= 100) {
          tier = 6;
          superChatColor = "#e91e63"; // Red
        } else if (amountVal >= 50) {
          tier = 5;
          superChatColor = "#e65100"; // Orange
        } else if (amountVal >= 20) {
          tier = 4;
          superChatColor = "#fdd835"; // Yellow (text will need dark contrast)
        } else if (amountVal >= 10) {
          tier = 3;
          superChatColor = "#00e676"; // Green-blue
        } else if (amountVal >= 5) {
          tier = 2;
          superChatColor = "#00b0ff"; // Medium blue
        } else {
          tier = 1;
          superChatColor = "#1565c0"; // Dark blue
        }

        superChatDetails = {
          amountMicros,
          amountDisplayString,
          userComment: snippet.superChatDetails.userComment,
        };
      }

      return {
        id: item.id || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        authorName: sanitizeHtml(author.displayName || "Viewer"),
        authorPhotoUrl: author.profileImageUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=64&h=64&q=80",
        messageText: sanitizeHtml(snippet.textMessageDetails?.messageText || snippet.displayMessage || ""),
        isModerator: !!author.isChatModerator,
        isOwner: !!author.isChatOwner,
        isSponsor: !!author.isChatSponsor,
        isVerified: !!author.isVerified,
        isSuperChat,
        superChatColor,
        superChatAmountText: isSuperChat ? snippet.superChatDetails?.amountDisplayString || "" : "",
        tier,
        timestamp: snippet.publishedAt ? new Date(snippet.publishedAt).getTime() : Date.now(),
      };
    });

    res.json({
      messages,
      nextPageToken: data.nextPageToken || null,
      pollingIntervalMillis: data.pollingIntervalMillis || 4000,
      offlineAt: data.offlineAt || null,
    });
  } catch (error: any) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ error: `Lỗi tải tin nhắn: ${error.message}` });
  }
});

// API Route 3: Fetch view count / info in parallel
app.get("/api/youtube/viewers", async (req, res): Promise<any> => {
  const { videoId, apiKey } = req.query;

  if (!videoId || !apiKey) {
    return res.status(400).json({ error: "Thiếu Video ID hoặc API Key" });
  }

  try {
    const url = `https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails&id=${videoId}&key=${apiKey}`;
    const response = await fetch(url);
    if (!response.ok) {
      return res.json({ viewerCount: 0 });
    }
    const data = await response.json();
    if (data.items && data.items.length > 0) {
      const details = data.items[0].liveStreamingDetails;
      const count = details && details.concurrentViewers ? parseInt(details.concurrentViewers, 10) : 0;
      return res.json({ viewerCount: count });
    }
    res.json({ viewerCount: 0 });
  } catch {
    res.json({ viewerCount: 0 });
  }
});

// Server-side settings cache to allow OBS and popouts to stay automatically in sync with the streamer control panel
let cachedOverlaySettings: any = null;

app.post("/api/youtube/settings-sync", (req, res) => {
  const { settings } = req.body;
  if (settings) {
    cachedOverlaySettings = settings;
    return res.json({ success: true, settings: cachedOverlaySettings });
  }
  res.status(400).json({ error: "Missing settings payload" });
});

app.get("/api/youtube/settings-sync", (req, res) => {
  res.json({ settings: cachedOverlaySettings });
});

// APIs bridging requests to Electron Main Process for Discord-style always on top overlay
app.get("/api/desktop-overlay/status", (req, res) => {
  const control = (global as any).electronOverlayControl;
  if (control) {
    return res.json({
      isElectron: true,
      isOpen: control.isOverlayOpen(),
    });
  }
  res.json({ isElectron: false, isOpen: false });
});

app.post("/api/desktop-overlay/toggle", (req, res) => {
  const { show } = req.body;
  const control = (global as any).electronOverlayControl;
  if (control) {
    control.toggleOverlay(!!show);
    return res.json({ success: true, isOpen: control.isOverlayOpen() });
  }
  res.status(400).json({ error: "Ứng dụng đang không chạy trong môi trường Desktop Electron." });
});

app.post("/api/desktop-overlay/set-locked", (req, res) => {
  const { locked } = req.body;
  const control = (global as any).electronOverlayControl;
  if (control) {
    control.setLocked(!!locked);
    return res.json({ success: true });
  }
  res.status(400).json({ error: "Ứng dụng đang không chạy trong môi trường Desktop Electron." });
});

app.post("/api/desktop-overlay/set-ignore-mouse", (req, res) => {
  const { ignore } = req.body;
  const control = (global as any).electronOverlayControl;
  if (control) {
    if (typeof control.setIgnoreMouse === "function") {
      control.setIgnoreMouse(!!ignore);
    } else {
      control.setLocked(!!ignore);
    }
    return res.json({ success: true, ignore: !!ignore });
  }
  res.status(400).json({ error: "Ứng dụng đang không chạy trong môi trường Desktop Electron." });
});

// Vite & Static file handler initialization
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    let distPath = path.join(process.cwd(), "dist");
    
    // Fall back to locations relative to __dirname for Electron and standalone builds
    if (typeof __dirname !== "undefined") {
      if (fs.existsSync(path.join(__dirname, "index.html"))) {
        distPath = __dirname;
      } else if (fs.existsSync(path.join(__dirname, "dist", "index.html"))) {
        distPath = path.join(__dirname, "dist");
      }
    }

    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server is running at http://localhost:${PORT}`);
    });
  }
}

if (!process.env.VERCEL) {
  startServer();
}

export default app;
