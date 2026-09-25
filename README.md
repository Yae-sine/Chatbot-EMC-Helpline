# EMC Helpline Chatbot

Static-first helpline chatbot for cyberviolence victims in Morocco — validated answers, crisis-first routing, 8 guided flows.

Rule-based (deterministic-first) conversational assistant for the CMRPI / Espace Maroc Cyberconfiance (EMC) Helpline. It guides victims of cyberviolence — plus parents, teachers, witnesses, and professionals — to the right validated information and resource (EMC-Helpline, ONDE 2511, Police 19, Gendarmerie Royale 177, legal or psychological support).

> **GitHub description (one-liner):** `Static-first helpline chatbot for cyberviolence victims in Morocco — validated answers, crisis-first routing, 8 guided flows.`

Built with **Next.js (App Router) + TypeScript (strict) + Tailwind CSS** as a single deployable codebase. No database, no user accounts, no message persistence.

## Safety first (non-negotiable)

Every incoming message is checked against the crisis protocol **before anything else**. On a match, the chatbot returns the validated crisis message immediately and skips the normal Q&A flow — no clarifying questions, no delay.

- **Case 2 — immediate physical danger** is checked first (Police 19, Gendarmerie Royale 177 in rural areas, ONDE 2511 if a child is concerned).
- **Case 1 — psychological distress / suicidal ideation** (ONDE 2511, trusted person).
- Case 2 takes precedence on overlap. Matching is deliberate literal substring matching on normalized text (lowercase, accents stripped).

The exact crisis wording lives in `data/crisis-protocol.ts` and was signed off by the encadrante — do not change it without re-validation. See `AGENTS.md` §6.

## Features

**Knowledge base — 75 validated entries**
- Typed `QA_DATABASE` in `data/qa-database.ts`, sourced verbatim from `docs/qa-source.md` + the validated resource PDF: 2.x presentation-EMC (4), 3.x signalement-assistance (9), 4.x juridique (14, incl. per-authority complaint entries), 5.x psychologique (9), 6.x informatif (27, incl. 12 attack facettes + child-risk entries + 6.27 humiliating photo/video), 7.x protection-prevention (12).
- Answers, trigger keywords, and sample formulations are validated copy — never paraphrased. `synonyms`/`tags`/keyword variants are generated retrieval metadata only.
- Text is served to users exclusively through `qaAnswer()` (verbatim, throws on unknown id).

**Request pipeline (`POST /api/chat`)**
1. Validate body (400 on missing/empty).
2. Crisis detection → immediate crisis reply (`isCrisis: true`).
3. Farewell detection → clears any active flow.
4. Pending clarification re-route (id / "1" / "2" / question text; abandoned after 2 stale tries).
5. Active flow resume (`handleFlow`, follows `switchTo`). A message the flow can't use **leaves the flow** when it reads as a question or the knowledge base answers it with high confidence — otherwise it re-prompts and keeps the flow.
6. Explicit intent → launches a flow; emotional-state gate → opens `emotion-weather` with validated copy.
7. High-confidence static match (`matchEntry`) → validated answer (`mode: "static"`).
8. Else hybrid LLM layer (rate-limited) → validated answer / flow / clarification / grounded smalltalk (`mode: "llm"`).
9. Fallback message (invites rephrasing + lists the five `parcours` themes, `mode: "fallback"`).

**8 deterministic flows** (`lib/chatbot/flows/`, typed in `types/flow.ts`)
- `parcours-technique` (content → platform → nature → orientation; StopNCII / Take It Down / IWF / e-vigilance), `parcours-juridique` (legal answers + authorities submenu: Parquet/plaintes.pmp.ma, Police/E-Blagh, Gendarmerie, Ministry of Justice, women/children cells), `parcours-informatif` (definitions + facettes + risks 6.19–6.26 + prevention 7.8–7.12 submenu), `parcours-psychologique` (emotion-weather routing + psychoeducation + consequences + non-diagnostic PHQ-4/DASS-21 orientation), `guided-qualification` (16-node profile → intent → situation → need tree, leaves resolve to one QA entry), `emotion-weather` (intensity 1–5 → strongest-feeling question → per-emotion validation script → breathing/grounding switch), `breathing-4-2-6` (4 cycles, redo/parcours/terminate), `grounding-5-4-3-2-1` (5 senses, validate-then-advance) + shared `resources` menu (3.1 EMC-Helpline, 3.7 reporting sites, 3.4 intimate-content removal, 4.5 filing a complaint).

**Chat UX (mobile-first, accessible)**
- Single page (`app/page.tsx` → `AppShell`): greeting message (assistant limits + emergency numbers) with guided-tree entry, quick-reply pills that send on click, sidebar topics that fill the composer.
- Assistant answers render as borderless prose with preserved paragraphs and safe clickable links; user messages stay bubbled; crisis replies are the only filled alert panel (`role="alert"`).
- Breathing orb animation (pausable, reduced-motion variant, newest-turn-only), typing indicator, stick-to-bottom scrolling with "back to latest" button, offline failure row with retry (never blamed on the user).
- Light/dark themes (class-based, FOUC-safe), emergency numbers as one-tap `tel:` links in the sidebar, responsive drawer below `lg`, skip link, `role="log"` announcements, focus trap + Escape, ≥40px touch targets, AA-verified contrast.
- All UI copy goes through `t("fr", key)` (`lib/i18n.ts`); Arabic dictionary is scaffolded (empty this phase).

**Hybrid understanding layer (static-first, opt-in via keys)**
- The LLM never writes user-facing copy: the classifier (Gemini primary, Groq/OpenRouter chain fallback) only proposes QA ids / flows / clarifications; every answer is still served verbatim from the validated base. Every failure degrades to the deterministic fallback — never an error to the user.
- Confidence gate: a strong term or ≥2 keywords stays static; a single generic keyword goes to the hybrid path.
- RAG-light retrieval: lexical + build-time semantic embeddings (`data/embeddings.json`, generated via `npm run index-embeddings`, absent = lexical-only supported mode), hybrid score + profile boost, degraded-serve at ≥0.75 with zero LLM calls.
- Session context (profile, last QA ids, pending clarification — routing facts only), classifier-result cache (TTL+LRU), per-client rate limits (10/min, 200/day; denied = fallback, never 429), `emc-meta` metadata logs with **no message content**.

**Privacy**: no server-side persistence beyond the request/response cycle, no raw-message logging, in-memory sessions (30-min TTL, capped) holding routing data only.

## Getting started

```bash
npm install
npm run dev        # http://localhost:3000
```

Optional (enables the hybrid layer + semantic retrieval):

```bash
cp .env.example .env   # then set at least one provider key
npm run index-embeddings  # regenerates data/embeddings.json (needs GEMINI_API_KEY)
npm run eval              # golden-corpus before/after report (needs keys for the live subset)
```

Key variables in `.env.example`: `LLM_PROVIDER` (gemini | groq | openrouter), `GEMINI_API_KEY` / `GROQ_API_KEY` / `OPENROUTER_API_KEY`, `GEMINI_CHAT_MODEL` / `GROQ_CHAT_MODEL` / `OPENROUTER_MODEL` (required for OpenRouter), `LLM_TIMEOUT_MS`, `LLM_MAX_RETRIES`, `LLM_SMALLTALK`, `TRUSTED_PROXY_HOPS`, `RATE_LIMIT_PER_MINUTE` / `RATE_LIMIT_PER_DAY`, `MESSAGE_CHAR_LIMIT` / `SESSION_TURN_CAP`, `ENABLE_META_LOGGING`, `ENABLE_RESPONSE_CACHE`. Without any usable key the hybrid path is off and the bot behaves deterministically.

## Commands

```bash
npm install
npm run dev          # http://localhost:3000
npm run build
npm run start
npm run lint
npm run typecheck
npm run test
npm run test:watch
npm run eval             # golden-corpus report (tests/eval/report.test.ts)
npm run index-embeddings # rebuild data/embeddings.json (needs a key; tsx)
```

Always run `lint`, `typecheck`, and `test` before considering a task done. Never weaken `tsconfig.json` strictness.

## API

| Method | Endpoint   | Purpose                                  | Auth |
| ------ | ---------- | ---------------------------------------- | ---- |
| POST   | `/api/chat` | Send one message, receive assistant reply | None |

Request: `{ "message": string, "sessionId": string }` (`sessionId` is client-generated via `crypto.randomUUID()`, regenerated on "new conversation").
Response: `{ "text": string, "isCrisis": boolean, "options"?: string[], "flowId"?: string, "exercise"?: string, "mode"?: "static" | "llm" | "fallback", "matchedId"?: string | null, "confidence"?: number }`.

## Testing & quality

- Vitest + jsdom + Testing Library. Suites: `safety` (every crisis keyword, exact copy, Case 2 precedence, short-circuit via real POST), `matcher` (every `sampleFormulation` resolves to its own entry), `spotcheck` (qualitative end-to-end phrasings), `flows` / `guided` / `route-flows` (orchestration, session isolation, farewell clearing, crisis-overrides-flow), `router` / `hybrid-route` / `retriever` / `validator` / `context` / `rate-limit` / `cache` / `llm-client` / `session` / `indexer` / `classifier` / `emotion`, plus component tests (`message-text`, `message-bubble`, `quick-replies`, `sidebar`, `linkify`).
- `tests/eval/` golden corpus: **172 cases across 14 categories** (exact, paraphrase, typo, informal, short/long, ambiguous, multi-intent, out-of-domain, adversarial, safety, retrieval, deterministic-required, emotional). CI asserts the deterministic subset on every run; `npm run eval` prints the full + live before/after table when keys are configured.

## Project structure

```
app/
  page.tsx                 # chat page (renders <AppShell />)
  layout.tsx, globals.css  # root layout, Tailwind v4 tokens, dark-mode init
  api/chat/route.ts        # POST endpoint: message in -> response out
components/
  chat/                    # ChatWindow, MessageBubble, MessageText, ChatInput,
                           # QuickReplies, TypingIndicator, BreathingPulse,
                           # SystemNotice, LinkifiedText
  layout/                  # AppShell (owns all chat state), Header, Sidebar,
                           # Footer, ThemeToggle
  ui/                      # primitives (shadcn-style): Button, Card, Badge,
                           # Avatar, Logo
lib/
  chatbot/                 # pure logic: normalize, safety, matcher, fallback,
                           # intents, emotion, session, context, rate-limit,
                           # cache, observe, meters, validator, linkify,
                           # flows/ (8 state machines + helpers + resources)
  config/env.ts            # typed env knobs
  llm/                     # provider client (Gemini/Groq/OpenRouter) + classifier
  rag/                     # retriever + indexer
  router/route.ts          # hybrid decision ladder (routeLLM)
  i18n.ts                  # t(locale, key) dictionary (fr filled, ar scaffolded)
  suggestions.ts           # starter prompts (validated formulations)
  ui/                      # greeting, emergency numbers, scroll/focus hooks
data/
  qa-database.ts           # 75 typed QAEntry (validated copy)
  crisis-protocol.ts       # 2 crisis cases (validated copy)
  embeddings.json          # generated semantic index (absent = supported mode)
types/  qa.ts  chat.ts  flow.ts
docs/   qa-source.md (canonical content)  architecture-hybrid.md (hybrid blueprint)
tests/  safety, matcher, spotcheck, flows, guided, route-flows, router,
        hybrid-route, retriever, validator, context, rate-limit, cache,
        llm-client, session, emotion, UI tests, eval/ (corpus + harness)
scripts/index-embeddings.ts
```

## Content rules

- `docs/qa-source.md` is the single source of truth. All `answer`, `keywords`, and `sampleFormulations` come from it — copy legal articles, phone numbers, and URLs exactly, never paraphrase.
- If a needed scenario isn't in the source doc, flag it instead of inventing content.
- When in doubt, crisis detection wins over general matching.

## Known limitations / roadmap

- **Vercel deployment** still pending (Jalon 3 "simple, online-accessible interface").
- **Hybrid needs keys**: without provider keys low-confidence messages get the fallback; regenerate `data/embeddings.json` after KB edits.
- **Literal crisis matching**: single-word triggers can over-fire; conjugated forms (e.g. "je me scarifie" vs keyword "me scarifier") are missed — extending the list needs encadrante sign-off.
- **In-memory sessions** die on restart/scale-out (fine this phase — no persistence by design).
- **Version drift**: sidebar shows 0.2.0 while `package.json` is 0.1.0; `parcours` tags for 2.1/2.2/7.1–7.3 unconfirmed; Arabic strings intentionally empty.
- Deferred (non-goals this phase): vector DB, user accounts, persistent storage.

## Docs map

- `AGENTS.md` — binding project rules + safety protocol.
- `PROJECT_CONTEXT.md` — technical architecture reference.
- `PROGRESS.md` — implementation status and next tasks.
- `docs/qa-source.md` — canonical validated knowledge base (Jalon 1).
- `docs/architecture-hybrid.md` — hybrid blueprint (phases 0–7 implemented).
- `PLANLLM.md` — hybrid planning notes.
