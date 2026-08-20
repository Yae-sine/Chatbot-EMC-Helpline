// Retriever tests (PLANLLM Phase 4): deterministic fixtures with seeded
// 64-dim vectors — cosine order, lexical-only fallback, profile bonus, topK,
// score bounds. Semantic paths use a stubbed fetch; the embeddings file is
// overridden via the module seam.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QA_DATABASE } from "@/data/qa-database";
import {
  __setEmbeddingsSourceForTest,
  cosine,
  createRetriever,
  resetEmbeddingsCache,
} from "@/lib/rag/retriever";
import type { EmbeddingsFile } from "@/lib/rag/indexer";
import type { Config } from "@/lib/config/env";

function noKeysCfg(overrides: Partial<Config> = {}): Config {
  return {
    llmProvider: "gemini",
    geminiApiKey: "",
    groqApiKey: "",
    openrouterApiKey: "",
    geminiChatModel: "gemini-3.5-flash-lite",
    groqChatModel: "llama-3.3-70b-versatile",
    openrouterModel: "",
    llmTimeoutMs: 5000,
    llmMaxRetries: 1,
    llmSmalltalk: true,
    rateLimitPerMinute: 10,
    rateLimitPerDay: 200,
    messageCharLimit: 500,
    sessionTurnCap: 30,
    enableMetaLogging: false,
    enableResponseCache: true,
    ...overrides,
  };
}

// Seeded 64-dim vectors: a distinctive coordinate block per entry.
function makeVector(seed: number): number[] {
  const vector = new Array<number>(64).fill(0);
  const block = seed % 8;
  for (let i = 0; i < 8; i += 1) {
    vector[block * 8 + i] = 0.5 + (seed % 10) / 100;
  }
  return vector;
}

const PROJECTION = [
  ["3.4", "suppression contenu intime"],
  ["2.2", "objectifs de l'emc"],
  ["6.10", "doxing"],
  ["4.5", "porter plainte"],
  ["3.7", "sites de signalement"],
  ["6.18", "sextorsion"],
  ["4.11", "plainte police"],
  ["7.8", "mot de passe solide"],
  ["5.1", "conséquences psychologiques"],
  ["6.5", "cyberharcèlement"],
] as const;

import type { QAEntry } from "@/types/qa";

const SEED_ENTRIES: QAEntry[] = PROJECTION.map(([id, question]) => ({
  id,
  question,
  keywords: [question],
  profiles: [] as QAEntry["profiles"],
  synonyms: [],
  tags: [],
  category: "informatif",
  parcours: [],
  sampleFormulations: [],
  answer: `answer ${id}`,
}));

function embeddingsFile(queryVector: number[]): EmbeddingsFile {
  return {
    model: "test",
    generatedAt: "2026-01-01T00:00:00.000Z",
    dimensions: 64,
    entries: PROJECTION.map(([id, text], index) => ({
      id,
      text,
      category: "informatif",
      // index 2 = "6.10 doxing": give the query seed the same vector.
      vector: index === 2 ? queryVector : makeVector(index + 1),
    })),
  };
}

describe("cosine", () => {
  it("is 1 for identical vectors and 0 for the zero vector", () => {
    const v = [1, 0, 0];
    expect(cosine(v, v)).toBe(1);
    expect(cosine(v, [0, 0, 0])).toBe(0);
    expect(cosine(v, [])).toBe(0);
    expect(cosine(v, [1, 0])).toBe(0);
  });

  it("orders by similarity", () => {
    const a = makeVector(1);
    const b = makeVector(2);
    const a2 = a.map((x) => x + 0.01);
    expect(cosine(a, a2)).toBeGreaterThan(cosine(a, b));
  });
});

describe("createRetriever", () => {
  beforeEach(() => {
    __setEmbeddingsSourceForTest(null);
  });

  afterEach(() => {
    resetEmbeddingsCache();
    vi.unstubAllGlobals();
  });

  it("runs lexical-only when embeddings are unavailable (no block)", async () => {
    const retriever = createRetriever(noKeysCfg(), SEED_ENTRIES);
    const top = await retriever.retrieve("comment porter plainte", { topK: 3 });
    expect(top.length).toBe(3);
    expect(top[0].id).toBe("4.5");
    expect(top.every((candidate) => candidate.score >= 0 && candidate.score <= 1)).toBe(true);
  });

  it("uses semantic similarity above lexical overlap", async () => {
    const queryVector = makeVector(3);
    __setEmbeddingsSourceForTest(embeddingsFile(queryVector));
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({ embeddings: [{ values: queryVector }] }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );
    const cfg = noKeysCfg({ geminiApiKey: "k" });
    const retriever = createRetriever(cfg, SEED_ENTRIES);
    const top = await retriever.retrieve("mon adresse a été publiée en ligne", { topK: 5 });
    expect(top[0].id).toBe("6.10");
    expect(top[0].score).toBeGreaterThan(0.5);
  });

  it("adds the profile bonus only for entries listing that profile", async () => {
    const withParent: QAEntry[] = SEED_ENTRIES.map((entry) =>
      entry.id === "7.8"
        ? { ...entry, profiles: ["parent-tuteur"] }
        : entry,
    );
    const retriever = createRetriever(noKeysCfg(), withParent);
    const withoutProfile = await retriever.retrieve("aide", { topK: 74 });
    const withProfile = await retriever.retrieve("aide", { profile: "parent-tuteur", topK: 74 });

    const idxWithout = withoutProfile.findIndex((c) => c.id === "7.8");
    const idxWith = withProfile.findIndex((c) => c.id === "7.8");
    // Lexically "7.8" sorts last; the bonus must lift it strictly higher.
    expect(withoutProfile[idxWithout].score).toBe(0);
    expect(idxWith).toBeLessThan(idxWithout);
    expect(withProfile[idxWith].score).toBeCloseTo(0.15, 5);
  });

  it("respects topK and candidate shape", async () => {
    const retriever = createRetriever(noKeysCfg(), SEED_ENTRIES);
    const top = await retriever.retrieve("signaler", { topK: 3 });
    expect(top).toHaveLength(3);
    for (const candidate of top) {
      expect(typeof candidate.id).toBe("string");
      expect(typeof candidate.question).toBe("string");
      expect(Array.isArray(candidate.keywords)).toBe(true);
      expect(candidate.score).toBeGreaterThanOrEqual(0);
    }
  });

  it("never throws when the embeddings file is missing", async () => {
    resetEmbeddingsCache();
    const retriever = createRetriever(noKeysCfg(), SEED_ENTRIES);
    const top = await retriever.retrieve("une question banale");
    expect(Array.isArray(top)).toBe(true);
  });

  it("keeps the production 74-entry database retrievable", async () => {
    const retriever = createRetriever(noKeysCfg(), QA_DATABASE);
    const top = await retriever.retrieve("Une ex a posté mes photos sans mon accord", { topK: 5 });
    expect(top).toHaveLength(5);
    for (const candidate of top) {
      expect(QA_DATABASE.some((entry) => entry.id === candidate.id)).toBe(true);
    }
  });
});