import { handleOptions, sendJson, type ApiRequest, type ApiResponse } from "../../lib/vercel-handler";

export default function handler(req: ApiRequest, res: ApiResponse) {
  if (handleOptions(req, res)) return;
  return sendJson(res, 400, { error: "Ứng dụng đang không chạy trong môi trường Desktop Electron." });
}
