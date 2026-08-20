import { NextResponse } from "next/server";
import { QA_DATABASE } from "@/data/qa-database";
import { detectCrisis } from "@/lib/chatbot/safety";
import { matchEntry } from "@/lib/chatbot/matcher";
import { fallbackMessage } from "@/lib/chatbot/fallback";
import { detectIntent } from "@/lib/chatbot/intents";
import { getContext, getFlowState, setContext, setFlowState } from "@/lib/chatbot/session";
import {
  emptyContext,
  mapGuidedProfile,
  noteAnswer,
  noteTurn,
  resolvePendingClarify,
  setPendingClarify,
  setProfile,
} from "@/lib/chatbot/context";
import { handleFlow, launchFlow } from "@/lib/chatbot/flows";
import { qaAnswer } from "@/lib/chatbot/flows/helpers";
import {
  EMOTION_SUPPORT_OPTION,
  hasEmotionalSignal,
  isEmotionalStatement,
} from "@/lib/chatbot/emotion";
import { createRateLimiter } from "@/lib/chatbot/rate-limit";
import { loadConfig } from "@/lib/config/env";
import { buildProviderChain } from "@/lib/llm/client";
import { createRetriever } from "@/lib/rag/retriever";
import { clarifyPromptText, routeLLM } from "@/lib/router/route";
import { logMeta } from "@/lib/chatbot/observe";
import { t } from "@/lib/i18n";

export const runtime = "nodejs";

// Module-level singletons (per process), never rebuilt per request.
const cfg = loadConfig();
const providers = buildProviderChain(cfg);
const retriever = createRetriever(cfg, QA_DATABASE);
const rateLimiter = createRateLimiter({
  perMinute: cfg.rateLimitPerMinute,
  perDay: cfg.rateLimitPerDay,
});

const FAREWELL_PHRASES = [
  "merci",
  "merci beaucoup",
  "merci pour tout",
  "c'est tout",
  "terminer",
  "au revoir",
  "bonne journée",
  "bonne soirée",
  "non merci",
  "non, merci",
  "j'ai fini",
];

function isFarewell(message: string): boolean {
  const normalized = message.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
  return FAREWELL_PHRASES.some((phrase) => normalized === phrase);
}

// Rate-limit identity for the LLM budget. Client-supplied values must never
// be trusted blindly: the leftmost x-forwarded-for entry is whatever the
// caller typed, so prefer the single-IP headers a proxy sets itself, then the
// LAST forwarded hop (the address our own proxy observed). With no proxy
// header at all, fall back to the session so one visitor cannot drain the
// whole budget for everybody.
function rateLimitKey(request: Request, sessionId: string | null): string {
  const direct =
    request.headers.get("x-real-ip") ?? request.headers.get("cf-connecting-ip");
  if (direct && direct.trim() !== "") return `ip:${direct.trim()}`;
  const hops = (request.headers.get("x-forwarded-for") ?? "")
    .split(",")
    .map((hop) => hop.trim())
    .filter((hop) => hop !== "");
  const observed = hops[hops.length - 1];
  if (observed !== undefined) return `ip:${observed}`;
  return sessionId !== null ? `session:${sessionId}` : "anonymous";
}

// An answer to a message that also carries emotional weight keeps its
// validated text and only gains the existing support pill — the same string
// detectIntent maps to the météo des émotions, so tapping it launches the
// flow through normal intent routing. Never invented copy, never a hijack.
function emotionPill(message: string, matchedId?: string | null): string[] | undefined {
  if (!matchedId) return undefined;
  return hasEmotionalSignal(message) ? [EMOTION_SUPPORT_OPTION] : undefined;
}

// Steps 5 & 6: high-confidence static match, otherwise the hybrid LLM layer
// (rate-limited; denied requests get today's fallback, never an error).
async function resolveAnswer(
  message: string,
  sessionId: string | null,
  request: Request,
): Promise<NextResponse> {
  const startedAt = Date.now();
  const match = matchEntry(message, QA_DATABASE);
  if (match.confidence === "high" && match.entry) {
    if (sessionId) {
      setContext(sessionId, noteAnswer(getContext(sessionId) ?? emptyContext(), match.entry.id));
    }
    logMeta(cfg, { mode: "static", matchedId: match.entry.id, latencyMs: Date.now() - startedAt });
    return NextResponse.json({
      text: match.entry.answer,
      isCrisis: false,
      mode: "static",
      matchedId: match.entry.id,
      confidence: 1,
      options: emotionPill(message, match.entry.id),
    });
  }

  if (!rateLimiter.allow(rateLimitKey(request, sessionId))) {
    logMeta(cfg, { mode: "fallback", latencyMs: Date.now() - startedAt });
    return NextResponse.json({ text: fallbackMessage("fr"), isCrisis: false, mode: "fallback" });
  }

  const context = sessionId ? getContext(sessionId) : null;
  const outcome = await routeLLM({ rawMessage: message, context, cfg, providers, retriever });
  logMeta(cfg, {
    mode: outcome.mode,
    matchedId: outcome.matchedId,
    latencyMs: Date.now() - startedAt,
  });
  if (sessionId) {
    if (outcome.flowStateToPersist !== undefined) {
      setFlowState(sessionId, outcome.flowStateToPersist);
    }
    if (outcome.contextDelta) {
      setContext(sessionId, outcome.contextDelta);
    }
  }
  if (outcome.isCrisis) {
    return NextResponse.json({ text: outcome.text, isCrisis: true });
  }
  return NextResponse.json({
    text: outcome.text,
    isCrisis: false,
    options: outcome.options ?? emotionPill(message, outcome.matchedId),
    flowId: outcome.flowId,
    mode: outcome.mode,
    matchedId: outcome.matchedId,
  });
}

export async function POST(request: Request) {
  let message: unknown;
  let rawSessionId: unknown;
  try {
    const body = (await request.json()) as { message?: unknown; sessionId?: unknown };
    message = body.message;
    rawSessionId = body.sessionId;
  } catch {
    return NextResponse.json({ text: t("fr", "emptyMessage"), isCrisis: false }, { status: 400 });
  }

  if (typeof message !== "string" || message.trim() === "") {
    return NextResponse.json({ text: t("fr", "emptyMessage"), isCrisis: false }, { status: 400 });
  }

  const sessionId =
    typeof rawSessionId === "string" && rawSessionId.length > 0 && rawSessionId.length <= 128
      ? rawSessionId
      : null;

  // 1. Safety protocol runs FIRST, before anything else (AGENTS.md §6).
  const safety = detectCrisis(message);
  if (safety.isCrisis) {
    if (sessionId) setFlowState(sessionId, null);
    return NextResponse.json({ text: safety.message as string, isCrisis: true });
  }

  // 2. Small talk / flow termination: clear any active flow.
  if (isFarewell(message)) {
    if (sessionId) setFlowState(sessionId, null);
    return NextResponse.json({
      text: t("fr", "farewell"),
      isCrisis: false,
    });
  }

  // 2b. Count the turn in the session context (gates the LLM path).
  if (sessionId) {
    setContext(sessionId, noteTurn(getContext(sessionId) ?? emptyContext()));
  }

  // 2c. Pending clarification re-route (PLANLLM Phase 5): if the classifier
  // asked to disambiguate, a deterministic answer to that prompt is served
  // directly. Two consecutive stale answers abandon the pending question and
  // continue the normal pipeline — the user is never trapped.
  if (sessionId) {
    const ctx = getContext(sessionId);
    const pending = ctx?.pendingClarify ?? null;
    if (pending && pending.expiresAt > Date.now()) {
      const base = ctx ?? emptyContext();
      const resolved = resolvePendingClarify(message, pending.ids);
      if (resolved !== null) {
        // The pending question is answered either way. A pending id that no
        // longer exists in QA_DATABASE (knowledge-base edit while the session
        // was live) must never surface as a 500: drop the clarification and
        // let the normal pipeline handle this message.
        let text: string | null = null;
        try {
          text = qaAnswer(resolved);
        } catch {
          text = null;
        }
        const cleared = setPendingClarify(base, null);
        setContext(sessionId, text === null ? cleared : noteAnswer(cleared, resolved));
        if (text !== null) {
          return NextResponse.json({
            text,
            isCrisis: false,
            mode: "static",
            matchedId: resolved,
          });
        }
      } else {
        const stale = pending.stale + 1;
        if (stale >= 2) {
          setContext(sessionId, setPendingClarify(base, null));
        } else {
          setContext(sessionId, { ...base, pendingClarify: { ...pending, stale } });
          const prompt = clarifyPromptText(pending.ids);
          return NextResponse.json({ text: prompt ?? fallbackMessage("fr"), isCrisis: false });
        }
      }
    }
  }

  // 3. Resume an active conversational flow (stateful session).
  if (sessionId) {
    const state = getFlowState(sessionId);
    if (state) {
      const { output, nextState } = handleFlow(state, message);
      // Free text mid-guided-tree abandons the tree: clear the flow and let
      // the general matcher answer this message normally.
      if (output.fallbackToMatcher) {
        setFlowState(sessionId, null);
        return resolveAnswer(message, sessionId, request);
      }
      setFlowState(sessionId, nextState);

      // Guided-tree profile learning: the first path entry that maps to a
      // Profile becomes the session profile (soft retrieval boost).
      if (state.flowId === "guided-qualification" && nextState) {
        const pathIds = (nextState.data.path ?? "").split(",").filter(Boolean);
        for (const pathId of pathIds) {
          const profile = mapGuidedProfile(pathId);
          if (profile) {
            setContext(sessionId, setProfile(getContext(sessionId) ?? emptyContext(), profile));
            break;
          }
        }
      }

      return NextResponse.json({
        text: output.text,
        isCrisis: false,
        options: output.options,
        flowId: state.flowId,
      });
    }
  }

  // 4. Explicit user request to start a guided parcours or support exercise.
  const intent = detectIntent(message);
  if (intent) {
    const { output, nextState } = launchFlow(intent);
    if (sessionId) setFlowState(sessionId, nextState);
    return NextResponse.json({
      text: output.text,
      isCrisis: false,
      options: output.options,
      flowId: intent,
    });
  }

  // 4b. Emotional-state message → open the météo des émotions (deterministic
  // tier: no key, no quota, no provider needed). The flow's own validated
  // opener does the talking, so no new user-facing copy is involved. A
  // factual question or a third-person subject suppresses this (see
  // emotion.ts), which keeps « comment porter plainte ? j'ai peur » on the
  // validated legal answer — that message gets the support pill instead.
  if (isEmotionalStatement(message)) {
    const { output, nextState } = launchFlow("emotion-weather");
    if (sessionId) setFlowState(sessionId, nextState);
    return NextResponse.json({
      text: output.text,
      isCrisis: false,
      options: output.options,
      flowId: "emotion-weather",
    });
  }

  // 5. General keyword matching + hybrid LLM understanding layer.
  return resolveAnswer(message, sessionId, request);
}