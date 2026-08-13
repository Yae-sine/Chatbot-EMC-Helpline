export type FlowId =
  | "parcours-technique"
  | "parcours-juridique"
  | "parcours-informatif"
  | "parcours-psychologique"
  | "emotion-weather"
  | "grounding-5-4-3-2-1"
  | "breathing-4-2-6";

// In-memory conversational state for multi-step flows (see lib/chatbot/session.ts).
// Only contains routing data (current step, qualification answers, chosen emotion),
// never raw user messages or personally identifiable content.
export interface FlowState {
  flowId: FlowId;
  step: string;
  data: Record<string, string>;
}

export interface FlowOutput {
  text: string;
  options?: string[];
  // Internal id of the next step; when absent the flow is finished.
  nextStep?: string;
  // Extra data to merge into the flow state for the next step.
  data?: Record<string, string>;
  // Switch to another flow (used by the emotion-weather flow to launch
  // the breathing / grounding exercise and by parcours cross-links).
  switchTo?: FlowId;
}