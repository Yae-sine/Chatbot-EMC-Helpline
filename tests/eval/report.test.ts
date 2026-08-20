// `npm run eval` target (PLANLLM §18): runs the whole golden corpus against
// the current system and prints the baseline report. The report's pass/fail
// matrix is information — the CI-asserted subset lives in eval.test.ts.

import { describe, expect, it } from "vitest";
import { QA_DATABASE } from "@/data/qa-database";
import { loadConfig } from "@/lib/config/env";
import { createRetriever } from "@/lib/rag/retriever";
import { metersSnapshot, resetMeters } from "@/lib/chatbot/meters";
import { EVAL_CORPUS } from "./corpus";
import { evaluate, formatReport } from "./harness";

const LIVE = (process.env.GEMINI_API_KEY ?? "") !== "";

describe("eval report", () => {
  it("runs the golden corpus and prints the baseline report", async () => {
    const summary = await evaluate(EVAL_CORPUS, "Phase 0 baseline");

    // The report is the deliverable; keep the test honest about its shape.
    expect(summary.total).toBe(EVAL_CORPUS.length);
    expect(summary.ciTotal).toBeGreaterThan(0);
    expect(summary.categories.length).toBe(13);
    expect(summary.pass).toBeGreaterThanOrEqual(summary.ciTotal - summary.failures.filter((f) => f.evalCase.ci).length);

    const report = formatReport(summary);
    expect(report).toContain("# Eval report");
    expect(report).toContain("## Gaps");
    console.log(report);
  });
});

// Live-only hybrid eval (PLANLLM Phase 6): prints the before/after table —
// static-only pipeline vs the hybrid route — with fallback-rate,
// id-accuracy, latency percentiles and LLM call counts. Nothing beyond the
// deterministic gate is asserted; the table is the deliverable.
describe.skipIf(!LIVE)("eval hybrid report (live, keyed)", () => {
  it("prints the before/after table", async () => {
    resetMeters();
    const before = await evaluate(EVAL_CORPUS, "before (static-only)", { staticOnly: true });
    resetMeters();
    const after = await evaluate(EVAL_CORPUS, "after (hybrid)");
    const meters = metersSnapshot();

    const pct = (correct: number, total: number): string =>
      total === 0 ? "–" : `${((correct / total) * 100).toFixed(1)}%`;
    const table = [
      "## Before / after (hybrid layer)",
      "",
      "| metric | before (static) | after (hybrid) |",
      "| --- | --- | --- |",
      `| fallback rate | ${pct(before.failures.filter((v) => v.turn.route === "fallback").length, before.total)} | ${pct(after.failures.filter((v) => v.turn.route === "fallback").length, after.total)} |`,
      `| strict answer-id accuracy | ${pct(before.strictAnswer.correct, before.strictAnswer.total)} | ${pct(after.strictAnswer.correct, after.strictAnswer.total)} |`,
      `| latency p50/p95 | ${before.latency.p50} ms / ${before.latency.p95} ms | ${after.latency.p50} ms / ${after.latency.p95} ms |`,
      `| mode split | static ${before.modes.static} | static ${after.modes.static} · llm ${after.modes.llm} · fallback ${after.modes.fallback} |`,
      `| LLM calls | 0 | ${meters.totalCalls} (ok ${meters.ok}, fail ${meters.fail}) · p50 ${meters.p50} ms / p95 ${meters.p95} ms |`,
      "",
    ].join("\n");
    console.log(table);
  });
});

// Live-only retrieval check (PLANLLM Phase 4): with a key + embeddings file,
// every retrieval-requiring corpus case must keep its expected id in the
// semantic top 5 (presence, not rank — the reranker/classifier decides above).
describe.skipIf(!LIVE)("eval retrieval subset (live)", () => {
  it("keeps the expected entry in the top 5 for every retrieval-requiring case", async () => {
    const cfg = loadConfig();
    const retriever = createRetriever(cfg, QA_DATABASE);
    const failures: string[] = [];
    for (const evalCase of EVAL_CORPUS) {
      if (evalCase.category !== "retrieval-requiring") continue;
      const expected = evalCase.expected;
      if (expected.kind !== "qa") continue;
      const top = await retriever.retrieve(evalCase.input, { topK: 5 });
      const ids = top.map((candidate) => candidate.id);
      if (!ids.some((id) => expected.ids.includes(id))) {
        failures.push(`${evalCase.id}: expected ${expected.ids.join("/")} in top5, got ${ids.join(",")}`);
      }
    }
    expect(failures, failures.join("\n")).toEqual([]);
  });
});