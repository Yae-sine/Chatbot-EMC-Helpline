// Short-term session context (PLANLLM Phase 3/5).
//
// Pure helpers, no I/O: context rides the session store's TTL (session.ts).
// Only routing-level facts are kept (profile, last QA ids, pending clarify) —
// never raw user messages, never PII (AGENTS.md §10).

import type { Profile } from "@/types/qa";
import { QA_DATABASE } from "@/data/qa-database";
import { normalize } from "@/lib/chatbot/normalize";

export interface SessionContext {
  /** learned from the guided tree (coarse: tree cannot split mineure/majeure) */
  profile: Profile | null;
  /** answered QA ids, most recent first, capped at 6 */
  lastQaIds: string[];
  turnCount: number;
  pendingClarify: { ids: string[]; expiresAt: number; stale: number } | null;
}

export function emptyContext(): SessionContext {
  return { profile: null, lastQaIds: [], turnCount: 0, pendingClarify: null };
}

export function noteTurn(ctx: SessionContext): SessionContext {
  return { ...ctx, turnCount: ctx.turnCount + 1 };
}

export function noteAnswer(ctx: SessionContext, qaId: string): SessionContext {
  const deduped = ctx.lastQaIds.filter((id) => id !== qaId);
  const lastQaIds = [qaId, ...deduped].slice(0, 6);
  return { ...ctx, lastQaIds };
}

export function setProfile(ctx: SessionContext, profile: Profile): SessionContext {
  return { ...ctx, profile };
}

export function setPendingClarify(
  ctx: SessionContext,
  ids: string[] | null,
  ttlMs = 10 * 60 * 1000,
): SessionContext {
  return {
    ...ctx,
    pendingClarify: ids ? { ids, expiresAt: Date.now() + ttlMs, stale: 0 } : null,
  };
}

/** One-line summary the classifier receives as context anchor. */
export function summarize(ctx: SessionContext): string {
  const parts: string[] = [];
  if (ctx.profile) parts.push(`profil utilisateur: ${ctx.profile}`);
  if (ctx.lastQaIds.length > 0) parts.push(`dernieres reponses: ${ctx.lastQaIds.join(", ")}`);
  if (parts.length === 0) return "nouvelle conversation";
  return parts.join("; ");
}

/**
 * Deterministic resolution of a pending clarification (PLANLLM Phase 5):
 * - the raw answer equals an id ("3.2");
 * - "1"/"2" (option index into the ids);
 * - a single letter a/b;
 * - the message contains one question's full text (either direction).
 * Returns the resolved id only when EXACTLY ONE of the candidates matches —
 * anything ambiguous reissues the prompt.
 */
export function resolvePendingClarify(message: string, ids: string[]): string | null {
  if (ids.length < 2) return null;
  const trimmed = message.trim();
  const normalized = normalize(trimmed);

  const direct = ids.find((id) => trimmed === id);
  const byIndex =
    normalized.length === 1 && /^[1-9]$/.test(normalized) ? ids[Number(normalized) - 1] : undefined;
  const byLetter =
    normalized.length === 1 && /^[a-z]$/.test(normalized)
      ? ids[normalized.charCodeAt(0) - "a".charCodeAt(0)]
      : undefined;

  const hits = new Set<string>();
  if (direct) hits.add(direct);
  if (byIndex !== undefined) hits.add(byIndex);
  if (byLetter !== undefined) hits.add(byLetter);

  if (hits.size === 1) return [...hits][0];

  // Question-text containment: the message repeats one of the questions
  // (full or abbreviated), either direction.
  const questionMatches = ids.filter((id) => {
    const entry = QA_DATABASE.find((candidate) => candidate.id === id);
    if (!entry) return false;
    const normQuestion = normalize(entry.question);
    return normalized.includes(normQuestion) || normQuestion.includes(normalized);
  });
  return questionMatches.length === 1 ? questionMatches[0] : null;
}

// Guided-tree profile ids (root option ids) → Profile. The tree cannot
// distinguish victime-mineure/majeure, so "victime" defaults to majeure —
// it only soft-boosts retrieval and can never alone misroute.
const GUIDED_TO_PROFILE: Record<string, Profile | null> = {
  victime: "victime-majeure",
  parent: "parent-tuteur",
  enseignant: "enseignant-educateur",
  temoin: "temoin",
  pro: "professionnel",
  autre: null,
};

/** Also accepts the intent-node forms ("intent-victime") that the guided
 * tree stores in its navigation path. */
export function mapGuidedProfile(guidedId: string): Profile | null {
  const direct = GUIDED_TO_PROFILE[guidedId];
  if (direct !== undefined) return direct;
  const intent = guidedId.startsWith("intent-") ? guidedId.slice("intent-".length) : "";
  return intent in GUIDED_TO_PROFILE ? GUIDED_TO_PROFILE[intent] : null;
}