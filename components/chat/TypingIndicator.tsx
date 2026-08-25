import { Avatar } from "@/components/ui/Avatar";
import { Logo } from "@/components/ui/Logo";
import { t } from "@/lib/i18n";

const DOT_DELAYS = ["0ms", "180ms", "360ms"];

export function TypingIndicator() {
  return (
    <div className="flex animate-message-in items-center gap-2.5">
      <Avatar className="size-7 rounded-lg">
        <Logo src="/EMC_Helpline.png" alt="" sizes="1.75rem" className="size-7 p-0.5" />
      </Avatar>
      <div role="status" className="flex items-center gap-1.5 py-1">
        {DOT_DELAYS.map((delay) => (
          <span
            key={delay}
            style={{ animationDelay: delay }}
            className="size-1.5 animate-pulse rounded-full bg-muted-foreground/70"
          />
        ))}
        <span className="sr-only">{t("fr", "typing")}</span>
      </div>
    </div>
  );
}
