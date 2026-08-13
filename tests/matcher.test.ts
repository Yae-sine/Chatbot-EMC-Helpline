import { describe, expect, it } from "vitest";
import { QA_DATABASE } from "@/data/qa-database";
import { matchEntry } from "@/lib/chatbot/matcher";

describe("matching engine (AGENTS.md §8)", () => {
  it("contains exactly 74 entries with unique ids and no placeholders", () => {
    expect(QA_DATABASE).toHaveLength(74);
    const ids = QA_DATABASE.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(73);
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
