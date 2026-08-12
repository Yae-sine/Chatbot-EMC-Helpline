"use client";

import { Menu, RotateCcw } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/ui/Logo";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { t } from "@/lib/i18n";

interface HeaderProps {
  onNewChat: () => void;
  onOpenSidebar: () => void;
}

export function Header({ onNewChat, onOpenSidebar }: HeaderProps) {
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
          <Menu />
        </Button>

        <div className="flex min-w-0 items-center gap-3">
          <Logo
            src="/EMC_Helpline.png"
            alt="EMC Helpline"
            sizes="2.5rem"
            className="size-10 rounded-lg border border-border bg-card p-1.5 shadow-sm"
          />
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-semibold tracking-tight">
              {t("fr", "chatTitle")}
            </p>
            <p className="hidden truncate text-xs text-muted-foreground sm:block">
              {t("fr", "chatSubtitle")}
            </p>
          </div>
        </div>

        <Badge variant="success" className="ml-2 hidden md:inline-flex">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500 opacity-60" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
          </span>
          {t("fr", "statusReady")}
        </Badge>

        <div className="ml-auto flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={onNewChat} className="gap-2">
            <RotateCcw />
            <span className="hidden sm:inline">{t("fr", "newChat")}</span>
          </Button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
