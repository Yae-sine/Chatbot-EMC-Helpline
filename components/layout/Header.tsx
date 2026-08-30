"use client";

import { useState } from "react";
import { Menu, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { t } from "@/lib/i18n";

interface HeaderProps {
  onNewChat: () => void;
  onOpenSidebar: () => void;
  /** True once the thread holds something worth losing. */
  canReset: boolean;
}

export function Header({ onNewChat, onOpenSidebar, canReset }: HeaderProps) {
  const [confirming, setConfirming] = useState(false);

  const requestReset = () => {
    // Wiping a conversation someone is in the middle of is not undoable, and a
    // mis-tap in the header is easy on a phone.
    if (canReset) setConfirming(true);
    else onNewChat();
  };

  const confirmReset = () => {
    setConfirming(false);
    onNewChat();
  };

  return (
    <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center gap-3 px-4 sm:px-6">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onOpenSidebar}
          aria-label={t("fr", "openMenu")}
        >
          <Menu aria-hidden="true" />
        </Button>

        <div className="flex min-w-0 items-center gap-3">
          <Logo
            src="/EMC_Helpline.png"
            alt=""
            sizes="2.5rem"
            className="size-10 rounded-lg border border-border bg-card p-1.5 shadow-raise"
          />
          <div className="min-w-0 leading-tight">
            <h1 className="truncate text-sm font-semibold tracking-tight">
              {t("fr", "chatTitle")}
            </h1>
            <p className="hidden truncate text-xs text-muted-foreground sm:block">
              {t("fr", "chatSubtitle")}
            </p>
          </div>
        </div>


        <div className="ml-auto flex items-center gap-1">
          <div
            className="relative"
            onKeyDown={(event) => {
              if (event.key === "Escape" && confirming) {
                event.stopPropagation();
                setConfirming(false);
              }
            }}
          >
            <Button
              variant="ghost"
              size="sm"
              onClick={requestReset}
              aria-expanded={confirming}
              className="gap-2"
            >
              <RotateCcw aria-hidden="true" />
              <span className="hidden sm:inline">{t("fr", "newChat")}</span>
            </Button>

            {confirming && (
              <div
                role="dialog"
                aria-label={t("fr", "newChatQuestion")}
                className="absolute top-full right-0 z-40 mt-2 w-64 rounded-xl border border-border bg-card p-3 shadow-overlay"
              >
                <p className="text-sm leading-relaxed">{t("fr", "newChatQuestion")}</p>
                <div className="mt-3 flex justify-end gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
                    {t("fr", "newChatCancel")}
                  </Button>
                  <Button variant="destructive" size="sm" autoFocus onClick={confirmReset}>
                    {t("fr", "newChatConfirm")}
                  </Button>
                </div>
              </div>
            )}
          </div>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
