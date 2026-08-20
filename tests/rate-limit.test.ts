// Rate limiter tests (PLANLLM Phase 5): per-minute and per-day buckets,
// window reset, injectable clock.

import { describe, expect, it } from "vitest";
import { createRateLimiter, rateLimitKey } from "@/lib/chatbot/rate-limit";

function req(headers: Record<string, string>): Request {
  return new Request("http://localhost/api/chat", { method: "POST", headers });
}

describe("rateLimitKey", () => {
  it("prefers the single-IP headers a proxy sets itself", () => {
    expect(rateLimitKey(req({ "x-real-ip": "9.9.9.9" }), null)).toBe("ip:9.9.9.9");
    expect(rateLimitKey(req({ "cf-connecting-ip": "8.8.8.8" }), null)).toBe("ip:8.8.8.8");
  });

  it("ignores the caller-supplied left of the forwarded chain", () => {
    const spoofed = req({ "x-forwarded-for": "1.2.3.4, 9.9.9.9" });
    const other = req({ "x-forwarded-for": "5.6.7.8, 9.9.9.9" });
    expect(rateLimitKey(spoofed, null)).toBe("ip:9.9.9.9");
    // Rotating the spoofable entry must not buy a second budget.
    expect(rateLimitKey(other, null)).toBe(rateLimitKey(spoofed, null));
  });

  it("counts back the configured number of trusted hops", () => {
    // CDN + platform: the platform appended the CDN's address, the CDN
    // appended the real client — so the client is the second from the right.
    const request = req({ "x-forwarded-for": "1.2.3.4, 77.77.77.77, 10.0.0.1" });
    expect(rateLimitKey(request, null, 2)).toBe("ip:77.77.77.77");
    expect(rateLimitKey(request, null, 1)).toBe("ip:10.0.0.1");
  });

  it("never guesses when the chain is shorter than the configured depth", () => {
    const request = req({ "x-forwarded-for": "10.0.0.1" });
    expect(rateLimitKey(request, "sess-1", 2)).toBe("session:sess-1");
    expect(rateLimitKey(request, null, 2)).toBe("anonymous");
  });

  it("falls back to the session when no proxy header is present", () => {
    expect(rateLimitKey(req({}), "sess-2")).toBe("session:sess-2");
    expect(rateLimitKey(req({}), null)).toBe("anonymous");
  });
});

describe("createRateLimiter", () => {
  it("allows a burst up to perMinute then denies within the minute", () => {
    const limiter = createRateLimiter({ perMinute: 3, perDay: 100 });
    const now = 1_000_000_000_000;
    expect(limiter.allow("ip-1", now)).toBe(true);
    expect(limiter.allow("ip-1", now + 1000)).toBe(true);
    expect(limiter.allow("ip-1", now + 2000)).toBe(true);
    expect(limiter.allow("ip-1", now + 3000)).toBe(false);
  });

  it("separates buckets per key", () => {
    const limiter = createRateLimiter({ perMinute: 1, perDay: 100 });
    const now = 1_000_000_000_000;
    expect(limiter.allow("ip-1", now)).toBe(true);
    expect(limiter.allow("ip-1", now)).toBe(false);
    expect(limiter.allow("ip-2", now)).toBe(true);
  });

  it("resets after the minute window", () => {
    const limiter = createRateLimiter({ perMinute: 1, perDay: 100 });
    const minuteMs = 60_000;
    expect(limiter.allow("a", 0)).toBe(true);
    expect(limiter.allow("a", 1000)).toBe(false);
    expect(limiter.allow("a", minuteMs)).toBe(true);
    expect(limiter.allow("a", minuteMs + 1000)).toBe(false);
  });

  it("stays correct after thousands of distinct keys (bounded maps)", () => {
    // The maps are swept back under their cap; a fresh key must still be
    // metered exactly, and a swept key at worst gets its quota reset early.
    const limiter = createRateLimiter({ perMinute: 1, perDay: 100 });
    const now = 1_000_000_000_000;
    for (let i = 0; i < 5000; i += 1) {
      expect(limiter.allow(`ip-${i}`, now)).toBe(true);
    }
    expect(limiter.allow("ip-fresh", now)).toBe(true);
    expect(limiter.allow("ip-fresh", now)).toBe(false);
  });

  it("caps the day independently of the minute", () => {
    const limiter = createRateLimiter({ perMinute: 5, perDay: 3 });
    const dayMs = 86_400_000;
    // Three separate minutes: 3/3 daily used.
    expect(limiter.allow("a", 0)).toBe(true);
    expect(limiter.allow("a", minuteMs(1))).toBe(true);
    expect(limiter.allow("a", minuteMs(2))).toBe(true);
    expect(limiter.allow("a", minuteMs(3))).toBe(false);
    // New day resets.
    expect(limiter.allow("a", dayMs)).toBe(true);
  });
});

function minuteMs(minute: number): number {
  return minute * 60_000;
}