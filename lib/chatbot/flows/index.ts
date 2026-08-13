import type { FlowOutput, FlowState } from "@/types/flow";
import { emotionWeatherFlow } from "./emotion-weather";
import { groundingFlow } from "./grounding";
import { breathingFlow } from "./breathing";
import { technicalFlow } from "./technical";
import { juridiqueFlow } from "./juridique";
import { informatifFlow } from "./informatif";
import { parcoursPsychologiqueFlow } from "./psychologique";
import { guidedFlow } from "./guided";

function runFlow(state: FlowState, rawMessage: string): FlowOutput {
  switch (state.flowId) {
    case "emotion-weather":
      return emotionWeatherFlow(state, rawMessage);
    case "grounding-5-4-3-2-1":
      return groundingFlow(state, rawMessage);
    case "breathing-4-2-6":
      return breathingFlow(state, rawMessage);
    case "parcours-technique":
      return technicalFlow(state, rawMessage);
    case "parcours-juridique":
      return juridiqueFlow(state, rawMessage);
    case "parcours-informatif":
      return informatifFlow(state, rawMessage);
    case "parcours-psychologique":
      return parcoursPsychologiqueFlow(state, rawMessage);
    case "guided-qualification":
      return guidedFlow(state, rawMessage);
    default:
      // Unreachable (FlowId is closed); defensive fallback keeps the API safe.
      return { text: "" };
  }
}

export interface FlowResult {
  output: FlowOutput;
  nextState: FlowState | null;
}

// Runs the flow handler, following switchTo links (e.g. emotion-weather ->
// breathing/grounding) until a concrete output is produced, and computes the
// state to persist for the next turn (null when the flow is finished).
export function handleFlow(state: FlowState, rawMessage: string): FlowResult {
  let current: FlowState = state;
  let output = runFlow(current, rawMessage);
  while (output.switchTo) {
    current = { flowId: output.switchTo, step: "start", data: current.data };
    output = runFlow(current, "");
  }
  const nextState: FlowState | null = output.nextStep
    ? {
        flowId: current.flowId,
        step: output.nextStep,
        data: { ...current.data, ...output.data },
      }
    : null;
  return { output, nextState };
}