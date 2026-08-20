import type { FlowState } from "@/types/flow";
import type { SessionContext } from "@/lib/chatbot/context";

// In-memory conversational state store for multi-step flows.
// Privacy (AGENTS.md §10): only routing data is kept (current step, chosen
// options) — never raw user messages, never PII. No persistence, TTL eviction.
const TTL_MS = 30 * 60 * 1000;
const MAX_SESSIONS = 500;

interface SessionEntry {
  flow: FlowState | null;
  context: SessionContext | null;
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

// Every write goes through here so the cap holds whichever field is written
// (setContext runs on every request that carries a sessionId).
function writeEntry(sessionId: string, entry: SessionEntry): void {
  purgeExpired();
  // Delete before set so the key moves to the end of the Map: insertion order
  // then means recency, and eviction takes the least-recently-written session
  // instead of the first one ever created (a busy user was evictable before).
  const existed = sessions.delete(sessionId);
  if (!existed) {
    while (sessions.size >= MAX_SESSIONS) {
      const oldestId = sessions.keys().next().value;
      if (oldestId === undefined) break;
      sessions.delete(oldestId as string);
    }
  }
  sessions.set(sessionId, entry);
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
  const existing = sessions.get(sessionId);
  writeEntry(sessionId, {
    flow,
    context: existing?.context ?? null,
    createdAt: Date.now(),
  });
}

/** Short-term routing context (profile + last answers), see context.ts. */
export function getContext(sessionId: string): SessionContext | null {
  const entry = sessions.get(sessionId);
  if (!entry) return null;
  if (Date.now() - entry.createdAt > TTL_MS) {
    sessions.delete(sessionId);
    return null;
  }
  return entry.context;
}

export function setContext(sessionId: string, ctx: SessionContext | null): void {
  const existing = sessions.get(sessionId);
  writeEntry(sessionId, {
    flow: existing?.flow ?? null,
    context: ctx,
    createdAt: Date.now(),
  });
}