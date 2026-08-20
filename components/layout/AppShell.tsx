"use client";

import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { Footer } from "@/components/layout/Footer";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { t } from "@/lib/i18n";
import type { ChatMessage } from "@/types/chat";

function currentTime(): string {
  return new Date().toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Greeting pushed at the start of every conversation: the guide requires the
// chatbot to state its limits (automated assistant) and the emergency numbers
// explicitly from the very first message.
const GREETING_MESSAGE: ChatMessage = {
  id: "greeting-initial",
  role: "assistant",
  text: t("fr", "greeting"),
  // Launch trigger for the guided qualification tree (see lib/chatbot/flows/guided.ts).
  options: [t("fr", "guidedStartPrompt")],
  timestamp: currentTime(),
};

export function AppShell() {
  const [messages, setMessages] = useState<ChatMessage[]>(() => [GREETING_MESSAGE]);
  const [isTyping, setIsTyping] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [composerFocusSignal, setComposerFocusSignal] = useState(0);
  const [sessionId, setSessionId] = useState(() => crypto.randomUUID());

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isTyping) return;

    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "user", text: trimmed, timestamp: currentTime() },
    ]);
    setIsTyping(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, sessionId }),
      });
      const data = (await res.json()) as {
        text: string;
        isCrisis: boolean;
        options?: string[];
        flowId?: string;
        mode?: "static" | "llm" | "fallback";
        matchedId?: string | null;
        confidence?: number;
      };
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: data.text,
          isCrisis: data.isCrisis,
          options: data.options,
          flowId: data.flowId,
          mode: data.mode,
          matchedId: data.matchedId,
          confidence: data.confidence,
          timestamp: currentTime(),
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: t("fr", "emptyMessage"),
          timestamp: currentTime(),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const selectPrompt = (prompt: string) => {
    setInputValue(prompt);
    setComposerFocusSignal((signal) => signal + 1);
    setSidebarOpen(false);
  };

  const newChat = () => {
    setMessages([GREETING_MESSAGE]);
    setInputValue("");
    setSessionId(crypto.randomUUID());
  };

  return (
    <div className="flex h-dvh flex-col bg-background text-foreground">
      <Header onNewChat={newChat} onOpenSidebar={() => setSidebarOpen(true)} />
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
            inputValue={inputValue}
            onInputChange={setInputValue}
            onSend={sendMessage}
            composerFocusSignal={composerFocusSignal}
          />
        </main>
      </div>
      <Footer />
    </div>
  );
}
