import { normalize } from "./normalize";
import type { QAEntry } from "@/types/qa";

const MIN_MATCHES = 1;

// Discriminative terms (PLANLLM Phase 2): a matched keyword from this set is
// enough to serve the entry with full confidence — these are terms a user
// cannot say by accident ("e-blagh", "doxing", "ponter plainte au parquet").
// Stored lowercase; normalized at runtime; the integrity test in
// tests/matcher.test.ts keeps every term anchored to an entry keyword list
// (drop a term when the KB stops containing it — no other code change).
// "objectifs de l'emc" was deliberately dropped: no entry keyword contains it
// (entries use "objectifs emc" / "objectifs du service").
export const STRONG_TERMS: string[] = [
  "espace maroc cyberconfiance", "qui sommes nous", "vous etes qui", "qu est ce que l emc",
  "mission de l emc", "numero vert", "2511", "evigilance", "reportcontent",
  "liens pour signaler", "sites pour signaler", "liste des liens", "adresses de signalement",
  "take it down", "stopncii", "internet watch foundation", "pedopornographie", "porter plainte",
  "comment porter plainte", "ou porter plainte", "depot de plainte", "deposer une plainte",
  "parquet", "e-blagh", "surete nationale", "gendarmerie royale", "ministere de la justice",
  "212537266600", "cellules de prise en charge", "article 503 2", "loi 27 14", "loi 09 08", "loi 88 13",
  "consequences psychologiques", "sante mentale", "cyberharcelement scolaire", "protocole scolaire",
  "revenge porn", "sextorsion", "doxing", "denigrement", "fraping", "outing", "flaming", "grooming",
  "stalking", "sexting", "webcam", "faux profil", "compte pirate", "mot de passe fort",
  "controle parental", "temps d ecran", "les quatre reflexes", "aidez moi",
  "kaspersky safe kids", "qwant junior", "youtube kids", "norton family",
];

const STRONG_SET: ReadonlySet<string> = new Set(STRONG_TERMS.map((term) => normalize(term)));

export type MatchConfidence = "high" | "low";

export interface MatchResult {
  matched: boolean;
  entry?: QAEntry;
  score: number;
  keywordMatches: number;
  synonymMatches: number;
  /** matched keywords of the best entry that are in STRONG_TERMS */
  strongHits: number;
  confidence: MatchConfidence;
}

export interface ScoreEntry {
  keywordMatches: number;
  synonymMatches: number;
  score: number;
}

function matchTerms(terms: string[], normalizedText: string): string[] {
  const matched: string[] = [];
  for (const term of terms) {
    const normalizedTerm = normalize(term);
    if (normalizedTerm !== "" && normalizedText.includes(normalizedTerm)) {
      matched.push(normalizedTerm);
    }
  }
  return matched;
}

/** Lexical score of one entry against an already-normalized message (retriever reuses it). */
export function scoreEntryAgainst(normalizedText: string, entry: QAEntry): ScoreEntry {
  const keywordMatches = matchTerms(entry.keywords, normalizedText).length;
  const synonymMatches = matchTerms(entry.synonyms, normalizedText).length;
  return { keywordMatches, synonymMatches, score: keywordMatches * 2 + synonymMatches };
}

function questionMentionsLongest(
  normalizedQuestion: string,
  matched: string[],
  longestMatched: number,
): boolean {
  if (longestMatched < 0) return false;
  const longest = matched.find((t) => t.length === longestMatched);
  return longest !== undefined && normalizedQuestion.includes(longest);
}

function isBetterCandidate(
  score: number,
  keywordMatches: number,
  profiles: number,
  longestMatched: number,
  questionHit: boolean,
  bestScore: number,
  bestKeywords: number,
  bestProfiles: number,
  bestLongest: number,
  bestQuestionHit: boolean,
  bestExists: boolean,
): boolean {
  if (score > bestScore) return true;
  if (score < bestScore) return false;
  // Tie: prefer the more specific entry (AGENTS.md §8.4), in order:
  // more keyword matches → fewer profiles → longer strongest keyword →
  // the canonical question mentions that keyword → first in database.
  return (
    score > 0 &&
    bestExists &&
    (keywordMatches > bestKeywords ||
      (keywordMatches === bestKeywords &&
        (profiles < bestProfiles ||
          (profiles === bestProfiles &&
            (longestMatched > bestLongest ||
              (longestMatched === bestLongest && questionHit && !bestQuestionHit))))))
  );
}

export function matchEntry(rawMessage: string, entries: QAEntry[]): MatchResult {
  const text = normalize(rawMessage);
  let best: QAEntry | undefined;
  let bestScore = 0;
  let bestKeywords = 0;
  let bestSynonyms = 0;
  let bestMatched: string[] = [];
  let bestLongest = -1;
  let bestQuestionHit = false;

  for (const entry of entries) {
    const matched = matchTerms(entry.keywords, text);
    const keywordMatches = matched.length;
    const synonymMatches = matchTerms(entry.synonyms, text).length;
    const score = keywordMatches * 2 + synonymMatches;
    const longestMatched =
      matched.length > 0 ? matched.reduce((max, term) => Math.max(max, term.length), 0) : -1;
    const normalizedQuestion = normalize(entry.question);
    const questionHit = questionMentionsLongest(normalizedQuestion, matched, longestMatched);

    if (
      isBetterCandidate(
        score,
        keywordMatches,
        entry.profiles.length,
        longestMatched,
        questionHit,
        bestScore,
        bestKeywords,
        best?.profiles.length ?? 0,
        bestLongest,
        bestQuestionHit,
        best !== undefined,
      )
    ) {
      best = entry;
      bestScore = score;
      bestKeywords = keywordMatches;
      bestSynonyms = synonymMatches;
      bestMatched = matched;
      bestLongest = longestMatched;
      bestQuestionHit = questionHit;
    }
  }

  if (best && bestScore >= MIN_MATCHES) {
    const strongHits = bestMatched.filter((term) => STRONG_SET.has(term)).length;
    const confidence: MatchConfidence =
      strongHits >= 1 || bestKeywords >= 2 ? "high" : "low";
    return {
      matched: true,
      entry: best,
      score: bestScore,
      keywordMatches: bestKeywords,
      synonymMatches: bestSynonyms,
      strongHits,
      confidence,
    };
  }
  return {
    matched: false,
    score: 0,
    keywordMatches: 0,
    synonymMatches: 0,
    strongHits: 0,
    confidence: "low",
  };
}