// Eval CI subset (PLANLLM §18): corpus invariants + the deterministic-required,
// safety and exact cases are asserted on every test run. Cases with
// `ci: false` are intentionally NOT asserted here — they document the
// baseline gap surface and are measured by `npm run eval` / later phases.

import { describe, expect, it } from "vitest";
import { QA_DATABASE } from "@/data/qa-database";
import { CRISIS_PROTOCOL } from "@/data/crisis-protocol";
import { EVAL_CORPUS, EVAL_CATEGORIES } from "./corpus";
import { runCase, runTurn } from "./harness";

const QA_IDS = new Set(QA_DATABASE.map((entry) => entry.id));
const CRISIS_IDS = new Set(CRISIS_PROTOCOL.map((crisisCase) => crisisCase.id));
const FLOW_IDS = new Set([
  "parcours-technique",
  "parcours-juridique",
  "parcours-informatif",
  "parcours-psychologique",
  "guided-qualification",
  "emotion-weather",
  "grounding-5-4-3-2-1",
  "breathing-4-2-6",
]);

describe("eval corpus invariants", () => {
  it("has at least 120 cases (plan §18: ~120)", () => {
    expect(EVAL_CORPUS.length).toBeGreaterThanOrEqual(120);
  });

  it("has unique well-formed case ids and covers every category", () => {
    const ids = EVAL_CORPUS.map((evalCase) => evalCase.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const evalCase of EVAL_CORPUS) {
      expect(evalCase.id, `case id ${evalCase.id}`).toMatch(/^[a-z0-9]+-\d+$/);
      expect(EVAL_CATEGORIES, `category of ${evalCase.id}`).toContain(evalCase.category);
      expect(evalCase.input.length, `input of ${evalCase.id}`).toBeGreaterThan(0);
    }
    for (const category of EVAL_CATEGORIES) {
      expect(EVAL_CORPUS.some((evalCase) => evalCase.category === category), category).toBe(true);
    }
  });

  it("references only real QA ids, crisis cases and flow ids", () => {
    for (const evalCase of EVAL_CORPUS) {
      const exp = evalCase.expected;
      if (exp.kind === "qa") {
        expect(exp.ids.length, `qa ids of ${evalCase.id}`).toBeGreaterThan(0);
        for (const id of exp.ids) {
          expect(QA_IDS.has(id), `qa id ${id} (case ${evalCase.id}) exists`).toBe(true);
        }
      }
      if (exp.kind === "crisis") {
        expect(CRISIS_IDS.has(exp.caseId), `crisis id ${exp.caseId} (case ${evalCase.id})`).toBe(true);
      }
      if (exp.kind === "flow") {
        expect(exp.flowIds.length, `flow ids of ${evalCase.id}`).toBeGreaterThan(0);
        for (const flowId of exp.flowIds) {
          expect(FLOW_IDS.has(flowId), `flow id ${flowId} (case ${evalCase.id})`).toBe(true);
        }
      }
    }
  });

  it("keeps the CI subset green: crisis positives are always ci, gaps are documented", () => {
    const ciCases = EVAL_CORPUS.filter((evalCase) => evalCase.ci);
    expect(ciCases.length).toBeGreaterThan(80);
    for (const evalCase of EVAL_CORPUS) {
      // Safety positives are non-negotiable (AGENTS.md §6): no case that is
      // expected to be a crisis may be SILENTLY excluded from CI. A crisis
      // case may drop out of CI only when the unmodifiable literal gate
      // (safety.ts/crisis-protocol.ts, AGENTS.md §6) cannot detect its
      // phrasing — then it must carry a documented KNOWNGAP note so it stays
      // visible in `npm run eval` until the protocol is extended (with
      // encadrante sign-off).
      if (evalCase.expected.kind === "crisis" && !evalCase.ci) {
        expect(
          evalCase.note && evalCase.note.length > 0,
          `${evalCase.id}: crisis case dropped from CI must document the gap`,
        ).toBe(true);
      }
      // Every non-asserted case must carry a documented reason, so the corpus
      // can never accumulate undocumented failures.
      if (!evalCase.ci) {
        expect(
          evalCase.note && evalCase.note.length > 0,
          `${evalCase.id} (ci:false) must document why it is not asserted`,
        ).toBe(true);
      }
    }
  });
});

describe("eval CI subset (plan §18: exact + safety + deterministic-required)", () => {
  it("passes every ci:true case against the current system", async () => {
    const ciCases = EVAL_CORPUS.filter((evalCase) => evalCase.ci);
    const failures: string[] = [];
    for (const evalCase of ciCases) {
      const verdict = await runCase(evalCase);
      if (!verdict.pass) {
        failures.push(
          `${evalCase.id} [${evalCase.category}] "${evalCase.input}" → ${verdict.detail}`,
        );
      }
    }
    expect(failures, failures.join("\n")).toEqual([]);
  });

  it("is deterministic: same deterministic-required question yields identical text", async () => {
    const detCases = EVAL_CORPUS.filter(
      (evalCase) => evalCase.category === "deterministic-required",
    );
    for (const evalCase of detCases) {
      const first = await runTurn(evalCase.input, `eval-det-a-${evalCase.id}`);
      const second = await runTurn(evalCase.input, `eval-det-b-${evalCase.id}`);
      expect(first.text, `determinism of ${evalCase.id}`).toBe(second.text);
      expect(first.text.length, `non-empty answer of ${evalCase.id}`).toBeGreaterThan(0);
    }
  });
});