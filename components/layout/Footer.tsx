import { Logo } from "@/components/ui/Logo";
import { t } from "@/lib/i18n";

export function Footer() {
  return (
    <footer className="border-t bg-card">
      <div className="mx-auto flex w-full max-w-[1440px] items-center justify-center gap-3 px-4 py-4 sm:px-6">
        <Logo
          src="/EMC.webp"
          alt="Espace Maroc Cyberconfiance"
          sizes="12rem"
          className="h-10 w-28"
        />
        <p className="text-center text-xs text-muted-foreground">{t("fr", "footerText")}</p>
      </div>
    </footer>
  );
}