import { normalize } from "../normalize";
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

export function askAgain(state?: FlowState): FlowOutput {
  // Keep the current step when possible: a single misunderstood message must
  // never wipe the guided parcours (AGENTS.md: flows are stateful).
  return state
    ? {
        text: "Je n'ai pas bien compris. Veuillez choisir l'une des options proposées.",
        nextStep: state.step,
      }
    : { text: "Je n'ai pas bien compris. Veuillez choisir l'une des options proposées." };
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