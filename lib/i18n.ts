const fr = {
  fallback:
    "Je n'ai pas bien compris votre demande. Pouvez-vous reformuler votre message avec d'autres mots ? Je peux vous aider sur les parcours suivants : technique, juridique, informatif, psychologique et parental.",
  emptyMessage:
    "Je n'ai pas bien compris votre demande. Pouvez-vous reformuler votre message ?",
  chatTitle: "EMC Helpline",
  chatSubtitle: "Espace Maroc Cyberconfiance",
  statusReady: "Base de connaissances prête",
  newChat: "Nouvelle conversation",
  openMenu: "Ouvrir le menu latéral",
  closeMenu: "Fermer le menu latéral",
  themeToggle: "Basculer entre les thèmes clair et sombre",
  inputPlaceholder: "Écrivez votre message…",
  inputHint: "Entrée pour envoyer · Maj+Entrée pour une nouvelle ligne",
  sendButton: "Envoyer le message",
  typing: "L'assistant écrit…",
  crisisNotice: "Réponse d'urgence — ressources à contacter",
  welcomeBadge: "Assistance cyberviolence & cyberharcèlement",
  welcomeTitle: "Comment pouvons-nous vous aider ?",
  welcomeDescription:
    "Posez une question sur le cyberharcèlement, le signalement de contenus, le cadre juridique ou la protection des enfants. Les réponses proviennent d'une base de connaissances validée par l'équipe de l'EMC.",
  welcomeHint:
    "Choisissez une question ci-dessous pour la placer dans le champ de saisie, ou écrivez librement.",
  suggestionEmcTitle: "Qu'est-ce que l'EMC ?",
  suggestionEmcDesc: "Présentation du service et de ses missions",
  suggestionReportTitle: "Signaler un contenu",
  suggestionReportDesc: "Photo, vidéo ou message publié en ligne",
  suggestionPlainteTitle: "Porter plainte",
  suggestionPlainteDesc: "Preuves à réunir et démarches à suivre",
  suggestionEnfantTitle: "Aider mon enfant",
  suggestionEnfantDesc: "Réagir face à un cas de harcèlement",
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
  crisisNotice: "",
  welcomeBadge: "",
  welcomeTitle: "",
  welcomeDescription: "",
  welcomeHint: "",
  suggestionEmcTitle: "",
  suggestionEmcDesc: "",
  suggestionReportTitle: "",
  suggestionReportDesc: "",
  suggestionPlainteTitle: "",
  suggestionPlainteDesc: "",
  suggestionEnfantTitle: "",
  suggestionEnfantDesc: "",
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
