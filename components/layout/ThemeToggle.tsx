"use client";

import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { t } from "@/lib/i18n";

export function ThemeToggle() {
  const toggle = () => {
    const dark = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("theme", dark ? "dark" : "light");
  };

  return (
    <Button variant="ghost" size="icon" onClick={toggle} aria-label={t("fr", "themeToggle")}>
      <span className="grid place-items-center">
        <Sun className="col-start-1 row-start-1 size-4 transition-all dark:scale-0 dark:opacity-0" />
        <Moon className="col-start-1 row-start-1 size-4 scale-0 opacity-0 transition-all dark:scale-100 dark:opacity-100" />
      </span>
    </Button>
  );
}
