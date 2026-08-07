import { normalize } from "./normalize";
import type { QAEntry } from "@/types/qa";

const MIN_MATCHES = 1;

export interface MatchResult {
  matched: boolean;
  entry?: QAEntry;
  score: number;
  keywordMatches: number;
  synonymMatches: number;
}

function countTermMatches(terms: string[], normalizedText: string): number {
  let count = 0;
  for (const term of terms) {
    if (normalizedText.includes(normalize(term))) {
      count += 1;
    }
  }
  return count;
}

export function matchEntry(
  rawMessage: string,
  entries: QAEntry[],
): MatchResult {
  const text = normalize(rawMessage);
  let best: QAEntry | undefined;
  let bestScore = 0;
  let bestKeywords = 0;
  let bestSynonyms = 0;

  for (const entry of entries) {
    const keywordMatches = countTermMatches(entry.keywords, text);
    const synonymMatches = countTermMatches(entry.synonyms, text);
    const score = keywordMatches * 2 + synonymMatches;

    const isBetter =
      score > bestScore ||
      (score === bestScore &&
        score > 0 &&
        best !== undefined &&
        (keywordMatches > bestKeywords ||
          (keywordMatches === bestKeywords &&
            entry.profiles.length < best.profiles.length)));

    if (isBetter) {
      best = entry;
      bestScore = score;
      bestKeywords = keywordMatches;
      bestSynonyms = synonymMatches;
    }
  }

  if (best && bestScore >= MIN_MATCHES) {
    return {
      matched: true,
      entry: best,
      score: bestScore,
      keywordMatches: bestKeywords,
      synonymMatches: bestSynonyms,
    };
  }
  return { matched: false, score: 0, keywordMatches: 0, synonymMatches: 0 };
}
