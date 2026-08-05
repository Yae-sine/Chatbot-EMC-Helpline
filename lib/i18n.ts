const fr = {
  fallback:
    "Je n'ai pas bien compris votre demande. Pouvez-vous reformuler votre message avec d'autres mots ? Je peux vous aider sur les parcours suivants : technique, juridique, informatif, psychologique et parental.",
  emptyMessage:
    "Je n'ai pas bien compris votre demande. Pouvez-vous reformuler votre message ?",
  chatTitle: "EMC Helpline",
  chatSubtitle: "Espace Maroc Cyberconfiance",
  inputPlaceholder: "Écrivez votre message…",
  sendButton: "Envoyer",
  typing: "L'assistant écrit…",
} as const;

export type TranslationKey = keyof typeof fr;

export type Locale = "fr" | "ar";

const ar: Record<TranslationKey, string> = {
  // TODO(ar): Arabic i18n is scaffolded but not filled in this phase (AGENTS.md §13).
  fallback: "",
  emptyMessage: "",
  chatTitle: "",
  chatSubtitle: "",
  inputPlaceholder: "",
  sendButton: "",
  typing: "",
};

const dictionaries: Record<Locale, Record<TranslationKey, string>> = { fr, ar };

export function t(locale: Locale, key: TranslationKey): string {
  return dictionaries[locale][key];
}
