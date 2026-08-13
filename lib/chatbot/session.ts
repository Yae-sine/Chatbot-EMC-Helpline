import type { FlowState } from "@/types/flow";

// In-memory conversational state store for multi-step flows.
// Privacy (AGENTS.md §10): only routing data is kept (current step, chosen
// options) — never raw user messages, never PII. No persistence, TTL eviction.
const TTL_MS = 30 * 60 * 1000;
const MAX_SESSIONS = 500;

interface SessionEntry {
  flow: FlowState | null;
  createdAt: number;
}

const sessions = new Map<string, SessionEntry>();

function purgeExpired(): void {
  const now = Date.now();
  for (const [id, entry] of sessions) {
    if (now - entry.createdAt > TTL_MS) {
      sessions.delete(id);
    }
  }
}

function evictOldest(): void {
  while (sessions.size > MAX_SESSIONS) {
    const oldestId = sessions.keys().next().value;
    if (oldestId === undefined) break;
    sessions.delete(oldestId as string);
  }
}

export function getFlowState(sessionId: string): FlowState | null {
  const entry = sessions.get(sessionId);
  if (!entry) return null;
  if (Date.now() - entry.createdAt > TTL_MS) {
    sessions.delete(sessionId);
    return null;
  }
  return entry.flow;
}

export function setFlowState(sessionId: string, flow: FlowState | null): void {
  purgeExpired();
  if (sessions.size >= MAX_SESSIONS) evictOldest();
  sessions.set(sessionId, { flow, createdAt: Date.now() });
}