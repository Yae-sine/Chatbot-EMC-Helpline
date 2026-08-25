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

/** Auto-grow ceiling; past it the textarea scrolls internally. */
const MAX_HEIGHT_PX = 200;

export function ChatInput({ value, onChange, onSend, disabled, focusSignal }: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT_PX)}px`;
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
    <div className="border-t bg-background/85 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur supports-[backdrop-filter]:bg-background/70 sm:px-6 sm:pb-4">
      <div className="mx-auto w-full max-w-3xl">
        <div className="flex items-end gap-2 rounded-2xl border border-border bg-card p-2 shadow-raise transition-colors focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-ring/30">
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
            aria-describedby="composer-hint"
            rows={1}
            disabled={disabled}
            // text-base below sm: anything smaller makes iOS Safari zoom the
            // viewport on focus, which breaks the h-dvh shell.
            className="max-h-[200px] flex-1 resize-none bg-transparent px-3 py-2 text-base leading-relaxed text-foreground outline-none placeholder:text-muted-foreground disabled:opacity-60 sm:text-message"
          />
          <Button
            onClick={submit}
            disabled={!canSend}
            size="icon"
            aria-label={t("fr", "sendButton")}
            className="size-10 shrink-0 rounded-xl"
          >
            {disabled ? (
              <LoaderCircle className="animate-spin" aria-hidden="true" />
            ) : (
              <ArrowUp aria-hidden="true" />
            )}
          </Button>
        </div>
        {/* Hidden where there is no Enter key to speak of. */}
        <p
          id="composer-hint"
          className="mt-2 hidden text-center text-xs text-muted-foreground sm:block"
        >
          {t("fr", "inputHint")}
        </p>
      </div>
    </div>
  );
}
