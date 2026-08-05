import { SUGGESTIONS } from "@/lib/suggestions";
import { t } from "@/lib/i18n";

interface SuggestionCardsProps {
  onSelect: (prompt: string) => void;
}

export function SuggestionCards({ onSelect }: SuggestionCardsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {SUGGESTIONS.map((suggestion) => (
        <button
          key={suggestion.key}
          type="button"
          onClick={() => onSelect(suggestion.prompt)}
          className="group flex items-start gap-3 rounded-xl border border-border bg-card p-4 text-left shadow-sm transition-colors hover:border-primary/40 hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-transform group-hover:scale-105">
            <suggestion.icon className="size-4" />
          </span>
          <span>
            <span className="block text-sm font-medium">{t("fr", suggestion.titleKey)}</span>
            <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
              {t("fr", suggestion.descriptionKey)}
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}
