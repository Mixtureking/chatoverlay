import type { IncomingMessage, ServerResponse } from "http";

export type ApiRequest = IncomingMessage & {
  body?: unknown;
  query?: Record<string, string | string[] | undefined>;
};
export type ApiResponse = ServerResponse;

export function setCorsHeaders(res: ApiResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, PATCH, DELETE");
  res.setHeader("Access-Control-Allow-Headers", "X-Requested-With,Content-Type,Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true");
}

export function sendJson(res: ApiResponse, status: number, body: unknown) {
  setCorsHeaders(res);
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

export async function readJsonBody<T = Record<string, unknown>>(req: ApiRequest): Promise<T> {
  if (req.body && typeof req.body === "object") {
    return req.body as T;
  }

  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw.trim()) return {} as T;
  return JSON.parse(raw) as T;
}

export function handleOptions(req: ApiRequest, res: ApiResponse): boolean {
  setCorsHeaders(res);
  if (req.method === "OPTIONS") {
    res.statusCode = 200;
    res.end();
    return true;
  }
  return false;
}

export function queryParam(
  query: Record<string, string | string[] | undefined> | undefined,
  key: string
): string | undefined {
  const value = query?.[key];
  if (Array.isArray(value)) return value[0];
  return value;
}

export function getQuery(req: ApiRequest): URLSearchParams {
  if (req.query && typeof req.query === "object") {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(req.query)) {
      if (typeof value === "string") params.set(key, value);
      else if (Array.isArray(value) && value[0]) params.set(key, value[0]);
    }
    return params;
  }
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  return url.searchParams;
}
