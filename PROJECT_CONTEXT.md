# Project Context — EMC Helpline Chatbot

Technical reference for the CMRPI / Espace Maroc Cyberconfiance (EMC) "EMC
Helpline" chatbot. Read `AGENTS.md` (project rules + safety protocol) alongside
this file. This file documents the **current** state of the repository; see
`PROGRESS.md` for implementation status.

## 1. Project Overview

- A **rule-based** (no LLM/RAG) conversational assistant that helps victims of
  cyberviolence in Morocco, plus parents, teachers, witnesses, and
  professionals, get validated information and be routed to the right resource
  (EMC-Helpline, ONDE, Police, Gendarmerie, legal or psychological support).
- Built during **Jalon 2 & 3** of a PFA internship (Aug 1–31, 2026). Jalon 1
  produced the validated knowledge base in `docs/qa-source.md` (25
  conversational scenarios), which is the single source of truth for content.
- Current state: a functioning end-to-end chatbot (chat UI → API → matching
  engine → flow layer → static knowledge base) with a desktop-first UI
  redesign, light/dark theming, and passing lint/typecheck/tests/build. Not yet
  deployed publicly; crisis-protocol copy validated and signed off by the
  encadrante (Mme Belaous).

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
    matcher.ts            # keyword+synonym scoring against QA_DATABASE
    fallback.ts           # default "didn't understand" message
    intents.ts            # explicit user-ask triggers -> launch flows
    session.ts            # in-memory per-session flow state (30-min TTL)
    linkify.ts            # URL segmentation for safe link rendering
    flows/                # 8 deterministic state machines (technical, juridique,
                          # informatif, psychologique, emotion-weather, breathing,
                          # grounding, guided-qualification) + helpers.ts,
                          # index.ts orchestration
  i18n.ts                 # t(locale, key) dictionary (fr filled, ar scaffolded)
  suggestions.ts          # SUGGESTIONS + TOPICS (prompts = validated formulations)
  utils.ts                # cn() class-merging helper
data/
  qa-database.ts          # 74 QAEntry (typed), from docs/qa-source.md + Ressources PDF
  crisis-protocol.ts      # 2 crisis cases (exact copy, validated by the encadrante)
types/
  qa.ts                   # Profile, Parcours, Category, QAEntry, CrisisCase
  chat.ts                 # ChatMessage, ChatResponse
  flow.ts                 # FlowId, FlowState, option types
docs/
  qa-source.md            # canonical validated knowledge base (Jalon 1 deliverable)
tests/
  safety.test.ts          # crisis-protocol tests
  matcher.test.ts         # matching-engine tests
  spotcheck.test.ts       # qualitative end-to-end phrasings
  flows.test.ts           # flow orchestration tests
  guided.test.ts          # guided-qualification tree tests
  route-flows.test.ts     # route-level session/flow tests
  linkify.test.tsx        # URL link rendering tests
public/                   # default Next.js SVGs + logos (no custom assets)
```

## 4. Architecture

```
Browser (AppShell.tsx — client state + crypto.randomUUID sessionId)
  │  POST /api/chat  { message, sessionId }
  ▼
app/api/chat/route.ts  (Node.js Route Handler)
  │  1. validate body (400 on missing/empty)
  │  2. detectCrisis(message)   ──> crisis message immediately (Case 2 first)
  │  3. isFarewell(message)     ──> clears any active flow
  │  4. handleFlow(state, msg)  ──> active flow (per sessionId) drives the reply
  │  5. detectIntent(message)   ──> explicit ask -> launch a flow
  │  6. matchEntry(message, QA_DATABASE)
  │  7. fallbackMessage("fr") if no match
  ▼
{ text, isCrisis, options?, flowId? }
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
  - `200` `{ text: matchedEntry.answer, isCrisis: false, options?, flowId? }`
  - `200` `{ text: fallbackMessage, isCrisis: false }`
- **Normalization** (`lib/chatbot/normalize.ts`): lowercase, NFD accent
  stripping, strip non-alphanumerics, collapse whitespace.
- **Safety** (`lib/chatbot/safety.ts`): iterates `CRISIS_PROTOCOL` in array
  order, literal `includes()` substring match on normalized text. Returns first
  hit. `physical-danger` is first in the array (Case 2 takes precedence).
- **Farewell** (in `app/api/chat/route.ts`): exact normalized match on a fixed
  phrase list clears any active flow.
- **Session store** (`lib/chatbot/session.ts`): in-memory Map keyed by
  `sessionId`, 30-min TTL, max 500 sessions; stores flow routing data only
  (flowId/step/data), never message content.
- **Flows** (`lib/chatbot/flows/*`): 8 deterministic state machines — technical,
  juridique, informatif, psychologique, emotion-weather, breathing (4-2-6),
  grounding (5-4-3-2-1), guided-qualification (16-node tree) — driven by
  `handleFlow` (`flows/index.ts`); `helpers.ts` provides `matchOption`,
  `askAgain` (state retained on bad input), `qaAnswer` (verbatim, throws on
  dead ids), `toResponse`.
- **Intents** (`lib/chatbot/intents.ts`): explicit user-ask substring triggers
  that launch flows; deliberately disjoint from QA keywords/synonyms.
- **Matcher** (`lib/chatbot/matcher.ts`): scores every `QAEntry` as
  `keywordMatches * 2 + synonymMatches`; picks the highest score ≥ `MIN_MATCHES`
  (1). Tie-break: more keyword matches, then narrower `profiles` list (i.e.
  more specific entry wins; broad "tous profils" only as last resort).
- **Fallback** (`lib/chatbot/fallback.ts`): returns the `fallback` i18n string
  (invites rephrasing + lists the five `parcours` themes).
- **Security:** no auth, no rate limiting, no persistence. Privacy constraint
  (AGENTS.md §10): never log or store raw user messages.

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
  isCrisis?, timestamp?, options?, flowId? }`; `ChatResponse`: `{ text,
  isCrisis, options?, flowId? }`.
- Flows are typed in `types/flow.ts` (`FlowId`, `FlowState`, option types) and
  implemented as deterministic state machines in `lib/chatbot/flows/*`.

## 8. API

| Method | Endpoint | Purpose | Authentication |
| ------ | -------- | ------- | -------------- |
| POST | `/api/chat` | Send one user message, receive assistant reply | None |

Request: `{ "message": string, "sessionId": string }`. Response: `{ "text":
string, "isCrisis": boolean, "options"?: string[], "flowId"?: string }` (see
§5 for status codes).

## 9. Important Architectural Decisions

- **Single Next.js codebase** for frontend + backend (Route Handlers serve as
  the Node.js backend) — chosen so the whole stack stays one deployable
  TypeScript codebase (AGENTS.md §3).
- **Rule-based matching, no LLM/RAG** — explicitly deferred to a later phase.
- **Safety-first pipeline** — crisis detection runs before any general matching
  and short-circuits it; `physical-danger` (Case 2) is checked before
  `psychological-distress` (Case 1) because Case 2 takes precedence.
- **Static typed knowledge base in the repo** — no database this phase; the
  KB is regenerated from `docs/qa-source.md` (which is regenerated from a PDF).
- **`t()` i18n indirection from day one** — cheap path to future Arabic support
  (only French ships now).
- **Desktop-first UI redesign**: viewport-pinned app shell, responsive drawer
  sidebar, greeting message at conversation start (with the guided-tree launch
  quick reply), dark mode.
- **Class-based dark mode with inline FOUC-prevention script** — no theme
  library; single source of truth is the `.dark` class on `<html>` plus
  `localStorage.theme`.
- **Generated retrieval metadata** (`synonyms`, `tags`, extended `keywords`)
  is distinguished from validated copy; validated strings are never paraphrased.

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
- No LLM/RAG, no user accounts, no message persistence/logging this phase.
- Arabic strings are intentionally empty this phase (AGENTS.md §13).
- Run `npm run lint`, `npm run typecheck`, and `npm run test` before finishing;
  never weaken `tsconfig.json` strictness.
- `PROJECT_CONTEXT.md`, `PROGRESS.md`, and `AGENTS.md` are listed in
  `.gitignore` (local project docs, not committed).

## 12. Known Issues

Verified from the codebase:

1. **Version drift** — `package.json` version is `0.1.0` but the sidebar copy
   shows "EMC Helpline · 0.2.0" (`lib/i18n.ts` `sidebarVersionValue`).
2. **Crisis keyword precision** — literal substring matching on single words
   (`mourir`, `suicide`, `au secours`) can over-trigger in non-crisis contexts.
   This is the intended literal behavior per AGENTS.md §6, but a known
   limitation of the approach.

## 13. Important Files

- `AGENTS.md` — canonical project rules, safety protocol, testing requirements.
- `docs/qa-source.md` — single source of truth for all chatbot content.
- `data/qa-database.ts` — the 74-entry typed knowledge base used at runtime.
- `data/crisis-protocol.ts` — crisis cases; first-priority check.
- `app/api/chat/route.ts` — the only backend endpoint.
- `lib/chatbot/*` — matching engine (normalize, safety, matcher, fallback,
  intents, session, linkify) + `flows/` state machines.
- `lib/i18n.ts` — all user-facing strings (fr/ar dictionaries).
- `lib/suggestions.ts` — starter prompts (validated formulations) for the UI.
- `components/layout/AppShell.tsx` — owns chat state and wires everything.
- `components/chat/ChatWindow.tsx` / `MessageBubble.tsx` — core chat UI.
- `app/globals.css` — design-token theme (light/dark), animations.
- `tests/safety.test.ts`, `tests/matcher.test.ts` — regression safety net.
