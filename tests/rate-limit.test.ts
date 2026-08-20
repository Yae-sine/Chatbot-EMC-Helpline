// Rate limiter tests (PLANLLM Phase 5): per-minute and per-day buckets,
// window reset, injectable clock.

import { describe, expect, it } from "vitest";
import { createRateLimiter } from "@/lib/chatbot/rate-limit";

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