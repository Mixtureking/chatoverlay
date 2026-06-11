// src/server/createApiApp.ts
import express from "express";
import dns from "dns";

// src/server/chatInteractivity.ts
var DEFAULT_VOTE_STATE = {
  A: 0,
  B: 0,
  voters: {},
  updatedAt: Date.now(),
  keywordA: "A",
  keywordB: "B",
  voteStartedAt: Date.now()
};
var voteState = {
  ...DEFAULT_VOTE_STATE,
  voters: {}
};
var processedMessageIds = /* @__PURE__ */ new Set();
var processedMessageIdQueue = [];
var MAX_PROCESSED_IDS = 5e3;
function parseChatCommand(messageText) {
  if (typeof messageText !== "string") return null;
  const unescaped = messageText.replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
  const trimmed = unescaped.trim().toUpperCase();
  const kA = voteState.keywordA;
  const kB = voteState.keywordB;
  if (trimmed.startsWith("!")) {
    if (/^!TUNGHOA$/i.test(trimmed)) return { type: "tunghoa" };
    if (/^!PHAOHOA$/i.test(trimmed)) return { type: "phaohoa" };
    if (/^!TIM$/i.test(trimmed)) return { type: "tim" };
    if (/^!VOTAY$/i.test(trimmed) || /^!VỖTAY$/i.test(trimmed)) return { type: "votay" };
    const rollMatch = trimmed.match(/^!ROLL\s+(\d{1,4})$/i);
    if (rollMatch) {
      const sides = Number.parseInt(rollMatch[1], 10);
      if (Number.isFinite(sides) && sides >= 2) {
        return { type: "roll", sides };
      }
      return null;
    }
    if (/^!PICK$/i.test(trimmed)) {
      return { type: "pick" };
    }
    const voteMatch = trimmed.match(/^!VOTE\s+"?([^"]+)"?$/i);
    if (voteMatch) {
      const val = voteMatch[1].trim().toUpperCase();
      if (val === kA) return { type: "vote", option: "A" };
      if (val === kB) return { type: "vote", option: "B" };
    }
    const commandOnly = trimmed.substring(1);
    if (commandOnly === kA) return { type: "vote", option: "A" };
    if (commandOnly === kB) return { type: "vote", option: "B" };
  } else {
    if (trimmed === kA) return { type: "vote", option: "A" };
    if (trimmed === kB) return { type: "vote", option: "B" };
  }
  return null;
}
function getVoteState() {
  return {
    A: voteState.A,
    B: voteState.B,
    total: voteState.A + voteState.B,
    voters: { ...voteState.voters },
    updatedAt: voteState.updatedAt,
    keywordA: voteState.keywordA,
    keywordB: voteState.keywordB,
    voteStartedAt: voteState.voteStartedAt
  };
}
function resetVoteState() {
  voteState.A = 0;
  voteState.B = 0;
  voteState.voters = {};
  voteState.voteStartedAt = Date.now();
  voteState.updatedAt = Date.now();
  processedMessageIds.clear();
  processedMessageIdQueue.length = 0;
  return getVoteState();
}
function setVoteKeywords(keywordA, keywordB) {
  voteState.keywordA = (keywordA || "A").trim().toUpperCase();
  voteState.keywordB = (keywordB || "B").trim().toUpperCase();
  voteState.updatedAt = Date.now();
  return getVoteState();
}
function castVote(userId, option, messageId, timestamp) {
  if (!userId || typeof userId !== "string") {
    return { accepted: false, reason: "missing_user", state: getVoteState() };
  }
  if (messageId) {
    if (processedMessageIds.has(messageId)) {
      return { accepted: false, reason: "duplicate_message", state: getVoteState() };
    }
    processedMessageIds.add(messageId);
    processedMessageIdQueue.push(messageId);
    if (processedMessageIdQueue.length > MAX_PROCESSED_IDS) {
      const oldId = processedMessageIdQueue.shift();
      if (oldId) processedMessageIds.delete(oldId);
    }
  }
  if (timestamp && timestamp < voteState.voteStartedAt) {
    return { accepted: false, reason: "old_message", state: getVoteState() };
  }
  const normalizedUserId = userId.trim();
  voteState.voters[normalizedUserId] = option;
  const counts = Object.values(voteState.voters).reduce(
    (acc, val) => {
      acc[val]++;
      return acc;
    },
    { A: 0, B: 0 }
  );
  voteState.A = counts.A;
  voteState.B = counts.B;
  voteState.updatedAt = Date.now();
  return {
    accepted: true,
    reason: "new_vote",
    state: getVoteState()
  };
}

// src/server/createApiApp.ts
dns.setDefaultResultOrder && dns.setDefaultResultOrder("ipv4first");
function log(message) {
  const timestamp = (/* @__PURE__ */ new Date()).toISOString();
  console.log(`[LOGGER][${timestamp}] ${message}`);
}
function sanitizeHtml(text) {
  if (!text) return "";
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
function extractVideoId(input) {
  if (!input) return "";
  let trimmed = input.replace(/[\u200B-\u200C\u200D\uFEFF\s]/g, "").trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  const watchMatch = trimmed.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (watchMatch) return watchMatch[1];
  const liveMatch = trimmed.match(/\/live\/([a-zA-Z0-9_-]{11})/);
  if (liveMatch) return liveMatch[1];
  const shortMatch = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (shortMatch) return shortMatch[1];
  const embedMatch = trimmed.match(/\/embed\/([a-zA-Z0-9_-]{11})/);
  if (embedMatch) return embedMatch[1];
  const looseMatch = trimmed.match(/([a-zA-Z0-9_-]{11})/);
  if (looseMatch) return looseMatch[0];
  return trimmed;
}
function createApiApp() {
  const app2 = express();
  app2.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, PATCH, DELETE");
    res.setHeader("Access-Control-Allow-Headers", "X-Requested-With,Content-Type,Authorization");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });
  app2.use((req, res, next) => {
    if (req.body !== void 0) {
      req._body = true;
    }
    next();
  });
  app2.use(express.json({ limit: "15mb" }));
  app2.use(express.urlencoded({ limit: "15mb", extended: true }));
  app2.post(["/api/youtube/live-chat-id", "/youtube/live-chat-id", "/live-chat-id", "*/live-chat-id"], async (req, res) => {
    try {
      const { videoUrlOrId, apiKey } = req.body || {};
      log(`Nh\u1EADn y\xEAu c\u1EA7u k\u1EBFt c\u1EA5u /api/youtube/live-chat-id. Video input: "${videoUrlOrId}", API Key \u1EA9n: "${apiKey && typeof apiKey === "string" ? apiKey.substring(0, 6) + "..." : "Kh\xF4ng c\xF3"}"`);
      if (!videoUrlOrId) {
        log("L\u1ED7i: Thi\u1EBFu th\xF4ng tin Video URL ho\u1EB7c ID");
        return res.status(400).json({ error: "Thi\u1EBFu th\xF4ng tin Video URL ho\u1EB7c ID" });
      }
      if (!apiKey) {
        log("L\u1ED7i: Thi\u1EBFu YouTube API Key");
        return res.status(400).json({ error: "Thi\u1EBFu YouTube API Key" });
      }
      const videoId = extractVideoId(videoUrlOrId);
      log(`Tr\xEDch xu\u1EA5t th\xE0nh c\xF4ng Video ID: "${videoId}"`);
      const url = `https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails,snippet&id=${videoId}&key=${apiKey}`;
      log(`B\u1EAFt \u0111\u1EA7u fetch Google API: ${url.replace(apiKey, "HIDDEN")}`);
      const response = await fetch(url);
      log(`Google API tr\u1EA3 v\u1EC1 m\xE3 ph\u1EA3n h\u1ED3i: ${response.status} (${response.statusText})`);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const message = errorData?.error?.message || "L\u1ED7i API t\u1EEB Google";
        const status = response.status;
        log(`L\u1ED7i k\u1EBFt n\u1ED1i ho\u1EB7c API ph\u1EA3n h\u1ED3i kh\xF4ng th\xE0nh c\xF4ng: ${JSON.stringify(errorData)}`);
        return res.status(status).json({ error: `Google API Error (${status}): ${message}` });
      }
      const data = await response.json();
      log(`D\u1EEF li\u1EC7u Google API l\u1EA5y v\u1EC1 th\xE0nh c\xF4ng: items count = ${data.items ? data.items.length : 0}`);
      if (!data.items || data.items.length === 0) {
        log(`L\u1ED7i: Kh\xF4ng t\xECm th\u1EA5y video tr\xEAn YouTube v\u1EDBi ID "${videoId}"`);
        return res.status(404).json({ error: "Kh\xF4ng t\xECm th\u1EA5y video. Vui l\xF2ng ki\u1EC3m tra l\u1EA1i URL ho\u1EB7c ID." });
      }
      const videoItem = data.items[0];
      const liveStreamingDetails = videoItem.liveStreamingDetails;
      const snippet = videoItem.snippet;
      if (!liveStreamingDetails) {
        log(`L\u1ED7i: Video "${videoId}" kh\xF4ng ch\u1EE9a liveStreamingDetails. Kh\xF4ng ph\u1EA3i livestream/tr\u1EF1c ti\u1EBFp.`);
        return res.status(400).json({
          error: "\u0110\xE2y kh\xF4ng ph\u1EA3i l\xE0 video Livestream ho\u1EB7c video c\xF4ng chi\u1EBFu tr\u1EF1c ti\u1EBFp."
        });
      }
      const activeLiveChatId = liveStreamingDetails.activeLiveChatId;
      log(`Th\xF4ng tin livestream: activeLiveChatId="${activeLiveChatId}"`);
      if (!activeLiveChatId) {
        log(`L\u1ED7i: Livestream "${videoId}" kh\xF4ng c\xF3 activeLiveChatId. C\xF3 th\u1EC3 livestream \u0111\xE3 k\u1EBFt th\xFAc.`);
        return res.status(400).json({
          error: "Livestream n\xE0y \u0111\xE3 k\u1EBFt th\xFAc ho\u1EB7c kh\xF4ng c\xF3 khung chat tr\u1EF1c ti\u1EBFp n\xE0o \u0111ang ho\u1EA1t \u0111\u1ED9ng."
        });
      }
      log(`Th\u1EF1c hi\u1EC7n tr\u1EA3 v\u1EC1 d\u1EEF li\u1EC7u k\u1EBFt n\u1ED1i th\xE0nh c\xF4ng: activeLiveChatId="${activeLiveChatId}", title="${snippet.title}"`);
      res.json({
        activeLiveChatId,
        videoId,
        title: snippet.title,
        channelTitle: snippet.channelTitle,
        viewerCount: liveStreamingDetails.concurrentViewers ? parseInt(liveStreamingDetails.concurrentViewers, 10) : 0
      });
    } catch (error) {
      log(`G\u1EB7p exception c\u1EF1c k\u1EF3 nghi\xEAm tr\u1ECDng trong live-chat-id try-catch: ${error?.message || error}
Stack trace: ${error?.stack}`);
      res.status(500).json({ error: `L\u1ED7i m\xE1y ch\u1EE7 k\u1EBFt n\u1ED1i YouTube: ${error.message}` });
    }
  });
  app2.post(["/api/interactivity/chat-command", "/interactivity/chat-command"], (req, res) => {
    try {
      const { messageText } = req.body || {};
      const command = parseChatCommand(messageText || "");
      return res.json({ command });
    } catch (error) {
      return res.status(500).json({ error: `Failed to parse chat command: ${error?.message || error}` });
    }
  });
  app2.get(["/api/interactivity/votes", "/interactivity/votes"], (req, res) => {
    res.json({ state: getVoteState() });
  });
  app2.post(["/api/interactivity/votes", "/interactivity/votes"], (req, res) => {
    try {
      const { userId, option, messageId, timestamp } = req.body || {};
      if (option !== "A" && option !== "B") {
        return res.status(400).json({ error: "option must be A or B" });
      }
      const result = castVote(String(userId || ""), option, messageId, timestamp);
      return res.status(result.accepted ? 200 : 409).json(result);
    } catch (error) {
      return res.status(500).json({ error: `Vote update failed: ${error?.message || error}` });
    }
  });
  app2.delete(["/api/interactivity/votes", "/interactivity/votes"], (_req, res) => {
    res.json({ state: resetVoteState() });
  });
  app2.post(["/api/interactivity/vote-keywords", "/interactivity/vote-keywords"], (req, res) => {
    try {
      const { keywordA, keywordB } = req.body || {};
      const result = setVoteKeywords(keywordA, keywordB);
      return res.json({ success: true, state: result });
    } catch (error) {
      return res.status(500).json({ error: `Failed to set vote keywords: ${error?.message || error}` });
    }
  });
  app2.get(["/api/youtube/messages", "/youtube/messages", "/messages", "*/messages"], async (req, res) => {
    try {
      const { liveChatId, apiKey, pageToken } = req.query || {};
      if (!liveChatId || !apiKey) {
        return res.status(400).json({ error: "Thi\u1EBFu tham s\u1ED1 liveChatId ho\u1EB7c apiKey" });
      }
      let url = `https://www.googleapis.com/youtube/v3/liveChat/messages?liveChatId=${liveChatId}&part=snippet,authorDetails&key=${apiKey}&maxResults=100`;
      if (pageToken) {
        url += `&pageToken=${pageToken}`;
      }
      const response = await fetch(url);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const message = errorData?.error?.message || "L\u1ED7i khi l\u1EA5y tin nh\u1EAFn chat";
        return res.status(response.status).json({ error: `YouTube API Error: ${message}` });
      }
      const data = await response.json();
      const rawItems = data.items || [];
      const messages = rawItems.map((item) => {
        const snippet = item.snippet || {};
        const author = item.authorDetails || {};
        const isSuperChat = snippet.type === "superChatEvent";
        let superChatDetails = null;
        let tier = 1;
        let superChatColor = "#1e88e5";
        if (isSuperChat && snippet.superChatDetails) {
          const amountMicros = snippet.superChatDetails.amountMicros || 0;
          const amountDisplayString = snippet.superChatDetails.amountDisplayString || "";
          const currency = snippet.superChatDetails.userComment || "USD";
          const amountVal = amountMicros / 1e6;
          if (amountVal >= 100) {
            tier = 6;
            superChatColor = "#e91e63";
          } else if (amountVal >= 50) {
            tier = 5;
            superChatColor = "#e65100";
          } else if (amountVal >= 20) {
            tier = 4;
            superChatColor = "#fdd835";
          } else if (amountVal >= 10) {
            tier = 3;
            superChatColor = "#00e676";
          } else if (amountVal >= 5) {
            tier = 2;
            superChatColor = "#00b0ff";
          } else {
            tier = 1;
            superChatColor = "#1565c0";
          }
          superChatDetails = {
            amountMicros,
            amountDisplayString,
            userComment: snippet.superChatDetails.userComment
          };
        }
        const cleanMessageText = sanitizeHtml(snippet.textMessageDetails?.messageText || snippet.displayMessage || "");
        const channelId = author.channelId || author.displayName || "anonymous";
        const messageId = item.id || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const timestamp = snippet.publishedAt ? new Date(snippet.publishedAt).getTime() : Date.now();
        const command = parseChatCommand(cleanMessageText);
        if (command) {
          if (command.type === "vote") {
            castVote(channelId, command.option, messageId, timestamp);
          } else if (["tunghoa", "phaohoa", "tim", "votay"].includes(command.type)) {
            if (cachedSprint7State) {
              cachedSprint7State.flowerTrigger = Date.now();
              cachedSprint7State.updatedAt = Date.now();
              const typeMap = {
                tunghoa: "TUNG_HOA",
                phaohoa: "PHAO_HOA",
                tim: "TIM",
                votay: "VO_TAY"
              };
              cachedSprint7State.flowerType = typeMap[command.type];
            }
          }
        }
        return {
          id: messageId,
          authorName: sanitizeHtml(author.displayName || "Viewer"),
          authorPhotoUrl: author.profileImageUrl || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=64&h=64&q=80",
          messageText: cleanMessageText,
          isModerator: !!author.isChatModerator,
          isOwner: !!author.isChatOwner,
          isSponsor: !!author.isChatSponsor,
          isVerified: !!author.isVerified,
          isSuperChat,
          superChatColor,
          superChatAmountText: isSuperChat ? snippet.superChatDetails?.amountDisplayString || "" : "",
          tier,
          timestamp
        };
      });
      res.json({
        messages,
        nextPageToken: data.nextPageToken || null,
        pollingIntervalMillis: data.pollingIntervalMillis || 4e3,
        offlineAt: data.offlineAt || null
      });
    } catch (error) {
      console.error("Error fetching messages:", error);
      res.status(500).json({ error: `L\u1ED7i t\u1EA3i tin nh\u1EAFn: ${error.message}` });
    }
  });
  app2.get(["/api/youtube/viewers", "/youtube/viewers", "/viewers", "*/viewers"], async (req, res) => {
    try {
      const { videoId, apiKey } = req.query || {};
      if (!videoId || !apiKey) {
        return res.status(400).json({ error: "Thi\u1EBFu Video ID ho\u1EB7c API Key" });
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
  let cachedOverlaySettings = null;
  app2.post(["/api/youtube/settings-sync", "/youtube/settings-sync", "/settings-sync", "*/settings-sync"], (req, res) => {
    try {
      const { settings } = req.body || {};
      if (settings) {
        cachedOverlaySettings = settings;
        return res.json({ success: true, settings: cachedOverlaySettings });
      }
      res.status(400).json({ error: "Missing settings payload" });
    } catch (error) {
      res.status(500).json({ error: `L\u1ED7i \u0111\u1ED3ng b\u1ED9 c\u1EA5u h\xECnh: ${error.message}` });
    }
  });
  app2.get(["/api/youtube/settings-sync", "/youtube/settings-sync", "/settings-sync", "*/settings-sync"], (req, res) => {
    try {
      res.json({ settings: cachedOverlaySettings });
    } catch (error) {
      res.status(500).json({ error: `L\u1ED7i \u0111\u1ED3ng b\u1ED9 c\u1EA5u h\xECnh: ${error.message}` });
    }
  });
  app2.patch(["/api/youtube/settings-sync", "/youtube/settings-sync", "/settings-sync", "*/settings-sync"], (req, res) => {
    try {
      const { settings } = req.body || {};
      if (settings && cachedOverlaySettings) {
        cachedOverlaySettings = { ...cachedOverlaySettings, ...settings };
        return res.json({ success: true, settings: cachedOverlaySettings });
      } else if (settings) {
        cachedOverlaySettings = settings;
        return res.json({ success: true, settings: cachedOverlaySettings });
      }
      res.status(400).json({ error: "Missing settings payload" });
    } catch (error) {
      res.status(500).json({ error: `L\u1ED7i \u0111\u1ED3ng b\u1ED9 c\u1EA5u h\xECnh: ${error.message}` });
    }
  });
  let cachedSprint7State = null;
  app2.post(["/api/sprint7/state-sync", "/sprint7/state-sync", "*/sprint7/state-sync"], (req, res) => {
    try {
      const { state } = req.body || {};
      if (state) {
        cachedSprint7State = state;
        if (state.voteKeywordA && state.voteKeywordB) {
          setVoteKeywords(state.voteKeywordA, state.voteKeywordB);
        }
        return res.json({ success: true, state: cachedSprint7State });
      }
      res.status(400).json({ error: "Missing state payload" });
    } catch (error) {
      res.status(500).json({ error: `L\u1ED7i \u0111\u1ED3ng b\u1ED9 c\u1EA5u h\xECnh Sprint 7: ${error.message}` });
    }
  });
  app2.get(["/api/sprint7/state-sync", "/sprint7/state-sync", "*/sprint7/state-sync"], (req, res) => {
    try {
      res.json({ state: cachedSprint7State });
    } catch (error) {
      res.status(500).json({ error: `L\u1ED7i \u0111\u1ED3ng b\u1ED9 c\u1EA5u h\xECnh Sprint 7: ${error.message}` });
    }
  });
  app2.get(["/api/desktop-overlay/status", "/desktop-overlay/status", "/status", "*/status"], (req, res) => {
    const control = global.electronOverlayControl;
    if (control) {
      return res.json({ isElectron: true, isOpen: control.isOverlayOpen() });
    }
    res.json({ isElectron: false, isOpen: false });
  });
  app2.post(["/api/desktop-overlay/toggle", "/desktop-overlay/toggle", "/toggle", "*/toggle"], (req, res) => {
    const { show } = req.body || {};
    const control = global.electronOverlayControl;
    if (control) {
      control.toggleOverlay(!!show);
      return res.json({ success: true, isOpen: control.isOverlayOpen() });
    }
    res.status(400).json({ error: "\u1EE8ng d\u1EE5ng \u0111ang kh\xF4ng ch\u1EA1y trong m\xF4i tr\u01B0\u1EDDng Desktop Electron." });
  });
  app2.post(["/api/desktop-overlay/set-locked", "/desktop-overlay/set-locked", "/set-locked", "*/set-locked"], (req, res) => {
    const { locked } = req.body || {};
    const control = global.electronOverlayControl;
    if (control) {
      control.setLocked(!!locked);
      return res.json({ success: true });
    }
    res.status(400).json({ error: "\u1EE8ng d\u1EE5ng \u0111ang kh\xF4ng ch\u1EA1y trong m\xF4i tr\u01B0\u1EDDng Desktop Electron." });
  });
  app2.post(["/api/desktop-overlay/set-ignore-mouse", "/desktop-overlay/set-ignore-mouse", "/set-ignore-mouse", "*/set-ignore-mouse"], (req, res) => {
    const { ignore } = req.body || {};
    const control = global.electronOverlayControl;
    if (control) {
      if (typeof control.setIgnoreMouse === "function") {
        control.setIgnoreMouse(!!ignore);
      } else {
        control.setLocked(!!ignore);
      }
      return res.json({ success: true, ignore: !!ignore });
    }
    res.status(400).json({ error: "\u1EE8ng d\u1EE5ng \u0111ang kh\xF4ng ch\u1EA1y trong m\xF4i tr\u01B0\u1EDDng Desktop Electron." });
  });
  app2.use((err, req, res, next) => {
    console.error("Express App Critical Error Handling:", err);
    res.status(err.status || 500).json({
      error: `L\u1ED7i m\xE1y ch\u1EE7 k\u1EBFt n\u1ED1i YouTube ho\u1EB7c c\u1EA5u h\xECnh: ${err.message || err}`
    });
  });
  return app2;
}

// src/server/api.ts
var app = createApiApp();
var api_default = app;
export {
  api_default as default
};
