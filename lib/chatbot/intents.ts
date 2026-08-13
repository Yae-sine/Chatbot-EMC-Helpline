import { normalize } from "./normalize";
import type { FlowId } from "@/types/flow";

// Explicit user-ask triggers for starting a guided parcours or a support
// exercise. IMPORTANT: these triggers must NEVER overlap with QA_DATABASE
// keywords/synonyms (e.g. "signaler", "porter plainte", "je vais mal") — the
// general matcher handles those questions with validated answers; the flows
// are opt-in conversations launched by clearly deliberate phrasings.
interface Intent {
  flowId: FlowId;
  triggers: string[];
}

const INTENTS: Intent[] = [
  {
    flowId: "parcours-technique",
    triggers: [
      "parcours technique",
      "démarche technique",
      "guide-moi pour signaler",
      "guidez-moi pour signaler",
      "aide-moi à signaler étape par étape",
      "je veux être guidé pour signaler",
      "lancer le parcours technique",
      "commencer le parcours technique",
      "parcours pour signaler un contenu",
    ],
  },
  {
    flowId: "parcours-juridique",
    triggers: [
      "parcours juridique",
      "démarche juridique",
      "guide-moi pour porter plainte",
      "guidez-moi pour porter plainte",
      "aide-moi à porter plainte étape par étape",
      "lancer le parcours juridique",
      "commencer le parcours juridique",
      "je veux être guidé juridiquement",
      "parcours pour porter plainte",
    ],
  },
  {
    flowId: "parcours-informatif",
    triggers: [
      "parcours informatif",
      "parcours d'information",
      "lancer le parcours informatif",
      "commencer le parcours informatif",
      "guide-moi dans les définitions",
      "parcours pour comprendre",
    ],
  },
  {
    flowId: "parcours-psychologique",
    triggers: [
      "parcours psychologique",
      "soutien psychologique",
      "démarche psychologique",
      "je veux du soutien",
      "je veux de l'aide psychologique",
      "lancer le parcours psychologique",
      "commencer le parcours psychologique",
      "j'ai besoin de soutien",
    ],
  },
  {
    flowId: "emotion-weather",
    triggers: [
      "météo des émotions",
      "météo de mes émotions",
      "aide-moi à gérer mes émotions",
      "soutien émotionnel",
      "je veux un exercice adapté à mon état",
      "je suis submergé",
      "je suis submergée",
      "je n'arrive plus à gérer",
      "calme-moi",
    ],
  },
  {
    flowId: "breathing-4-2-6",
    triggers: [
      "exercice de respiration",
      "technique de respiration",
      "respiration 4 2 6",
      "respiration 4-2-6",
      "inspire 4 secondes",
      "je veux faire un exercice de respiration",
      "refaire l'exercice de respiration",
      "guide-moi avec la respiration",
      "aide-moi à respirer",
    ],
  },
  {
    flowId: "grounding-5-4-3-2-1",
    triggers: [
      "exercice d'ancrage",
      "exercice 5 4 3 2 1",
      "ancrage 5 4 3 2 1",
      "je veux faire un exercice d'ancrage",
      "refaire l'exercice d'ancrage",
      "exercice des cinq sens",
      "ancrage sensoriel",
    ],
  },
  {
    flowId: "guided-qualification",
    triggers: [
      "aidez-moi à comprendre ma situation",
      "je ne sais pas quoi demander",
      "oriente-moi",
      "guidage",
    ],
  },
];

export function detectIntent(rawMessage: string): FlowId | null {
  const text = normalize(rawMessage);
  if (text === "") return null;
  for (const intent of INTENTS) {
    for (const trigger of intent.triggers) {
      if (text.includes(normalize(trigger))) {
        return intent.flowId;
      }
    }
  }
  return null;
}