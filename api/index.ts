import express from "express";
import path from "path";
import dns from "dns";
import fs from "fs";

// Helper to log errors & transactions to console for runtime inspection
function logToFile(message: string) {
  const timestamp = new Date().toISOString();
  const logLine = `[LOGGER][${timestamp}] ${message}\n`;
  console.log(logLine.trim());
  try {
    fs.appendFileSync(path.join(process.cwd(), "server_logs.txt"), logLine, "utf8");
  } catch (err) {
    // Ignore log-writing errors to prevent crash loop
  }
}

// Ensure DNS resolution works correctly in sandboxed environments
dns.setDefaultResultOrder && dns.setDefaultResultOrder("ipv4first");

const app = express();

// Enable CORS for external overlay display integrations (e.g., OBS Browser Source, desktop apps)
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, PATCH, DELETE");
  res.setHeader("Access-Control-Allow-Headers", "X-Requested-With,Content-Type,Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// Guard body-parser for serverless environments (like Vercel) where req.body might already be pre-parsed.
// If req.body is already populated (even if empty object or array), we skip parsing to prevent the body-parser from hanging on a consumed stream.
app.use((req, res, next) => {
  if (req.body !== undefined) {
    (req as any)._body = true;
  }
  next();
});

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
  if (!input) return "";
  // Strip any common copy-paste invisible characters, zero-width spaces, and trim whitespace
  let trimmed = input.replace(/[\u200B-\u200C\u200D\uFEFF\s]/g, "").trim();

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

  // Fallback match to extract any consecutive 11-character sequence of letters/digits/hyphens/underscores which might be a video ID
  const looseMatch = trimmed.match(/([a-zA-Z0-9_-]{11})/);
  if (looseMatch) return looseMatch[0];

  return trimmed;
}

// API Route 1: Get Active Live Chat ID & Broadcast Info from Video ID
app.post(["/api/youtube/live-chat-id", "/youtube/live-chat-id", "/live-chat-id", "*/live-chat-id"], async (req, res): Promise<any> => {
  try {
    const { videoUrlOrId, apiKey } = req.body || {};

    logToFile(`Nhận yêu cầu kết cấu /api/youtube/live-chat-id. Video input: "${videoUrlOrId}", API Key ẩn: "${apiKey && typeof apiKey === 'string' ? apiKey.substring(0, 6) + '...' : 'Không có'}"`);

    if (!videoUrlOrId) {
      logToFile("Lỗi: Thiếu thông tin Video URL hoặc ID");
      return res.status(400).json({ error: "Thiếu thông tin Video URL hoặc ID" });
    }

    if (!apiKey) {
      logToFile("Lỗi: Thiếu YouTube API Key");
      return res.status(400).json({ error: "Thiếu YouTube API Key" });
    }

    const videoId = extractVideoId(videoUrlOrId);
    logToFile(`Trích xuất thành công Video ID: "${videoId}"`);

    const url = `https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails,snippet&id=${videoId}&key=${apiKey}`;
    logToFile(`Bắt đầu fetch Google API: ${url.replace(apiKey, "HIDDEN")}`);
    const response = await fetch(url);
    logToFile(`Google API trả về mã phản hồi: ${response.status} (${response.statusText})`);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const message = errorData?.error?.message || "Lỗi API từ Google";
      const status = response.status;
      logToFile(`Lỗi kết nối hoặc API phản hồi không thành công: ${JSON.stringify(errorData)}`);
      return res.status(status).json({ error: `Google API Error (${status}): ${message}` });
    }

    const data = await response.json();
    logToFile(`Dữ liệu Google API lấy về thành công: items count = ${data.items ? data.items.length : 0}`);
    if (!data.items || data.items.length === 0) {
      logToFile(`Lỗi: Không tìm thấy video trên YouTube với ID "${videoId}"`);
      return res.status(404).json({ error: "Không tìm thấy video. Vui lòng kiểm tra lại URL hoặc ID." });
    }

    const videoItem = data.items[0];
    const liveStreamingDetails = videoItem.liveStreamingDetails;
    const snippet = videoItem.snippet;

    if (!liveStreamingDetails) {
      logToFile(`Lỗi: Video "${videoId}" không chứa liveStreamingDetails. Không phải livestream/trực tiếp.`);
      return res.status(400).json({ 
        error: "Đây không phải là video Livestream hoặc video công chiếu trực tiếp." 
      });
    }

    const activeLiveChatId = liveStreamingDetails.activeLiveChatId;
    logToFile(`Thông tin livestream: activeLiveChatId="${activeLiveChatId}"`);
    if (!activeLiveChatId) {
      logToFile(`Lỗi: Livestream "${videoId}" không có activeLiveChatId. Có thể livestream đã kết thúc.`);
      return res.status(400).json({ 
        error: "Livestream này đã kết thúc hoặc không có khung chat trực tiếp nào đang hoạt động." 
      });
    }

    logToFile(`Thực hiện trả về dữ liệu kết nối thành công: activeLiveChatId="${activeLiveChatId}", title="${snippet.title}"`);
    res.json({
      activeLiveChatId,
      videoId,
      title: snippet.title,
      channelTitle: snippet.channelTitle,
      viewerCount: liveStreamingDetails.concurrentViewers ? parseInt(liveStreamingDetails.concurrentViewers, 10) : 0,
    });
  } catch (error: any) {
    logToFile(`Gặp exception cực kỳ nghiêm trọng trong live-chat-id try-catch: ${error?.message || error}\nStack trace: ${error?.stack}`);
    res.status(500).json({ error: `Lỗi máy chủ kết nối YouTube: ${error.message}` });
  }
});

// API Route 2: Fetch Live Chat Messages and Stream Details
app.get(["/api/youtube/messages", "/youtube/messages", "/messages", "*/messages"], async (req, res): Promise<any> => {
  try {
    const { liveChatId, apiKey, pageToken } = req.query || {};

    if (!liveChatId || !apiKey) {
      return res.status(400).json({ error: "Thiếu tham số liveChatId hoặc apiKey" });
    }
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
app.get(["/api/youtube/viewers", "/youtube/viewers", "/viewers", "*/viewers"], async (req, res): Promise<any> => {
  try {
    const { videoId, apiKey } = req.query || {};

    if (!videoId || !apiKey) {
      return res.status(400).json({ error: "Thiếu Video ID hoặc API Key" });
    }
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

app.post(["/api/youtube/settings-sync", "/youtube/settings-sync", "/settings-sync", "*/settings-sync"], (req, res) => {
  try {
    const { settings } = req.body || {};
    if (settings) {
      cachedOverlaySettings = settings;
      return res.json({ success: true, settings: cachedOverlaySettings });
    }
    res.status(400).json({ error: "Missing settings payload" });
  } catch (error: any) {
    res.status(500).json({ error: `Lỗi đồng bộ cấu hình: ${error.message}` });
  }
});

app.get(["/api/youtube/settings-sync", "/youtube/settings-sync", "/settings-sync", "*/settings-sync"], (req, res) => {
  try {
    res.json({ settings: cachedOverlaySettings });
  } catch (error: any) {
    res.status(500).json({ error: `Lỗi đồng bộ cấu hình: ${error.message}` });
  }
});

// APIs bridging requests to Electron Main Process for Discord-style always on top overlay
app.get(["/api/desktop-overlay/status", "/desktop-overlay/status", "/status", "*/status"], (req, res) => {
  const control = (global as any).electronOverlayControl;
  if (control) {
    return res.json({
      isElectron: true,
      isOpen: control.isOverlayOpen(),
    });
  }
  res.json({ isElectron: false, isOpen: false });
});

app.post(["/api/desktop-overlay/toggle", "/desktop-overlay/toggle", "/toggle", "*/toggle"], (req, res) => {
  const { show } = req.body || {};
  const control = (global as any).electronOverlayControl;
  if (control) {
    control.toggleOverlay(!!show);
    return res.json({ success: true, isOpen: control.isOverlayOpen() });
  }
  res.status(400).json({ error: "Ứng dụng đang không chạy trong môi trường Desktop Electron." });
});

app.post(["/api/desktop-overlay/set-locked", "/desktop-overlay/set-locked", "/set-locked", "*/set-locked"], (req, res) => {
  const { locked } = req.body || {};
  const control = (global as any).electronOverlayControl;
  if (control) {
    control.setLocked(!!locked);
    return res.json({ success: true });
  }
  res.status(400).json({ error: "Ứng dụng đang không chạy trong môi trường Desktop Electron." });
});

app.post(["/api/desktop-overlay/set-ignore-mouse", "/desktop-overlay/set-ignore-mouse", "/set-ignore-mouse", "*/set-ignore-mouse"], (req, res) => {
  const { ignore } = req.body || {};
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

// Express global error handle middleware (Ensures error formatting always outputs JSON, preventing HTML 500 errors)
app.use((err: any, req: any, res: any, next: any) => {
  console.error("Express App Critical Error Handling:", err);
  res.status(err.status || 500).json({
    error: `Lỗi máy chủ kết nối YouTube hoặc cấu hình: ${err.message || err}`
  });
});

export default app;
