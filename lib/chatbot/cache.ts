// Small TTL cache with LRU eviction (PLANLLM Phase 7). Map-backed, expires
// on read, refreshes recency on access, evicts the least-recently-used when
// full. In-memory only — never persisted.

export interface TTLCache<K, V> {
  readonly size: number;
  get(key: K): V | undefined;
  set(key: K, value: V): void;
  clear(): void;
}

interface CacheEntry<V> {
  value: V;
  lastAccess: number;
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
      if (Date.now() - entry.lastAccess > ttlMs) {
        entries.delete(key);
        return undefined;
      }
      // Touch to refresh the LRU position.
      entries.delete(key);
      entries.set(key, entry);
      entry.lastAccess = Date.now();
      return entry.value;
    },
    set(key: K, value: V): void {
      if (entries.has(key)) entries.delete(key);
      entries.set(key, { value, lastAccess: Date.now() });
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