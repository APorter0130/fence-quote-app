/**
 * Small in-memory sliding-window rate limiter.
 *
 * Best-effort only: on serverless hosting each instance keeps its own counters, so
 * this slows down floods and casual abuse but is not a hard guarantee. For stronger
 * protection add a captcha (for example Cloudflare Turnstile) or a shared store.
 */
const buckets = new Map<string, number[]>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (buckets.get(key) ?? []).filter((time) => now - time < windowMs);

  if (recent.length >= limit) {
    buckets.set(key, recent);
    return false;
  }

  recent.push(now);
  buckets.set(key, recent);

  if (buckets.size > 5000) {
    for (const [bucketKey, times] of buckets) {
      if (times.every((time) => now - time >= windowMs)) {
        buckets.delete(bucketKey);
      }
    }
  }

  return true;
}

export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const first = forwarded?.split(",")[0]?.trim();

  return first || req.headers.get("x-real-ip") || "unknown";
}
