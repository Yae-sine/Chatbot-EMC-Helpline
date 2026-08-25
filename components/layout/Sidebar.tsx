"use client";

import { useRef } from "react";
import { ShieldAlert, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Footer } from "@/components/layout/Footer";
import { EMERGENCY_NUMBERS } from "@/lib/ui/emergency";
import { useFocusTrap } from "@/lib/ui/use-focus-trap";
import { useMediaQuery } from "@/lib/ui/use-media-query";
import { TOPICS } from "@/lib/suggestions";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  onSelectPrompt: (prompt: string) => void;
}

export function Sidebar({ open, onClose, onSelectPrompt }: SidebarProps) {
  const panelRef = useRef<HTMLElement>(null);
  const isDesktop = useMediaQuery("(min-width: 64rem)");

  // Below `lg` the panel is a modal drawer; at `lg` and above it is a static
  // landmark and must not trap focus or swallow Escape.
  const isModal = !isDesktop;
  useFocusTrap(panelRef, isModal && open, onClose);

  // While closed on mobile the panel used to stay tabbable behind the viewport
  // edge — a keyboard user tabbed into invisible controls.
  const hidden = isModal && !open;

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
        ref={panelRef}
        aria-label={t("fr", "sidebarTitle")}
        {...(isModal ? { role: "dialog" as const, "aria-modal": true } : {})}
        inert={hidden}
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-80 max-w-[85vw] shrink-0 overflow-y-auto border-r bg-card transition-transform duration-200 lg:static lg:z-auto lg:w-72 lg:max-w-none lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-14 items-center justify-between border-b px-4 lg:hidden">
          <span className="text-sm font-semibold">{t("fr", "sidebarTitle")}</span>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label={t("fr", "closeMenu")}>
            <X aria-hidden="true" />
          </Button>
        </div>

        <div className="space-y-7 p-4">
          <section>
            {/* Below lg the drawer's own header bar already states this. */}
            <h2 className="hidden text-xs font-semibold tracking-wider text-muted-foreground uppercase lg:block">
              {t("fr", "sidebarTitle")}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground lg:mt-2">
              {t("fr", "sidebarAboutText")}
            </p>
          </section>

          <section>
            <h2
              id="sidebar-topics"
              className="text-xs font-semibold tracking-wider text-muted-foreground uppercase"
            >
              {t("fr", "sidebarTopics")}
            </h2>
            <p id="sidebar-topics-hint" className="mt-1.5 text-xs text-muted-foreground">
              {t("fr", "sidebarTopicsHint")}
            </p>
            <ul aria-labelledby="sidebar-topics" className="mt-2.5 space-y-0.5">
              {TOPICS.map((topic) => (
                <li key={topic.key}>
                  <button
                    type="button"
                    onClick={() => onSelectPrompt(topic.prompt)}
                    aria-describedby="sidebar-topics-hint"
                    className="flex min-h-10 w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    <topic.icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <span className="truncate">{t("fr", topic.labelKey)}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-xl border border-emergency-border bg-emergency-soft p-4">
            <div className="flex items-center gap-2 text-emergency">
              <ShieldAlert className="size-4 shrink-0" aria-hidden="true" />
              <h2 className="text-sm font-semibold">{t("fr", "sidebarSafety")}</h2>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-emergency">
              {t("fr", "sidebarSafetyText")}
            </p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {EMERGENCY_NUMBERS.map(({ numberKey, callLabelKey }) => {
                const number = t("fr", numberKey);
                return (
                  <li key={numberKey}>
                    <a
                      href={`tel:${number}`}
                      aria-label={t("fr", callLabelKey)}
                      className="inline-flex min-h-10 items-center rounded-lg border border-emergency-border bg-background/60 px-3.5 text-sm font-semibold tabular-nums text-emergency transition-colors hover:bg-background focus-visible:ring-2 focus-visible:ring-emergency-accent focus-visible:ring-offset-1 focus-visible:ring-offset-emergency-soft focus-visible:outline-none"
                    >
                      {number}
                    </a>
                  </li>
                );
              })}
            </ul>
          </section>

          <Footer />
        </div>
      </aside>
    </>
  );
}
