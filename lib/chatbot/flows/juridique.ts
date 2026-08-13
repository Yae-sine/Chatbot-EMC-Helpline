import type { FlowOutput, FlowState } from "@/types/flow";
import { askAgain, matchOption, qaAnswer } from "./helpers";

// Parcours juridique (Ressources Chatbot.docx.pdf — Guide technique, §2):
// guided tour of the validated legal answers via menus, including the
// authorities where to file a complaint with their validated links
// (Parquet/plaintes.pmp.ma, Police/E-Blagh, Gendarmerie, Ministère de la
// Justice, cellules femmes et enfants victimes).
const MENU_OPTIONS = [
  "Le cyberharcèlement est-il puni par la loi ?",
  "Comment collecter des preuves ?",
  "Où et comment porter plainte ?",
  "Quels textes protègent mon enfant ?",
  "Les autorités où porter plainte",
  "Terminer",
];

const AUTORITES_OPTIONS = [
  "Le Parquet (plainte en ligne)",
  "La Police (E-Blagh)",
  "La Gendarmerie Royale",
  "Le Ministère de la Justice",
  "Les cellules femmes et enfants victimes",
  "Retour au menu",
  "Terminer",
];

const BACK_OPTIONS = ["Retour au menu", "Terminer"];

const AUTORITES_BACK_OPTIONS = ["Retour aux autorités", "Retour au menu", "Terminer"];

const TOPIC_ANSWERS: Record<string, string> = {
  "Le cyberharcèlement est-il puni par la loi ?": "4.1",
  "Comment collecter des preuves ?": "4.5",
  "Où et comment porter plainte ?": "4.5",
  "Quels textes protègent mon enfant ?": "4.9",
};

const AUTORITES_ANSWERS: Record<string, string> = {
  "Le Parquet (plainte en ligne)": "4.10",
  "La Police (E-Blagh)": "4.11",
  "La Gendarmerie Royale": "4.12",
  "Le Ministère de la Justice": "4.13",
  "Les cellules femmes et enfants victimes": "4.14",
};

function closing(): FlowOutput {
  return {
    text: "D'accord. N'oubliez pas : l'EMC-Helpline est disponible 24h/24 et 7j/7 si vous avez besoin d'aide. Vous pouvez aussi demander le parcours technique ou psychologique à tout moment.",
  };
}

function menuIntro(): FlowOutput {
  return {
    text: "Parcours juridique : je peux vous guider à travers le cadre légal et les démarches. Que souhaitez-vous savoir ?",
    options: MENU_OPTIONS,
    nextStep: "menu",
  };
}

function autoritesIntro(): FlowOutput {
  return {
    text: "Parcours juridique — les autorités où porter plainte pour une cyberviolence, avec leurs liens validés. À quelle autorité souhaitez-vous vous adresser ?",
    options: AUTORITES_OPTIONS,
    nextStep: "autorites",
  };
}

export function juridiqueFlow(state: FlowState, rawMessage: string): FlowOutput {
  switch (state.step) {
    case "start":
      return menuIntro();
    case "menu": {
      const index = matchOption(rawMessage, MENU_OPTIONS);
      if (index < 0) return askAgain(state);
      const topic = MENU_OPTIONS[index];
      if (topic === "Terminer") return closing();
      if (topic === "Les autorités où porter plainte") return autoritesIntro();
      return {
        text: qaAnswer(TOPIC_ANSWERS[topic] ?? "4.1"),
        options: BACK_OPTIONS,
        nextStep: "back",
        data: { topic },
      };
    }
    case "autorites": {
      const index = matchOption(rawMessage, AUTORITES_OPTIONS);
      if (index < 0) return askAgain(state);
      const autorite = AUTORITES_OPTIONS[index];
      if (autorite === "Terminer") return closing();
      if (autorite === "Retour au menu") return menuIntro();
      return {
        text: qaAnswer(AUTORITES_ANSWERS[autorite] ?? "4.10"),
        options: AUTORITES_BACK_OPTIONS,
        nextStep: "autorites-back",
        data: { autorite },
      };
    }
    case "autorites-back": {
      const index = matchOption(rawMessage, AUTORITES_BACK_OPTIONS);
      if (index === 0) return autoritesIntro();
      if (index === 1) return menuIntro();
      if (index === 2) return closing();
      return askAgain(state);
    }
    case "back": {
      const index = matchOption(rawMessage, BACK_OPTIONS);
      if (index === 0) return menuIntro();
      if (index === 1) return closing();
      return askAgain(state);
    }
    default:
      return closing();
  }
}
