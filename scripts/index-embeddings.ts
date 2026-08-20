// `npm run index-embeddings` (PLANLLM Phase 4): generates data/embeddings.json
// from the validated QA_DATABASE using the configured provider chain.
// Requires a provider key (GEMINI_API_KEY by default) — without one the
// script prints a message and exits 0 (lexical-only retrieval stays active;
// an absent artifact is a supported runtime mode, not corruption).
// Idempotent: rewrites the artifact file in place. Excluded from `npm test`
// via vitest.config.mts (scripts/**).

import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { QA_DATABASE } from "@/data/qa-database";
import { loadConfig, loadDotEnv } from "@/lib/config/env";
import { buildProviderChain, GEMINI_EMBEDDING_MODEL } from "@/lib/llm/client";
import { buildIndexPayload, serializeEmbeddings } from "@/lib/rag/indexer";

const OUT_PATH = join(process.cwd(), "data", "embeddings.json");
const BATCH_SIZE = 16;

async function main(): Promise<void> {
  loadDotEnv();
  const cfg = loadConfig({ ...process.env, LLM_PROVIDER: "gemini" });
  if (cfg.llmProvider === null || !cfg.geminiApiKey) {
    console.warn(
      "set GEMINI_API_KEY in .env to generate embeddings — skipping (lexical-only retrieval stays active)",
    );
    return;
  }

  const providers = buildProviderChain(cfg);
  const embedProvider = providers.find((provider) => provider.id === "gemini");
  if (!embedProvider) {
    throw new Error("no Gemini provider available for embeddings; GEMINI_API_KEY required");
  }

  const rows = buildIndexPayload(QA_DATABASE);
  const vectors: number[][] = [];
  for (let start = 0; start < rows.length; start += BATCH_SIZE) {
    const batch = rows.slice(start, start + BATCH_SIZE);
    const embedded = await embedProvider.embedTexts(batch.map((row) => row.text));
    if (embedded.length !== batch.length) {
      throw new Error(`embedding batch ${start} returned ${embedded.length}/${batch.length} vectors`);
    }
    vectors.push(...embedded);
  }

  const dimensions = vectors[0]?.length ?? 0;
  if (dimensions === 0) {
    throw new Error("embedding provider returned empty vectors");
  }
  // Every row must match: one short/empty vector would be written to the
  // artifact and score 0 for every query, with no error at runtime.
  const malformed = rows
    .map((row, index) => ({ id: row.id, length: vectors[index]?.length ?? 0 }))
    .filter((row) => row.length !== dimensions);
  if (malformed.length > 0) {
    throw new Error(
      `embedding dimension mismatch (expected ${dimensions}): ` +
        malformed.map((row) => `${row.id}=${row.length}`).join(", "),
    );
  }
  const serialized = serializeEmbeddings(rows, vectors, GEMINI_EMBEDDING_MODEL, dimensions);
  writeFileSync(OUT_PATH, serialized, "utf8");

  const written = JSON.parse(readFileSync(OUT_PATH, "utf8")) as {
    entries?: Array<{ id?: unknown; vector?: unknown }>;
  };
  console.log(
    `wrote ${written.entries?.length ?? 0} embeddings (dim ${dimensions}) to data/embeddings.json`,
  );
}

void main();