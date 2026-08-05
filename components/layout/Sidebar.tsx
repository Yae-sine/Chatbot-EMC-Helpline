"use client";

import { ShieldAlert, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { TOPICS } from "@/lib/suggestions";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  onSelectPrompt: (prompt: string) => void;
}

export function Sidebar({ open, onClose, onSelectPrompt }: SidebarProps) {
  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        aria-label={t("fr", "sidebarTitle")}
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 shrink-0 overflow-y-auto border-r bg-card transition-transform duration-200 lg:static lg:z-auto lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-14 items-center justify-between border-b px-4 lg:hidden">
          <span className="text-sm font-semibold">{t("fr", "sidebarTitle")}</span>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label={t("fr", "closeMenu")}>
            <X />
          </Button>
        </div>

        <div className="space-y-6 p-4">
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t("fr", "sidebarTitle")}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {t("fr", "sidebarAboutText")}
            </p>
          </section>

          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t("fr", "sidebarTopics")}
            </h2>
            <ul className="mt-2 space-y-1">
              {TOPICS.map((topic) => (
                <li key={topic.key}>
                  <button
                    type="button"
                    onClick={() => onSelectPrompt(topic.prompt)}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <topic.icon className="size-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{t("fr", topic.labelKey)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-xl border border-amber-300/40 bg-amber-50 p-4 dark:border-amber-400/25 dark:bg-amber-400/10">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
              <ShieldAlert className="size-4" />
              <h2 className="text-sm font-semibold">{t("fr", "sidebarSafety")}</h2>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-amber-800/90 dark:text-amber-200/90">
              {t("fr", "sidebarSafetyText")}
            </p>
          </section>

          <section>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {t("fr", "sidebarVersion")}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("fr", "sidebarVersionValue")}
            </p>
          </section>
        </div>
      </aside>
    </>
  );
}
