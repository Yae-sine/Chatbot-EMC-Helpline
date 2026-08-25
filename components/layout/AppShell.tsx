"use client";

import { useCallback, useRef, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { createGreeting, currentTime } from "@/lib/ui/greeting";
import { t } from "@/lib/i18n";
import type { ChatMessage, ChatResponse } from "@/types/chat";

export function AppShell() {
  const [messages, setMessages] = useState<ChatMessage[]>(() => [createGreeting()]);
  const [isTyping, setIsTyping] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [composerFocusSignal, setComposerFocusSignal] = useState(0);
  const [sessionId, setSessionId] = useState(() => crypto.randomUUID());
  // Set only for client-side transport failures; a server answer, including a
  // 400, is a message and goes into the thread as one.
  const [failedMessage, setFailedMessage] = useState<string | null>(null);

  const inFlight = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isTyping) return;

      setFailedMessage(null);
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "user", text: trimmed, timestamp: currentTime() },
      ]);
      setIsTyping(true);

      const controller = new AbortController();
      inFlight.current = controller;

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: trimmed, sessionId }),
          signal: controller.signal,
        });
        const data = (await res.json()) as ChatResponse;
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            text: data.text,
            isCrisis: data.isCrisis,
            options: data.options,
            flowId: data.flowId,
            exercise: data.exercise,
            mode: data.mode,
            matchedId: data.matchedId,
            confidence: data.confidence,
            timestamp: currentTime(),
          },
        ]);
      } catch (error) {
        // An abort is a deliberate reset, not a failure to report.
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setFailedMessage(trimmed);
        }
      } finally {
        if (inFlight.current === controller) inFlight.current = null;
        setIsTyping(false);
      }
    },
    [isTyping, sessionId],
  );

  const retry = useCallback(() => {
    if (!failedMessage) return;
    // The failed turn's own user bubble is already in the thread; drop it so
    // the retry does not duplicate it.
    setMessages((prev) => {
      const last = prev[prev.length - 1];
      return last && last.role === "user" && last.text === failedMessage
        ? prev.slice(0, -1)
        : prev;
    });
    const text = failedMessage;
    setFailedMessage(null);
    void sendMessage(text);
  }, [failedMessage, sendMessage]);

  const selectPrompt = (prompt: string) => {
    setInputValue(prompt);
    setComposerFocusSignal((signal) => signal + 1);
    setSidebarOpen(false);
  };

  const newChat = () => {
    inFlight.current?.abort();
    inFlight.current = null;
    setMessages([createGreeting()]);
    setInputValue("");
    setFailedMessage(null);
    setIsTyping(false);
    setSessionId(crypto.randomUUID());
  };

  return (
    <div className="flex h-dvh flex-col bg-background text-foreground">
      <a
        href="#conversation"
        className="sr-only rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50"
      >
        {t("fr", "skipToConversation")}
      </a>

      <Header
        onNewChat={newChat}
        onOpenSidebar={() => setSidebarOpen(true)}
        canReset={messages.some((message) => message.role === "user")}
      />

      <div className="mx-auto flex w-full max-w-[1440px] min-h-0 flex-1">
        <Sidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          onSelectPrompt={selectPrompt}
        />
        <main className="flex min-w-0 flex-1 flex-col">
          <ChatWindow
            messages={messages}
            isTyping={isTyping}
            hasError={failedMessage !== null}
            onRetry={retry}
            inputValue={inputValue}
            onInputChange={setInputValue}
            onSend={sendMessage}
            composerFocusSignal={composerFocusSignal}
          />
        </main>
      </div>
    </div>
  );
}
