// Hybrid retrieval (PLANLLM Phase 4): semantic (embeddings) + lexical hybrid
// scoring over the validated QA database only. The embedding index is
// lazy-loaded once from data/embeddings.json (absent = lexical-only, a
// supported runtime mode); a failed query embedding degrades to lexical-only
// for that turn — retrieval must never block the chat.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { normalize } from "@/lib/chatbot/normalize";
import { scoreEntryAgainst } from "@/lib/chatbot/matcher";
import { buildProviderChain } from "@/lib/llm/client";
import { isEmbeddingsFile, type EmbeddingsFile } from "@/lib/rag/indexer";
import type { Config } from "@/lib/config/env";
import type { Profile, QAEntry } from "@/types/qa";

export const EMBEDDINGS_PATH = "data/embeddings.json";

export interface RetrievalCandidate {
  id: string;
  question: string;
  keywords: string[];
  score: number;
}

export interface Retriever {
  retrieve(
    rawMessage: string,
    opts?: { profile?: Profile | null; topK?: number },
  ): Promise<RetrievalCandidate[]>;
}

/** Cosine similarity; zero-vector or dimension mismatch → 0. */
export function cosine(a: number[], b: number[]): number {
  if (a.length === 0 || a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function lexicalScore(rawMessage: string, entry: QAEntry): number {
  const scored = scoreEntryAgainst(normalize(rawMessage), entry);
  return Math.min(1, scored.score / 6);
}

// ── embeddings source (lazy, module-level, once) ────────────────────────────

// undefined = not loaded yet; null = absent/unreadable (semantic disabled).
let embeddingsCache: EmbeddingsFile | null | undefined;

export function resetEmbeddingsCache(): void {
  embeddingsCache = undefined;
}

/** Test seam: override the embeddings source without touching the file. */
export function __setEmbeddingsSourceForTest(file: EmbeddingsFile | null): void {
  embeddingsCache = file;
}

function loadEmbeddings(): EmbeddingsFile | null {
  if (embeddingsCache !== undefined) return embeddingsCache;
  let file: EmbeddingsFile | null = null;
  try {
    const raw = readFileSync(join(process.cwd(), EMBEDDINGS_PATH), "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (isEmbeddingsFile(parsed)) file = parsed;
  } catch {
    file = null;
  }
  embeddingsCache = file;
  return file;
}

const SEMANTIC_WEIGHT = 0.6;
const LEXICAL_WEIGHT = 0.4;
const PROFILE_BONUS = 0.15;

export function createRetriever(cfg: Config, entries: QAEntry[]): Retriever {
  const providers = buildProviderChain(cfg); // shared module-level circuit breaker
  // Only Gemini implements embedTexts (Groq/OpenRouter throw not_available),
  // and data/embeddings.json is a gemini-embedding-001 artifact, so a vector
  // from any other provider would not even share its dimension. Picking
  // providers[0] blindly killed semantic retrieval whenever LLM_PROVIDER put
  // another provider first — silently, since the failure degrades to lexical.
  const embedder = providers.find((provider) => provider.id === "gemini") ?? null;
  const vectorById = () => {
    const file = loadEmbeddings();
    return file ? new Map(file.entries.map((row) => [row.id, row.vector])) : null;
  };

  return {
    async retrieve(rawMessage, opts) {
      const topK = opts?.topK ?? 5;
      const profile = opts?.profile ?? null;
      const vectors = vectorById();

      let queryVector: number[] | null = null;
      if (vectors && embedder !== null) {
        try {
          const embedded = await embedder.embedTexts([rawMessage]);
          queryVector = embedded[0] ?? null;
        } catch {
          // embedding failure ⇒ lexical-only this turn, never a block
          queryVector = null;
        }
      }

      const scored = entries
        .map((entry) => {
          const semantic =
            vectors !== null && queryVector !== null
              ? cosine(queryVector, vectors.get(entry.id) ?? [])
              : 0;
          const lexic = lexicalScore(rawMessage, entry);
          const profileBoost =
            profile !== null && entry.profiles.includes(profile) ? PROFILE_BONUS : 0;
          return {
            id: entry.id,
            question: entry.question,
            keywords: entry.keywords,
            score: SEMANTIC_WEIGHT * semantic + LEXICAL_WEIGHT * lexic + profileBoost,
          };
        })
        .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
      return scored.slice(0, topK);
    },
  };
}