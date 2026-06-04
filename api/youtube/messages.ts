import { fetchLiveChatMessages } from "../../lib/youtube";
import {
  getQuery,
  handleOptions,
  sendJson,
  type ApiRequest,
  type ApiResponse,
} from "../../lib/vercel-handler";

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (handleOptions(req, res)) return;

  if (req.method !== "GET") {
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  try {
    const params = getQuery(req);
    const liveChatId = params.get("liveChatId");
    const apiKey = params.get("apiKey");
    const pageToken = params.get("pageToken") || undefined;

    if (!liveChatId || !apiKey) {
      return sendJson(res, 400, { error: "Thiếu tham số liveChatId hoặc apiKey" });
    }

    const result = await fetchLiveChatMessages(liveChatId, apiKey, pageToken);
    if (result.ok === false) {
      return sendJson(res, result.status, { error: result.error });
    }

    return sendJson(res, 200, {
      messages: result.messages,
      nextPageToken: result.nextPageToken,
      pollingIntervalMillis: result.pollingIntervalMillis,
      offlineAt: result.offlineAt,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[messages]", message);
    return sendJson(res, 500, { error: `Lỗi tải tin nhắn: ${message}` });
  }
}
