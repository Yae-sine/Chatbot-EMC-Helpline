import type { FlowOutput, FlowState } from "@/types/flow";
import { askAgain, matchOption, qaAnswer } from "./helpers";

// Parcours informatif (Ressources Chatbot.docx.pdf — Guide technique, §3):
// definitions, forms and prevention backed by the validated Q&A answers.
// The 12 facettes come from §IV "types de cyberharcèlement"; the risks submenu
// covers the 8 cyberviolences a child may encounter (ids 6.19–6.26); the
// prevention submenu answers the §IV good practices (ids 7.8–7.12).
const MENU_OPTIONS = [
  "Qu'est-ce que la cyberviolence et le cyberharcèlement ?",
  "Les trois formes du cyberharcèlement",
  "Les formes du cyberharcèlement",
  "Les cyberviolences que mon enfant peut rencontrer",
  "La classification internationale",
  "Prévention et bonnes pratiques",
  "Terminer",
];

const FACETTE_OPTIONS = [
  "Stalking",
  "Cybermenaces",
  "Dénigrement",
  "Doxing",
  "Exclusion",
  "Flaming",
  "Fraping",
  "Grooming",
  "Usurpation d'identité",
  "Outing / trickery",
  "Sextorsion",
  "Revenge porn",
];

const RISKS_OPTIONS = [
  "Le sexting",
  "Le chantage à la webcam",
  "Les rumeurs et fausses informations",
  "Le piratage de compte",
  "Les groupes et pages anti-personne",
  "Les contenus inappropriés",
  "Le racisme et la haine en ligne",
  "La fraude et l'escroquerie",
  "Retour au menu",
  "Terminer",
];

const PREVENTION_OPTIONS = [
  "Comment choisir un bon mot de passe ?",
  "Protéger ses données personnelles",
  "Sécuriser ses objets connectés",
  "Les précautions sur les réseaux sociaux",
  "Les règles pour les jeux en ligne",
  "Retour au menu",
  "Terminer",
];

const FACETTE_ANSWERS: Record<string, string> = {
  Stalking: "6.7",
  Cybermenaces: "6.8",
  Dénigrement: "6.9",
  Doxing: "6.10",
  Exclusion: "6.11",
  Flaming: "6.12",
  Fraping: "6.13",
  Grooming: "6.14",
  "Usurpation d'identité": "6.15",
  "Outing / trickery": "6.16",
  Sextorsion: "6.18",
  "Revenge porn": "6.17",
};

const RISKS_ANSWERS: Record<string, string> = {
  "Le sexting": "6.19",
  "Le chantage à la webcam": "6.20",
  "Les rumeurs et fausses informations": "6.21",
  "Le piratage de compte": "6.22",
  "Les groupes et pages anti-personne": "6.23",
  "Les contenus inappropriés": "6.24",
  "Le racisme et la haine en ligne": "6.25",
  "La fraude et l'escroquerie": "6.26",
};

const PREVENTION_ANSWERS: Record<string, string> = {
  "Comment choisir un bon mot de passe ?": "7.8",
  "Protéger ses données personnelles": "7.9",
  "Sécuriser ses objets connectés": "7.10",
  "Les précautions sur les réseaux sociaux": "7.11",
  "Les règles pour les jeux en ligne": "7.12",
};

const BACK_OPTIONS = ["Retour au menu", "Terminer"];
const FACETTE_BACK_OPTIONS = ["Retour aux formes", "Retour au menu", "Terminer"];
const RISKS_BACK_OPTIONS = ["Retour aux risques", "Retour au menu", "Terminer"];
const PREVENTION_BACK_OPTIONS = ["Retour aux préventions", "Retour au menu", "Terminer"];

function closing(): FlowOutput {
  return {
    text: "D'accord. N'oubliez pas : l'EMC-Helpline est disponible 24h/24 et 7j/7 si vous avez besoin d'aide. Vous pouvez aussi demander le parcours juridique ou psychologique à tout moment.",
  };
}

function menuIntro(): FlowOutput {
  return {
    text: "Parcours informatif : je peux vous expliquer les concepts, les formes de cyberviolence et les bonnes pratiques. Que souhaitez-vous découvrir ?",
    options: MENU_OPTIONS,
    nextStep: "menu",
  };
}

function submenuIntro(text: string, options: string[], nextStep: string): FlowOutput {
  return { text, options, nextStep };
}

export function informatifFlow(state: FlowState, rawMessage: string): FlowOutput {
  switch (state.step) {
    case "start":
      return menuIntro();
    case "menu": {
      const index = matchOption(rawMessage, MENU_OPTIONS);
      if (index < 0) return askAgain(state);
      const topic = MENU_OPTIONS[index];
      if (topic === "Terminer") return closing();
      if (topic === "Les formes du cyberharcèlement") {
        return submenuIntro(
          "Le cyberharcèlement peut prendre de nombreuses formes. Laquelle voulez-vous comprendre ?",
          FACETTE_OPTIONS,
          "facette",
        );
      }
      if (topic === "Les cyberviolences que mon enfant peut rencontrer") {
        return submenuIntro(
          "Voici les cyberviolences qu'un enfant peut rencontrer. Laquelle voulez-vous comprendre ?",
          RISKS_OPTIONS,
          "risques",
        );
      }
      if (topic === "Prévention et bonnes pratiques") {
        return submenuIntro(
          "Parcours informatif — prévention : je peux vous aider sur ces bonnes pratiques validées. Que souhaitez-vous savoir ?",
          PREVENTION_OPTIONS,
          "prevention",
        );
      }
      const answerId =
        topic === "Qu'est-ce que la cyberviolence et le cyberharcèlement ?"
          ? "6.1"
          : topic === "Les trois formes du cyberharcèlement"
            ? "6.6"
            : "6.4";
      return {
        text: qaAnswer(answerId),
        options: BACK_OPTIONS,
        nextStep: "back",
        data: { topic },
      };
    }
    case "facette": {
      const index = matchOption(rawMessage, FACETTE_OPTIONS);
      if (index < 0) return askAgain(state);
      const facette = FACETTE_OPTIONS[index];
      return {
        text: qaAnswer(FACETTE_ANSWERS[facette] ?? "6.1"),
        options: FACETTE_BACK_OPTIONS,
        nextStep: "facette-back",
        data: { facette },
      };
    }
    case "facette-back": {
      const index = matchOption(rawMessage, FACETTE_BACK_OPTIONS);
      if (index === 1) return menuIntro();
      if (index === 2) return closing();
      if (index === 0) {
        return submenuIntro(
          "Le cyberharcèlement peut prendre de nombreuses formes. Laquelle voulez-vous comprendre ?",
          FACETTE_OPTIONS,
          "facette",
        );
      }
      return askAgain(state);
    }
    case "risques": {
      const index = matchOption(rawMessage, RISKS_OPTIONS);
      if (index < 0) return askAgain(state);
      const risque = RISKS_OPTIONS[index];
      if (risque === "Retour au menu") return menuIntro();
      if (risque === "Terminer") return closing();
      return {
        text: qaAnswer(RISKS_ANSWERS[risque] ?? "6.3"),
        options: RISKS_BACK_OPTIONS,
        nextStep: "risques-back",
        data: { risque },
      };
    }
    case "risques-back": {
      const index = matchOption(rawMessage, RISKS_BACK_OPTIONS);
      if (index === 1) return menuIntro();
      if (index === 2) return closing();
      if (index === 0) {
        return submenuIntro(
          "Voici les cyberviolences qu'un enfant peut rencontrer. Laquelle voulez-vous comprendre ?",
          RISKS_OPTIONS,
          "risques",
        );
      }
      return askAgain(state);
    }
    case "prevention": {
      const index = matchOption(rawMessage, PREVENTION_OPTIONS);
      if (index < 0) return askAgain(state);
      const topic = PREVENTION_OPTIONS[index];
      if (topic === "Retour au menu") return menuIntro();
      if (topic === "Terminer") return closing();
      return {
        text: qaAnswer(PREVENTION_ANSWERS[topic] ?? "7.1"),
        options: PREVENTION_BACK_OPTIONS,
        nextStep: "prevention-back",
        data: { topic },
      };
    }
    case "prevention-back": {
      const index = matchOption(rawMessage, PREVENTION_BACK_OPTIONS);
      if (index === 1) return menuIntro();
      if (index === 2) return closing();
      if (index === 0) {
        return submenuIntro(
          "Parcours informatif — prévention : je peux vous aider sur ces bonnes pratiques validées. Que souhaitez-vous savoir ?",
          PREVENTION_OPTIONS,
          "prevention",
        );
      }
      return askAgain(state);
    }
    default:
      return closing();
  }
}
