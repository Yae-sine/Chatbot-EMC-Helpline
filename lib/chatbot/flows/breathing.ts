import type { FlowOutput, FlowState } from "@/types/flow";
import { ASSURANCE_MESSAGE } from "./emotion-weather";
import { matchOption } from "./helpers";
import { RESOURCE_ENTRY_OPTION, resourcesEntry, resourcesStep } from "./resources";

// Respiration rythmée 4-2-6 (inspirer 4s, retenir 2s, expirer 6s) — exercise
// defined in Ressources Chatbot.docx.pdf (technique de respiration). The
// benefits intro is summarized from the same validated section.
const CYCLES = 4;

interface CycleStep {
  cycle: string;
  phase: string;
  text: string;
}

function cycleSteps(): CycleStep[] {
  const steps: CycleStep[] = [];
  for (let i = 1; i <= CYCLES; i += 1) {
    const intro = i === 1 ? "" : "Encore un cycle. ";
    steps.push({
      cycle: String(i),
      phase: "inhale",
      text: `${intro}Inspirez doucement par le nez pendant 4 secondes. Remplissez le ventre, puis la poitrine.`,
    });
    steps.push({
      cycle: String(i),
      phase: "hold",
      text: "Retenez votre souffle pendant 2 secondes. Gardez les épaules détendues.",
    });
    steps.push({
      cycle: String(i),
      phase: "exhale",
      text: "Expirez lentement par la bouche pendant 6 secondes, jusqu'au bout. Laissez partir la tension.",
    });
  }
  return steps;
}

const CLOSING_LINE =
  "D'accord. L'exercice de respiration « 4-2-6 » reste à votre disposition à tout moment. N'oubliez pas : l'EMC-Helpline est disponible 24h/24 et 7j/7 si vous avez besoin d'aide.";

export function breathingFlow(state: FlowState, rawMessage: string): FlowOutput {
  if (state.step === "start") {
    return {
      text: "Les exercices de respiration sont reconnus pour leurs effets bénéfiques sur la gestion du stress, de l'anxiété et des émotions négatives : ils ralentissent le rythme cardiaque et aident à calmer le corps et l'esprit. Nous allons respirer en rythme : inspirez pendant 4 secondes, retenez votre souffle 2 secondes, puis expirez lentement pendant 6 secondes.",
      options: ["Continuer"],
      nextStep: "c1-inhale",
    };
  }

  if (state.step === "resources") {
    if (matchOption(rawMessage, [RESOURCE_ENTRY_OPTION]) >= 0) return resourcesEntry();
    return resourcesStep(state, rawMessage, CLOSING_LINE) ?? { text: CLOSING_LINE };
  }

  if (state.step === "done") {
    const message = rawMessage.toLowerCase();
    if (matchOption(rawMessage, [RESOURCE_ENTRY_OPTION]) >= 0) {
      return resourcesEntry();
    }
    if (/terminer|merci|au revoir/.test(message)) {
      return { text: CLOSING_LINE };
    }
    if (message.includes("psychologique")) {
      return { text: "", switchTo: "parcours-psychologique" };
    }
    if (message.includes("refaire")) {
      return {
        text: "Nous allons refaire l'exercice : inspirez pendant 4 secondes, retenez votre souffle 2 secondes, puis expirez lentement pendant 6 secondes.",
        options: ["Continuer"],
        nextStep: "c1-inhale",
      };
    }
    return {
      text: `${ASSURANCE_MESSAGE}`,
      options: [
        "Refaire l'exercice de respiration",
        RESOURCE_ENTRY_OPTION,
        "Parcours psychologique",
        "Terminer",
      ],
      nextStep: "resources",
    };
  }

  if (/terminer|arrêter|arreter|stop/.test(rawMessage.toLowerCase())) {
    return {
      text: "D'accord. L'exercice de respiration « 4-2-6 » reste à votre disposition à tout moment. N'oubliez pas : l'EMC-Helpline est disponible 24h/24 et 7j/7 si vous avez besoin d'aide.",
    };
  }

  const steps = cycleSteps();
  const index = steps.findIndex((s) => `c${s.cycle}-${s.phase}` === state.step);
  if (index < 0) {
    return {
      text: `${ASSURANCE_MESSAGE}`,
      options: ["Refaire l'exercice de respiration", "Parcours psychologique", "Terminer"],
    };
  }

  const next = steps[index + 1];
  return {
    text: steps[index].text,
    options: ["Continuer"],
    nextStep: next ? `c${next.cycle}-${next.phase}` : "done",
  };
}