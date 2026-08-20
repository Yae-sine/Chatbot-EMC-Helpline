// LLM call meters (PLANLLM Phase 6): process-wide ring of provider calls
// (trimmed to 256) plus aggregated totals. No persistence. Consumed by the
// live eval report (`npm run eval` with a key) and observability.

import type { ProviderId } from "@/lib/config/env";

export interface CallRecord {
  provider: ProviderId;
  ok: boolean;
  latencyMs: number;
}

export interface MetersSnapshot {
  totalCalls: number;
  ok: number;
  fail: number;
  calls: CallRecord[];
  p50: number;
  p95: number;
}

const MAX_RING = 256;
const ring: CallRecord[] = [];
let totalOk = 0;
let totalFail = 0;

export function resetMeters(): void {
  ring.length = 0;
  totalOk = 0;
  totalFail = 0;
}

export function recordCall(record: CallRecord): void {
  ring.push(record);
  if (ring.length > MAX_RING) ring.shift();
  if (record.ok) totalOk += 1;
  else totalFail += 1;
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
  };
}