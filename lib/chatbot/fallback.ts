import { t, type Locale } from "@/lib/i18n";

export function fallbackMessage(locale: Locale = "fr"): string {
  return t(locale, "fallback");
}
