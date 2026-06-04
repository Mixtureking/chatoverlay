import { resolveLiveChatId } from "../../lib/youtube";
import {
  handleOptions,
  readJsonBody,
  sendJson,
  type ApiRequest,
  type ApiResponse,
} from "../../lib/vercel-handler";

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (handleOptions(req, res)) return;

  if (req.method !== "POST") {
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  try {
    const { videoUrlOrId, apiKey } = await readJsonBody<{
      videoUrlOrId?: string;
      apiKey?: string;
    }>(req);

    if (!videoUrlOrId) {
      return sendJson(res, 400, { error: "Thiếu thông tin Video URL hoặc ID" });
    }
    if (!apiKey) {
      return sendJson(res, 400, { error: "Thiếu YouTube API Key" });
    }

    const result = await resolveLiveChatId(videoUrlOrId, apiKey);
    if (result.ok === false) {
      return sendJson(res, result.status, { error: result.error });
    }

    return sendJson(res, 200, result.data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[live-chat-id]", message);
    return sendJson(res, 500, { error: `Lỗi máy chủ kết nối YouTube: ${message}` });
  }
}
