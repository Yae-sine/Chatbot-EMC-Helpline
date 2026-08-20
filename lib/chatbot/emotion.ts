// Emotional-state detection (deterministic tier).
//
// A victim who writes « j'ai très peur et je n'arrive plus à penser à autre
// chose » is asking for support, not for a fiche. This module recognises that
// shape so the route can open the météo des émotions flow — whose copy is
// validated (Ressources Chatbot.docx.pdf, guide technique) — instead of
// answering with an information sheet or the fallback.
//
// Pure functions, no copy of their own, no LLM: this tier must keep working
// with no provider key, past the rate limit and while the breaker is open.
// The crisis protocol still runs FIRST in the route (AGENTS.md §6) — nothing
// here can intercept a danger or suicidal message.
//
// Patterns are written in `normalize()` space: lowercased, accents stripped,
// every non-alphanumeric character (apostrophes included) collapsed to a
// single space — hence "j ai", "je n arrive plus a".

import { normalize } from "@/lib/chatbot/normalize";

/** The pill that hands the conversation to the météo des émotions flow.
 * Same string as the `emotion-weather` intent trigger (intents.ts), so
 * tapping it goes through normal intent routing. */
export const EMOTION_SUPPORT_OPTION = "Aide-moi à gérer mes émotions";

// First-person statements about a present emotional state. Deliberately
// narrow: each line is a phrasing a distressed user actually types, so a
// false positive is a bug we can point at and delete.
const EMOTIONAL_SIGNALS: RegExp[] = [
  /\bj ai (tres |vraiment |tellement |si )?peur\b/,
  /\bj ai (tres |vraiment |tellement )?honte\b/,
  /\bj angoisse\b/,
  /\bje (suis|me sens) (tres |vraiment |tellement )?(angoisse|angoissee|anxieux|anxieuse|terrorise|terrorisee|panique|paniquee|stresse|stressee|submerge|submergee|depasse|depassee|perdu|perdue|aneanti|aneantie|effondre|effondree|brise|brisee|humilie|humiliee|honteux|honteuse|sale|nul|nulle|vide|mal dans ma peau)\b/,
  /\bje suis (a bout|en panique|en detresse|au bout du rouleau)\b/,
  /\bje me sens (tres |vraiment |tellement )?mal\b/,
  /\bje n arrive plus a (dormir|penser|me concentrer|respirer|gerer|sortir|parler|manger|rien faire)\b/,
  /\bje n arrive pas a (dormir|penser|me concentrer|respirer|gerer)\b/,
  /\b(je ne dors plus|je n en dors plus|je ne dors pas|j ai des insomnies)\b/,
  /\b(ca me hante|ca m obsede|j y pense tout le temps|je n arrete pas d y penser)\b/,
  /\bje (ne )?pense (plus )?qu a ca\b/,
  /\bje pleure (tout le temps|tous les jours|sans arret|beaucoup)\b/,
  /\bje (craque|panique|deprime|suffoque)\b/,
  /\bje n en peux plus\b/,
  /\bje me sens (seul|seule|isole|isolee)\b/,
  /\bj ai (envie de pleurer|la boule au ventre|le coeur qui bat trop vite)\b/,
];

// Markers that make the message a request for information or a procedure:
// the user asked something, so answer it (and offer the pill) rather than
// starting an exercise.
const FACTUAL_MARKERS: string[] = [
  "comment",
  "que faire",
  "quoi faire",
  "est ce que je peux",
  "est ce que c est",
  "qu est ce que",
  "c est quoi",
  "quelles",
  "quels",
  "pourquoi",
  "plainte",
  "porter plainte",
  "signaler",
  "signalement",
  "loi",
  "article",
  "avocat",
  "police",
  "gendarmerie",
  "numero",
  "telephone",
  "procedure",
  "demarche",
  "preuve",
  "capture",
  "supprimer",
  "bloquer",
  "recours",
  "consequences",
  "definition",
];

// Someone else is the subject of the emotion (a parent describing a child, a
// teacher describing a pupil). The flow's scripts address the person who
// feels it, so these messages keep the validated answer and only gain the
// support pill.
const THIRD_PERSON_SUBJECTS: string[] = [
  "mon fils",
  "ma fille",
  "mon enfant",
  "mes enfants",
  "mon eleve",
  "mes eleves",
  "mon frere",
  "ma soeur",
  "mon ami",
  "mon amie",
  "ma mere",
  "mon pere",
  "sa fille",
  "son fils",
  "son enfant",
  "un enfant",
  "l enfant",
  "il a peur",
  "elle a peur",
  "ils ont peur",
  "elles ont peur",
  "quelqu un a peur",
];

/** True when the message states the writer's own present emotional state. */
export function hasEmotionalSignal(rawMessage: string): boolean {
  const text = normalize(rawMessage);
  if (text === "") return false;
  return EMOTIONAL_SIGNALS.some((pattern) => pattern.test(text));
}

/** True when the message asks for a fact, a contact or a procedure. */
export function looksFactual(rawMessage: string): boolean {
  // The question mark is stripped by normalize(), so read it on the raw text
  // (Arabic question mark included — the classifier receives raw Arabic too).
  if (/[?？؟]/.test(rawMessage)) return true;
  const text = normalize(rawMessage);
  if (text === "") return false;
  return FACTUAL_MARKERS.some((marker) => text.includes(normalize(marker)));
}

/** True when the emotion belongs to someone the writer is talking about. */
export function hasThirdPersonSubject(rawMessage: string): boolean {
  const text = normalize(rawMessage);
  if (text === "") return false;
  return THIRD_PERSON_SUBJECTS.some((subject) => text.includes(normalize(subject)));
}

/**
 * True when the message is a pure emotional statement: the writer's own
 * present state, with no factual question and nobody else as the subject.
 * This is the condition for opening the météo des émotions directly; the
 * looser `hasEmotionalSignal` only adds the support pill to an answer.
 */
export function isEmotionalStatement(rawMessage: string): boolean {
  if (!hasEmotionalSignal(rawMessage)) return false;
  if (looksFactual(rawMessage)) return false;
  if (hasThirdPersonSubject(rawMessage)) return false;
  return true;
}
