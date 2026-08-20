// LLM rate limiter (PLANLLM Phase 3/5): two in-memory sliding buckets
// (per-minute, per-day) per key. Not persisted; evicts on access. Used only
// to gate the LLM path — a denied request gets today's normal fallback
// (never an error, never a 429).

export interface RateLimiter {
  allow(key: string, now?: number): boolean;
}

function minuteBucketKey(now: number): number {
  return Math.floor(now / 60_000);
}

function dayBucketKey(now: number): number {
  return Math.floor(now / 86_400_000);
}

export function createRateLimiter(opts: { perMinute: number; perDay: number }): RateLimiter {
  const perMinute = new Map<string, number>(); // key -> minute bucket
  const perDay = new Map<string, number>(); // key -> day bucket

  return {
    allow(key: string, now: number = Date.now()): boolean {
      const minuteKey = `${key}:${minuteBucketKey(now)}`;
      const dayKey = `${key}:${dayBucketKey(now)}`;

      const minuteCount = perMinute.get(minuteKey) ?? 0;
      const dayCount = perDay.get(dayKey) ?? 0;
      if (minuteCount >= opts.perMinute || dayCount >= opts.perDay) return false;

      perMinute.set(minuteKey, minuteCount + 1);
      perDay.set(dayKey, dayCount + 1);
      return true;
    },
  };
}