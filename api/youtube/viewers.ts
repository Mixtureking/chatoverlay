import { fetchViewerCount } from "../../lib/youtube";
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
    const videoId = params.get("videoId");
    const apiKey = params.get("apiKey");

    if (!videoId || !apiKey) {
      return sendJson(res, 400, { error: "Thiếu Video ID hoặc API Key" });
    }

    const viewerCount = await fetchViewerCount(videoId, apiKey);
    return sendJson(res, 200, { viewerCount });
  } catch {
    return sendJson(res, 200, { viewerCount: 0 });
  }
}
