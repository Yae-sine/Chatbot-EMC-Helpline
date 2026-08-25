import { Logo } from "@/components/ui/Logo";
import { t } from "@/lib/i18n";

/**
 * Rendered at the bottom of the sidebar rather than under the conversation:
 * inside the `h-dvh` shell a permanent footer cost ~74px of every screen, which
 * on a 360x640 phone is a tenth of the viewport spent on a legal line.
 */
export function Footer() {
  return (
    <footer className="space-y-3 border-t border-border pt-4">
      <div className="flex items-center gap-2.5">
        <Logo
          src="/EMC.webp"
          alt="Espace Maroc Cyberconfiance"
          sizes="8rem"
          className="h-8 w-20"
        />
        <p className="text-xs text-muted-foreground">{t("fr", "sidebarVersionValue")}</p>
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">{t("fr", "footerText")}</p>
    </footer>
  );
}
