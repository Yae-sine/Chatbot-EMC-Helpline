# Project Context — EMC Helpline Chatbot

Technical reference for the CMRPI / Espace Maroc Cyberconfiance (EMC) "EMC
Helpline" chatbot. Read `AGENTS.md` (project rules + safety protocol) alongside
this file. This file documents the **current** state of the repository; see
`PROGRESS.md` for implementation status.

## 1. Project Overview

- A **hybrid rule-based + LLM understanding layer** conversational assistant
  that helps victims of cyberviolence in Morocco, plus parents, teachers,
  witnesses, and professionals, get validated information and be routed to the
  right resource (EMC-Helpline, ONDE, Police, Gendarmerie, legal or
  psychological support). Deterministic matching stays first; an LLM
  classifier (Gemini 2.5 Flash primary, Groq/OpenRouter chain fallback) only
  steps in when the static layer is not confident and proposes ids — the text
  is always served from the validated knowledge base (see
  `docs/architecture-hybrid.md` for the full blueprint).
- Built during **Jalon 2 & 3** of a PFA internship (Aug 1–31, 2026). Jalon 1
  produced the validated knowledge base in `docs/qa-source.md` (25
  conversational scenarios), which is the single source of truth for content.
- Current state: a functioning end-to-end chatbot (chat UI → API → matching
  engine → flow layer → static knowledge base) with a confidence-gated hybrid
  LLM/RAG-light layer, light/dark theming, and passing lint/typecheck/tests/
  build. Not yet deployed publicly; crisis-protocol copy validated and signed
  off by the encadrante (Mme Belaous); new hybrid copy (`clarifyPrompt`) carries `TODO(encadrante)`.

## 2. Technology Stack

### Frontend
- Next.js **16.3.0** (App Router, Turbopack)
- React / React-DOM **19.2.8**
- Tailwind CSS **^4** (via `@tailwindcss/postcss`, CSS-first config in
  `app/globals.css`)
- `lucide-react` **^1.28.0** (icons)
- `class-variance-authority` ^0.7.1, `clsx` ^2.1.1, `tailwind-merge` ^3.6.0
  (shadcn-style `cn()` + `cva` variants)
- `next/font/google` — Geist / Geist Mono

### Backend
- Same Next.js App Router codebase — Route Handlers under `app/api/*` are the
  backend (`runtime = "nodejs"`). No separate server package.

### Database
- **None.** The knowledge base is static, typed data shipped in the repo
  (`data/qa-database.ts`). No ORM, no persistence.

### Infrastructure / DevOps
- No Docker, no CI config, no `.env` files in the repo (`.env*` is gitignored).
- Deployment target: Vercel (recommended in `AGENTS.md` §14; `.vercel` is
  gitignored).

### Testing
- Vitest **^4.1.10** (`vitest.config.mts`, `jsdom`, globals enabled)
- `@testing-library/react` ^16.3.2, `@testing-library/jest-dom` ^7
- ESLint **^9** flat config (`eslint.config.mjs`, `eslint-config-next` 16.3.0)

## 3. Repository Structure

```
app/
  layout.tsx              # root layout: fonts, metadata, dark-mode init script
  page.tsx                # renders <AppShell />
  globals.css             # Tailwind v4 design tokens (light/dark), animations
  api/chat/route.ts       # POST backend endpoint (the only backend)
components/
  chat/                   # chat-specific UI
    ChatWindow.tsx        # message list + grouping + auto-scroll + composer wiring
    MessageBubble.tsx     # user / assistant / crisis bubble rendering
    ChatInput.tsx         # auto-growing textarea composer
    QuickReplies.tsx      # clickable option pills under the latest message
    TypingIndicator.tsx   # "typing" dots
    BreathingPulse.tsx    # animated 4-2-6 circle for the breathing flow
    LinkifiedText.tsx     # safe target="_blank" link rendering
  layout/                 # app shell
    AppShell.tsx          # client component owning all chat state
    Header.tsx / Sidebar.tsx / Footer.tsx / ThemeToggle.tsx
  ui/                     # primitives (shadcn-style): Button, Card, Badge,
                          # Avatar, Logo
lib/
  chatbot/                # pure, unit-testable logic (no React)
    normalize.ts          # lowercase, strip accents/punctuation
    safety.ts             # crisis detection (runs FIRST)
    matcher.ts            # keyword+synonym scoring, STRONG_TERMS, confidence gate
    fallback.ts           # default "didn't understand" message
    intents.ts            # explicit user-ask triggers -> launch flows
    session.ts            # in-memory per-session flow state + context (30-min TTL)
    context.ts            # SessionContext helpers (profile, last ids, clarify)
    rate-limit.ts         # per-client LLM gate (minute/day buckets)
    cache.ts              # TTL + LRU cache (classifier results)
    observe.ts            # emc-meta logging (no message content)
    meters.ts            # provider call meters for the eval report
    validator.ts          # grounding (isGrounded) + classifier output validation
    linkify.ts            # URL segmentation for safe link rendering
    flows/                # 8 deterministic state machines (technical, juridique,
                          # informatif, psychologique, emotion-weather, breathing,
                          # grounding, guided-qualification) + helpers.ts,
                          # index.ts orchestration (+ launchFlow)
  config/
    env.ts                # typed env access (loadConfig/loadDotEnv) — hybrid knobs
  llm/
    client.ts             # fetch-only provider client (Gemini/Groq/OpenRouter chain,
                          # circuit breaker, completeJSON)
    classifier.ts         # LLM classifier: message → validated route decision
  rag/
    retriever.ts          # lexical + semantic (embeddings.json) retrieval
    indexer.ts            # index payload building / artifact serialization
  router/
    route.ts              # routeLLM decision ladder (pure, no Next imports)
  i18n.ts                 # t(locale, key) dictionary (fr filled, ar scaffolded)
  suggestions.ts          # SUGGESTIONS + TOPICS (prompts = validated formulations)
  utils.ts                # cn() class-merging helper
data/
  qa-database.ts          # 74 QAEntry (typed), from docs/qa-source.md + Ressources PDF
  crisis-protocol.ts      # 2 crisis cases (exact copy, validated by the encadrante)
  embeddings.json         # GENERATED by `npm run index-embeddings` (absent = lexical-only)
types/
  qa.ts                   # Profile, Parcours, Category, QAEntry, CrisisCase
  chat.ts                 # ChatMessage, ChatResponse (mode/matchedId/confidence)
  flow.ts                 # FlowId, FlowState, option types
scripts/
  index-embeddings.ts     # regenerates data/embeddings.json (tsx; excluded from
                          # `npm test` via vitest exclude)
docs/
  qa-source.md            # canonical validated knowledge base (Jalon 1 deliverable)
  architecture-hybrid.md  # verbatim PLANLLM blueprint (phases 0–7 implemented)
tests/
  safety.test.ts          # crisis-protocol tests
  matcher.test.ts         # matching-engine + confidence tests
  spotcheck.test.ts       # qualitative end-to-end phrasings
  flows.test.ts           # flow orchestration tests
  guided.test.ts          # guided-qualification tree tests
  route-flows.test.ts     # route-level session/flow tests
  router.test.ts          # hybrid router unit tests (fake providers)
  hybrid-route.test.ts    # route cutover (no keys + stubbed provider)
  retriever.test.ts       # retrieval scoring (fixtures)
  validator.test.ts       # grounding + classifier validation
  context.test.ts / rate-limit.test.ts / cache.test.ts
  llm-client.test.ts      # provider client (stubbed fetch)
  linkify.test.tsx        # URL link rendering tests
  eval/                   # golden eval corpus + harness + `npm run eval` report
public/                   # default Next.js SVGs + logos (no custom assets)
```

## 4. Architecture

```
Browser (AppShell.tsx — client state + crypto.randomUUID sessionId)
  │  POST /api/chat  { message, sessionId }
  ▼
app/api/chat/route.ts  (Node.js Route Handler)
  │  1. validate body (400 on missing/empty)
  │  2. detectCrisis(message)     ──> crisis message immediately (Case 2 first)
  │  3. isFarewell(message)       ──> clears any active flow
  │  4. pending clarification?    ──> deterministic answer/"1"/"2"/question text
  │  5. handleFlow(state, msg)    ──> active flow drives the reply (guided tree
  │                                   also learns the session profile)
  │  6. detectIntent(message)     ──> explicit ask -> launch a flow
  │  7. matchEntry(...) high confidence -> validated answer (mode "static")
  │  8. else routeLLM(...)         (rate-limited per client)
  │        caps → retrieval top5 → degraded serve ≥0.75
  │          → LLM classifier (chain, cached) → qaAnswer / flow / clarify /
  │            smalltalk (grounded) / offtopic → every failure = fallback
  │  9. fallbackMessage("fr") if nothing matched
  ▼
{ text, isCrisis, options?, flowId?, mode?, matchedId?, confidence? }
```

There is no service/repository/database layer — the "services" are the pure
functions in `lib/chatbot/` and the "database" is the static `data/` modules.
Request/response cycle only: no message persistence, no logging of message
content.

## 5. Backend

- **Entry point:** `app/api/chat/route.ts` — `POST`, `runtime = "nodejs"`.
  Request body `{ message: string, sessionId: string }`; responses:
  - `400` `{ text, isCrisis: false }` for invalid/empty input (`emptyMessage` key)
  - `200` `{ text: crisisMessage, isCrisis: true }` on crisis detection
  - `200` `{ text, isCrisis: false, options?, flowId?, mode?, matchedId?,
    confidence? }` — `mode` is `"static"` (high-confidence match / flow turn),
    `"llm"` (hybrid layer served a validated answer) or `"fallback"`;
    `matchedId` is the QA id served when applicable
  - `200` `{ text: fallbackMessage, isCrisis: false, mode: "fallback" }`
- **Normalization** (`lib/chatbot/normalize.ts`): lowercase, NFD accent
  stripping, strip non-alphanumerics, collapse whitespace. The LLM path
  receives the RAW message (Arabic must reach the model).
- **Safety** (`lib/chatbot/safety.ts`): iterates `CRISIS_PROTOCOL` in array
  order, literal `includes()` substring match on normalized text. Returns first
  hit. `physical-danger` is first in the array (Case 2 takes precedence).
- **Farewell** (in `app/api/chat/route.ts`): exact normalized match on a fixed
  phrase list clears any active flow.
- **Session store** (`lib/chatbot/session.ts`): in-memory Map keyed by
  `sessionId`, 30-min TTL, max 500 sessions; stores flow routing data
  (flowId/step/data) and a short-term `SessionContext` (profile, last 6 QA
  ids, pending clarification) — never message content.
- **Context** (`lib/chatbot/context.ts`): pure helpers (`noteTurn`,
  `noteAnswer`, `setProfile`, `setPendingClarify`, `summarize`,
  `mapGuidedProfile`, `resolvePendingClarify`) — the guided tree's first
  mapped path id becomes the session profile; a pending clarification is
  resolved deterministically (id / "1"/"2" / letter / question text) and
  abandoned after 2 stale tries.
- **Flows** (`lib/chatbot/flows/*`): 8 deterministic state machines — technical,
  juridique, informatif, psychologique, emotion-weather, breathing (4-2-6),
  grounding (5-4-3-2-1), guided-qualification (16-node tree) — driven by
  `handleFlow` (`flows/index.ts`); `launchFlow(flowId)` starts a flow from its
  root (shared by intents and the hybrid router); `helpers.ts` provides
  `matchOption`, `askAgain` (state retained on bad input), `qaAnswer`
  (verbatim, throws on dead ids), `toResponse`.
- **Intents** (`lib/chatbot/intents.ts`): explicit user-ask substring triggers
  that launch flows; deliberately disjoint from QA keywords/synonyms.
- **Matcher** (`lib/chatbot/matcher.ts`): scores every `QAEntry` as
  `keywordMatches * 2 + synonymMatches`; picks the highest score ≥ `MIN_MATCHES`
  (1). Tie-break: more keyword matches, then narrower `profiles` list (more
  specific entry wins), then longer matched keyword, then the canonical
  question mentioning it. **Confidence gate:** `high` when a strong term
  (`STRONG_TERMS`) matched or ≥2 distinct keywords — a single generic keyword
  is `low` and goes to the hybrid layer.
- **Hybrid router** (`lib/router/route.ts`): `routeLLM` — caps (message length,
  session turns) → retrieval top 5 (never outside the 74) → degraded serve at
  hybrid score ≥ 0.75 (zero LLM calls) → `classify()` (Gemini/Groq/OpenRouter
  chain, result cached by normalized message+context) → route:
  - `qa` (1 id) → verbatim answer via `qaAnswer`, mode `llm`;
  - `clarify` (2–3 ids) → prompt with the two validated questions, pending
    stored in context;
  - `flow` (whitelisted id) → `launchFlow`, state persisted;
  - `smalltalk` → free text only after `checkFreeText` (short, grounded, not a
    hidden crisis — crisis phrasing returns the validated crisis message);
  - `offtopic` → fallback copy.
  Every provider failure, invalid payload or unknown id degrades to the
  fallback — never an error/empty text.
- **Retrieval** (`lib/rag/retriever.ts`): lexical-only when
  `data/embeddings.json` is absent; hybrid `0.6×semantic + 0.4×lexic + 0.15
  (profile ∈ entry.profiles)` when it exists and a provider key is set; a
  failed query embedding degrades to lexical for that turn.
- **LLM client** (`lib/llm/client.ts`): fetch-only; Gemini
  `:generateContent` / `gemini-embedding-001`, Groq & OpenRouter OpenAI-style
  chat completions; 429 → 1 s retry (cap), auth/5xx/timeout → next provider,
  invalid JSON → retry at temperature 0 then `bad_json`; module-level circuit
  breaker (3 failures / 60 s, half-open re-probe).
- **Config** (`lib/config/env.ts`): typed knobs (`LLM_PROVIDER`, keys, models,
  timeouts, caps, rate limits, `ENABLE_META_LOGGING`, `ENABLE_RESPONSE_CACHE`);
  `.env.example` documents every variable; without any key (or with an
  OpenRouter key but no `OPENROUTER_MODEL`) `llmProvider` is null and the
  hybrid path is off (today's behavior). `LLM_PROVIDER` moves its provider to
  the front of the chain; the others stay as fallbacks. `LLM_SMALLTALK=false`
  suppresses generated free text — the router then serves validated copy only.
- **The fallback** (`lib/chatbot/fallback.ts`): returns the `fallback` i18n string
  (invites rephrasing + lists the five `parcours` themes).
- **Security & privacy:** per-client LLM rate gate (minute + day buckets,
  bounded maps; the client identity is `x-real-ip`/`cf-connecting-ip`, else the
  LAST `x-forwarded-for` hop — the leftmost entry is caller-supplied and
  spoofable — else the session id; denied = fallback, never a 429, no new copy);
  metadata logs (`emc-meta`) carry mode/matchedId/latency only — never raw
  user messages (AGENTS.md §10); no persistence of conversations.

## 6. Frontend

- **Pages:** single page `app/page.tsx` → `AppShell`. No routing.
- **State management:** plain local React state inside `AppShell.tsx`
  (`messages`, `isTyping`, `sidebarOpen`, `inputValue`, `composerFocusSignal`).
  No global store, no context, no server state.
- **API integration:** `sendMessage` in `AppShell.tsx` POSTs `{ message,
  sessionId }` to `/api/chat`; on error the assistant replies with the
  `emptyMessage` string.
- **Chat UX:**
  - A greeting message (limits + emergency numbers) is pushed at conversation
    start; its quick reply launches the guided qualification tree.
  - `QuickReplies` under the latest assistant message send an option
    immediately via `onSend`.
  - Sidebar `TOPICS` insert a validated prompt into the composer via
    `selectPrompt` (focus signal).
  - `ChatWindow` groups consecutive same-role messages, shows a timestamp per
    group, auto-scrolls on new messages/typing.
  - `MessageBubble`: user bubbles right-aligned (teal); assistant left with
    avatar; crisis responses render with a red bubble + `crisisNotice` label.
  - `TypingIndicator` shown while awaiting a response.
- **Layout:** viewport-locked shell (`h-dvh`) so the composer stays pinned;
  `Header` (sticky, mobile menu button, status badge, new-chat, theme toggle),
  `Sidebar` (drawer on mobile, static on `lg+`), `Footer`. Max content width
  1440px, chat column max 768px.
- **Theming:** class-based dark mode — `.dark` on `<html>`, applied by an
  inline script in `layout.tsx` (reads `localStorage.theme`, falls back to
  `prefers-color-scheme`) to avoid FOUC; `ThemeToggle` toggles the class and
  persists. Design tokens + `@custom-variant dark` defined in `globals.css`.
- **i18n:** all UI copy via `t("fr", key)` from `lib/i18n.ts`; Arabic dict is
  scaffolded but empty (this phase).
- **A11y:** reduced-motion media query, focus-visible rings, aria-labels, sr-only
  text for the typing indicator.

## 7. Database

- **Technology:** none. Static typed arrays in `data/`.
- **`QA_DATABASE` (`data/qa-database.ts`):** 74 entries with unique `id`s in
  `X.Y` format, grouped by `category`:

  | Section | Category | Count |
  |---|---|---|
  | 2.1–2.4 | `presentation-emc` | 4 |
  | 3.1–3.9 | `signalement-assistance` | 9 |
  | 4.1–4.14 | `juridique` | 14 |
  | 5.1–5.9 | `psychologique` | 9 |
  | 6.1–6.26 | `informatif` | 26 |
  | 7.1–7.12 | `protection-prevention` | 12 |

- **`CRISIS_PROTOCOL` (`data/crisis-protocol.ts`):** 2 cases —
  `physical-danger` (checked first) and `psychological-distress`, each with a
  fixed keyword list and exact French response copy. Copy validated and signed
  off by the encadrante (Mme Belaous) — do not change without her re-validation.

### Data model (`types/qa.ts`)
- `Profile`: `victime-mineure | victime-majeure | parent-tuteur |
  enseignant-educateur | temoin | professionnel`
- `Parcours`: `technique | juridique | informatif | psychologique | parental`
- `Category`: `presentation-emc | signalement-assistance | juridique |
  psychologique | informatif | protection-prevention`
- `QAEntry`: `{ id, category, question, profiles, parcours,
  sampleFormulations, answer, keywords, synonyms, tags }` — `answer`, leading
  `keywords`, `sampleFormulations`, `profiles`, `parcours` come verbatim from
  `docs/qa-source.md`; additional keyword variants, `synonyms`, `tags` are
  generated retrieval metadata.
- `ChatMessage` (`types/chat.ts`): `{ id, role: "user"|"assistant", text,
  isCrisis?, timestamp?, options?, flowId?, mode?, matchedId?, confidence? }`;
  `ChatResponse`: `{ text, isCrisis, options?, flowId?, mode?, matchedId?,
  confidence? }` (`mode`/`matchedId`/`confidence` added with the hybrid
  layer).
- Flows are typed in `types/flow.ts` (`FlowId`, `FlowState`, option types) and
  implemented as deterministic state machines in `lib/chatbot/flows/*`.

## 8. API

| Method | Endpoint | Purpose | Authentication |
| ------ | -------- | ------- | -------------- |
| POST | `/api/chat` | Send one user message, receive assistant reply | None |

Request: `{ "message": string, "sessionId": string }`. Response: `{ "text":
string, "isCrisis": boolean, "options"?: string[], "flowId"?: string,
"mode"?: "static" | "llm" | "fallback", "matchedId"?: string | null,
"confidence"?: number }` (see §5 for status codes).

## 9. Important Architectural Decisions

- **Single Next.js codebase** for frontend + backend (Route Handlers serve as
  the Node.js backend) — chosen so the whole stack stays one deployable
  TypeScript codebase (AGENTS.md §3).
- **Hybrid, static-first**: the LLM is an understanding layer for
  low-confidence messages only — it proposes ids/flows/clarifications, never
  writes copy; every failure degrades to the deterministic fallback. Detailed
  blueprint: `PLANLLM.md` / `docs/architecture-hybrid.md` (phases 0–7
  implemented).
- **Safety-first pipeline** — crisis detection runs before any general matching
  and short-circuits it; `physical-danger` (Case 2) is checked before
  `psychological-distress` (Case 1) because Case 2 takes precedence. The
  classifier is explicitly forbidden from handling danger messages.
- **Static typed knowledge base in the repo** — no database this phase; the
  KB is regenerated from `docs/qa-source.md` (which is regenerated from a PDF).
  Text is served to users exclusively through `qaAnswer()` (verbatim).
- **Confidence gate** — a single generic keyword with no strong term never
  serves a possibly-wrong entry: it goes through the hybrid layer (fallback
  without configured keys). Discriminative `STRONG_TERMS` and multi-keyword
  matches stay static (fast, deterministic).
- **`t()` i18n indirection from day one** — cheap path to future Arabic
  support (only French ships now); new hybrid copy marked `TODO(encadrante)`.
- **Desktop-first UI redesign**: viewport-pinned app shell, responsive drawer
  sidebar, greeting message at conversation start (with the guided-tree launch
  quick reply), dark mode.
- **Class-based dark mode with inline FOUC-prevention script** — no theme
  library; single source of truth is the `.dark` class on `<html>` plus
  `localStorage.theme`.
- **Generated retrieval metadata** (`synonyms`, `tags`, extended `keywords`)
  is distinguished from validated copy; validated strings are never
  paraphrased.

## 10. Coding Conventions

- TypeScript **strict**; no `any` without a justifying comment.
- Components: PascalCase filenames, one component per file (in `components/`).
- Lib/utility files: kebab-case (`lib/chatbot/normalize.ts`, `lib/i18n.ts`).
- Path alias `@/*` maps to repo root (tsconfig + vitest config).
- Class merging via `cn()` (`lib/utils.ts`); `cva` variants for `Button`/`Badge`.
- Matching logic lives in small pure functions in `lib/chatbot/` so it is unit
  testable without rendering the UI.
- All user-facing copy goes through `t(locale, key)`; crisis/Q&A strings are
  copied verbatim from the validated sources.
- Error handling: no try/catch in route beyond body parsing; the client catches
  fetch failures and shows the `emptyMessage` reply.
- Tests: Vitest + jsdom in `tests/`, named `*.test.ts`, one file per subsystem.

## 11. Important Constraints

- **Sensitive-content product.** Never move general matching ahead of the
  crisis check (AGENTS.md §6). Do not change the encadrante-approved crisis
  copy without her re-validation (Mme Belaous).
- Do not paraphrase or alter legal articles, phone numbers, URLs, or answers —
  copy from `docs/qa-source.md` exactly. If a needed scenario isn't in the
  source doc, flag it instead of inventing content.
- Deterministic layer stays authoritative: the LLM proposes ids only, every
  answer is served verbatim from the validated database, and the crisis gate
  always runs first. New hybrid user-facing copy (`clarifyPrompt`) needs the encadrante's sign-off before public use
  (AGENTS.md §9/§13; `TODO(encadrante)` in `lib/i18n.ts`).
- No user accounts, no message persistence/logging of message content;
  metadata logs (`emc-meta`) exclude message text.
- Arabic strings are intentionally empty this phase (AGENTS.md §13).
- Run `npm run lint`, `npm run typecheck`, and `npm run test` before finishing;
  never weaken `tsconfig.json` strictness.
- `AGENTS.md`, `PROJECT_CONTEXT.md`, `PROGRESS.md`, `PLANLLM.md` and
  `CLAUDE.md` are committed project docs; only `.env*` (except `.env.example`)
  and build artifacts are gitignored.

## 12. Known Issues

Verified from the codebase:

1. **Version drift** — `package.json` version is `0.1.0` but the sidebar copy
   shows "EMC Helpline · 0.2.0" (`lib/i18n.ts` `sidebarVersionValue`).
2. **Crisis keyword precision** — literal substring matching on single words
   (`mourir`, `suicide`, `au secours`) can over-trigger in non-crisis contexts,
   and conjugated forms ("je me scarifie") are not detected. Intended literal
   behavior per AGENTS.md §6; documented as eval KNOWNGAPs (extending the
   protocol requires encadrante sign-off).
3. **LLM disabled without keys** — no `GEMINI_API_KEY`/Groq/OpenRouter key ⇒
   `llmProvider` is null, hybrid path off, low-confidence messages get the
   fallback (documented HYBRID-REQUIRED gaps in the eval corpus).
4. **`data/embeddings.json` is an artifact** — absent until `npm run
   index-embeddings` runs with a key (lexical-only retrieval while absent;
   fully supported). Regenerate after knowledge-base edits. Indexed with
   `gemini-embedding-001` (GA, 3072 dims; the legacy `text-embedding-001`
   family is retired and returns 404 on v1beta).
5. **Single-keyword canonical questions need keys** — e.g. `"Qu'est-ce que le
   cyberharcèlement ?"` reaches its validated answer via the hybrid/degraded
   serve path only when keys are configured (see `tests/eval/corpus.ts` notes).

## 13. Important Files

- `AGENTS.md` — canonical project rules, safety protocol, testing requirements.
- `docs/qa-source.md` — single source of truth for all chatbot content.
- `docs/architecture-hybrid.md` — verbatim PLANLLM blueprint (phases 0–7 done).
- `data/qa-database.ts` — the 74-entry typed knowledge base used at runtime.
- `data/crisis-protocol.ts` — crisis cases; first-priority check.
- `data/embeddings.json` — generated semantic index (absent = supported mode).
- `app/api/chat/route.ts` — the only backend endpoint (confidence gate +
  hybrid cutover).
- `lib/chatbot/*` — matching engine (normalize, safety, matcher, fallback,
  intents, session, context, rate-limit, cache, observe, meters, validator,
  linkify) + `flows/` state machines.
- `lib/config/env.ts`, `lib/llm/client.ts` + `classifier.ts`,
  `lib/rag/retriever.ts` + `indexer.ts`, `lib/router/route.ts` — hybrid layer.
- `lib/i18n.ts` — all user-facing strings (fr/ar dictionaries).
- `lib/suggestions.ts` — starter prompts (validated formulations) for the UI.
- `components/layout/AppShell.tsx` — owns chat state and wires everything.
- `components/chat/ChatWindow.tsx` / `MessageBubble.tsx` — core chat UI.
- `app/globals.css` — design-token theme (light/dark), animations.
- `tests/eval/` + `npm run eval` — golden corpus, deterministic CI gate,
  live before/after report.
- `tests/safety.test.ts`, `tests/matcher.test.ts` — regression safety net.
