import { t } from "@/lib/i18n";
import type { ChatMessage } from "@/types/chat";

export const GREETING_ID = "greeting-initial";

export function currentTime(): string {
  return new Date().toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Greeting pushed at the start of every conversation: the guide requires the
 * chatbot to state its limits (automated assistant) and the emergency numbers
 * explicitly from the very first message.
 *
 * A factory rather than a module constant — the previous constant froze its
 * timestamp at module-evaluation time and handed the same stale value back on
 * every "Nouvelle conversation".
 */
export function createGreeting(): ChatMessage {
  return {
    id: GREETING_ID,
    role: "assistant",
    text: t("fr", "greeting"),
    // Launch trigger for the guided qualification tree (see lib/chatbot/flows/guided.ts).
    options: [t("fr", "guidedStartPrompt")],
    timestamp: currentTime(),
  };
}
