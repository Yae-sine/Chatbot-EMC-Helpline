# CLAUDE.md — working notes for Claude Code

EMC Helpline chatbot (CMRPI / Espace Maroc Cyberconfiance): a **static-first
hybrid** assistant for victims of cyberviolence in Morocco. Deterministic
matching answers first; an LLM classifier only handles low-confidence messages
and it **proposes ids, never text**. Next.js App Router + TypeScript strict,
one deployable codebase, no database.

**This is a sensitive-content product.** The crisis path and the verbatim-answer
rule outrank every other consideration, including "the code would be nicer".

## Document map (read in this order, don't duplicate them)

| File | Role | When to touch |
| --- | --- | --- |
| `AGENTS.md` | Persistent project rules + the crisis protocol | Never, unless explicitly told |
| `PROJECT_CONTEXT.md` | Stable architecture reference | Only on real architecture/stack changes |
| `PROGRESS.md` | Current implementation status | After every meaningful task |
| `PLANLLM.md` = `docs/architecture-hybrid.md` | Hybrid-layer blueprint (phases 0–7, all implemented) | Rarely; it is a plan of record |
| `docs/qa-source.md` | **Single source of truth for all chatbot copy** | Never edit to fit code |

Precedence note: `AGENTS.md` §1–§2 still describe the project as "rule-based,
no LLM/RAG" — that predates the hybrid layer on this branch. For anything about
the LLM layer, `PLANLLM.md` + `PROJECT_CONTEXT.md` + the code govern; the rest
of `AGENTS.md` (safety §6, content §9, privacy §10, style §11, tests §12) is
fully in force. Do not "fix" `AGENTS.md` without being asked.

## Commands

```bash
npm run dev              # http://localhost:3000
npm run lint             # eslint (flat config)
npm run typecheck        # tsc --noEmit — never weaken strictness to pass
npm test                 # vitest run: 19 files, 205 tests (+2 live-only skipped)
npm run eval             # golden corpus report; live before/after only with a key
npm run index-embeddings # regenerate data/embeddings.json (needs GEMINI_API_KEY)
```

Always run lint + typecheck + test before calling a task done (AGENTS.md §4).
`scripts/*.ts` run under `tsx`, not vitest (`vitest.config.mts` excludes
`scripts/**`).

## Non-negotiables

1. **Crisis first.** `detectCrisis` runs before anything else in
   `app/api/chat/route.ts`; Case 2 (`physical-danger`) before Case 1. Copy in
   `data/crisis-protocol.ts` is signed off by the encadrante (Mme Belaous) —
   changing a character needs her re-validation.
2. **Verbatim answers only.** User-facing QA text comes from `qaAnswer(id)`.
   The LLM may return ids, flow names, or a clarification choice — never copy.
   Phone numbers, URLs and legal articles exist only in validated data.
3. **Flows stay deterministic.** All 8 state machines in
   `lib/chatbot/flows/*` are pure logic. No LLM inside a flow.
4. **Privacy.** No persistence of message content, no raw-message logging.
   `emc-meta` lines carry mode/matchedId/latency only. Session context stores
   routing facts (profile, last ids, pending clarify) — never text, never PII.
5. **Every LLM failure degrades to the existing fallback.** Timeout, 429,
   auth, bad JSON, open breaker, rate-limit denial: the user gets today's
   fallback copy, never an error and never a 429.

## Request pipeline (`app/api/chat/route.ts`)

```
validate body → detectCrisis → farewell → 2b: noteTurn (the ONLY turn counter)
→ pending clarification → active flow → detectIntent → isEmotionalStatement
(opens emotion-weather) → matchEntry (confidence "high" ⇒ mode "static")
→ rate-limit gate → routeLLM → fallback
```

`routeLLM` (`lib/router/route.ts`, pure, no Next imports): caps → retrieval
top-5 (never outside the 75 validated entries) → degraded serve at score ≥0.75
(zero LLM calls) → cached classifier → `qa` | `clarify` | `flow` | `smalltalk`
(only after `checkFreeText`) | `offtopic`.

## Hybrid-layer facts worth knowing before editing

- **Turn counting lives in the route (step 2b) only.** `routeLLM` must never
  call `noteTurn` — double counting silently halves `SESSION_TURN_CAP`.
  `tests/hybrid-route.test.ts` and `tests/router.test.ts` guard both sides.
- **`LLM_PROVIDER` leads the chain**, the other keyed providers follow as
  fallbacks (`buildProviderChain`). An OpenRouter key without
  `OPENROUTER_MODEL` yields `llmProvider: null` (provider disabled), not an
  empty "enabled" chain.
- **`LLM_SMALLTALK=false` is a real kill switch** for generated free text —
  keep it wired if you touch the smalltalk branch.
- **Rate-limit identity** (`rateLimitKey`): `x-real-ip` / `cf-connecting-ip`,
  else the **last** `x-forwarded-for` hop (the leftmost is caller-supplied and
  spoofable), else the session id. Tests and `tests/eval/harness.ts` send a
  distinct `x-real-ip` per turn so the corpus is not throttled into `fallback`.
- **Module-level singletons.** The route builds `cfg`/`providers`/`retriever`
  at import time. Tests must `vi.resetModules()` after changing `process.env`;
  standalone scripts must call `loadDotEnv()` **before** importing the route.
- **`data/embeddings.json` is a generated artifact** (75 × 3072,
  `gemini-embedding-001`). Regenerate after any knowledge-base edit. A
  malformed vector now fails loudly (`isEmbeddingsFile` checks non-empty and
  dimension-consistent rows) instead of leaving entries retrieval-blind.
- **The emotional path is two-tiered on purpose.** `lib/chatbot/emotion.ts` is
  the deterministic tier (no key, no quota, CI-asserted); the classifier
  `flow` route is the paraphrase net. Both open the same flow, and both are
  vetoed for third-person messages (`lib/router/route.ts`) because the flow's
  scripts address the person who feels the emotion. Never add comfort copy
  here — the flow's own validated opener is the reply.
- **The emotional path ends on resources, not on silence.**
  `lib/chatbot/flows/resources.ts` holds one `resources` step shared by
  emotion-weather, breathing and grounding; every pill serves a validated QA
  id through `qaAnswer` (3.1 / 3.7 / 3.4 / 4.5). Add a resource by adding a
  label → id pair there, never by writing copy.
- **The prompt must list the flow ids.** `buildUserPrompt` sends
  `FLOW_IDS_ALLOWED`; without that list the model cannot emit a flow id the
  validator accepts, so `route: "flow"` silently never works in production.
- **Only Gemini can embed.** `createRetriever` picks the Gemini provider for
  query embeddings regardless of `LLM_PROVIDER`; Groq/OpenRouter throw
  `not_available` and the artifact is `gemini-embedding-001`. A wrong pick
  kills semantic retrieval silently (it degrades to lexical).
- **Meters carry failure kinds and decisions.** `recordCall` takes a `kind`,
  `recordDecision` counts classifier routes, and `npm run eval` prints both —
  that is how you find out *which* provider failed and *why* instead of
  reading a bare ok/fail ratio.
- **`completeJSON` takes a `validate` callback.** Pass it whenever the payload
  has a schema (the classifier does): without it, well-formed-but-unusable
  JSON is metered as a success and the breaker never trips.
- **Classifier `maxOutputTokens` is 768, deliberately.** Reasoning-capable
  models spend 250–320 tokens thinking before the JSON; at 300 the body is
  truncated and providers reject it.
- Not implemented although PLANLLM §14 asks for it: the `import "server-only"`
  guard on `lib/llm/*`. Keys are still server-side only — never expose one via
  `NEXT_PUBLIC_*`, never log one.

## Provider reality check (verified 2026-08-20 against the live APIs)

Model ids drift; **verify against the provider's model list before trusting
one**, and prefer a real call over reading docs.

- `GEMINI_CHAT_MODEL=gemini-3.1-flash-lite` — current choice, ~1–4 s.
  `gemini-3.5-flash-lite` exists on this key but was 15–86 s per call, and it
  rejects `thinkingConfig.thinkingBudget: 0` (400), so it cannot be sped up.
- `GROQ_CHAT_MODEL=openai/gpt-oss-120b` — `llama-3.3-70b-versatile` is retired
  (404). Groq also **requires the word "json" somewhere in the messages** when
  `response_format: json_object` is sent; the classifier system prompt
  satisfies this ("QUE du JSON valide") — keep it that way.
- `OPENROUTER_MODEL=openrouter/free` — free-model router, $0, 200k context;
  6–9 s because it picks a random free model. Third in the chain.
- `LLM_TIMEOUT_MS=12000` is a ceiling, not a delay: a healthy Gemini call is
  ~1–3 s. The headroom exists for the slow fallbacks.
- Live sanity check (no key committed, `.env` is gitignored): a throwaway
  `scripts/smoke-*.ts` that `loadDotEnv()`s then calls `POST` with a handful of
  messages — expect crisis/static/flow in single-digit ms and `mode: "llm"`
  with a real `matchedId` in a few seconds. Delete the script afterwards.

## Conventions

- TypeScript strict; no `any` without a justifying comment.
- Components PascalCase (one per file); lib files kebab-case; `@/*` maps to the
  repo root.
- Pure, unit-testable functions in `lib/chatbot/` — no React imports there.
- All UI copy through `t(locale, key)`; validated strings copied exactly.
- Comments explain *why* (a constraint, a provider quirk), not *what*.
- Add a regression test **before** fixing a bug (AGENTS.md §12); one test file
  per subsystem, `tests/*.test.ts`.
- If a needed scenario is missing from `docs/qa-source.md`, flag it — never
  invent content or a placeholder answer.

## Housekeeping after a task

1. Update `PROGRESS.md` (completed / in-progress / new blockers / next tasks).
2. Update `PROJECT_CONTEXT.md` only if the architecture actually changed.
3. Leave `AGENTS.md` alone unless explicitly instructed.
4. Don't commit or push unless asked; `.env*` (except `.env.example`) stays
   untracked.
