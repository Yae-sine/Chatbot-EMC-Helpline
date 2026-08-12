import { ShieldCheck, TriangleAlert } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { LinkifiedText } from "@/components/chat/LinkifiedText";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import type { ChatMessage } from "@/types/chat";

interface MessageBubbleProps {
  message: ChatMessage;
  showAvatar?: boolean;
}

export function MessageBubble({ message, showAvatar = true }: MessageBubbleProps) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex animate-message-in justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-bubble-user px-4 py-3 text-sm leading-relaxed text-bubble-user-foreground shadow-sm">
          <LinkifiedText text={message.text} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex animate-message-in items-start gap-3">
      <Avatar className={cn("size-8 shrink-0", !showAvatar && "invisible")}>
        <ShieldCheck className="size-4" />
      </Avatar>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl rounded-tl-md border px-4 py-3 text-sm leading-relaxed shadow-sm",
          message.isCrisis
            ? "border-destructive/30 bg-bubble-crisis text-bubble-crisis-foreground"
            : "border-border bg-card text-card-foreground",
        )}
      >
        {message.isCrisis && (
          <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide opacity-80">
            <TriangleAlert className="size-3.5 shrink-0" />
            {t("fr", "crisisNotice")}
          </p>
        )}
        <LinkifiedText text={message.text} />
      </div>
    </div>
  );
}
