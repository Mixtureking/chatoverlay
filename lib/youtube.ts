export function sanitizeHtml(text: string): string {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function extractVideoId(input: string): string {
  if (!input) return "";
  const trimmed = input.replace(/[\u200B-\u200C\u200D\uFEFF\s]/g, "").trim();

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

export type LiveChatIdResult =
  | { ok: true; data: { activeLiveChatId: string; videoId: string; title: string; channelTitle: string; viewerCount: number } }
  | { ok: false; status: number; error: string };

export async function resolveLiveChatId(
  videoUrlOrId: string,
  apiKey: string,
  log?: (msg: string) => void
): Promise<LiveChatIdResult> {
  const videoId = extractVideoId(videoUrlOrId);
  log?.(`Trích xuất Video ID: "${videoId}"`);

  const url = `https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails,snippet&id=${videoId}&key=${apiKey}`;
  const response = await fetch(url);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = (errorData as { error?: { message?: string } })?.error?.message || "Lỗi API từ Google";
    return { ok: false, status: response.status, error: `Google API Error (${response.status}): ${message}` };
  }

  const data = (await response.json()) as {
    items?: Array<{
      snippet?: { title?: string; channelTitle?: string };
      liveStreamingDetails?: { activeLiveChatId?: string; concurrentViewers?: string };
    }>;
  };

  if (!data.items?.length) {
    return { ok: false, status: 404, error: "Không tìm thấy video. Vui lòng kiểm tra lại URL hoặc ID." };
  }

  const videoItem = data.items[0];
  const liveStreamingDetails = videoItem.liveStreamingDetails;
  const snippet = videoItem.snippet;

  if (!liveStreamingDetails) {
    return {
      ok: false,
      status: 400,
      error: "Đây không phải là video Livestream hoặc video công chiếu trực tiếp.",
    };
  }

  const activeLiveChatId = liveStreamingDetails.activeLiveChatId;
  if (!activeLiveChatId) {
    return {
      ok: false,
      status: 400,
      error: "Livestream này đã kết thúc hoặc không có khung chat trực tiếp nào đang hoạt động.",
    };
  }

  return {
    ok: true,
    data: {
      activeLiveChatId,
      videoId,
      title: snippet?.title || "",
      channelTitle: snippet?.channelTitle || "",
      viewerCount: liveStreamingDetails.concurrentViewers
        ? parseInt(liveStreamingDetails.concurrentViewers, 10)
        : 0,
    },
  };
}

export function mapChatMessages(rawItems: unknown[]) {
  return rawItems.map((item: unknown) => {
    const row = item as Record<string, unknown>;
    const snippet = (row.snippet || {}) as Record<string, unknown>;
    const author = (row.authorDetails || {}) as Record<string, unknown>;

    const isSuperChat = snippet.type === "superChatEvent";
    let tier = 1;
    let superChatColor = "#1e88e5";

    if (isSuperChat && snippet.superChatDetails) {
      const details = snippet.superChatDetails as Record<string, unknown>;
      const amountMicros = (details.amountMicros as number) || 0;
      const amountVal = amountMicros / 1_000_000;
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
    }

    const textDetails = snippet.textMessageDetails as { messageText?: string } | undefined;
    const superDetails = snippet.superChatDetails as { amountDisplayString?: string } | undefined;

    return {
      id: (row.id as string) || `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      authorName: sanitizeHtml((author.displayName as string) || "Viewer"),
      authorPhotoUrl:
        (author.profileImageUrl as string) ||
        "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=64&h=64&q=80",
      messageText: sanitizeHtml(
        textDetails?.messageText || (snippet.displayMessage as string) || ""
      ),
      isModerator: !!author.isChatModerator,
      isOwner: !!author.isChatOwner,
      isSponsor: !!author.isChatSponsor,
      isVerified: !!author.isVerified,
      isSuperChat,
      superChatColor,
      superChatAmountText: isSuperChat ? superDetails?.amountDisplayString || "" : "",
      tier,
      timestamp: snippet.publishedAt
        ? new Date(snippet.publishedAt as string).getTime()
        : Date.now(),
    };
  });
}

export async function fetchLiveChatMessages(
  liveChatId: string,
  apiKey: string,
  pageToken?: string
) {
  let url = `https://www.googleapis.com/youtube/v3/liveChat/messages?liveChatId=${liveChatId}&part=snippet,authorDetails&key=${apiKey}&maxResults=100`;
  if (pageToken) url += `&pageToken=${pageToken}`;

  const response = await fetch(url);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const message = (errorData as { error?: { message?: string } })?.error?.message || "Lỗi khi lấy tin nhắn chat";
    return { ok: false as const, status: response.status, error: `YouTube API Error: ${message}` };
  }

  const data = (await response.json()) as {
    items?: unknown[];
    nextPageToken?: string;
    pollingIntervalMillis?: number;
    offlineAt?: string;
  };

  return {
    ok: true as const,
    messages: mapChatMessages(data.items || []),
    nextPageToken: data.nextPageToken || null,
    pollingIntervalMillis: data.pollingIntervalMillis || 4000,
    offlineAt: data.offlineAt || null,
  };
}

export async function fetchViewerCount(videoId: string, apiKey: string): Promise<number> {
  const url = `https://www.googleapis.com/youtube/v3/videos?part=liveStreamingDetails&id=${videoId}&key=${apiKey}`;
  const response = await fetch(url);
  if (!response.ok) return 0;

  const data = (await response.json()) as {
    items?: Array<{ liveStreamingDetails?: { concurrentViewers?: string } }>;
  };
  const details = data.items?.[0]?.liveStreamingDetails;
  return details?.concurrentViewers ? parseInt(details.concurrentViewers, 10) : 0;
}
