// TTL cache tests (PLANLLM Phase 7): absolute expiry on read, LRU eviction,
// recency refresh on access, fake timers.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createTTLCache, fnv1a } from "@/lib/chatbot/cache";

describe("createTTLCache", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("expires ttlMs after the write, however often the key is read", () => {
    const cache = createTTLCache<string, number>(10, 600_000);
    cache.set("a", 1);
    expect(cache.get("a")).toBe(1);
    // Still inside the TTL.
    vi.advanceTimersByTime(599_000);
    expect(cache.get("a")).toBe(1);
    // Reading does NOT extend the entry: a hot key must not pin a stale
    // routing decision past the TTL (absolute, not sliding).
    vi.advanceTimersByTime(2_000);
    expect(cache.get("a")).toBeUndefined();
    // Writing again restarts the TTL.
    cache.set("a", 2);
    vi.advanceTimersByTime(599_000);
    expect(cache.get("a")).toBe(2);
  });

  it("expires entries on read after the TTL", () => {
    const cache = createTTLCache<string, string>(10, 600_000);
    cache.set("x", "fresh");
    vi.advanceTimersByTime(600_001);
    expect(cache.get("x")).toBeUndefined();
  });

  it("evicts the least-recently-used entry beyond maxSize", () => {
    const cache = createTTLCache<string, number>(3, 600_000);
    cache.set("a", 1);
    cache.set("b", 2);
    cache.set("c", 3);
    // Touch "a" so "b" becomes the LRU.
    cache.get("a");
    cache.set("d", 4);
    expect(cache.get("b")).toBeUndefined();
    expect(cache.get("a")).toBe(1);
    expect(cache.size).toBe(3);
  });

  it("overwrites duplicate keys without growing", () => {
    const cache = createTTLCache<string, number>(10, 600_000);
    cache.set("a", 1);
    cache.set("a", 2);
    expect(cache.size).toBe(1);
    expect(cache.get("a")).toBe(2);
  });

  it("clear drops everything", () => {
    const cache = createTTLCache<string, number>(10, 600_000);
    cache.set("a", 1);
    cache.clear();
    expect(cache.size).toBe(0);
    expect(cache.get("a")).toBeUndefined();
  });

  it("fnv1a is stable and discriminating", () => {
    const keyA = fnv1a("cristal rose");
    const keyB = fnv1a("cristal rose ");
    expect(keyA).toBe(fnv1a("cristal rose"));
    expect(keyA).not.toBe(keyB);
    expect(keyA).toMatch(/^[0-9a-z]+$/);
  });
});