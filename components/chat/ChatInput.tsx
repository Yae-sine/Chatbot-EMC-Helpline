"use client";

import { useEffect, useRef } from "react";
import { ArrowUp, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { t } from "@/lib/i18n";

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: (text: string) => void;
  disabled?: boolean;
  focusSignal?: number;
}

export function ChatInput({ value, onChange, onSend, disabled, focusSignal }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [value]);

  useEffect(() => {
    if (focusSignal) textareaRef.current?.focus();
  }, [focusSignal]);

  const canSend = value.trim().length > 0 && !disabled;

  const submit = () => {
    if (!canSend) return;
    onSend(value);
    onChange("");
  };

  return (
    <div className="border-t bg-background/85 px-4 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/70 sm:px-6">
      <div className="mx-auto w-full max-w-3xl">
        <div className="flex items-end gap-2 rounded-2xl border border-border bg-card p-2 shadow-sm transition-colors focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-ring/30">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                submit();
              }
            }}
            placeholder={t("fr", "inputPlaceholder")}
            aria-label={t("fr", "inputPlaceholder")}
            rows={1}
            disabled={disabled}
            className="max-h-40 flex-1 resize-none bg-transparent px-3 py-2 text-sm leading-relaxed text-foreground outline-none placeholder:text-muted-foreground disabled:opacity-60"
          />
          <Button
            type="submit"
            onClick={submit}
            disabled={!canSend}
            size="icon"
            aria-label={t("fr", "sendButton")}
            className="shrink-0 rounded-xl"
          >
            {disabled ? <LoaderCircle className="animate-spin" /> : <ArrowUp />}
          </Button>
        </div>
        <p className="mt-2 text-center text-xs text-muted-foreground">{t("fr", "inputHint")}</p>
      </div>
    </div>
  );
}
