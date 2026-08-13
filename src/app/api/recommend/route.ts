import { isStudentProfile } from "@/utils/profileStorage";

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 5;
const MAX_REQUEST_BYTES = 20_000;

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

/**
 * Development-only rate limiter stub. Replace this process-local map with a
 * shared Redis/KV limiter before deploying across multiple server instances.
 */
const requestLedger = new Map<string, RateLimitEntry>();

function getClientKey(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const forwardedAddress = forwardedFor?.split(",")[0]?.trim();

  return forwardedAddress || request.headers.get("x-real-ip") || "anonymous";
}

function isRateLimited(clientKey: string) {
  const now = Date.now();
  const entry = requestLedger.get(clientKey);

  if (!entry || entry.resetAt <= now) {
    requestLedger.set(clientKey, { count: 1, resetAt: now + WINDOW_MS });
    return { limited: false, retryAfter: 0 };
  }

  entry.count += 1;

  return {
    limited: entry.count > MAX_REQUESTS_PER_WINDOW,
    retryAfter: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
  };
}

export async function POST(request: Request) {
  const clientKey = getClientKey(request);
  const rateLimit = isRateLimited(clientKey);

  if (rateLimit.limited) {
    return Response.json(
      { error: "请求过于频繁，请稍后再试。" },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfter), "Cache-Control": "no-store" } },
    );
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_BYTES) {
    return Response.json({ error: "请求内容过大。" }, { status: 413, headers: { "Cache-Control": "no-store" } });
  }

  try {
    const body: unknown = await request.json();
    const profile =
      body && typeof body === "object" && "profile" in body
        ? (body as Record<string, unknown>).profile
        : null;

    if (!isStudentProfile(profile)) {
      return Response.json({ error: "无效的个人背景数据。" }, { status: 400, headers: { "Cache-Control": "no-store" } });
    }

    // Keep AI keys server-only in .env.local (never NEXT_PUBLIC_*). The actual
    // provider call belongs here once the recommendation service is connected.
    return Response.json(
      { message: "推荐接口已通过校验并保留限流保护；AI 服务尚未连接。" },
      { status: 501, headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json({ error: "请求 JSON 格式无效。" }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }
}
