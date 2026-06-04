import { getOverlaySettings, setOverlaySettings } from "../../lib/settings-store";
import {
  handleOptions,
  readJsonBody,
  sendJson,
  type ApiRequest,
  type ApiResponse,
} from "../../lib/vercel-handler";

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (handleOptions(req, res)) return;

  try {
    if (req.method === "GET") {
      return sendJson(res, 200, { settings: getOverlaySettings() });
    }

    if (req.method === "POST") {
      const { settings } = await readJsonBody<{ settings?: unknown }>(req);
      if (!settings) {
        return sendJson(res, 400, { error: "Missing settings payload" });
      }
      const saved = setOverlaySettings(settings);
      return sendJson(res, 200, { success: true, settings: saved });
    }

    return sendJson(res, 405, { error: "Method not allowed" });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return sendJson(res, 500, { error: `Lỗi đồng bộ cấu hình: ${message}` });
  }
}
