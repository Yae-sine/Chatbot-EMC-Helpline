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

export function AppShell() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [composerFocusSignal, setComposerFocusSignal] = useState(0);

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
        body: JSON.stringify({ message: trimmed }),
      });
      const data = (await res.json()) as { text: string; isCrisis: boolean };
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: data.text,
          isCrisis: data.isCrisis,
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
    setMessages([]);
    setInputValue("");
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
            onSelectPrompt={selectPrompt}
            composerFocusSignal={composerFocusSignal}
          />
        </main>
      </div>
      <Footer />
    </div>
  );
}
