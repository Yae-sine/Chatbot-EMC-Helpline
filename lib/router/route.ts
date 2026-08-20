// Hybrid router (PLANLLM Phase 3): pure decision ladder on top of the
// deterministic layer. No Next.js imports, no provider I/O here — the route
// handler passes cfg/providers/retriever in. Every failure degrades to
// today's fallback; validated answers are served only via qaAnswer().

import { QA_DATABASE } from "@/data/qa-database";
import { t } from "@/lib/i18n";
import { fallbackMessage } from "@/lib/chatbot/fallback";
import { createTTLCache, fnv1a } from "@/lib/chatbot/cache";
import { emptyContext, noteAnswer, setPendingClarify, summarize, type SessionContext } from "@/lib/chatbot/context";
import {
  EMOTION_SUPPORT_OPTION,
  hasEmotionalSignal,
  hasThirdPersonSubject,
  isEmotionalStatement,
} from "@/lib/chatbot/emotion";
import { detectCrisis } from "@/lib/chatbot/safety";
import { checkFreeText, type ClassifierValidated } from "@/lib/chatbot/validator";
import { launchFlow } from "@/lib/chatbot/flows";
import { qaAnswer } from "@/lib/chatbot/flows/helpers";
import { classify } from "@/lib/llm/classifier";
import type { Config } from "@/lib/config/env";
import type { LLMProvider } from "@/lib/llm/client";
import type { Retriever } from "@/lib/rag/retriever";
import type { FlowId, FlowState } from "@/types/flow";
import { normalize } from "@/lib/chatbot/normalize";

/** Top retrieval candidate at or above this hybrid score is served directly,
 * zero LLM calls (cheap path, PLANLLM Phase 3 step d). */
export const DEGRADED_SERVE_THRESHOLD = 0.75;

// Classifier-result cache (PLANLLM Phase 7): keyed by message+context, LRU,
// in-process. Only successful validated results are cached; a failure is
// never cached. Disabled via ENABLE_RESPONSE_CACHE=false.
const classifierCache = createTTLCache<string, ClassifierValidated>();

/** Test hook: forget every cached classifier result. */
export function __resetRouterCaches(): void {
  classifierCache.clear();
}

function cacheKey(rawMessage: string, ctx: SessionContext): string {
  return fnv1a(normalize(rawMessage) + "|" + summarize(ctx));
}

export type ResponseMode = "static" | "llm" | "fallback";

export interface RouteOutcome {
  mode: ResponseMode;
  text?: string;
  isCrisis?: boolean;
  options?: string[];
  flowId?: string;
  matchedId?: string | null;
  /** non-null only when a flow was launched */
  flowStateToPersist?: FlowState | null;
  /** non-null only when a clarification was issued */
  clarify?: { ids: string[] } | null;
  /** context to persist after this turn (undefined = unchanged) */
  contextDelta?: SessionContext;
}

function qaQuestion(id: string): string | null {
  return QA_DATABASE.find((entry) => entry.id === id)?.question ?? null;
}

/** The verified clarification prompt for 2 ids ({a}/{b} in t("fr","clarifyPrompt")). */
export function clarifyPromptText(ids: [string, string] | string[]): string | null {
  const questionA = qaQuestion(ids[0]);
  const questionB = qaQuestion(ids[1]);
  if (questionA === null || questionB === null) return null;
  return t("fr", "clarifyPrompt").replace("{a}", questionA).replace("{b}", questionB);
}

export interface RouteLLMInput {
  rawMessage: string;
  context: SessionContext | null;
  cfg: Config;
  providers: LLMProvider[];
  retriever: Retriever;
}

export async function routeLLM(input: RouteLLMInput): Promise<RouteOutcome> {
  const { rawMessage, cfg, providers, retriever } = input;
  const ctx = input.context ?? emptyContext();

  const fallback = (): RouteOutcome => ({ mode: "fallback", text: fallbackMessage("fr") });

  // a. LLM path is OFF without configured providers: low-confidence messages
  //    get today's fallback.
  if (cfg.llmProvider === null || providers.length === 0) return fallback();

  // b. Caps gate only the LLM branch. The turn is counted once by the caller
  //    (route handler, step 2b) — never again here, or the cap would be hit
  //    after half the intended number of turns.
  if (rawMessage.length > cfg.messageCharLimit) return fallback();
  if (ctx.turnCount > cfg.sessionTurnCap) return fallback();

  // c. Candidates never leave the 74-entry validated database (top 5).
  const candidates = await retriever.retrieve(rawMessage, { profile: ctx.profile, topK: 5 });

  // d. Cheap path: a clearly-matching top candidate is served with zero LLM
  //    calls (mode "llm" because it went through the hybrid layer decision).
  if (candidates.length > 0 && candidates[0].score >= DEGRADED_SERVE_THRESHOLD) {
    const id = candidates[0].id;
    let text: string;
    try {
      text = qaAnswer(id);
    } catch {
      return fallback();
    }
    return {
      mode: "llm",
      text,
      matchedId: id,
      contextDelta: noteAnswer(ctx, id),
    };
  }

  // e. Classifier (raw message — Arabic must reach the model). Results are
  // cached per (message + context) when ENABLE_RESPONSE_CACHE is on, so a
  // repeated question costs no provider call within the TTL.
  let classified: ClassifierValidated;
  const key = cfg.enableResponseCache ? cacheKey(rawMessage, ctx) : null;
  const cached = key !== null ? classifierCache.get(key) : undefined;
  if (cached !== undefined) {
    classified = cached;
  } else {
    try {
      const result = await classify(
        { message: rawMessage, contextSummary: summarize(ctx), candidates },
        cfg,
        providers,
      );
      classified = result.result;
      if (key !== null) classifierCache.set(key, classified);
    } catch {
      return fallback();
    }
  }

  switch (classified.route) {
    case "qa": {
      const id = classified.qaIds[0];
      let text: string;
      try {
        text = qaAnswer(id);
      } catch {
        return fallback();
      }
      return {
        mode: "llm",
        text,
        matchedId: id,
        contextDelta: noteAnswer(ctx, id),
      };
    }
    case "flow": {
      // Deterministic veto (observed live): the classifier sometimes reads
      // « ma fille a peur d'aller à l'école » as an emotional state and opens
      // the météo des émotions, whose scripts address the person who feels
      // it. A parent or teacher describing someone else must not be dropped
      // into a victim-framed exercise. A parent voicing their own distress
      // (« j'ai très peur pour ma fille ») still gets the door, as a pill.
      if (
        classified.flow === "emotion-weather" &&
        hasThirdPersonSubject(rawMessage) &&
        !isEmotionalStatement(rawMessage)
      ) {
        return {
          ...fallback(),
          options: hasEmotionalSignal(rawMessage) ? [EMOTION_SUPPORT_OPTION] : undefined,
          contextDelta: ctx,
        };
      }
      let launched: ReturnType<typeof launchFlow>;
      try {
        launched = launchFlow(classified.flow as FlowId);
      } catch {
        return fallback();
      }
      const { output, nextState } = launched;
      return {
        mode: "llm",
        text: output.text,
        options: output.options,
        flowId: classified.flow as string,
        flowStateToPersist: nextState,
        contextDelta: ctx,
      };
    }
    case "clarify": {
      const ids = classified.qaIds.slice(0, 2);
      const text = clarifyPromptText(ids);
      if (text === null) return fallback();
      return {
        mode: "llm",
        text,
        clarify: { ids },
        contextDelta: setPendingClarify(ctx, ids),
      };
    }
    case "offtopic":
      return { ...fallback(), contextDelta: ctx };
    case "smalltalk": {
      // LLM_SMALLTALK=false is the kill switch for generated free text: no
      // model-authored sentence may reach the user, only validated copy.
      if (!cfg.llmSmalltalk) {
        return { mode: "fallback", text: fallbackMessage("fr"), contextDelta: ctx };
      }
      const proposed = classified.smalltalk ?? "";
      // Free text is safe only when short, grounded and not a hidden crisis.
      const verdict = checkFreeText(proposed, [rawMessage]);
      if (!verdict.ok) {
        if (verdict.reason === "crisis") {
          const crisis = detectCrisis(proposed);
          return {
            mode: "fallback",
            text: crisis.message ?? fallbackMessage("fr"),
            isCrisis: true,
            contextDelta: ctx,
          };
        }
        return { mode: "fallback", text: fallbackMessage("fr"), contextDelta: ctx };
      }
      return { mode: "llm", text: proposed, contextDelta: ctx };
    }
  }
}
