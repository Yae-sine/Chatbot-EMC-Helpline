import type { ChatMessage } from "@/types/chat";

export function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={[
          "max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed",
          isUser
            ? "rounded-br-md bg-bubble-user text-bubble-user-text"
            : message.isCrisis
              ? "rounded-bl-md bg-bubble-crisis text-bubble-crisis-text"
              : "rounded-bl-md border border-black/5 bg-bubble-bot text-foreground shadow-sm",
        ].join(" ")}
      >
        {message.text}
      </div>
    </div>
  );
}
