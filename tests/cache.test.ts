// TTL cache tests (PLANLLM Phase 7): expiry on read, LRU eviction, refresh
// on access, fake timers.

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

  it("returns stored values and refreshes expiry on read", () => {
    const cache = createTTLCache<string, number>(10, 600_000);
    cache.set("a", 1);
    expect(cache.get("a")).toBe(1);
    // Read at 599s is within TTL; moving 599s later again must still hit.
    vi.advanceTimersByTime(599_000);
    expect(cache.get("a")).toBe(1);
    vi.advanceTimersByTime(599_000);
    expect(cache.get("a")).toBe(1);
    // Idle past the TTL: expired.
    vi.advanceTimersByTime(601_000);
    expect(cache.get("a")).toBeUndefined();
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