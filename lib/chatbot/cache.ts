// Small TTL cache with LRU eviction (PLANLLM Phase 7). Map-backed; an entry
// expires ttlMs after it was stored (absolute, not sliding — a hot key must
// never pin a stale routing decision), reads refresh only the LRU position,
// and the least-recently-used entry is evicted when full. In-memory only.

export interface TTLCache<K, V> {
  readonly size: number;
  get(key: K): V | undefined;
  set(key: K, value: V): void;
  clear(): void;
}

interface CacheEntry<V> {
  value: V;
  insertedAt: number;
}

export function createTTLCache<K, V>(maxSize = 96, ttlMs = 600_000): TTLCache<K, V> {
  const entries = new Map<K, CacheEntry<V>>();

  return {
    get size() {
      return entries.size;
    },
    get(key: K): V | undefined {
      const entry = entries.get(key);
      if (!entry) return undefined;
      if (Date.now() - entry.insertedAt > ttlMs) {
        entries.delete(key);
        return undefined;
      }
      // Touch to refresh the LRU position (insertion order = recency).
      entries.delete(key);
      entries.set(key, entry);
      return entry.value;
    },
    set(key: K, value: V): void {
      if (entries.has(key)) entries.delete(key);
      entries.set(key, { value, insertedAt: Date.now() });
      while (entries.size > maxSize) {
        const oldest = entries.keys().next().value;
        if (oldest === undefined) break;
        entries.delete(oldest);
      }
    },
    clear(): void {
      entries.clear();
    },
  };
}

/** FNV-1a 32-bit hash, base36 — stable routing-cache keys (not a security hash). */
export function fnv1a(input: string): string {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}