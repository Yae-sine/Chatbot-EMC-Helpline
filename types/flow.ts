export type FlowId =
  | "parcours-technique"
  | "parcours-juridique"
  | "parcours-informatif"
  | "parcours-psychologique"
  | "guided-qualification"
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
  // Set when the current turn should leave the flow and be handled by the
  // general matcher instead (used by the guided tree: free text mid-tree
  // abandons the tree and gets a normal Q&A answer).
  fallbackToMatcher?: boolean;
  // Set when the message matched none of the options this step offers. The
  // route uses it to decide whether the knowledge base can answer the message
  // instead — flows stay pure and never call the matcher themselves
  // (AGENTS.md §11).
  unmatched?: boolean;
  // Marks a turn that guides a timed exercise, so the client can render the
  // matching companion. Set only on the exercise's own guided steps, never on
  // the menus or closing lines the same flow also serves — those keep the
  // flow's id but are not the exercise.
  exercise?: FlowId;
}