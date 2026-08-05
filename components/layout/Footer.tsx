import { t } from "@/lib/i18n";

export function Footer() {
  return (
    <footer className="border-t bg-card">
      <div className="mx-auto w-full max-w-[1440px] px-4 py-3 sm:px-6">
        <p className="text-center text-xs text-muted-foreground">{t("fr", "footerText")}</p>
      </div>
    </footer>
  );
}
