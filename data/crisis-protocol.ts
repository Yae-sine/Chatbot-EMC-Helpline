import type { CrisisCase } from "@/types/qa";

// TODO: confirm final wording with encadrante (Mme Belaous) before any real deployment.
// These messages are working proposals marked in the source knowledge base as pending her
// sign-off (see AGENTS.md §6). Do not change the wording without her validation.
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
    ],
    message:
      "« Ce que vous écrivez est très important et je le prends au sérieux. Je ne suis qu'un assistant automatisé et je ne peux pas vous accompagner seul dans ce moment difficile ; votre sécurité mérite l'attention d'une personne humaine, dès maintenant. Je vous invite à contacter immédiatement le numéro vert 2511 (ONDE) ou une personne de confiance. Vous n'êtes pas seul(e). »",
  },
];

// physical-danger must stay FIRST in the array: on overlap between the two cases,
// Case 2 (physical danger) takes precedence (AGENTS.md §6, §8).
