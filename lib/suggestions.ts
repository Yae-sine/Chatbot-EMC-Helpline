import {
  BookOpen,
  HeartPulse,
  Info,
  LifeBuoy,
  Scale,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import type { TranslationKey } from "@/lib/i18n";

export interface Suggestion {
  key: string;
  icon: LucideIcon;
  titleKey: TranslationKey;
  descriptionKey: TranslationKey;
  prompt: string;
}

// Prompts are validated sample formulations from docs/qa-source.md.
export const SUGGESTIONS: Suggestion[] = [
  {
    key: "emc",
    icon: Info,
    titleKey: "suggestionEmcTitle",
    descriptionKey: "suggestionEmcDesc",
    prompt: "C'est quoi l'EMC ?",
  },
  {
    key: "report",
    icon: ShieldCheck,
    titleKey: "suggestionReportTitle",
    descriptionKey: "suggestionReportDesc",
    prompt: "Comment je fais pour signaler une photo humiliante postée sur Instagram ?",
  },
  {
    key: "plainte",
    icon: Scale,
    titleKey: "suggestionPlainteTitle",
    descriptionKey: "suggestionPlainteDesc",
    prompt: "Il faut aller où exactement pour déposer une plainte ?",
  },
  {
    key: "enfant",
    icon: Users,
    titleKey: "suggestionEnfantTitle",
    descriptionKey: "suggestionEnfantDesc",
    prompt: "Mon enfant m'a montré des messages inquiétants, comment réagir sans le braquer ?",
  },
];

export interface Topic {
  key: string;
  icon: LucideIcon;
  labelKey: TranslationKey;
  prompt: string;
}

export const TOPICS: Topic[] = [
  {
    key: "presentation",
    icon: Info,
    labelKey: "topicPresentation",
    prompt: "C'est quoi l'EMC ?",
  },
  {
    key: "aide",
    icon: LifeBuoy,
    labelKey: "topicAide",
    prompt: "Mon enfant se fait harceler, il y a un numéro pour ça ?",
  },
  {
    key: "juridique",
    icon: Scale,
    labelKey: "topicJuridique",
    prompt: "Je veux savoir si la loi marocaine protège vraiment les victimes",
  },
  {
    key: "psychologique",
    icon: HeartPulse,
    labelKey: "topicPsychologique",
    prompt: "Depuis que je suis harcelé(e) en ligne, je ne dors plus, c'est normal ?",
  },
  {
    key: "informatif",
    icon: BookOpen,
    labelKey: "topicInformatif",
    prompt: "C'est quoi la différence entre cyberviolence et cyberharcèlement ?",
  },
  {
    key: "prevention",
    icon: ShieldCheck,
    labelKey: "topicPrevention",
    prompt: "Comment je peux mieux me protéger sur Internet au quotidien ?",
  },
];
