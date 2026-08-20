import type { FlowId, FlowOutput, FlowState } from "@/types/flow";
import { EMOTION_SUPPORT_OPTION } from "@/lib/chatbot/emotion";
import { matchOption, qaAnswer } from "./helpers";

interface GuidedOption {
  id: string; // stable id, e.g. "victime", "photo-intime"
  label: string; // exact pill text shown to the user
  ack?: string; // one-line acknowledgment shown above the next question;
  // only set on options that route to another node via `next`
  next?: string; // next question node id
  switchTo?: FlowId; // hand the conversation to another flow (e.g.
  // emotion-weather); handleFlow chains it and persists the target flow's state
  targetQaId?: string; // leaf: QA_DATABASE entry id; answer served via qaAnswer()
  exit?: true; // leaf: leave the tree to free typing
}

interface GuidedNode {
  id: string;
  question: string; // asked when the node becomes active
  options: GuidedOption[];
}

const LEAF_SUFFIX = "Vous pouvez continuer à me poser des questions librement.";
// Offer the existing support module (emotion-weather) after a resolved
// leaf. The pill text is an exact emotion-weather intent trigger
// (intents.ts), so selecting it launches the real flow via the route's
// normal intent step — no switchTo, no new content. The breathing and
// grounding exercises are already offered inside that module, so they are
// NOT duplicated here. Shown once, after the QA answer.
const LEAF_OPTIONS = [EMOTION_SUPPORT_OPTION];
const EXIT_TEXT =
  "D'accord. Écrivez librement votre question, ou demandez l'un des parcours guidés : technique, juridique, informatif ou psychologique.";

// Declarative qualification tree: profile -> intent -> situation -> need.
// Leaves carry a targetQaId served verbatim through qaAnswer() (single source
// of truth = QA_DATABASE; qaAnswer throws on an unknown id, so dead ids fail
// loudly at test time). Every node but `profile` auto-earns a "Retour" pill
// (computed by presentNode, not stored in options).
export const GUIDED_TREE: GuidedNode[] = [
  {
    id: "profile",
    question:
      "Je vais vous aider à trouver ce qui correspond le mieux à votre situation. Pour pouvoir vous orienter, pouvez-vous me dire qui vous êtes ?",
    options: [
      {
        id: "victime",
        label: "Je suis victime",
        ack: "Je suis vraiment désolé(e) que vous viviez cette situation. Je suis là pour vous aider.",
        next: "intent-victime",
      },
      {
        id: "parent",
        label: "Je suis parent ou tuteur",
        ack: "Je comprends votre inquiétude. Parlons de ce qui se passe pour votre enfant.",
        next: "intent-parent",
      },
      {
        id: "enseignant",
        label: "Je suis enseignant ou éducateur",
        ack: "Merci de votre vigilance. Parlons de ce que vous pouvez faire.",
        next: "intent-enseignant",
      },
      {
        id: "temoin",
        label: "Je suis témoin",
        ack: "Merci de votre attention. Parlons de comment agir au mieux.",
        next: "intent-temoin",
      },
      {
        id: "pro",
        label: "Je suis un professionnel (psychologue, avocat, association…)",
        ack: "Merci. Je vais vous aider à bien orienter la personne concernée.",
        next: "intent-pro",
      },
      { id: "autre", label: "Autre / je préfère poser ma question directement", exit: true },
    ],
  },
  {
    id: "intent-victime",
    question: "Que souhaitez-vous faire ?",
    options: [
      {
        id: "info",
        label: "Comprendre ce qui m'arrive ou obtenir une information",
        next: "info",
      },
      { id: "signal", label: "Signaler un contenu publié en ligne", ack: "Signaler peut être une étape difficile, mais vous n'êtes pas seul(e).", next: "signal" },
      { id: "plainte", label: "Démarches juridiques / porter plainte", ack: "Je comprends que vous souhaitiez faire valoir vos droits.", next: "plainte" },
      { id: "psycho", label: "Soutien psychologique", ack: "Votre bien-être est important. Parlons-en.", next: "psycho" },
      { id: "prevention", label: "Me protéger au quotidien (prévention)", next: "prevention" },
      { id: "jsaispas", label: "Je ne sais pas", exit: true },
    ],
  },
  {
    id: "intent-parent",
    question: "Que souhaitez-vous faire ?",
    options: [
      {
        id: "enfant",
        label: "Mon enfant est concerné : comprendre la situation ou que faire",
        ack: "Je comprends que vous soyez préoccupé(e) pour votre enfant.",
        next: "situation-enfant",
      },
      { id: "signal", label: "Signaler un contenu publié en ligne", next: "signal" },
      { id: "plainte", label: "Démarches juridiques / porter plainte", next: "plainte" },
      {
        id: "psycho",
        label: "Soutien psychologique (pour moi ou mon enfant)",
        next: "psycho",
      },
      { id: "prevention", label: "Protéger / prévenir mon enfant au quotidien", next: "prevention-enfant" },
      { id: "jsaispas", label: "Je ne sais pas", exit: true },
    ],
  },
  {
    id: "intent-enseignant",
    question: "Que souhaitez-vous faire ?",
    options: [
      {
        id: "eleve-harcelement",
        label: "Un élève est victime de cyberharcèlement : comment réagir ?",
        targetQaId: "3.6",
      },
      {
        id: "eleve-risques",
        label: "Quels types de cyberviolence un élève peut-il rencontrer ?",
        targetQaId: "6.3",
      },
      { id: "signal", label: "Où signaler / orienter ?", next: "signal-pro" },
      { id: "signaux", label: "Repérer les signaux d'alerte chez un élève", targetQaId: "5.2" },
      { id: "info", label: "Comprendre / obtenir une information", next: "info" },
      { id: "jsaispas", label: "Je ne sais pas", exit: true },
    ],
  },
  {
    id: "intent-temoin",
    question: "Que souhaitez-vous faire ?",
    options: [
      { id: "que-faire", label: "J'ai été témoin : que faire ?", targetQaId: "7.7" },
      { id: "aider", label: "Aider une victime concrètement", targetQaId: "7.3" },
      { id: "signal", label: "Signaler un contenu vu en ligne", next: "signal" },
      { id: "info", label: "Comprendre la situation", next: "info" },
      { id: "jsaispas", label: "Je ne sais pas", exit: true },
    ],
  },
  {
    id: "intent-pro",
    question: "Que souhaitez-vous faire ?",
    options: [
      {
        id: "classif",
        label: "La classification internationale des cyberviolences",
        targetQaId: "6.4",
      },
      { id: "juridique", label: "Le cadre juridique pour orienter", next: "plainte" },
      { id: "signal", label: "Signaler / orienter une victime", next: "signal-pro" },
      { id: "info", label: "Comprendre / information générale", next: "info" },
      { id: "jsaispas", label: "Je ne sais pas", exit: true },
    ],
  },
  {
    id: "info",
    question: "Quel type d'information recherchez-vous ?",
    options: [
      {
        id: "difference",
        label: "Comprendre la différence entre cyberviolence et cyberharcèlement",
        targetQaId: "6.1",
      },
      { id: "emc", label: "Découvrir l'EMC et ses services", targetQaId: "2.1" },
      {
        id: "situation",
        label: "Comprendre ce qui m'arrive / identifier la situation",
        next: "forms",
      },
      { id: "autre", label: "Autre", exit: true },
    ],
  },
  {
    id: "forms",
    question:
      "Pouvez-vous décrire ce qui se passe ? Je vais vous orienter vers la réponse correspondante.",
    options: [
      {
        id: "harcelement",
        label: "Des moqueries ou des insultes répétées (harcèlement)",
        targetQaId: "6.5",
      },
      { id: "menaces", label: "Des menaces en ligne", targetQaId: "6.8" },
      {
        id: "intime",
        label: "La diffusion de photos ou vidéos intimes sans accord",
        targetQaId: "6.17",
      },
      {
        id: "chantage",
        label: "Des photos ou vidéos utilisées pour un chantage",
        targetQaId: "6.18",
      },
      { id: "identite", label: "Quelqu'un qui utilise mon identité (faux compte)", targetQaId: "6.15" },
      { id: "rumeurs", label: "Des rumeurs ou de fausses informations sur moi", targetQaId: "6.21" },
      { id: "stalking", label: "Un suivi ou un harcèlement obsessionnel (stalking)", targetQaId: "6.7" },
      { id: "jsaispas", label: "Je ne sais pas de quoi il s'agit", targetQaId: "6.1" },
      { id: "autre", label: "Autre", exit: true },
    ],
  },
  {
    id: "signal",
    question: "Que souhaitez-vous signaler ?",
    options: [
      {
        id: "intime",
        label: "Une photo ou une vidéo intime diffusée sans mon accord",
        targetQaId: "3.4",
      },
      { id: "humiliante", label: "Une photo ou une vidéo humiliante ou moqueuse", targetQaId: "3.2" },
      { id: "messages", label: "Des messages, commentaires ou insultes en ligne", targetQaId: "3.2" },
      { id: "abus-enfant", label: "Des images d'abus sexuel sur un enfant", targetQaId: "3.3" },
      { id: "ou-signaler", label: "Je ne sais pas où / comment signaler", targetQaId: "3.7" },
      { id: "autre", label: "Autre", exit: true },
    ],
  },
  {
    id: "plainte",
    question: "Pour vos démarches juridiques, de quoi avez-vous besoin ?",
    options: [
      { id: "loi", label: "Le cyberharcèlement est-il puni par la loi ?", targetQaId: "4.1" },
      {
        id: "preuves",
        label: "Comment préparer mon dossier / collecter des preuves ?",
        targetQaId: "4.5",
      },
      { id: "ou", label: "Où déposer ma plainte ?", next: "ou-plainte" },
      { id: "autre", label: "Autre", exit: true },
    ],
  },
  {
    id: "ou-plainte",
    question: "Où souhaitez-vous porter plainte ?",
    options: [
      { id: "parquet", label: "Le Parquet (plainte en ligne)", targetQaId: "4.10" },
      { id: "police", label: "La Police (plateforme E-Blagh)", targetQaId: "4.11" },
      { id: "gendarmerie", label: "La Gendarmerie Royale", targetQaId: "4.12" },
      {
        id: "ministere",
        label: "Le centre d'aide du Ministère de la Justice",
        targetQaId: "4.13",
      },
      {
        id: "cellules",
        label: "Les cellules de prise en charge des femmes et enfants victimes",
        targetQaId: "4.14",
      },
      { id: "autre", label: "Autre", exit: true },
    ],
  },
  {
    id: "psycho",
    question: "Soutien psychologique : comment pouvons-nous vous aider ?",
    options: [
      {
        id: "sante-mentale",
        label: "Comprendre les conséquences sur ma santé mentale",
        targetQaId: "5.1",
      },
      { id: "physique", label: "Comprendre les conséquences physiques", targetQaId: "5.7" },
      { id: "duree", label: "Est-ce que les effets vont durer ?", targetQaId: "5.9" },
      {
        id: "aide",
        label: "Être accompagné(e) : où trouver de l'aide ?",
        targetQaId: "3.1",
      },
      // The label is an exact emotion-weather intent trigger (intents.ts),
      // so this option hands the conversation to the real support module via
      // switchTo — no duplicated content; breathing/grounding are inside it.
      { id: "emotions", label: EMOTION_SUPPORT_OPTION, switchTo: "emotion-weather" },
      { id: "autre", label: "Autre", exit: true },
    ],
  },
  {
    id: "prevention",
    question: "Protection et prévention : quel sujet vous intéresse ?",
    options: [
      { id: "pratiques", label: "Les bonnes pratiques de cybersécurité", targetQaId: "7.1" },
      { id: "mot-de-passe", label: "Comment choisir un bon mot de passe ?", targetQaId: "7.8" },
      { id: "objets", label: "Sécuriser mes objets connectés", targetQaId: "7.10" },
      { id: "reseaux", label: "Les précautions sur les réseaux sociaux", targetQaId: "7.11" },
      {
        id: "infos",
        label: "Pourquoi ne pas partager ses informations personnelles ?",
        targetQaId: "7.9",
      },
      { id: "autre", label: "Autre", exit: true },
    ],
  },
  {
    id: "situation-enfant",
    question: "Je comprends. Quelle est la situation de votre enfant ?",
    options: [
      {
        id: "victime",
        label: "Mon enfant est victime de cyberviolence : que faire ?",
        targetQaId: "7.6",
      },
      {
        id: "danger",
        label: "Mon enfant est en danger en ligne (contenus inquiétants…)",
        targetQaId: "3.5",
      },
      { id: "signaux", label: "Quels signaux d'alerte surveiller ?", targetQaId: "5.2" },
      { id: "ecrans", label: "Mon enfant cache ses écrans ou en abuse", targetQaId: "5.8" },
      { id: "vengeance", label: "Mon enfant veut se venger", targetQaId: "5.6" },
      { id: "textes", label: "Quels textes protègent mon enfant ?", targetQaId: "4.9" },
      {
        id: "preuves",
        label: "Comment collecter des preuves sans violer sa vie privée ?",
        targetQaId: "4.8",
      },
      {
        id: "types",
        label: "Quels types de cyberviolence peut-il rencontrer ?",
        targetQaId: "6.3",
      },
      { id: "autre", label: "Autre", exit: true },
    ],
  },
  {
    id: "prevention-enfant",
    question: "Quel sujet pour protéger votre enfant au quotidien ?",
    options: [
      { id: "age", label: "Adapter la protection selon son âge", targetQaId: "7.4" },
      { id: "controle", label: "Les applications de contrôle parental", targetQaId: "7.5" },
      { id: "jeux", label: "Les règles pour les jeux en ligne", targetQaId: "7.12" },
      { id: "autre", label: "Autre", exit: true },
    ],
  },
  {
    id: "signal-pro",
    question: "Quel type de signalement vous intéresse ?",
    options: [
      { id: "sites", label: "Quels sont les sites de signalement ?", targetQaId: "3.7" },
      { id: "abus-enfant", label: "Des images d'abus sexuel sur un enfant", targetQaId: "3.3" },
      { id: "autre", label: "Autre", exit: true },
    ],
  },
];

function findNode(nodeId: string): GuidedNode | undefined {
  return GUIDED_TREE.find((node) => node.id === nodeId);
}

function presentNode(node: GuidedNode, ancestorPath: string[], ack?: string): FlowOutput {
  const childPath = [...ancestorPath, node.id];
  const optionLabels = node.options.map((option) => option.label);
  return {
    text: ack ? ack + "\n\n" + node.question : node.question,
    options: childPath.length > 1 ? ["Retour", ...optionLabels] : optionLabels,
    nextStep: node.id,
    data: { path: childPath.join(",") },
  };
}

export function guidedFlow(state: FlowState, rawMessage: string): FlowOutput {
  if (state.step === "start") {
    const profile = findNode("profile");
    if (!profile) throw new Error("guided tree: missing profile node");
    return presentNode(profile, []);
  }

  const node = findNode(state.step);
  if (!node) {
    // Unknown step (defensive restart): re-present the profile question.
    return presentNode(findNode("profile") as GuidedNode, []);
  }

  // Reconcile the navigation path from persisted routing data.
  const path = (state.data.path ?? "").split(",").filter(Boolean);
  if (path[path.length - 1] !== state.step) path.push(state.step);
  const canGoBack = path.length > 1;

  const labels = [...(canGoBack ? ["Retour"] : []), ...node.options.map((option) => option.label)];
  const idx = matchOption(rawMessage, labels);

  // Free text mid-tree abandons the tree; the route handler re-routes the
  // message to the general matcher instead.
  if (idx < 0) {
    return { text: "", fallbackToMatcher: true };
  }

  if (idx === 0 && canGoBack) {
    const parentId = path[path.length - 2];
    const ancestor = path.slice(0, path.length - 2);
    return presentNode(findNode(parentId) as GuidedNode, ancestor);
  }

  const option = node.options[canGoBack ? idx - 1 : idx];
  if (option.targetQaId) {
    return { text: qaAnswer(option.targetQaId) + "\n\n" + LEAF_SUFFIX, options: LEAF_OPTIONS };
  }
  if (option.exit) {
    return { text: EXIT_TEXT };
  }
  if (option.next) {
    const child = findNode(option.next);
    if (!child) throw new Error(`guided tree: unknown next node ${option.next}`);
    return presentNode(child, path, option.ack);
  }
  if (option.switchTo) {
    // Hand off to another flow (e.g. emotion-weather from Soutien
    // psychologique); handleFlow chains via output.switchTo and persists the
    // target flow's state, so the guided tree ends cleanly here.
    return { text: "", switchTo: option.switchTo };
  }
  // Defensive: option with no action — end the tree gracefully.
  return { text: EXIT_TEXT };
}

// Every targetQaId across the tree, for the no-dead-id integrity test.
export function collectLeafQaIds(): string[] {
  const ids: string[] = [];
  for (const node of GUIDED_TREE) {
    for (const option of node.options) {
      if (option.targetQaId) ids.push(option.targetQaId);
    }
  }
  return ids;
}
