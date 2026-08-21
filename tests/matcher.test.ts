import { describe, expect, it } from "vitest";
import { QA_DATABASE } from "@/data/qa-database";
import { matchEntry, STRONG_TERMS } from "@/lib/chatbot/matcher";
import { normalize } from "@/lib/chatbot/normalize";

describe("matching engine (AGENTS.md §8)", () => {
  it("contains exactly 75 entries with unique ids and no placeholders", () => {
    expect(QA_DATABASE).toHaveLength(75);
    const ids = QA_DATABASE.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(75);
    for (const entry of QA_DATABASE) {
      expect(entry.id).toMatch(/^\d+\.\d+$/);
      expect(entry.answer.length).toBeGreaterThan(0);
      expect(entry.answer).not.toMatch(/placeholder/i);
      expect(entry.keywords.length).toBeGreaterThan(0);
    }
  });

  it("resolves at least one sampleFormulation back to its own entry", () => {
    for (const entry of QA_DATABASE) {
      const resolved = entry.sampleFormulations.some(
        (formulation) => matchEntry(formulation, QA_DATABASE).entry?.id === entry.id,
      );
      expect(resolved, `no sample formulation resolves to entry ${entry.id}`).toBe(true);
    }
  });

  it("returns no match for an unrelated message", () => {
    const result = matchEntry("Quel temps fait-il aujourd'hui ?", QA_DATABASE);
    expect(result.matched).toBe(false);
  });

  it("matches keywords case- and accent-insensitively", () => {
    const result = matchEntry("Pouvez-vous m'aider à DÉPOSER UNE PLAINTE ?", QA_DATABASE);
    expect(result.matched).toBe(true);
    expect(result.entry?.id).toBe("4.5");
  });

  it("scores by number of matched terms and picks the best entry", () => {
    const result = matchEntry("Je veux porter plainte et bloquer son compte.", QA_DATABASE);
    expect(result.matched).toBe(true);
    expect(result.entry?.id).toBe("4.5");
    expect(result.keywordMatches).toBeGreaterThan(0);
  });

  it("uses synonyms to improve retrieval", () => {
    const result = matchEntry(
      "Quelles répercussions sur l'état psychologique d'une victime de harcèlement ?",
      QA_DATABASE,
    );
    expect(result.matched).toBe(true);
    expect(result.entry?.id).toBe("5.1");
    expect(result.synonymMatches).toBeGreaterThan(0);
  });
});

describe("match confidence (PLANLLM Phase 2)", () => {
  it("a single generic keyword is low confidence", () => {
    const result = matchEntry("Je veux aider mon fils", QA_DATABASE);
    expect(result.matched).toBe(true);
    expect(result.confidence).toBe("low");
    expect(result.strongHits).toBe(0);
  });

  it("a discriminative strong term is high confidence and specific", () => {
    const plainte = matchEntry("Je veux porter plainte", QA_DATABASE);
    expect(plainte.confidence).toBe("high");
    expect(plainte.entry?.id).toBe("4.5");

    const doxing = matchEntry("C'est quoi le doxing ?", QA_DATABASE);
    expect(doxing.confidence).toBe("high");
    expect(doxing.entry?.id).toBe("6.10");
  });

  it("two distinct keywords are high confidence", () => {
    const result = matchEntry("Signaler et porter plainte", QA_DATABASE);
    expect(result.confidence).toBe("high");
    expect(result.keywordMatches).toBeGreaterThanOrEqual(2);
  });

  it("keeps every STRONG_TERM anchored in an entry keyword list", () => {
    for (const term of STRONG_TERMS) {
      const normalizedTerm = normalize(term);
      expect(normalizedTerm.length, `term "${term}" must normalize non-empty`).toBeGreaterThan(0);
      const anchored = QA_DATABASE.some((entry) =>
        entry.keywords.some((keyword) => normalize(keyword).includes(normalizedTerm)),
      );
      expect(anchored, `STRONG_TERM "${term}" is not a substring of any keyword`).toBe(true);
    }
  });

  it("tie-break prefers the entry whose question mentions the matched term", () => {
    // "e-blagh", "gendarmerie", "fraping" and "dénigrement" are shared by a
    // generic entry and a specific one; the specific question wins the tie.
    expect(matchEntry("e-blagh", QA_DATABASE).entry?.id).toBe("4.11");
    expect(matchEntry("gendarmerie", QA_DATABASE).entry?.id).toBe("4.12");
    expect(matchEntry("le fraping", QA_DATABASE).entry?.id).toBe("6.13");
    expect(matchEntry("Qu'est-ce que le dénigrement en ligne ?", QA_DATABASE).entry?.id).toBe("6.9");
  });
});
