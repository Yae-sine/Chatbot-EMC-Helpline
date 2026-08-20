// Metadata logging (PLANLLM Phase 6): one JSON line per LLM/static decision
// when ENABLE_META_LOGGING is on. NEVER logs raw user messages (AGENTS.md
// §10) — only routing facts.

import type { Config } from "@/lib/config/env";

export interface MetaEvent {
  mode: "static" | "llm" | "fallback";
  matchedId?: string | null;
  latencyMs?: number;
}

export function logMeta(cfg: Config, event: MetaEvent): void {
  if (!cfg.enableMetaLogging) return;
  console.log("emc-meta", JSON.stringify(event));
}