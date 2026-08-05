export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  isCrisis?: boolean;
  timestamp?: string;
}

export interface ChatResponse {
  text: string;
  isCrisis: boolean;
}
