// Embedding artifact validation: a vector that cannot score must never be
// accepted silently — cosine() bails on a length mismatch, so such an entry
// would be retrieval-blind forever with no error anywhere.

import { describe, expect, it } from "vitest";
import { buildIndexPayload, isEmbeddingsFile, serializeEmbeddings } from "@/lib/rag/indexer";
import { QA_DATABASE } from "@/data/qa-database";

function fileWith(vectors: number[][]): unknown {
  return {
    model: "test-model",
    generatedAt: "2026-01-01T00:00:00.000Z",
    dimensions: 3,
    entries: vectors.map((vector, index) => ({
      id: `1.${index}`,
      text: "texte",
      category: "informatif",
      vector,
    })),
  };
}

describe("isEmbeddingsFile", () => {
  it("accepts a well-formed artifact", () => {
    expect(isEmbeddingsFile(fileWith([[0.1, 0.2, 0.3], [0.4, 0.5, 0.6]]))).toBe(true);
  });

  it("rejects an empty vector", () => {
    expect(isEmbeddingsFile(fileWith([[0.1, 0.2, 0.3], []]))).toBe(false);
  });

  it("rejects a vector that disagrees with the declared dimension", () => {
    expect(isEmbeddingsFile(fileWith([[0.1, 0.2, 0.3], [0.4, 0.5]]))).toBe(false);
  });

  it("rejects non-numeric coordinates and empty artifacts", () => {
    expect(isEmbeddingsFile(fileWith([["x" as unknown as number, 0.2, 0.3]]))).toBe(false);
    expect(isEmbeddingsFile({ model: "m", dimensions: 3, entries: [] })).toBe(false);
  });

  it("round-trips what serializeEmbeddings writes", () => {
    const rows = buildIndexPayload(QA_DATABASE.slice(0, 2));
    const serialized = serializeEmbeddings(rows, [[1, 0, 0], [0, 1, 0]], "test-model", 3);
    expect(isEmbeddingsFile(JSON.parse(serialized))).toBe(true);
  });
});
