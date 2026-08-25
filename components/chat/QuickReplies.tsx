import { t } from "@/lib/i18n";

interface QuickRepliesProps {
  options: string[];
  onSelect: (option: string) => void;
  /** Optional line shown above the pills (used once, under the greeting). */
  hint?: string;
}

export function QuickReplies({ options, onSelect, hint }: QuickRepliesProps) {
  return (
    <div className="animate-message-in">
      {hint && <p className="mb-2 text-xs text-muted-foreground">{hint}</p>}
      <ul aria-label={t("fr", "quickRepliesLabel")} className="flex flex-wrap gap-2">
        {options.map((option, index) => (
          <li key={option}>
            <button
              type="button"
              onClick={() => onSelect(option)}
              // Staggered so a six-pill resources menu resolves as a sequence
              // rather than a wall; capped so the last pill is never slow.
              style={{ animationDelay: `${Math.min(index, 5) * 40}ms` }}
              className="inline-flex min-h-10 animate-emerge items-center rounded-full border border-border bg-card px-4 text-sm font-medium text-card-foreground shadow-raise transition-colors hover:border-primary/50 hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              {option}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
