export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  isCrisis?: boolean;
  timestamp?: string;
  options?: string[];
  flowId?: string;
}

export interface ChatResponse {
  text: string;
  isCrisis: boolean;
  options?: string[];
  flowId?: string;
}
