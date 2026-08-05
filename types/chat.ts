export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  isCrisis?: boolean;
}

export interface ChatResponse {
  text: string;
  isCrisis: boolean;
}
