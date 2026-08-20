// LLM call meters (PLANLLM Phase 6): process-wide ring of provider calls
// (trimmed to 256) plus aggregated totals, a per-provider failure-kind
// breakdown and the classifier's route distribution. No persistence, no
// message content. Consumed by the live eval report and observability.
//
// The breakdown exists because a bare ok/fail count cannot answer the only
// question that matters when the hybrid layer underperforms: WHICH provider
// failed and WHY (timeout vs 429 vs malformed payload), and what the model
// decided when it did answer.

import type { ProviderId } from "@/lib/config/env";

/** Mirrors ProviderErrorKind; kept local so meters stays dependency-free. */
export type CallFailureKind =
  | "timeout"
  | "rate_limit"
  | "auth"
  | "http"
  | "network"
  | "bad_json"
  | "invalid_payload"
  | "not_available";

/** Classifier decisions worth counting (validated routes + the failures). */
export type DecisionKind =
  | "qa"
  | "clarify"
  | "flow"
  | "offtopic"
  | "smalltalk"
  | "degraded-serve"
  | "cache-hit"
  | "classifier-failed"
  /** no call was made: chain empty or every circuit breaker open */
  | "breaker-open";

export interface CallRecord {
  provider: ProviderId;
  ok: boolean;
  latencyMs: number;
  /** why the call failed; absent on success */
  kind?: CallFailureKind;
}

export interface ProviderBreakdown {
  ok: number;
  fail: number;
  kinds: Partial<Record<CallFailureKind, number>>;
}

export interface MetersSnapshot {
  totalCalls: number;
  ok: number;
  fail: number;
  calls: CallRecord[];
  p50: number;
  p95: number;
  byProvider: Partial<Record<ProviderId, ProviderBreakdown>>;
  decisions: Partial<Record<DecisionKind, number>>;
}

const MAX_RING = 256;
const ring: CallRecord[] = [];
let totalOk = 0;
let totalFail = 0;
const byProvider = new Map<ProviderId, ProviderBreakdown>();
const decisions = new Map<DecisionKind, number>();

export function resetMeters(): void {
  ring.length = 0;
  totalOk = 0;
  totalFail = 0;
  byProvider.clear();
  decisions.clear();
}

export function recordCall(record: CallRecord): void {
  ring.push(record);
  if (ring.length > MAX_RING) ring.shift();
  if (record.ok) totalOk += 1;
  else totalFail += 1;

  // Per-provider totals are NOT read from the ring: the ring is trimmed, the
  // breakdown must stay exact for the whole run.
  const entry = byProvider.get(record.provider) ?? { ok: 0, fail: 0, kinds: {} };
  if (record.ok) {
    entry.ok += 1;
  } else {
    entry.fail += 1;
    const kind = record.kind ?? "network";
    entry.kinds[kind] = (entry.kinds[kind] ?? 0) + 1;
  }
  byProvider.set(record.provider, entry);
}

/** One classifier/router decision, for the eval report's route distribution. */
export function recordDecision(kind: DecisionKind): void {
  decisions.set(kind, (decisions.get(kind) ?? 0) + 1);
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, index)];
}

export function metersSnapshot(): MetersSnapshot {
  const latencies = ring.map((call) => call.latencyMs).sort((a, b) => a - b);
  return {
    totalCalls: totalOk + totalFail,
    ok: totalOk,
    fail: totalFail,
    calls: [...ring],
    p50: percentile(latencies, 50),
    p95: percentile(latencies, 95),
    byProvider: Object.fromEntries(byProvider) as Partial<Record<ProviderId, ProviderBreakdown>>,
    decisions: Object.fromEntries(decisions) as Partial<Record<DecisionKind, number>>,
  };
}
