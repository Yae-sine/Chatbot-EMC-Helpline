"use client";

import { useMemo } from "react";
import { ArrowDown } from "lucide-react";
import { MessageBubble } from "./MessageBubble";
import { ChatInput } from "./ChatInput";
import { TypingIndicator } from "./TypingIndicator";
import { QuickReplies } from "./QuickReplies";
import { SystemNotice } from "./SystemNotice";
import { useStickToBottom } from "@/lib/ui/use-stick-to-bottom";
import { GREETING_ID } from "@/lib/ui/greeting";
import { t } from "@/lib/i18n";
import type { ChatMessage } from "@/types/chat";

interface ChatWindowProps {
  messages: ChatMessage[];
  isTyping: boolean;
  hasError: boolean;
  onRetry: () => void;
  inputValue: string;
  onInputChange: (value: string) => void;
  onSend: (text: string) => void;
  composerFocusSignal: number;
}

function buildGroups(messages: ChatMessage[]): ChatMessage[][] {
  const groups: ChatMessage[][] = [];
  for (const message of messages) {
    const last = groups[groups.length - 1];
    if (last && last[0].role === message.role) {
      last.push(message);
    } else {
      groups.push([message]);
    }
  }
  return groups;
}

export function ChatWindow({
  messages,
  isTyping,
  hasError,
  onRetry,
  inputValue,
  onInputChange,
  onSend,
  composerFocusSignal,
}: ChatWindowProps) {
  const groups = useMemo(() => buildGroups(messages), [messages]);
  const last = messages[messages.length - 1];
  const activeOptions =
    last && last.role === "assistant" && last.options && last.options.length > 0
      ? last.options
      : [];

  const { scrollRef, atBottom, scrollToBottom } = useStickToBottom<HTMLDivElement>(
    `${messages.length}:${isTyping}:${hasError}`,
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="relative min-h-0 flex-1">
        <div
          ref={scrollRef}
          className="chat-scroll absolute inset-0 overflow-y-auto"
        >
          {/* role="log" carries an implicit polite live region, so an arriving
              answer is announced. A crisis message's own role="alert" nests
              inside it and takes over for that subtree. */}
          <div
            id="conversation"
            role="log"
            aria-label={t("fr", "conversationLabel")}
            className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6 sm:px-6"
          >
            {groups.map((group) => (
              <div key={group[0].id}>
                {group.map((message, index) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    isGroupStart={index === 0}
                    isLatest={message.id === last?.id}
                  />
                ))}
              </div>
            ))}

            {isTyping && <TypingIndicator />}

            {!isTyping && activeOptions.length > 0 && (
              <QuickReplies
                options={activeOptions}
                onSelect={onSend}
                hint={last?.id === GREETING_ID ? t("fr", "greetingHint") : undefined}
              />
            )}

            {hasError && (
              <SystemNotice
                message={t("fr", "networkError")}
                actionLabel={t("fr", "retry")}
                onAction={onRetry}
              />
            )}
          </div>
        </div>

        {!atBottom && (
          <button
            type="button"
            onClick={scrollToBottom}
            aria-label={t("fr", "scrollToLatest")}
            className="absolute bottom-3 left-1/2 flex size-10 -translate-x-1/2 items-center justify-center rounded-full border border-border bg-card text-card-foreground shadow-overlay transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <ArrowDown className="size-4" aria-hidden="true" />
          </button>
        )}
      </div>

      <ChatInput
        value={inputValue}
        onChange={onInputChange}
        onSend={onSend}
        disabled={isTyping}
        focusSignal={composerFocusSignal}
      />
    </div>
  );
}
