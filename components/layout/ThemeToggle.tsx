"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { t } from "@/lib/i18n";

// The theme lives on <html>, applied by the inline script in app/layout.tsx
// before hydration — so it is external state as far as React is concerned, and
// the class is the single source of truth.
function subscribe(onStoreChange: () => void): () => void {
  const observer = new MutationObserver(onStoreChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  return () => observer.disconnect();
}

export function ThemeToggle() {
  const isDark = useSyncExternalStore(
    subscribe,
    () => document.documentElement.classList.contains("dark"),
    () => false,
  );

  const toggle = () => {
    const dark = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", dark);
    try {
      localStorage.setItem("theme", dark ? "dark" : "light");
    } catch {
      // Private mode or blocked storage: the toggle still applies this session.
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      aria-label={t("fr", "themeToggle")}
      aria-pressed={isDark}
    >
      <span className="grid place-items-center" aria-hidden="true">
        <Sun className="col-start-1 row-start-1 size-4 transition-all dark:scale-0 dark:opacity-0" />
        <Moon className="col-start-1 row-start-1 size-4 scale-0 opacity-0 transition-all dark:scale-100 dark:opacity-100" />
      </span>
    </Button>
  );
}
