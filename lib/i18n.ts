const fr = {
  fallback:
    "Je n'ai pas bien compris votre demande. Pouvez-vous reformuler votre message avec d'autres mots ? Je peux vous aider sur les parcours suivants : technique, juridique, informatif, psychologique et parental.",
  emptyMessage:
    "Je n'ai pas bien compris votre demande. Pouvez-vous reformuler votre message ?",
  farewell:
    "De rien. N'oubliez pas : l'EMC-Helpline est disponible 24h/24 et 7j/7, ainsi que le numéro vert 2511 de l'ONDE. Si vous en ressentez le besoin plus tard, je serai là.",
  chatTitle: "EMC Helpline",
  chatSubtitle: "Espace Maroc Cyberconfiance",
  statusReady: "Base de connaissances prête",
  newChat: "Nouvelle conversation",
  openMenu: "Ouvrir le menu latéral",
  closeMenu: "Fermer le menu latéral",
  themeToggle: "Basculer entre les thèmes clair et sombre",
  inputPlaceholder: "Écrivez votre message…",
  inputHint: "Entrée pour envoyer",
  sendButton: "Envoyer le message",
  typing: "L'assistant écrit…",
  breathingInhale: "Inspirez lentement…",
  breathingHold: "Retenez votre souffle…",
  breathingExhale: "Expirez lentement…",
  crisisNotice: "Réponse d'urgence — ressources à contacter",
  greeting:
    "Bonjour, je suis l'assistant de l'EMC-Helpline — Espace Maroc Cyberconfiance (CMRPI). Je suis un assistant automatisé : je fournis des informations sur la cyberviolence, le signalement, le cadre juridique et le soutien psychologique, mais je ne remplace pas une aide humaine. En cas d'urgence — danger immédiat ou détresse psychologique — contactez sans attendre le numéro vert 2511 (ONDE), la Police au 19 ou la Gendarmerie Royale au 177. Comment puis-je vous aider ?",
  greetingHint: "Choisissez l'option ci-dessous ou écrivez librement.",
  guidedStartPrompt: "Aidez-moi à comprendre ma situation",
  topicPresentation: "Présentation de l'EMC",
  topicAide: "Signaler & être aidé",
  topicJuridique: "Cadre juridique",
  topicPsychologique: "Santé & bien-être",
  topicInformatif: "Comprendre",
  topicPrevention: "Prévention & parentalité",
  sidebarTitle: "À propos de ce chatbot",
  sidebarAboutText:
    "Assistant d'information conçu par le CMRPI / Espace Maroc Cyberconfiance pour orienter les victimes de cyberviolence, leurs proches et les professionnels.",
  sidebarTopics: "Sujets abordés",
  sidebarSafety: "En cas d'urgence",
  sidebarSafetyText:
    "Danger immédiat ? Contactez la Police (19), la Gendarmerie Royale (177) ou le numéro vert ONDE (2511).",
  sidebarVersion: "Application",
  sidebarVersionValue: "EMC Helpline · 0.2.0",
  footerText:
    "EMC Helpline — CMRPI · Assistant d'information. Aucune donnée personnelle n'est enregistrée.",
} as const;

export type TranslationKey = keyof typeof fr;

export type Locale = "fr" | "ar";

const ar: Record<TranslationKey, string> = {
  // TODO(ar): Arabic i18n is scaffolded but not filled in this phase (AGENTS.md §13).
  fallback: "",
  emptyMessage: "",
  farewell: "",
  chatTitle: "",
  chatSubtitle: "",
  statusReady: "",
  newChat: "",
  openMenu: "",
  closeMenu: "",
  themeToggle: "",
  inputPlaceholder: "",
  inputHint: "",
  sendButton: "",
  typing: "",
  breathingInhale: "",
  breathingHold: "",
  breathingExhale: "",
  crisisNotice: "",
  greeting: "",
  greetingHint: "",
  guidedStartPrompt: "",
  topicPresentation: "",
  topicAide: "",
  topicJuridique: "",
  topicPsychologique: "",
  topicInformatif: "",
  topicPrevention: "",
  sidebarTitle: "",
  sidebarAboutText: "",
  sidebarTopics: "",
  sidebarSafety: "",
  sidebarSafetyText: "",
  sidebarVersion: "",
  sidebarVersionValue: "",
  footerText: "",
};

const dictionaries: Record<Locale, Record<TranslationKey, string>> = { fr, ar };

export function t(locale: Locale, key: TranslationKey): string {
  return dictionaries[locale][key];
}
