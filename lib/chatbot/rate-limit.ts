// LLM rate limiter (PLANLLM Phase 3/5): a per-minute and a per-day counter
// per key. Not persisted; stale windows are dropped on access and the maps
// are swept back under MAX_KEYS so a long-lived process cannot grow without
// bound. Used only to gate the LLM path — a denied request gets today's
// normal fallback (never an error, never a 429).

export interface RateLimiter {
  allow(key: string, now?: number): boolean;
}

/**
 * Rate-limit identity for one request. Client-supplied values are never
 * trusted blindly: the leftmost `x-forwarded-for` entry is whatever the
 * caller typed, so prefer the single-IP headers a proxy sets itself, then the
 * hop our own infrastructure appended (`trustedProxyHops` = 1 for a single
 * platform proxy, 2 when a CDN sits in front of it). Too few hops for that
 * depth ⇒ do not guess. With no usable header, fall back to the session so
 * one visitor cannot drain the whole LLM budget for everybody.
 */
export function rateLimitKey(
  request: Request,
  sessionId: string | null,
  trustedProxyHops = 1,
): string {
  const direct = request.headers.get("x-real-ip") ?? request.headers.get("cf-connecting-ip");
  if (direct && direct.trim() !== "") return `ip:${direct.trim()}`;
  const hops = (request.headers.get("x-forwarded-for") ?? "")
    .split(",")
    .map((hop) => hop.trim())
    .filter((hop) => hop !== "");
  const observed = hops[hops.length - Math.max(1, trustedProxyHops)];
  if (observed !== undefined) return `ip:${observed}`;
  return sessionId !== null ? `session:${sessionId}` : "anonymous";
}

/** Distinct keys tracked per window map before a sweep runs. */
const MAX_KEYS = 1000;

interface Window {
  /** Bucket index this count belongs to; a different index means "expired". */
  bucket: number;
  count: number;
}

function minuteBucketKey(now: number): number {
  return Math.floor(now / 60_000);
}

function dayBucketKey(now: number): number {
  return Math.floor(now / 86_400_000);
}

function countIn(map: Map<string, Window>, key: string, bucket: number): number {
  const window = map.get(key);
  if (window === undefined) return 0;
  if (window.bucket !== bucket) {
    map.delete(key); // the window rolled over: the old count is dead
    return 0;
  }
  return window.count;
}

// Bounded memory: drop every key whose window has rolled over, then, if the
// map is still full of live windows, drop the oldest-inserted keys. Losing a
// live key only resets that client's quota early — an unbounded map would
// take the whole process down.
function sweep(map: Map<string, Window>, bucket: number): void {
  if (map.size <= MAX_KEYS) return;
  for (const [key, window] of map) {
    if (window.bucket !== bucket) map.delete(key);
  }
  while (map.size > MAX_KEYS) {
    const oldest = map.keys().next().value;
    if (oldest === undefined) break;
    map.delete(oldest);
  }
}

export function createRateLimiter(opts: { perMinute: number; perDay: number }): RateLimiter {
  const perMinute = new Map<string, Window>();
  const perDay = new Map<string, Window>();

  return {
    allow(key: string, now: number = Date.now()): boolean {
      const minuteBucket = minuteBucketKey(now);
      const dayBucket = dayBucketKey(now);

      const minuteCount = countIn(perMinute, key, minuteBucket);
      const dayCount = countIn(perDay, key, dayBucket);
      if (minuteCount >= opts.perMinute || dayCount >= opts.perDay) return false;

      perMinute.set(key, { bucket: minuteBucket, count: minuteCount + 1 });
      perDay.set(key, { bucket: dayBucket, count: dayCount + 1 });
      sweep(perMinute, minuteBucket);
      sweep(perDay, dayBucket);
      return true;
    },
  };
}
