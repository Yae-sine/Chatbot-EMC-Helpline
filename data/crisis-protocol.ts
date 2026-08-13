import type { CrisisCase } from "@/types/qa";

// TODO: confirm final wording with encadrante (Mme Belaous) before any real deployment.
// These messages are working proposals marked in the source knowledge base as pending her
// sign-off (see AGENTS.md §6). Do not change the wording without her validation.
//
// Keyword-style convention (mirrors qa-database.ts): the leading keywords are the validated
// triggers from AGENTS.md §6 / Ressources Chatbot.docx.pdf (critical safety protocol); the
// following ones are generated natural-language variants (same/near-identical meaning, no
// meaning drift). Over-matching is accepted by design: when in doubt, crisis detection wins
// (AGENTS.md §10) — the only requirement is that no *normal Q&A query* is intercepted.
export const CRISIS_PROTOCOL: CrisisCase[] = [
  {
    id: "physical-danger",
    keywords: [
      "danger immédiat",
      "il va me tuer",
      "il me frappe",
      "il est chez moi",
      "je ne suis pas en sécurité",
      "au secours",
      "il me menace avec une arme",
      "j'ai peur pour ma vie",
      // generated variants
      "je suis en danger immédiat",
      "il veut me tuer",
      "elle veut me tuer",
      "on veut me tuer",
      "il va me faire du mal",
      "elle va me faire du mal",
      "il me tape",
      "elle me tape",
      "il me bat",
      "elle me bat",
      "il me menace de mort",
      "elle me menace de mort",
      "on me menace de mort",
      "il me menace avec un couteau",
      "il me menace avec une arme blanche",
      "il a un couteau",
      "il m'attaque",
      "elle m'attaque",
      "on m'attaque",
      "j'ai très peur pour ma vie",
      "je suis séquestré",
      "je suis séquestrée",
    ],
    message:
      "« Ce que vous décrivez est très grave et je ne peux pas intervenir directement. Si vous êtes en danger immédiat, contactez sans attendre les services d'urgence : la Police au 19, ou la Gendarmerie Royale au 177 en milieu rural. Si un enfant est concerné, le numéro vert 2511 (ONDE) peut également vous orienter. Vous pouvez aussi solliciter l'EMC-Helpline pour un accompagnement dans les démarches qui suivront. »",
  },
  {
    id: "psychological-distress",
    keywords: [
      "mourir",
      "me tuer",
      "en finir",
      "finir avec la vie",
      "plus la force",
      "plus envie de vivre",
      "suicide",
      "suicidaire",
      "automutilation",
      "me faire du mal",
      "me scarifier",
      "je ne veux plus vivre",
      // generated variants
      "envie de mourir",
      "j'ai envie de mourir",
      "je veux mourir",
      "mettre fin à mes jours",
      "mettre fin à ma vie",
      "je veux être mort",
      "je veux être morte",
      "je préfère être mort",
      "je préfère être morte",
      "je n'ai plus la force",
      "j'ai plus la force",
      "je n'ai plus envie de vivre",
      "je pense au suicide",
      "des idées suicidaires",
      "idées suicidaires",
      "je me fais du mal",
      "je vais me faire du mal",
      "je vais me scarifier",
      "veut en finir avec la vie",
      "il veut en finir avec la vie",
      "elle veut en finir avec la vie",
    ],
    message:
      "« Ce que vous écrivez est très important et je le prends au sérieux. Je ne suis qu'un assistant automatisé et je ne peux pas vous accompagner seul dans ce moment difficile ; votre sécurité mérite l'attention d'une personne humaine, dès maintenant. Je vous invite à contacter immédiatement le numéro vert 2511 (ONDE) ou une personne de confiance. Vous n'êtes pas seul(e). »",
  },
];

// physical-danger must stay FIRST in the array: on overlap between the two cases,
// Case 2 (physical danger) takes precedence (AGENTS.md §6, §8).