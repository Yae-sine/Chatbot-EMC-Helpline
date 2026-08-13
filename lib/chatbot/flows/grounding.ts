import type { FlowOutput, FlowState } from "@/types/flow";
import { ASSURANCE_MESSAGE } from "./emotion-weather";

// Technique d'ancrage sensoriel "5-4-3-2-1" — script verbatim from
// Ressources Chatbot.docx.pdf. Validate-then-advance: the user decides when
// to move to the next sense (the guide explicitly requires this pacing).
const STEPS: Array<{ step: string; }> = [
  { step: "view" },
  { step: "touch" },
  { step: "listen" },
  { step: "smell" },
  { step: "taste" },
];

function stepText(step: string): string {
  switch (step) {
    case "view":
      return "5 - LA VUE. Regardez autour de vous et nommez mentalement 5 choses que vous pouvez voir. Par exemple : « je vois mon téléphone, je vois une lampe, je vois une fissure au plafond... » Prenez votre temps.";
    case "touch":
      return "4 - LE TOUCHER. Maintenant, prenez conscience de votre corps et nommez mentalement 4 choses que vous pouvez sentir. Par exemple : « je sens mes pieds sur le sol, je sens le tissu de mon vêtement, je sens l'air sur ma peau... »";
    case "listen":
      return "3 - L'OUÏE. Écoutez attentivement et identifiez 3 sons que vous pouvez entendre. Cela peut être un son lointain ou très proche, comme votre propre respiration.";
    case "smell":
      return "2 - L'ODORAT. Essayez d'identifier 2 odeurs autour de vous. L'odeur de la pièce, d'un parfum, ou même l'absence d'odeur.";
    case "taste":
      return "1 - LE GOÛT. Enfin, prenez conscience d'1 chose que vous pouvez goûter. Le goût d'un café, ou simplement le goût à l'intérieur de votre bouche.";
    default:
      return "";
  }
}

const CLOSING =
  "Voilà. J'espère que cet exercice vous a aidé(e) à vous sentir un peu plus ancré(e) ici et maintenant. C'est un outil que vous pouvez utiliser n'importe où, n'importe quand.";

const ENDING =
  "D'accord. L'exercice d'ancrage « 5-4-3-2-1 » reste à votre disposition à tout moment. N'oubliez pas : l'EMC-Helpline est disponible 24h/24 et 7j/7 si vous avez besoin d'aide.";

export function groundingFlow(state: FlowState, rawMessage: string): FlowOutput {
  if (state.step === "start") {
    return {
      text: "Parfait. Cet exercice s'appelle « 5-4-3-2-1 ». Il aide à se reconnecter au moment présent en utilisant vos cinq sens. Installez-vous confortablement et suivez-moi, étape par étape.",
      options: ["Continuer"],
      nextStep: "view",
    };
  }

  if (state.step === "done") {
    const message = rawMessage.toLowerCase();
    if (/terminer|merci|au revoir/.test(message)) {
      return { text: ENDING };
    }
    if (message.includes("psychologique")) {
      return { text: "", switchTo: "parcours-psychologique" };
    }
    if (message.includes("refaire")) {
      return {
        text: "Parfait. Cet exercice s'appelle « 5-4-3-2-1 ». Il aide à se reconnecter au moment présent en utilisant vos cinq sens. Installez-vous confortablement et suivez-moi, étape par étape.",
        options: ["Continuer"],
        nextStep: "view",
      };
    }
    return {
      text: `${CLOSING} ${ASSURANCE_MESSAGE}`,
      options: ["Refaire l'exercice d'ancrage", "Parcours psychologique", "Terminer"],
    };
  }

  const message = rawMessage.toLowerCase();
  if (/terminer|arrêter|arreter|stop/.test(message)) {
    return { text: ENDING };
  }
  const isValidation = /continuer|suivant|d'accord|ok|next|oui|prêt|prête/.test(message);
  if (!isValidation && rawMessage.trim() !== "") {
    return askAgainValidation(state.step);
  }

  const index = STEPS.findIndex((s) => s.step === state.step);
  if (index < 0) {
    return { text: CLOSING, options: ["Continuer"], nextStep: "done" };
  }
  const next = STEPS[index + 1];
  return {
    text: stepText(state.step),
    options: ["Continuer"],
    nextStep: next ? next.step : "done",
  };
}

function askAgainValidation(step: string): FlowOutput {
  return {
    text: "Prenez tout votre temps. Quand vous êtes prêt(e), cliquez sur « Continuer ».",
    options: ["Continuer"],
    nextStep: step,
  };
}