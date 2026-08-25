import { TriangleAlert } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Logo } from "@/components/ui/Logo";
import { MessageText } from "@/components/chat/MessageText";
import { BreathingPulse } from "@/components/chat/BreathingPulse";
import { cn } from "@/lib/utils";
import { t } from "@/lib/i18n";
import type { ChatMessage } from "@/types/chat";

interface MessageBubbleProps {
  message: ChatMessage;
  /** First message of a same-role run: it carries the avatar, name and time. */
  isGroupStart?: boolean;
}

function Timestamp({ value, className }: { value: string; className?: string }) {
  return (
    <span className={cn("text-[11px] tabular-nums text-muted-foreground", className)}>
      {value}
    </span>
  );
}

export function MessageBubble({ message, isGroupStart = true }: MessageBubbleProps) {
  if (message.role === "user") {
    return (
      <div className={cn("flex animate-message-in flex-col items-end", !isGroupStart && "mt-1.5")}>
        {isGroupStart && message.timestamp && (
          <Timestamp value={message.timestamp} className="mb-1 pr-1" />
        )}
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-bubble-user px-4 py-2.5 text-message text-bubble-user-foreground shadow-raise">
          <MessageText text={message.text} />
        </div>
      </div>
    );
  }

  return (
    <article className={cn("animate-message-in", !isGroupStart && "mt-3")}>
      {isGroupStart && (
        <div className="mb-2 flex items-center gap-2.5">
          <Avatar className="size-7 rounded-lg">
            <Logo src="/EMC_Helpline.png" alt="" sizes="1.75rem" className="size-7 p-0.5" />
          </Avatar>
          <span className="text-xs font-semibold">{t("fr", "assistantName")}</span>
          {message.timestamp && <Timestamp value={message.timestamp} />}
        </div>
      )}

      {message.isCrisis ? (
        // The one filled, bordered treatment left in the conversation: now that
        // ordinary answers are borderless prose, the crisis panel is the only
        // thing on screen shaped like an alert. `role="alert"` nests inside the
        // log's polite live region, so it is announced assertively and once.
        <div
          data-crisis
          role="alert"
          className="overflow-hidden rounded-xl border border-bubble-crisis-accent/40 bg-bubble-crisis text-bubble-crisis-foreground shadow-raise"
        >
          <div className="border-l-[5px] border-bubble-crisis-accent px-4 py-3.5 sm:px-5">
            <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide">
              <TriangleAlert className="size-4 shrink-0" aria-hidden="true" />
              {t("fr", "crisisNotice")}
            </p>
            <MessageText text={message.text} className="text-message" />
          </div>
        </div>
      ) : (
        <div className="max-w-[60ch] text-message text-foreground">
          <MessageText text={message.text} />
          {message.flowId === "breathing-4-2-6" && <BreathingPulse />}
        </div>
      )}
    </article>
  );
}
