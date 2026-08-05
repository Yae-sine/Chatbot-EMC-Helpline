import { ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { SuggestionCards } from "./SuggestionCards";
import { t } from "@/lib/i18n";

interface WelcomeScreenProps {
  onSelectPrompt: (prompt: string) => void;
}

export function WelcomeScreen({ onSelectPrompt }: WelcomeScreenProps) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center px-4 py-12 sm:px-6">
      <div className="w-full max-w-3xl animate-fade-in">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-sm">
            <ShieldCheck className="size-7" />
          </div>
          <Badge variant="outline" className="mb-4 border-primary/30 bg-primary/5 text-foreground">
            {t("fr", "welcomeBadge")}
          </Badge>
          <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            {t("fr", "welcomeTitle")}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-pretty text-base leading-relaxed text-muted-foreground">
            {t("fr", "welcomeDescription")}
          </p>
        </div>

        <SuggestionCards onSelect={onSelectPrompt} />

        <p className="mt-8 text-center text-sm text-muted-foreground">{t("fr", "welcomeHint")}</p>
      </div>
    </div>
  );
}
