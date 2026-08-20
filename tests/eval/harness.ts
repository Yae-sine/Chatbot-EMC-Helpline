// Eval harness (PLANLLM §18, Phase 0).
//
// Drives the REAL POST /api/chat route (the single source of truth for
// orchestration) exactly like tests/safety.test.ts does, classifies each
// turn into a route decision, and compares it with the golden expectation.
// The route decision is derived from the response body, not from a parallel
// pipeline — later phases only need to extend the response contract
// (`mode`, `matchedId`, `confidence` per PLANLLM §22) for richer verdicts.

import { POST } from "@/app/api/chat/route";
import { QA_DATABASE } from "@/data/qa-database";
import { detectCrisis } from "@/lib/chatbot/safety";
import { detectIntent } from "@/lib/chatbot/intents";
import { matchEntry } from "@/lib/chatbot/matcher";
import { fallbackMessage } from "@/lib/chatbot/fallback";
import type { CrisisCaseId } from "@/types/qa";
import type { FlowId } from "@/types/flow";
import type { EvalCase, EvalExpectation, EvalCategory } from "./corpus";
import { EVAL_CATEGORIES } from "./corpus";

export type Route = "qa" | "crisis" | "flow" | "fallback";
export type TurnMode = "static" | "llm" | "fallback";

export interface TurnResult {
  route: Route;
  text: string;
  crisisCaseId?: CrisisCaseId;
  flowId?: FlowId;
  /** QA entry id served for `qa` turns */
  matchedId?: string;
  mode: TurnMode;
  latencyMs: number;
}

export interface CaseVerdict {
  evalCase: EvalCase;
  turn: TurnResult;
  pass: boolean;
  /** human-readable mismatch reason for reports */
  detail: string;
}

export interface CategoryStat {
  category: EvalCategory;
  total: number;
  pass: number;
}

export interface EvalSummary {
  label: string;
  total: number;
  /** ci:true subset size (the CI-asserted set) */
  ciTotal: number;
  pass: number;
  failures: CaseVerdict[];
  categories: CategoryStat[];
  /** single-id QA expectations: strict id accuracy (primary metric, §18) */
  strictAnswer: { correct: number; total: number };
  /** multi-id QA expectations resolved correctly */
  tolerantAnswer: { correct: number; total: number };
  fallbackRate: number;
  crisisRecall: { correct: number; total: number };
  notCrisisFalsePositive: { flagged: number; total: number };
  latency: { samples: number; p50: number; p95: number };
  determinism: { iterated: number; compliant: number };
  /** turn-mode split, for the before/after report */
  modes: Record<TurnMode, number>;
}

interface RouteBody {
  text?: unknown;
  isCrisis?: unknown;
  flowId?: unknown;
  mode?: unknown;
  matchedId?: unknown;
}

const MODES: ReadonlySet<string> = new Set(["static", "llm", "fallback"]);

// The route budgets the LLM path per client (10/min, 200/day). A single
// identity would throttle the corpus into `fallback` after ~10 turns and the
// report would measure the limiter instead of the hybrid layer, so every turn
// gets its own synthetic client address.
let turnSequence = 0;

function nextClientIp(): string {
  turnSequence += 1;
  return `10.${(turnSequence >> 16) & 255}.${(turnSequence >> 8) & 255}.${turnSequence & 255}`;
}

/** One request/response cycle through the real route. */
async function postTurn(
  input: string,
  sessionId?: string,
): Promise<{ body: RouteBody; latencyMs: number }> {
  const startedAt = Date.now();
  const response = await POST(
    new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-real-ip": nextClientIp() },
      body: JSON.stringify({ message: input, sessionId: sessionId ?? null }),
    }),
  );
  const body = (await response.json()) as RouteBody;
  return { body, latencyMs: Date.now() - startedAt };
}

function classify(input: string, body: RouteBody): Omit<TurnResult, "latencyMs"> {
  const mode: TurnMode =
    typeof body.mode === "string" && MODES.has(body.mode) ? (body.mode as TurnMode) : "static";
  if (body.isCrisis === true) {
    const safety = detectCrisis(input);
    return {
      route: "crisis",
      text: typeof body.text === "string" ? body.text : "",
      crisisCaseId: safety.crisisCaseId,
      mode: "fallback",
    };
  }
  if (typeof body.flowId === "string") {
    return {
      route: "flow",
      text: typeof body.text === "string" ? body.text : "",
      flowId: body.flowId as FlowId,
      mode,
    };
  }
  const text = typeof body.text === "string" ? body.text : "";
  if (text === fallbackMessage("fr")) {
    return { route: "fallback", text, mode: "fallback" };
  }
  // QA answer: recover which entry was served — prefer the route's explicit
  // matchedId (added in Phase 3), else the unique verbatim answer text.
  let matchedId: string | undefined;
  if (typeof body.matchedId === "string" && body.matchedId.length > 0) {
    matchedId = body.matchedId;
  } else {
    const candidates = QA_DATABASE.filter((entry) => entry.answer === text);
    if (candidates.length === 1) {
      matchedId = candidates[0].id;
    } else {
      // Shared answer text (or an unrecognized route): fall back to the
      // matcher's own winner, which is what the route serves. Never crash.
      matchedId = matchEntry(input, QA_DATABASE).entry?.id;
    }
  }
  return { route: "qa", text, matchedId, mode };
}

/** One turn through the real route, classified into a route decision. */
export async function runTurn(
  input: string,
  sessionId?: string,
): Promise<TurnResult> {
  const { body, latencyMs } = await postTurn(input, sessionId);
  return { ...classify(input, body), latencyMs };
}

// The pre-hybrid deterministic pipeline (PLANLLM Phase 6 "before" snapshot):
// crisis → intent flow → matcher → fallback, no LLM anywhere. The updates
// mirror the current route's decision only as far as the static layer went.
export async function runStaticTurn(input: string): Promise<TurnResult> {
  const startedAt = Date.now();
  const safety = detectCrisis(input);
  if (safety.isCrisis) {
    return {
      route: "crisis",
      text: safety.message ?? "",
      crisisCaseId: safety.crisisCaseId,
      mode: "static",
      latencyMs: Date.now() - startedAt,
    };
  }
  const intent = detectIntent(input);
  if (intent) {
    const { handleFlow } = await import("@/lib/chatbot/flows");
    const { output } = handleFlow({ flowId: intent, step: "start", data: {} }, "");
    return {
      route: "flow",
      text: output.text,
      flowId: intent,
      mode: "static",
      latencyMs: Date.now() - startedAt,
    };
  }
  const match = matchEntry(input, QA_DATABASE);
  if (match.matched && match.entry) {
    return {
      route: "qa",
      text: match.entry.answer,
      matchedId: match.entry.id,
      mode: "static",
      latencyMs: Date.now() - startedAt,
    };
  }
  return {
    route: "fallback",
    text: fallbackMessage("fr"),
    mode: "static",
    latencyMs: Date.now() - startedAt,
  };
}

/** Evaluates one corpus case against the golden expectation. */
export async function runCase(evalCase: EvalCase): Promise<CaseVerdict> {
  return runCaseWith(evalCase, runTurn);
}

type TurnRunner = (input: string, sessionId?: string) => Promise<TurnResult>;

async function runCaseWith(evalCase: EvalCase, runner: TurnRunner): Promise<CaseVerdict> {
  const turn = runner === runTurn
    ? await runTurn(evalCase.input, `eval-${evalCase.id}`)
    : await runStaticTurn(evalCase.input);
  const detail = describeMismatch(evalCase.expected, turn);
  return {
    evalCase,
    turn,
    pass: detail === "",
    detail,
  };
}

async function runStatic(input: string): Promise<TurnResult> {
  return runStaticTurn(input);
}

function describeMismatch(exp: EvalExpectation, turn: TurnResult): string {
  switch (exp.kind) {
    case "qa":
      if (turn.route !== "qa" || turn.matchedId === undefined) {
        return `expected QA (${exp.ids.join("/")}), got route=${turn.route}`;
      }
      return exp.ids.includes(turn.matchedId)
        ? ""
        : `expected id(s) [${exp.ids.join(", ")}], matched ${turn.matchedId}`;
    case "crisis":
      return turn.route === "crisis" && turn.crisisCaseId === exp.caseId
        ? ""
        : `expected crisis ${exp.caseId}, got route=${turn.route}${turn.crisisCaseId ? `/${turn.crisisCaseId}` : ""}`;
    case "not-crisis":
      return turn.route === "crisis"
        ? `expected NOT a crisis, got ${turn.crisisCaseId ?? "crisis"}`
        : "";
    case "fallback":
      return turn.route === "fallback" ? "" : `expected fallback, got route=${turn.route}`;
    case "flow":
      return turn.route === "flow" && turn.flowId !== undefined && exp.flowIds.includes(turn.flowId)
        ? ""
        : `expected flow [${exp.flowIds.join(", ")}], got route=${turn.route}${turn.flowId ? `/${turn.flowId}` : ""}`;
  }
}

function pct(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[Math.max(0, idx)];
}

/** Runs the corpus once and aggregates the §18 metrics. */
export async function evaluate(
  corpus: EvalCase[],
  label: string,
  opts: { staticOnly?: boolean } = {},
): Promise<EvalSummary> {
  const runner = opts.staticOnly ? runStatic : runTurn;
  const verdicts: CaseVerdict[] = [];
  for (const evalCase of corpus) {
    verdicts.push(await runCaseWith(evalCase, runner));
  }

  const pass = verdicts.filter((v) => v.pass).length;
  const failures = verdicts.filter((v) => !v.pass);

  const categories: CategoryStat[] = EVAL_CATEGORIES.map((category) => {
    const rows = verdicts.filter((v) => v.evalCase.category === category);
    return {
      category,
      total: rows.length,
      pass: rows.filter((v) => v.pass).length,
    };
  });

  const strictlyExpected = verdicts.filter(
    (v) => v.evalCase.expected.kind === "qa" && v.evalCase.expected.ids.length === 1,
  );
  const tolerantlyExpected = verdicts.filter(
    (v) => v.evalCase.expected.kind === "qa" && v.evalCase.expected.ids.length > 1,
  );
  const crisisExpected = verdicts.filter((v) => v.evalCase.expected.kind === "crisis");
  const notCrisisExpected = verdicts.filter((v) => v.evalCase.expected.kind === "not-crisis");

  // Determinism: the same deterministic-required question must produce the
  // same answer text twice (PLANLLM §18 "deterministic-required → exact").
  let determinismCompliant = 0;
  for (const row of verdicts.filter((v) => v.evalCase.category === "deterministic-required")) {
    const first = row.turn.text;
    const secondTurn = await runTurn(row.evalCase.input, `eval-det-${row.evalCase.id}`);
    if (first !== "" && first === secondTurn.text) determinismCompliant += 1;
  }

  const latencies = verdicts.map((v) => v.turn.latencyMs).sort((a, b) => a - b);
  const modes: Record<TurnMode, number> = { static: 0, llm: 0, fallback: 0 };
  for (const verdict of verdicts) {
    modes[verdict.turn.mode] += 1;
  }

  return {
    label,
    modes,
    total: corpus.length,
    ciTotal: corpus.filter((evalCase) => evalCase.ci).length,
    pass,
    failures,
    categories,
    strictAnswer: {
      correct: strictlyExpected.filter((v) => v.pass).length,
      total: strictlyExpected.length,
    },
    tolerantAnswer: {
      correct: tolerantlyExpected.filter((v) => v.pass).length,
      total: tolerantlyExpected.length,
    },
    fallbackRate: verdicts.filter((v) => v.turn.route === "fallback").length / verdicts.length,
    crisisRecall: {
      correct: crisisExpected.filter((v) => v.pass).length,
      total: crisisExpected.length,
    },
    notCrisisFalsePositive: {
      flagged: notCrisisExpected.filter((v) => v.turn.route === "crisis").length,
      total: notCrisisExpected.length,
    },
    latency: {
      samples: latencies.length,
      p50: pct(latencies, 50),
      p95: pct(latencies, 95),
    },
    determinism: {
      iterated: verdicts.filter((v) => v.evalCase.category === "deterministic-required").length,
      compliant: determinismCompliant,
    },
  };
}

/** Markdown report for `npm run eval` (Phase 0 baseline; later: before/after). */
export function formatReport(summary: EvalSummary): string {
  const pctOf = (pass: number, total: number): string =>
    total === 0 ? "–" : `${((pass / total) * 100).toFixed(1)}%`;

  const rows = summary.categories
    .map(
      (cat) =>
        `| ${cat.category.padEnd(24)} | ${String(cat.pass).padStart(3)}/${String(cat.total).padEnd(3)} | ${pctOf(cat.pass, cat.total).padStart(6)} |`,
    )
    .join("\n");

  const gapList =
    summary.failures.length === 0
      ? "_(none — all cases pass)_"
      : summary.failures
          .map(
            (v) =>
              `- \`${v.evalCase.id}\` [${v.evalCase.category}] "${v.evalCase.input}" — ${v.detail}${v.evalCase.note ? ` (${v.evalCase.note})` : ""}`,
          )
          .join("\n");

  return [
    `# Eval report — ${summary.label}`,
    "",
    `- corpus: ${summary.total} cases / ${summary.categories.length} categories`,
    `- overall pass: ${summary.pass}/${summary.total} (${pctOf(summary.pass, summary.total)})`,
    `- CI-asserted subset (ci:true): ${summary.ciTotal} cases`,
    `- strict answer-id accuracy: ${summary.strictAnswer.correct}/${summary.strictAnswer.total} (${pctOf(summary.strictAnswer.correct, summary.strictAnswer.total)}) — primary metric`,
    `- tolerant answer accuracy (multi-id families): ${summary.tolerantAnswer.correct}/${summary.tolerantAnswer.total} (${pctOf(summary.tolerantAnswer.correct, summary.tolerantAnswer.total)})`,
    `- static fallback rate on corpus: ${pctOf(summary.failures.filter((v) => v.turn.route === "fallback").length, summary.total)} (${summary.failures.filter((v) => v.turn.route === "fallback").length} cases)`,
    `- mode split: static ${summary.modes.static}, llm ${summary.modes.llm}, fallback ${summary.modes.fallback}`,
    `- crisis recall: ${summary.crisisRecall.correct}/${summary.crisisRecall.total} (${pctOf(summary.crisisRecall.correct, summary.crisisRecall.total)})`,
    `- not-crisis false positives: ${summary.notCrisisFalsePositive.flagged}/${summary.notCrisisFalsePositive.total}`,
    `- determinism (same question, same text): ${summary.determinism.compliant}/${summary.determinism.iterated}`,
    `- latency p50/p95: ${summary.latency.p50} ms / ${summary.latency.p95} ms (in-process route)`,
    "",
    "## By category",
    "",
    "| category | pass | total | rate |",
    "| --- | --- | --- | --- |",
    rows,
    "",
    "## Gaps (corpus failures — the baseline improvement surface)",
    "",
    gapList,
    "",
  ].join("\n");
}