import { Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { EMERGENCY_NUMBERS } from "@/lib/ui/emergency";
import { t } from "@/lib/i18n";

/**
 * Always-on emergency strip. The numbers used to live only in the sidebar,
 * which is a closed drawer below `lg` — so on a phone, the one screen where
 * someone is most likely to need them, they were two interactions away.
 */
export function EmergencyBar({ className }: { className?: string }) {
  return (
    <aside
      aria-label={t("fr", "emergencyBarLabel")}
      className={cn(
        "border-b border-emergency-border bg-emergency-soft text-emergency",
        className,
      )}
    >
      <div className="mx-auto flex w-full max-w-[1440px] items-center gap-2 px-4 py-1.5 sm:gap-3 sm:px-6">
        <span className="flex shrink-0 items-center gap-1.5 text-xs font-semibold tracking-wide uppercase">
          <Phone className="size-3.5 shrink-0" aria-hidden="true" />
          {t("fr", "emergencyLabel")}
        </span>
        <ul className="flex min-w-0 flex-1 items-center justify-end gap-1.5 sm:justify-start sm:gap-2">
          {EMERGENCY_NUMBERS.map(({ numberKey, callLabelKey }) => {
            const number = t("fr", numberKey);
            return (
              <li key={numberKey}>
                <a
                  href={`tel:${number}`}
                  aria-label={t("fr", callLabelKey)}
                  className="inline-flex min-h-9 items-center rounded-lg border border-emergency-border bg-background/60 px-3 text-sm font-semibold tabular-nums transition-colors hover:bg-background focus-visible:ring-2 focus-visible:ring-emergency-accent focus-visible:ring-offset-1 focus-visible:ring-offset-emergency-soft focus-visible:outline-none"
                >
                  {number}
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
}
