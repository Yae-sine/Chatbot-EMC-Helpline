import { normalize } from "../normalize";
import { looksFactual } from "../emotion";
import type { ChatResponse } from "@/types/chat";
import type { FlowOutput, FlowState } from "@/types/flow";
import { QA_DATABASE } from "@/data/qa-database";

// Returns the index of the option whose normalized label matches the user
// message (option contains the message, or the message contains the option,
// or exact equality). Returns -1 when nothing matches.
export function matchOption(rawMessage: string, options: string[]): number {
  const text = normalize(rawMessage);
  if (text === "") return -1;
  for (let i = 0; i < options.length; i++) {
    const option = normalize(options[i]);
    if (option === text || option.includes(text) || text.includes(option)) {
      return i;
    }
  }
  return -1;
}

const ASK_AGAIN_TEXT =
  "Je n'ai pas bien compris. Veuillez choisir l'une des options proposées.";

/**
 * The single response for "that message is not one of my options".
 *
 * A real question must not be trapped by the re-prompt: `looksFactual` sends it
 * straight back to the general matcher, which ends the flow (the route clears
 * the state and answers normally). Everything else re-prompts and is flagged
 * `unmatched`, so the route can still let the knowledge base take the message
 * if it matches one with high confidence.
 *
 * `rawMessage` is optional only because a few call sites re-prompt without a
 * user message (a flow re-asking itself); omitting it keeps today's behaviour.
 */
export function askAgain(state?: FlowState, rawMessage?: string): FlowOutput {
  if (rawMessage !== undefined && looksFactual(rawMessage)) {
    return { text: "", fallbackToMatcher: true };
  }
  // Keep the current step when possible: a single misunderstood message must
  // never wipe the guided parcours (AGENTS.md: flows are stateful).
  return state
    ? { text: ASK_AGAIN_TEXT, nextStep: state.step, unmatched: true }
    : { text: ASK_AGAIN_TEXT, unmatched: true };
}

// Verbatim validated answer from the Q&A database, used by the guided
// parcours flows (AGENTS.md §9: nothing rephrased).
export function qaAnswer(id: string): string {
  const entry = QA_DATABASE.find((e) => e.id === id);
  if (!entry) {
    throw new Error(`qaAnswer: unknown QA entry ${id}`);
  }
  return entry.answer;
}

// Turns a finished flow output into a ChatResponse so the route handler can
// forward it unchanged (shared shape for stateless request/response).
export function toResponse(
  output: FlowOutput,
  params: { isCrisis: boolean; flowId?: string },
): ChatResponse {
  return {
    text: output.text,
    isCrisis: params.isCrisis,
    options: output.options,
    flowId: params.flowId,
  };
}