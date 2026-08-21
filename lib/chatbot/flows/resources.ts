// Ressources d'aide proposées à la fin du parcours émotionnel.
//
// The assurance message the exercises end on already says « Le suivant, si
// vous le souhaitez, est de trouver un soutien extérieur » — this step makes
// that next step reachable instead of closing the conversation on it.
//
// Every sentence the user reads comes verbatim from the validated database
// through qaAnswer(); the only strings authored here are pill labels, which
// are navigation, not content (same as « Retour aux formes » elsewhere).
// Shared by emotion-weather, breathing and grounding so the menu exists once.

import type { FlowOutput, FlowState } from "@/types/flow";
import { looksFactual } from "@/lib/chatbot/emotion";
import { askAgain, matchOption, qaAnswer } from "./helpers";

/** Pill label → validated QA entry, served verbatim. */
const RESOURCE_ANSWERS: Record<string, string> = {
  "La ligne d'assistance EMC-Helpline": "3.1",
  "Les sites de signalement": "3.7",
  "Faire supprimer un contenu intime": "3.4",
  "Porter plainte": "4.5",
};

/** The pill that opens the menu from a flow's final message. */
export const RESOURCE_ENTRY_OPTION = "Voir les ressources d'aide";

/** Entry served first: the helpline is the « soutien extérieur » itself. */
const ENTRY_ANSWER_ID = "3.1";

export const RESOURCE_OPTIONS: string[] = [...Object.keys(RESOURCE_ANSWERS), "Terminer"];

/** Opens the menu on the helpline answer; `extraOptions` keeps a pending
 * offer (the exercise proposal) alive next to it. */
export function resourcesEntry(extraOptions: string[] = []): FlowOutput {
  return {
    text: qaAnswer(ENTRY_ANSWER_ID),
    options: [...extraOptions, ...RESOURCE_OPTIONS],
    nextStep: "resources",
  };
}

/**
 * One turn of the menu. Returns `null` when the message matched one of
 * `extraOptions` — the calling flow owns those and handles them itself.
 * `closing` is that flow's own validated closing line, so « Terminer » ends
 * where the flow normally ends.
 */
export function resourcesStep(
  state: FlowState,
  rawMessage: string,
  closing: string,
  extraOptions: string[] = [],
): FlowOutput | null {
  if (extraOptions.length > 0 && matchOption(rawMessage, extraOptions) >= 0) {
    return null;
  }
  const index = matchOption(rawMessage, RESOURCE_OPTIONS);
  if (index < 0) {
    // A real question mid-menu is answered by the general matcher rather than
    // re-prompted (same escape as the guided tree and the météo).
    if (looksFactual(rawMessage)) return { text: "", fallbackToMatcher: true };
    return askAgain(state);
  }
  const label = RESOURCE_OPTIONS[index];
  if (label === "Terminer") return { text: closing };

  return {
    text: qaAnswer(RESOURCE_ANSWERS[label]),
    options: [...extraOptions, ...RESOURCE_OPTIONS],
    nextStep: "resources",
  };
}
