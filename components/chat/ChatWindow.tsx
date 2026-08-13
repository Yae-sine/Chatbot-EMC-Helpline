"use client";

import { useEffect, useMemo, useRef } from "react";
import { MessageBubble } from "./MessageBubble";
import { ChatInput } from "./ChatInput";
import { TypingIndicator } from "./TypingIndicator";
import { QuickReplies } from "./QuickReplies";
import type { ChatMessage } from "@/types/chat";

interface ChatWindowProps {
  messages: ChatMessage[];
  isTyping: boolean;
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
  inputValue,
  onInputChange,
  onSend,
  composerFocusSignal,
}: ChatWindowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const groups = useMemo(() => buildGroups(messages), [messages]);
  const last = messages[messages.length - 1];
  const activeOptions =
    last && last.role === "assistant" && last.options && last.options.length > 0
      ? last.options
      : [];

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, isTyping]);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div ref={scrollRef} className="chat-scroll flex-1 overflow-y-auto scroll-smooth">
        <div className="mx-auto w-full max-w-3xl space-y-4 px-4 py-6 sm:px-6">
            {groups.map((group) => (
              <div key={group[0].id}>
                {group.map((message, index) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    showAvatar={index === 0}
                  />
                ))}
                <div
                  className={
                    group[0].role === "user" ? "mt-1 pr-2 text-right" : "mt-1 pl-11"
                  }
                >
                  <span className="text-[11px] text-muted-foreground">
                    {group[0].timestamp}
                  </span>
                </div>
              </div>
            ))}
            {isTyping && <TypingIndicator />}
          </div>
      </div>
      {activeOptions.length > 0 && (
        <div className="pb-3">
          <QuickReplies options={activeOptions} onSelect={onSend} />
        </div>
      )}
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
