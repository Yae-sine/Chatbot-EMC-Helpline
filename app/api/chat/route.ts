import { NextResponse } from "next/server";
import { QA_DATABASE } from "@/data/qa-database";
import { detectCrisis } from "@/lib/chatbot/safety";
import { matchEntry } from "@/lib/chatbot/matcher";
import { fallbackMessage } from "@/lib/chatbot/fallback";
import { detectIntent } from "@/lib/chatbot/intents";
import { getFlowState, setFlowState } from "@/lib/chatbot/session";
import { handleFlow } from "@/lib/chatbot/flows";
import { t } from "@/lib/i18n";

export const runtime = "nodejs";

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

  // 3. Resume an active conversational flow (stateful session).
  if (sessionId) {
    const state = getFlowState(sessionId);
    if (state) {
      const { output, nextState } = handleFlow(state, message);
      // Free text mid-guided-tree abandons the tree: clear the flow and let
      // the general matcher answer this message normally.
      if (output.fallbackToMatcher) {
        setFlowState(sessionId, null);
        const match = matchEntry(message, QA_DATABASE);
        if (match.matched && match.entry) {
          return NextResponse.json({ text: match.entry.answer, isCrisis: false });
        }
        return NextResponse.json({ text: fallbackMessage("fr"), isCrisis: false });
      }
      setFlowState(sessionId, nextState);
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
    const { output, nextState } = handleFlow({ flowId: intent, step: "start", data: {} }, "");
    if (sessionId) setFlowState(sessionId, nextState);
    return NextResponse.json({
      text: output.text,
      isCrisis: false,
      options: output.options,
      flowId: intent,
    });
  }

  // 5. General keyword matching against the validated Q&A database.
  const match = matchEntry(message, QA_DATABASE);
  if (match.matched && match.entry) {
    return NextResponse.json({ text: match.entry.answer, isCrisis: false });
  }

  return NextResponse.json({ text: fallbackMessage("fr"), isCrisis: false });
}