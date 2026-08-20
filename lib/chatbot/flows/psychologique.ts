import type { FlowOutput, FlowState } from "@/types/flow";
import { EMOTION_SUPPORT_OPTION } from "@/lib/chatbot/emotion";
import { askAgain, matchOption, qaAnswer } from "./helpers";

// Parcours psychologique (Ressources Chatbot.docx.pdf — Guide technique, §4):
// routes to the emotion-weather module (validated scripts) or to the
// psychoeducation answers. The PHQ-4 / DASS-21 mention is informational and
// non-diagnostic only (the guide explicitly frames the module as recognition,
// normalization and action — never a diagnostic tool).
const MENU_OPTIONS = [
  EMOTION_SUPPORT_OPTION,
  "Les conséquences sur la santé mentale",
  "Les signaux d'alerte chez un enfant",
  "Les conséquences physiques, sociales et durables",
  "Mon enfant veut se venger",
  "Le bien-être numérique",
  "PHQ-4 et DASS-21 : explorer mon état",
  "Terminer",
];

const BACK_OPTIONS = ["Retour au menu", "Terminer"];

const PHQ_DASS_MESSAGE =
  "Le module « Météo des émotions » n'est pas un outil de diagnostic : son objectif est la reconnaissance, la normalisation et l'action. Pour aller plus loin : si l'acte de cyberviolence s'est déroulé il y a plus de deux semaines, le test PHQ-4 serait adéquat à faire passer. Si la victime souhaite encore explorer son état émotionnel, elle peut passer au DASS-21 — c'est un test psychologique assez long, qui prend une dizaine de minutes, et la personne devrait être confortable et concentrée lors de la passation. Ces tests ne remplacent pas un professionnel : parlez-en à une personne de confiance ou sollicitez l'EMC-Helpline pour un accompagnement.";

function closing(): FlowOutput {
  return {
    text: "D'accord. N'oubliez pas : l'EMC-Helpline est disponible 24h/24 et 7j/7 si vous avez besoin d'aide. Personne ne devrait affronter cela seul(e).",
  };
}

function menuIntro(): FlowOutput {
  return {
    text: "Parcours psychologique : je suis là pour vous écouter. Que souhaitez-vous faire ?",
    options: MENU_OPTIONS,
    nextStep: "menu",
  };
}

export function parcoursPsychologiqueFlow(state: FlowState, rawMessage: string): FlowOutput {
  switch (state.step) {
    case "start":
      return menuIntro();
    case "menu": {
      const index = matchOption(rawMessage, MENU_OPTIONS);
      if (index < 0) return askAgain(state);
      const topic = MENU_OPTIONS[index];
      if (topic === "Terminer") return closing();
      if (topic === EMOTION_SUPPORT_OPTION) {
        return { text: "", switchTo: "emotion-weather" };
      }
      if (topic === "PHQ-4 et DASS-21 : explorer mon état") {
        return {
          text: PHQ_DASS_MESSAGE,
          options: BACK_OPTIONS,
          nextStep: "back",
          data: { topic },
        };
      }
      let answerIds: string[];
      switch (topic) {
        case "Les conséquences sur la santé mentale":
          answerIds = ["5.1"];
          break;
        case "Les signaux d'alerte chez un enfant":
          answerIds = ["5.2"];
          break;
        case "Les conséquences physiques, sociales et durables":
          answerIds = ["5.5", "5.7", "5.9"];
          break;
        case "Mon enfant veut se venger":
          answerIds = ["5.6"];
          break;
        default:
          answerIds = ["5.3"];
      }
      return {
        text: answerIds.map((id) => qaAnswer(id)).join("\n\n"),
        options: BACK_OPTIONS,
        nextStep: "back",
        data: { topic },
      };
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