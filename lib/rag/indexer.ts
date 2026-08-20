// Embedding index payload construction (PLANLLM Phase 4) — pure helpers,
// no I/O. Only the validated QA_DATABASE is indexed (the source PDFs are not
// in the repo and their chunks would inject unvalidated routing context).

import type { QAEntry } from "@/types/qa";

export interface IndexPayloadRow {
  id: string;
  text: string;
  category: string;
}

export interface EmbeddingRow {
  id: string;
  text: string;
  category: string;
  vector: number[];
}

export interface EmbeddingsFile {
  model: string;
  generatedAt: string;
  dimensions: number;
  entries: EmbeddingRow[];
}

/** One indexing document per QA entry: question + validated formulations +
 * retrieval metadata (synonyms/tags) joined. */
export function buildIndexPayload(entries: QAEntry[]): IndexPayloadRow[] {
  return entries.map((entry) => ({
    id: entry.id,
    text: [entry.question, ...entry.sampleFormulations, ...entry.synonyms, ...entry.tags].join(" "),
    category: entry.category,
  }));
}

export function serializeEmbeddings(
  rows: IndexPayloadRow[],
  vectors: number[][],
  model: string,
  dimensions: number,
): string {
  return JSON.stringify({
    model,
    generatedAt: new Date().toISOString(),
    dimensions,
    entries: rows.map((row, index) => ({
      id: row.id,
      text: row.text,
      category: row.category,
      vector: vectors[index],
    })),
  });
}

/** Shape guard for the committed data/embeddings.json artifact. */
export function isEmbeddingsFile(value: unknown): value is EmbeddingsFile {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  if (typeof record.model !== "string" || !Array.isArray(record.entries)) return false;
  const dimensions = typeof record.dimensions === "number" ? record.dimensions : null;
  for (const entry of record.entries) {
    if (typeof entry !== "object" || entry === null) return false;
    const row = entry as Record<string, unknown>;
    if (
      typeof row.id !== "string" ||
      !Array.isArray(row.vector) ||
      // An empty vector, or one that disagrees with the declared dimension,
      // can never score (cosine bails on a length mismatch): reject the file
      // instead of leaving those entries silently retrieval-blind.
      row.vector.length === 0 ||
      (dimensions !== null && row.vector.length !== dimensions) ||
      row.vector.some((n) => typeof n !== "number")
    ) {
      return false;
    }
  }
  return record.entries.length > 0;
}