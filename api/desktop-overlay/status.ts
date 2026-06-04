import { handleOptions, sendJson, type ApiRequest, type ApiResponse } from "../../lib/vercel-handler";

export default function handler(req: ApiRequest, res: ApiResponse) {
  if (handleOptions(req, res)) return;
  return sendJson(res, 200, { isElectron: false, isOpen: false });
}
