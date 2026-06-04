import express from "express";
import path from "path";
import dns from "dns";
import fs from "fs";
import {
  fetchLiveChatMessages,
  fetchViewerCount,
  resolveLiveChatId,
} from "./lib/youtube";
import { getOverlaySettings, setOverlaySettings } from "./lib/settings-store";

function logToFile(message: string) {
  const timestamp = new Date().toISOString();
  const logLine = `[LOGGER][${timestamp}] ${message}\n`;
  console.log(logLine.trim());
  try {
    fs.appendFileSync(path.join(process.cwd(), "server_logs.txt"), logLine, "utf8");
  } catch {
    // Ignore log-writing errors on read-only filesystems (e.g. Vercel)
  }
}

dns.setDefaultResultOrder && dns.setDefaultResultOrder("ipv4first");

const app = express();
const PORT = 3000;

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

app.use(express.json());

app.post(["/api/youtube/live-chat-id", "/youtube/live-chat-id"], async (req, res): Promise<void> => {
  try {
    const { videoUrlOrId, apiKey } = req.body || {};
    logToFile(`POST /api/youtube/live-chat-id video="${videoUrlOrId}"`);

    if (!videoUrlOrId) {
      res.status(400).json({ error: "Thiếu thông tin Video URL hoặc ID" });
      return;
    }
    if (!apiKey) {
      res.status(400).json({ error: "Thiếu YouTube API Key" });
      return;
    }

    const result = await resolveLiveChatId(videoUrlOrId, apiKey, logToFile);
    if (result.ok === false) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    res.json(result.data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    logToFile(`live-chat-id error: ${message}`);
    res.status(500).json({ error: `Lỗi máy chủ kết nối YouTube: ${message}` });
  }
});

app.get(["/api/youtube/messages", "/youtube/messages"], async (req, res): Promise<void> => {
  try {
    const liveChatId = String(req.query.liveChatId || "");
    const apiKey = String(req.query.apiKey || "");
    const pageToken = req.query.pageToken ? String(req.query.pageToken) : undefined;

    if (!liveChatId || !apiKey) {
      res.status(400).json({ error: "Thiếu tham số liveChatId hoặc apiKey" });
      return;
    }

    const result = await fetchLiveChatMessages(liveChatId, apiKey, pageToken);
    if (result.ok === false) {
      res.status(result.status).json({ error: result.error });
      return;
    }
    res.json({
      messages: result.messages,
      nextPageToken: result.nextPageToken,
      pollingIntervalMillis: result.pollingIntervalMillis,
      offlineAt: result.offlineAt,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: `Lỗi tải tin nhắn: ${message}` });
  }
});

app.get(["/api/youtube/viewers", "/youtube/viewers"], async (req, res): Promise<void> => {
  try {
    const videoId = String(req.query.videoId || "");
    const apiKey = String(req.query.apiKey || "");
    if (!videoId || !apiKey) {
      res.status(400).json({ error: "Thiếu Video ID hoặc API Key" });
      return;
    }
    const viewerCount = await fetchViewerCount(videoId, apiKey);
    res.json({ viewerCount });
  } catch {
    res.json({ viewerCount: 0 });
  }
});

app.post(["/api/youtube/settings-sync", "/youtube/settings-sync"], (req, res) => {
  try {
    const { settings } = req.body || {};
    if (!settings) {
      res.status(400).json({ error: "Missing settings payload" });
      return;
    }
    const saved = setOverlaySettings(settings);
    res.json({ success: true, settings: saved });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    res.status(500).json({ error: `Lỗi đồng bộ cấu hình: ${message}` });
  }
});

app.get(["/api/youtube/settings-sync", "/youtube/settings-sync"], (_req, res) => {
  res.json({ settings: getOverlaySettings() });
});

app.get(["/api/desktop-overlay/status", "/desktop-overlay/status"], (_req, res) => {
  const control = (global as { electronOverlayControl?: { isOverlayOpen: () => boolean } })
    .electronOverlayControl;
  if (control) {
    res.json({ isElectron: true, isOpen: control.isOverlayOpen() });
    return;
  }
  res.json({ isElectron: false, isOpen: false });
});

app.post(["/api/desktop-overlay/toggle", "/desktop-overlay/toggle"], (req, res) => {
  const { show } = req.body || {};
  const control = (global as {
    electronOverlayControl?: { toggleOverlay: (v: boolean) => void; isOverlayOpen: () => boolean };
  }).electronOverlayControl;
  if (control) {
    control.toggleOverlay(!!show);
    res.json({ success: true, isOpen: control.isOverlayOpen() });
    return;
  }
  res.status(400).json({ error: "Ứng dụng đang không chạy trong môi trường Desktop Electron." });
});

app.post(["/api/desktop-overlay/set-locked", "/desktop-overlay/set-locked"], (req, res) => {
  const { locked } = req.body || {};
  const control = (global as { electronOverlayControl?: { setLocked: (v: boolean) => void } })
    .electronOverlayControl;
  if (control) {
    control.setLocked(!!locked);
    res.json({ success: true });
    return;
  }
  res.status(400).json({ error: "Ứng dụng đang không chạy trong môi trường Desktop Electron." });
});

app.post(
  ["/api/desktop-overlay/set-ignore-mouse", "/desktop-overlay/set-ignore-mouse"],
  (req, res) => {
    const { ignore } = req.body || {};
    const control = (global as {
      electronOverlayControl?: {
        setIgnoreMouse?: (v: boolean) => void;
        setLocked: (v: boolean) => void;
      };
    }).electronOverlayControl;
    if (control) {
      if (typeof control.setIgnoreMouse === "function") {
        control.setIgnoreMouse(!!ignore);
      } else {
        control.setLocked(!!ignore);
      }
      res.json({ success: true, ignore: !!ignore });
      return;
    }
    res.status(400).json({ error: "Ứng dụng đang không chạy trong môi trường Desktop Electron." });
  }
);

app.use((err: { status?: number; message?: string }, _req: express.Request, res: express.Response) => {
  console.error("Express error:", err);
  res.status(err.status || 500).json({
    error: `Lỗi máy chủ kết nối YouTube hoặc cấu hình: ${err.message || err}`,
  });
});

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

    if (typeof __dirname !== "undefined") {
      if (fs.existsSync(path.join(__dirname, "index.html"))) {
        distPath = __dirname;
      } else if (fs.existsSync(path.join(__dirname, "dist", "index.html"))) {
        distPath = path.join(__dirname, "dist");
      }
    }

    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
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
