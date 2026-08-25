export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  isCrisis?: boolean;
  timestamp?: string;
  options?: string[];
  flowId?: string;
  // Set while a timed exercise step is being guided (see FlowOutput.exercise).
  exercise?: string;
  mode?: "static" | "llm" | "fallback";
  matchedId?: string | null;
  confidence?: number;
}

export interface ChatResponse {
  text: string;
  isCrisis: boolean;
  options?: string[];
  flowId?: string;
  // Set while a timed exercise step is being guided (see FlowOutput.exercise).
  exercise?: string;
  mode?: "static" | "llm" | "fallback";
  matchedId?: string | null;
  confidence?: number;
}
