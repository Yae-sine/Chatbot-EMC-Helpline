import type { FlowOutput, FlowState } from "@/types/flow";
import { askAgain, matchOption } from "./helpers";

// Module "Météo des Émotions" (Ressources Chatbot.docx.pdf — Guide technique,
// Annexe). Intensity/emotion buttons include the emojis from the validated
// interface spec; step scripts are verbatim from the validated document.
export const INTENSITY_OPTIONS = [
  "1 - Un peu troublé(e) 🌥️",
  "2 - Assez mal à l'aise 🌧️",
  "3 - Très affecté(e) ⛈️",
  "4 - En pleine détresse 🌪️",
  "5 - Je n'arrive plus à gérer 🚨",
];

export const EMOTION_OPTIONS = [
  "😨 La peur / l'anxiété",
  "😠 La colère / la frustration",
  "😞 La tristesse / le découragement",
  "😳 La honte / l'humiliation",
  "😕 Je suis perdu(e) / je ne sais pas",
];

export const EMOTION_QUESTION = "Merci. Maintenant, quel est le sentiment le plus fort que vous ressentez en ce moment ?";

export type ExerciseId = "breathing-4-2-6" | "grounding-5-4-3-2-1";

interface ValidationScript {
  text: string;
  exercise: ExerciseId;
}

const VALIDATION_SCRIPTS: Record<string, ValidationScript> = {
  "😨 La peur / l'anxiété": {
    exercise: "breathing-4-2-6",
    text: "Ressentir de la peur ou de l'anxiété est une réaction de protection tout à fait normale quand on se sent menacé(e) et en danger. Votre corps et votre esprit sont en état d'alerte. Ce n'est pas un signe de faiblesse, mais un signal que vous vivez quelque chose d'inacceptable. Pour vous aider à traverser cette tempête, je vous propose un exercice simple pour calmer votre système nerveux. Voulez-vous essayer ?",
  },
  "😠 La colère / la frustration": {
    exercise: "breathing-4-2-6",
    text: "Il est tout à fait légitime de ressentir une grande colère. La colère est souvent le signe qu'une de vos limites importantes a été franchie ou qu'une injustice a été commise. C'est une énergie qui dit « ce n'est pas normal et ça doit cesser ». Avant de décider quoi faire, prendre un instant pour souffler peut aider à clarifier les idées. On essaie ensemble ?",
  },
  "😞 La tristesse / le découragement": {
    exercise: "grounding-5-4-3-2-1",
    text: "La tristesse et le sentiment de découragement sont des réponses profondes face à la méchanceté ou à un sentiment d'impuissance. C'est le signe que cette situation vous pèse et vous affecte, et c'est tout à fait humain. Vous avez le droit d'être triste. Pour prendre soin de vous dans ce moment difficile, je vous propose un exercice simple pour vous reconnecter en douceur au moment présent. Ça vous dit ?",
  },
  "😳 La honte / l'humiliation": {
    exercise: "grounding-5-4-3-2-1",
    text: "Merci de votre confiance en partageant cela. La honte est une émotion très douloureuse et très fréquente chez les victimes de cyberviolence. Il est crucial de se souvenir de ceci : la honte devrait être du côté de l'agresseur, jamais du vôtre. Vous n'avez rien fait de mal pour mériter cela. Pour vous aider à vous libérer un peu de ce poids, je vous propose un petit exercice d'ancrage pour revenir ici et maintenant. On essaie ?",
  },
  "😕 Je suis perdu(e) / je ne sais pas": {
    exercise: "breathing-4-2-6",
    text: "C'est tout à fait normal de se sentir perdu(e) et de ne pas pouvoir mettre de mots sur ce qui se passe, surtout quand on est submergé(e). C'est souvent le signe que le cerveau est saturé d'informations et d'émotions. Dans ces moments-là, la première chose à faire est de revenir à l'essentiel, à quelque chose de concret : votre souffle. Ça aide à remettre un peu d'ordre. Je peux vous guider si vous voulez.",
  },
};

// Post-exercise assurance message, verbatim from the guide technique.
export const ASSURANCE_MESSAGE =
  "Merci d'avoir pris ce moment pour vous. J'espère que cela vous a apporté un peu de calme. Souvenez-vous que cet exercice est un outil que vous possédez maintenant. Vous pouvez l'utiliser à tout moment où vous sentez la tempête monter. Prendre soin de soi est le premier pas. Le suivant, si vous le souhaitez, est de trouver un soutien extérieur. Personne ne devrait affronter cela seul(e).";

function proposalOutput(
  emotion: string,
  script: { text: string; exercise: ExerciseId },
): FlowOutput {
  const exerciseLabel =
    script.exercise === "breathing-4-2-6"
      ? "Oui, essayer l'exercice de respiration"
      : "Oui, essayer l'exercice d'ancrage";
  return {
    text: script.text,
    options: [exerciseLabel, "Non, pas pour le moment"],
    nextStep: "proposal",
    data: { emotion },
  };
}

export function emotionWeatherFlow(state: FlowState, rawMessage: string): FlowOutput {
  switch (state.step) {
    case "start":
      return {
        text: "Je suis là pour vous écouter. Avant toute chose, sur une échelle de 1 à 5, à quel point vous sentez-vous bouleversé(e) en ce moment ? Pensez-y comme une météo intérieure.",
        options: INTENSITY_OPTIONS,
        nextStep: "intensity",
        data: {},
      };
    case "intensity": {
      const index = matchOption(rawMessage, INTENSITY_OPTIONS);
      if (index < 0) {
        return askAgain(state);
      }
      return {
        text: EMOTION_QUESTION,
        options: EMOTION_OPTIONS,
        nextStep: "emotion",
        data: { intensity: INTENSITY_OPTIONS[index] },
      };
    }
    case "emotion": {
      const index = matchOption(rawMessage, EMOTION_OPTIONS);
      if (index < 0) {
        return askAgain(state);
      }
      const emotion = EMOTION_OPTIONS[index];
      const script = VALIDATION_SCRIPTS[emotion];
      if (!script) {
        return askAgain(state);
      }
      return proposalOutput(emotion, script);
    }
    case "proposal": {
      if (/non|pas pour le moment|merci/.test(rawMessage.toLowerCase())) {
        return { text: ASSURANCE_MESSAGE };
      }
      const emotion = state.data.emotion;
      const script = emotion ? VALIDATION_SCRIPTS[emotion] : undefined;
      if (!script) {
        return { text: ASSURANCE_MESSAGE };
      }
      return { text: "", switchTo: script.exercise };
    }
    default:
      return { text: ASSURANCE_MESSAGE };
  }
}