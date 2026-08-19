# Project Progress — EMC Helpline Chatbot

Implementation tracker. Mirrors `PROJECT_CONTEXT.md` for the current milestone.
Last verified state: `lint` and `typecheck` clean, `test` 95/95 passing, and
`build` all pass.

## Current Milestone

**Jalon 2 & 3 (PFA internship, Aug 2026):** deliver the rule-based EMC Helpline
chatbot — validated knowledge base wired into a keyword-matching engine behind a
chat UI, plus a simple online-deployable interface. The most recent completed
work is the **parcours polish iteration**: the stateful guided-parcours layer
(7 flows) was made robust and complete — emotion-weather Phase 2 (dominant
emotion) actually asks the validated question, wrong answers no longer destroy a
flow, the juridique/informatif/psychologique menus now cover all the authorities,
child-risk facettes and prevention good practices from the PDF, and a limits
greeting is pushed at conversation start.

## Completed

### Backend / Matching engine
- [x] `POST /api/chat` Route Handler (`app/api/chat/route.ts`), Node.js runtime,
      with input validation (400 on invalid/empty message) and full
      orchestration: crisis → farewell → active flow (sessionId) →
      intent (new flow) → QA matcher → fallback; responses carry
      `options`/`flowId`
- [x] Text normalization (`lib/chatbot/normalize.ts`): lowercase, accent
      stripping, punctuation cleanup
- [x] Safety protocol (`lib/chatbot/safety.ts` + `data/crisis-protocol.ts`):
      Case 2 `physical-danger` checked first, then Case 1
      `psychological-distress`; keyword lists extended with generated
      case/accent-insensitive variants; validated messages unchanged
      (signed off by the encadrante, Mme Belaous)
- [x] Matching engine (`lib/chatbot/matcher.ts`): keyword scoring,
      tie-breaking, `MIN_MATCHES` threshold; fallback listing the five
      `parcours` themes (`lib/chatbot/fallback.ts`)
- [x] Intent detection (`lib/chatbot/intents.ts`): explicit user-ask triggers
      for the 4 parcours + emotion-weather + breathing + grounding; triggers
      deliberately kept disjoint from QA keywords/synonyms
- [x] Session store (`lib/chatbot/session.ts`): in-memory Map, 30-min TTL,
      max 500 sessions, routing data only (no message content / no PII)
- [x] Flow engine: `lib/chatbot/flows/index.ts` (`handleFlow`, follows
      `switchTo` links, computes persistable `nextState`) + `helpers.ts`
      (`matchOption`, `askAgain` — keeps the current step so a misunderstood
      message never clears a flow, `qaAnswer` — verbatim answers only, throws on
      unknown id, `toResponse`)
- [x] Flow modules: `technical.ts` (content → platform → nature → orientation,
      links to StopNCII/Take It Down/IWF/evigilance), `juridique.ts` (menu of
      validated legal answers + **authorities submenu**: Parquet/plaintes.pmp.ma,
      Police/E-Blagh, Gendarmerie, Ministère de la Justice, cellules femmes et
      enfants), `informatif.ts` (definitions + 12 facettes + **risks submenu**
      6.19–6.26 + **prevention submenu** 7.8–7.12), `psychologique.ts` (routing
      to emotion-weather or psychoeducation answers, consequences menu 5.5/5.6/
      5.7/5.9 + 5.3 bien-être numérique + **PHQ-4/DASS-21 non-diagnostic
      orientation**), `emotion-weather.ts` (intensity 1–5 → **Phase-2 question
      « quel est le sentiment le plus fort »** with emoji buttons → validation
      script per emotion → switch to breathing/grounding),
      `breathing.ts` (4 × 4-2-6 cycles, redo/parcours/terminate at done, clean
      mid-exercise stop), `grounding.ts` (5-4-3-2-1 senses, validate-then-advance
      on every step, clean terminate)
- [x] Guided qualification tree (`guided-qualification` flow,
      `lib/chatbot/flows/guided.ts`): 16 declarative nodes
      (profile → intent → situation → need), leaves resolve to a single
      `QA_DATABASE` entry via `qaAnswer` (dead ids fail loudly), every node but
      `profile` auto-earns a `Retour` pill, "Je ne sais pas"/"Autre" exit to
      free typing; welcome suggestions replaced by the single tree launch
      option (`guidedStartPrompt`), free-text mid-tree abandons the tree and
      routes back to the general matcher (`fallbackToMatcher`)
- [x] Guided tree follow-up (acknowledgments + end-of-tree support): the
      mechanical "Très bien." transition is replaced with 9 per-choice
      acknowledgments (`option.ack`, shown above the next question, never on
      exits/leaves/back-navigation), and every resolved QA leaf now offers a
      single non-blocking pill "Aide-moi à gérer mes émotions" that launches
      the existing `emotion-weather` flow via normal intent routing
      (breathing/grounding are already offered inside that module, not
      duplicated here); the same option is also offered directly inside the
      tree's Soutien psychologique menu (`switchTo` on `GuidedOption`, hands
      the conversation to the real module — shared by the victime and parent
      intents)
- [x] Farewell phrases recognized at route level; they clear any active flow

### Knowledge base / data
- [x] 74-entry typed `QA_DATABASE` (`data/qa-database.ts`) across 6 categories,
      sourced from `docs/qa-source.md` + validated PDF (Ressources
      Chatbot.docx.pdf, extract in `/tmp/opencode/ressources-chatbot.txt`):
      ids 2.3–2.4, 3.7–3.9, 4.6–4.14 (incl. per-authority complaint entries),
      5.4–5.9, 6.5–6.26 (12 facettes + 8 child-risk facettes), 7.6–7.12;
      answers verbatim, keywords = validated triggers + generated variants, all
      `sampleFormulations` resolve back to their own entry
- [x] Typed domain model (`types/qa.ts`, `types/flow.ts`, `types/chat.ts`)

### Frontend
- [x] Chat flow: `ChatWindow` (grouping, timestamps, auto-scroll),
      `MessageBubble` (user / assistant / red crisis variant),
      `ChatInput` (auto-grow, Enter-to-send), `TypingIndicator`,
      `LinkifiedText` (safe `target="_blank"` links)
- [x] `QuickReplies` (`components/chat/QuickReplies.tsx`): clickable option
      pills rendered under the latest assistant message; clicking sends the
      option immediately
- [x] `BreathingPulse` (`components/chat/BreathingPulse.tsx`): animated
      4-2-6 circle + phase labels, shown on messages with
      `flowId === "breathing-4-2-6"`
- [x] App shell: `AppShell` owns chat state + a per-conversation `sessionId`
      (`crypto.randomUUID()`, regenerated on "Nouvelle conversation"), sent
      with every request; `options`/`flowId` stored on chat messages;
      **greeting message pushed at conversation start** (`greeting` i18n key —
      automated-assistant limits + emergency numbers 2511/19/177, with the
      guided tree launch option as the single quick reply); `Header`,
      `Sidebar`, `Footer`, `ThemeToggle`
- [x] Sidebar `TOPICS` keep the validated sample formulations
      (`lib/suggestions.ts`) as quick-reply prompts
- [x] i18n indirection for all UI copy (`lib/i18n.ts`), French filled
      (greeting, farewell, breathing phase labels); retired `WelcomeScreen` /
      `SuggestionCards` in favour of the persistent greeting message

### Testing & quality
- [x] `tests/safety.test.ts` — every crisis keyword triggers its case, exact
      message assertion, Case 2 beats Case 1, crisis short-circuits the matcher
      through the real `POST` route, case/accent insensitivity
- [x] `tests/matcher.test.ts` — 74 entries / unique ids, every
      `sampleFormulation` resolves back to its own entry
- [x] `tests/spotcheck.test.ts` — 28 qualitative end-to-end phrasings
      (incl. legal-answer disambiguation 4.1 vs 4.9 and the new
      per-authority/facette entries)
- [x] `tests/flows.test.ts` — 14 orchestration cases across all 7 flows:
      emotion-weather Phase-2 prompt + emoji buttons, askAgain state
      retention, `switchTo` chaining, authorities/risks/prevention submenus,
      PHQ-4/DASS-21 mention, done-step redo/terminate, validation pacing
- [x] `tests/route-flows.test.ts` — route-level session continuity, no
      cross-session leakage, farewell clearing, flow-then-QA resume,
      **crisis-overrides-active-flow**
- [x] `tests/linkify.test.tsx` — URL segmentation and rendered anchors
- [x] `npm run lint`, `npm run typecheck`, `npm run build` all pass

### Documentation & validation
- [x] Crisis-protocol copy signed off by the encadrante (Mme Belaous) —
      the exact wording in `data/crisis-protocol.ts` is validated, no longer a
      working proposal
- [x] Docs reconciled with the code: `AGENTS.md` (§5 structure, §6 crisis
      ordering + sign-off note, §7 data model incl. `category`/`synonyms`/
      `tags` and flow types, §8 pipeline), `PROJECT_CONTEXT.md` (structure,
      architecture, backend, DB counts, known issues), `PROGRESS.md`

## In Progress

None identified from the repository — the flow layer is complete and verified,
and the encadrante sign-off obtained. Items left are listed under Planned.

## Planned

Identifiable from TODOs, `AGENTS.md`, and source-doc notes:

- [ ] **`parcours` tagging confirmation** — confirm mapping for entries 2.1,
      2.2, 7.1–7.3 (currently unassigned) if `parcours` matters for routing UX
- [ ] **Vercel deployment** — AGENTS.md §14; satisfies the Jalon 3 "simple,
      online-accessible chat interface" requirement
- [ ] **Arabic translation strings** — fill the scaffolded `ar` dictionary
      (`TODO(ar)` in `lib/i18n.ts`, AGENTS.md §13)
- [ ] (Deferred phase, non-goals) LLM/RAG/vector DB; user accounts and
      persistent conversation storage

## Known Bugs / Issues

- **Version string drift.** Sidebar shows "EMC Helpline · 0.2.0" while
  `package.json` is `0.1.0`. File: `lib/i18n.ts` (`sidebarVersionValue`).
- **Crisis over-triggering on single words.** Literal substring matching means
  benign sentences containing e.g. "suicide" or "mourir" trigger the crisis
  path. Intended per AGENTS.md §6 but a precision limitation.
- **Flow continuation intercepts general questions (softened).** While a flow
  is active any non-option message gets the flow's `askAgain`, and the flow now
  **survives** the bad input (state retained, re-prompts). The user still needs
  to say "Terminer"/farewell to leave the parcours and get QA answers mid-flow.
  The guided tree is exempt: free text mid-tree clears the flow and is answered
  by the general matcher (`fallbackToMatcher`). Acceptable by design, worth a
  UX note.
- **In-memory sessions die on server restart/scale-out** (deployment caveat for
  long-running flows; harmless for this phase — no persistence per §10).

## Technical Debt

- **Limited UI/component tests.** `@testing-library/react`/`jsdom` configured;
  only `LinkifiedText` is covered. `QuickReplies`/`BreathingPulse`/AppShell
  session wiring have no component coverage yet.
- **No `.env.example`.** `.env*` is gitignored but no template documents what
  variables a future deploy could use (none are used today).
- **Version defined in two places** (`package.json` + i18n string) and already
  out of sync.
- **Crisis wording stored inline** in `data/crisis-protocol.ts`; if i18n for
  crisis messages is wanted (AGENTS.md §13 mentions it), the strings would need
  to move into the dictionary.

## Important Decisions

- Rule-based matching only this phase — no LLM/RAG (AGENTS.md §2).
- Safety check precedes general matching, always; `physical-danger` (Case 2)
  precedence over `psychological-distress` (Case 1) on overlap.
- Static typed knowledge base shipped in the repo instead of a database;
  answers returned verbatim via `qaAnswer()` (never rephrased in flows).
- Flows are opt-in conversations started by explicit intent phrasings, never by
  QA keyword overlap — the general matcher keeps answering validated content.
- Session state stores routing data only (flowId/step/data) — never message
  content or any PII (AGENTS.md §10).
- Session ids are client-generated (`crypto.randomUUID()`), sent in the POST
  body; store is in-memory with TTL/eviction.
- `switchTo` links flow modules together (emotion-weather → breathing/grounding,
  technical → juridique/psychologique, psychologique → emotion-weather);
  `handleFlow` resolves chains and computes the next persistable state.
- Single Next.js codebase (Route Handlers as backend) over a decoupled
  SPA + Express split; class-based dark mode without a library.
- `t()` dictionary indirection for all copy from day one (Arabic-ready).

## Next Recommended Tasks

1. **Deploy to Vercel** to close the Jalon 3 requirement (AGENTS.md §14).
2. **Extend component tests** for `QuickReplies`, `BreathingPulse`, and the
   AppShell session wiring (`@testing-library/react` already installed).
3. **Align the version string** (`lib/i18n.ts` vs `package.json`).
4. **Confirm `parcours` tagging** for entries 2.1, 2.2, 7.1–7.3 if routing UX
   needs it.
5. **Fill the Arabic dictionary** (later phase, per AGENTS.md §13).