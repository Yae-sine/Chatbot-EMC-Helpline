import { RotateCcw, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface SystemNoticeProps {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

/**
 * A client-side failure is not something the assistant said. It used to be
 * pushed into the thread as an assistant message ("je n'ai pas bien compris"),
 * which told the user their words were the problem when the network was. This
 * row is deliberately not a message bubble.
 */
export function SystemNotice({ message, actionLabel, onAction }: SystemNoticeProps) {
  return (
    <div
      role="alert"
      className="flex animate-message-in flex-col gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
    >
      <p className="flex items-start gap-2.5 text-sm leading-relaxed">
        <WifiOff className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
        {message}
      </p>
      {onAction && actionLabel && (
        <Button variant="outline" size="sm" onClick={onAction} className="shrink-0 gap-2">
          <RotateCcw aria-hidden="true" />
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
