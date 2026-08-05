import { ShieldCheck } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { t } from "@/lib/i18n";

export function TypingIndicator() {
  return (
    <div className="flex animate-message-in items-start gap-3" aria-live="polite">
      <Avatar className="size-8 shrink-0">
        <ShieldCheck className="size-4" />
      </Avatar>
      <div className="flex items-center gap-1 rounded-2xl rounded-tl-md border border-border bg-card px-4 py-4 shadow-sm">
        <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground" />
        <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:120ms]" />
        <span className="size-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:240ms]" />
        <span className="sr-only">{t("fr", "typing")}</span>
      </div>
    </div>
  );
}
