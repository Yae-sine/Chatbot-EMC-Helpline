# Project Progress — EMC Helpline Chatbot

Implementation tracker. Mirrors `PROJECT_CONTEXT.md` for the current milestone.
Last verified state (2026-08-20): `lint` and `typecheck` clean, `test` 242
passed (+ 2 skipped live-only), `npm run eval` green (172 cases / 14
categories), `build` passing, and the hybrid + emotional paths verified live
against the three providers.

## Current Milestone

**Jalon 2 & 3 (PFA internship, Aug 2026):** deliver the rule-based EMC Helpline
chatbot — validated knowledge base wired into a keyword-matching engine behind a
chat UI, plus a simple online-deployable interface. The most recent completed
work is the **hybrid LLM layer (PLANLLM phases 0–7, committed)**:
static-first matching with a confidence gate, an LLM understanding layer
(Gemini 2.5 Flash primary, Groq/OpenRouter chain fallback) that proposes QA ids
/ flows / clarifications — text is always served from the validated database —
plus RAG-light retrieval (build-time embeddings, no vector DB), short-term
session context, per-client rate limits, classifier-result caching and a
golden eval corpus (`npm run eval` prints the before/after table with keys).

## Completed

### Informatif facettes: definition → definition + reporting route (2026-08-21)
- [x] **15 answers enriched** (`data/qa-database.ts`): the 12 facettes served by
      the `parcours informatif` menu (6.7–6.18: stalking, cybermenaces,
      dénigrement, doxing, exclusion, flaming, fraping, grooming, usurpation,
      outing, revenge porn, sextorsion) plus 6.24 contenus inappropriés, 6.25
      racisme/haine and 6.26 fraude were definition-only. Each now closes with
      the validated route for that specific attack, in the house style of
      6.19–6.23 (which already had it and were left untouched)
- [x] **Channels are verbatim from `Ressources Chatbot.docx.pdf`** (§I.3
      contacts, §II « Comment et où porter plainte ? », §IV « BLOQUER et
      SIGNALER » / « RÉFLEXE N°1 : Faites des captures d'écran »): evigilance,
      cyberconfiance/signalment, IWF, reportcontent.google, Take It Down,
      StopNCII, 2511 (ONDE), plaintes.pmp.ma, e-blagh.ma. Nothing invented
- [x] **New entry 6.27** — « Quelqu'un a publié une photo ou une vidéo
      humiliante de moi, que faire ? ». The §IV theme « publication de photo ou
      vidéo embarrassante ou humiliante » existed only inside 6.1's enumeration
      and 3.2's how-to-report. Everything else in the PDF was already covered:
      the bonnes pratiques (7.8–7.12) and every reporting channel (3.x) exist
- [x] **Mirrored in `docs/qa-source.md`** (annex: per-entry route table + the
      6.27 block) and counts updated everywhere (74 → 75: `PROJECT_CONTEXT.md`
      §7 table, `tests/matcher.test.ts`, `PLANLLM.md`, `CLAUDE.md`,
      `lib/router/route.ts` comment)
- [x] **`data/embeddings.json` regenerated** — 75 vectors, dim 3072, no
      malformed row. Needed because `buildIndexPayload` embeds
      question/formulations/synonyms/tags (the 15 answer edits alone required
      no re-index)
- [x] **Verified**: lint, typecheck, 242 tests (incl. the matcher invariant that
      every `sampleFormulation` resolves back to its own entry — 6.27 does not
      collide with 3.2/3.4), deterministic `npm run eval` unchanged at 98/172
      with strict id accuracy 50/105, and a live walk of the parcours
      (facettes → Doxing / Revenge porn / Grooming, risks → contenus
      inappropriés) showing the enriched answers served verbatim

### Review remediation + provider observability (2026-08-20)
- [x] **Retrieval used the wrong provider for embeddings**
      (`lib/rag/retriever.ts`): the query was embedded with `providers[0]`,
      but only Gemini implements `embedTexts` and `data/embeddings.json` is a
      `gemini-embedding-001` artifact. With `LLM_PROVIDER=groq` (or
      openrouter) semantic retrieval was silently dead — the failure degrades
      to lexical, so nothing logged it, and the ≥0.75 degraded-serve path
      became unreachable (lexical alone caps at 0.4). The retriever now picks
      the Gemini provider explicitly, like `scripts/index-embeddings.ts`
- [x] **The request timeout did not cover the response body**
      (`lib/llm/client.ts`): `clearTimeout` ran as soon as headers arrived, so
      a provider that stalled the stream ran unbounded past
      `LLM_TIMEOUT_MS`. The abort timer now stays armed through
      `response.text()`
- [x] **Reasoning models could not be read** (`readGeminiText`): only
      `parts[0].text` was inspected, so a thought part in front of the answer
      produced `bad_json`. It now scans for the first non-thought text part
- [x] **Unusable payloads were metered as successes**: `completeJSON` accepts
      an optional `validate` callback (the classifier passes its schema
      check), so a provider answering well-formed-but-invalid JSON is metered
      as a failure with kind `invalid_payload` and feeds the circuit breaker
      instead of being re-probed on every request
- [x] **Session eviction is now true LRU** (`lib/chatbot/session.ts`): writes
      delete-then-set so insertion order means recency; an active session is
      no longer evicted just because it was created first
- [x] **Smalltalk was grounded against the user's own message**
      (`lib/router/route.ts`): a visitor who wrote « regarde
      https://evil.example » could have that link echoed back and pass
      `isGrounded`. Grounding now uses validated copy only (QA answers +
      crisis messages)
- [x] **Expired clarifications are cleared** and **a pending clarification no
      longer swallows distress or an explicit request** (`app/api/chat/route.ts`):
      « je n'en peux plus » opens the météo des émotions and an exercise
      request launches it, instead of both getting the disambiguation prompt
      again
- [x] **Rate-limit identity is configurable** (`TRUSTED_PROXY_HOPS`, default
      1): `rateLimitKey` moved to `lib/chatbot/rate-limit.ts` (a Next route
      file cannot export helpers) and counts back the configured number of
      trusted hops, so a CDN-in-front deployment does not collapse every
      visitor into one budget
- [x] **`STRONG_TERMS` audit** (`lib/chatbot/matcher.ts`): « aidez moi »
      removed — a keyword of 7.2 only, so any message containing it was served
      the generic four-reflexes sheet at full confidence (« aidez-moi, ma
      fille reçoit des images d'abus sexuel » never reached 3.3). The rest of
      the list was re-checked against its own contract and kept
- [x] **Observability** (`lib/chatbot/meters.ts`): calls now carry a failure
      kind, the snapshot exposes a per-provider ok/fail/kind breakdown and a
      classifier decision distribution (`qa`/`clarify`/`flow`/`offtopic`/
      `smalltalk`/`degraded-serve`/`cache-hit`/`classifier-failed`), and
      `npm run eval` prints both. The previous live run reported 27/54 calls
      failing with no way to see which provider or why
- [x] **Tests**: 224 → 242, incl. new `tests/classifier.test.ts` and cases for
      the stalled body, thought-part responses, per-provider kinds, the
      embedder choice, LRU eviction, `rateLimitKey` hop counting, grounding
      against validated copy, and clarification precedence

### Live measurement, 2026-08-20 (172-case corpus, keys configured)
Recorded from `npm run eval` with the new breakdown — the numbers the previous
run could not explain (it reported only "27/54 calls failed"):
- provider calls 38 (22 ok / 16 fail): gemini 14 ok / 5 fail (rate_limit 4,
  timeout 1) · groq 8 ok / 7 fail (**invalid_payload 4**, rate_limit 2,
  http 1) · openrouter 0 ok / 4 fail (rate_limit 4)
- classifier decisions: 68 failed, qa 8, offtopic 10, clarify 2, smalltalk 2
- **Reading it:** 68 failures against 38 calls means most failures made no call
  at all — every circuit breaker was open. The harness fires the corpus
  back-to-back, so a live run measures the free tiers' burst limits as much as
  the hybrid layer; `breaker-open` is now counted separately from a real
  provider failure so the two cannot be confused again. Targeted live checks
  (a handful of messages, human pace) answer correctly in 1–4 s.
- **Actionable:** `openai/gpt-oss-120b` returned schema-invalid classifier
  payloads on 4 of its 12 answered calls, and `openrouter/free` never answered
  under burst. Worth re-testing `groq/compound-mini` (valid payloads in the
  earlier smoke run) before trusting Groq as the second link.

### Emotional detection → météo des émotions (2026-08-20)
- [x] **Deterministic gate** (`lib/chatbot/emotion.ts`, new): first-person
      present-state patterns (« j'ai très peur », « je n'en dors plus »,
      « je suis submergée », « ça me hante »…) with two suppressors — a
      factual marker (question mark, plainte/signaler/loi/comment…) and a
      third-person subject (mon fils, ma fille, mon élève…). Runs in
      `app/api/chat/route.ts` step 4b, after explicit intents and before the
      matcher, and opens `emotion-weather` via `launchFlow`. No key, no quota,
      no provider needed
- [x] **Zero new user-facing copy**: the flow's own validated opener
      (« Je suis là pour vous écouter… une météo intérieure ») and its
      per-emotion psychoeducation scripts are the reply
- [x] **Classifier tier** (`lib/llm/classifier.ts`): the `flow` rule now also
      covers a message describing the writer's own emotional state, and the
      `offtopic` rule no longer swallows it (it used to say « TOUJOURS quand
      le message évoque un danger **ou une détresse** »; the deterministic
      crisis module still owns danger/suicidal phrasing and still runs first).
      **Bug fixed on the way: the allowed flow ids were never sent to the
      model**, so `route: "flow"` could not produce a validator-accepted id in
      production — `buildUserPrompt` now lists `FLOW_IDS_ALLOWED`
- [x] **Third-person veto** (`lib/router/route.ts`): observed live — the model
      read « ma fille a peur d'aller à l'école » as an emotional state and
      opened the exercise, whose scripts address the person who feels it. A
      deterministic guard now refuses `emotion-weather` for third-person
      messages and the prompt states the rule, so the veto stays a net (that
      message now returns the validated parent answer 7.6)
- [x] **Support pill on validated answers**: a message mixing emotion with a
      real question keeps its verbatim answer and gains the existing
      « Aide-moi à gérer mes émotions » option (already an `emotion-weather`
      intent trigger; `AppShell`/`QuickReplies` needed no change). The literal
      is now one `EMOTION_SUPPORT_OPTION` constant reused by `guided.ts` and
      `psychologique.ts`
- [x] **Free-text escape** (`lib/chatbot/flows/emotion-weather.ts`): a real
      question at the intensity/emotion step hands the message back to the
      matcher (`fallbackToMatcher`, the guided-tree pattern) instead of
      re-prompting
- [x] **Tests + eval**: `tests/emotion.test.ts` (new) plus route/flow/router
      cases; new `emotional` eval category (9 cases, 8 CI-asserted **with no
      key** — that is what the deterministic tier buys). Deterministic report:
      emotional 8/9, the miss being the keys-only paraphrase case. Live: the
      reference sentence opens the flow in 20 ms with zero provider calls;
      « tout ça me ronge de l'intérieur » and « je me réveille la nuit en
      repensant à ces messages » reach it through the classifier in ~1.2–1.8 s

### Hybrid-layer hardening + live verification (2026-08-20)
- [x] **Review fixes (13)** on top of the phases 0–7 commit: turn counting
      moved to the route only (`routeLLM` no longer double-counts, the
      `SESSION_TURN_CAP` was effectively halved); `setContext` now enforces
      `MAX_SESSIONS` through a single `writeEntry` path; rate-limiter windows
      are bounded and swept (was one permanent Map entry per client per
      minute); rate-limit identity is `x-real-ip`/`cf-connecting-ip` → last
      `x-forwarded-for` hop → session id (leftmost hop is spoofable, and a
      missing header used to collapse every visitor onto one bucket);
      `LLM_SMALLTALK` is wired into the smalltalk branch (was a dead flag);
      provider success/breaker reset happen only after the JSON validates, and
      429 vs bad-JSON retries have separate budgets; classifier cache TTL is
      absolute (a hot key could pin a stale decision forever); the
      pending-clarify branch can no longer 500 on a stale QA id; phone-token
      grounding covers the `0522/12/34/56` slash format the KB itself uses;
      malformed embedding rows fail loudly instead of becoming zero vectors;
      `LLM_PROVIDER` now actually orders the chain and an OpenRouter key with
      no model no longer counts as "LLM enabled"; unused `Badge` import removed
- [x] **Regression tests** for each fix: new `tests/session.test.ts`,
      `tests/indexer.test.ts`; extended `router`, `hybrid-route`, `validator`,
      `rate-limit`, `cache`, `llm-client` suites (187 → 205 passing). Three
      tests that encoded the old behaviour (sliding cache TTL, `embedTexts`
      returning `[]`, openrouter-without-model "enabled") were updated
      deliberately
- [x] **Classifier token budget** 300 → 768 (`lib/llm/classifier.ts`):
      reasoning-capable providers spend 250–320 tokens before the JSON and
      Groq rejects the truncated body with `400 json_validate_failed`
- [x] **Provider config verified against the live APIs**: Gemini
      `gemini-3.1-flash-lite` (~1–4 s; `gemini-3.5-flash-lite` answers
      correctly but took 15–86 s on this key and refuses
      `thinkingBudget: 0`), Groq `openai/gpt-oss-120b`
      (`llama-3.3-70b-versatile` is retired → 404), OpenRouter
      `openrouter/free` (free-model router, 6–9 s), `LLM_TIMEOUT_MS` 6000 →
      12000 (ceiling, not delay). End-to-end route check: crisis 9 ms, static
      4 ms, flow 2 ms, `mode: "llm"` with correct ids (7.6, 7.2) in 3.3–3.6 s,
      grounded smalltalk in 1.6 s, 3/3 provider calls OK
- [x] **`CLAUDE.md`** added: doc map + precedence, non-negotiables, pipeline,
      hybrid invariants, provider reality check, housekeeping

### Hybrid LLM layer (PLANLLM phases 0–7)
- [x] **Eval harness + golden corpus** (`tests/eval/`): 163 typed cases over 13
      categories (exact, paraphrase, typo, informal, short/long, ambiguous,
      multi-intent, offtopic, adversarial, safety, retrieval,
      deterministic-required), CI subset asserted on every run, `npm run eval`
      prints the report; live-only subsets gated on `GEMINI_API_KEY`
- [x] **Config + providers** (`lib/config/env.ts`, `lib/llm/client.ts`,
      `.env.example`): typed env knobs, `loadDotEnv`, zero-dependency fetch
      client for Gemini (generateContent/batchEmbedContents), Groq and
      OpenRouter (OpenAI-compatible), retry/429/timeout/auth mapping, 3-failure
      circuit breaker with half-open probe, `completeJSON` retry at
      temperature 0 on invalid JSON
- [x] **Matcher confidence gate** (`lib/chatbot/matcher.ts`): `STRONG_TERMS`,
      `confidence` high = strong hit or ≥2 keywords (one generic keyword no
      longer serves a wrong entry); tie-break extended (longest matched
      keyword, then the canonical question mentioning it) → fixes e-blagh →
      4.11, gendarmerie → 4.12, fraping → 6.13, dénigrement → 6.9,
      parquet → 4.10
- [x] **LLM understanding layer** (`lib/llm/classifier.ts`,
      `lib/router/route.ts`, `lib/chatbot/validator.ts`): classifier outputs
      route=qa (1 id) / clarify (2–3 ids) / flow / offtopic / smalltalk,
      validated against the day's retrieved candidates + flow whitelist;
      `routeLLM` ladder: caps → retrieval → degraded serve ≥0.75 → classifier
      → verbatim `qaAnswer`/flows/clarify prompt/fallback; every failure
      degrades to today's fallback; free-text smalltalk passes
      `checkFreeText` (grounded, short, crisis-checked)
- [x] **RAG-light retrieval** (`lib/rag/retriever.ts`, `lib/rag/indexer.ts`,
      `scripts/index-embeddings.ts`): lexical + semantic (build-time
      embeddings in `data/embeddings.json`, lazy-loaded, absent = supported
      mode) hybrid score 0.6/0.4 + 0.15 profile boost; `npm run
      index-embeddings` regenerates the artifact (needs a key); executed via
      tsx (vitest exclude quirk — PLANLLM contingency applied)
- [x] **Route cutover** (`app/api/chat/route.ts`): high-confidence static →
      hybrid LLM (rate-limited per client, forward-IP, fallback on deny, no
      new copy); session context (profile, last ids, pending clarification),
      guided-tree profile learning, clarification re-route (id/"1"/"2"/letter/
      question-text, 2 stale tries then pipeline rescue); module-level
      cfg/providers/retriever singletons
- [x] **Rate limiting / caching / observability** (`lib/chatbot/rate-limit.ts`
      minute+day buckets; `lib/chatbot/cache.ts` TTL+LRU classifier-result
      cache keyed by normalized message+context; `lib/chatbot/observe.ts`
      `emc-meta` log lines without message content; `lib/chatbot/meters.ts`
      provider call ring consumed by the live eval report)
- [x] **i18n/UI**: `clarifyPrompt`  key (fr + ar scaffold),
      `mode`/`matchedId`/`confidence` on the response contract (no badge is
      rendered in `MessageBubble` — only `Header` uses `Badge`)
- [x] **Tests**: 187 passing at the time of that commit (now 205, see the
      hardening entry above) (incl. `tests/router.test.ts`,
      `tests/hybrid-route.test.ts`, `tests/retriever.test.ts`,
      `tests/context.test.ts`, `tests/rate-limit.test.ts`,
      `tests/cache.test.ts`, `tests/validator.test.ts`,
      `tests/llm-client.test.ts`); existing suite (safety, matcher, spotcheck,
      flows, route-flows, guided, linkify) unchanged and green

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
- [x] 75-entry typed `QA_DATABASE` (`data/qa-database.ts`) across 6 categories,
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
- [x] `tests/matcher.test.ts` — 75 entries / unique ids, every
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
- **Crisis under-triggering on conjugated forms.** "je me scarifie" (conjugated)
  is not caught by the literal keyword "me scarifier" — documented as a
  KNOWNGAP in the eval corpus; extending `CRISIS_PROTOCOL` needs encadrante
  sign-off (AGENTS.md §6).
- **Flow continuation intercepts general questions (softened).** While a flow
  is active any non-option message gets the flow's `askAgain`, and the flow now
  **survives** the bad input (state retained, re-prompts). The user still needs
  to say "Terminer"/farewell to leave the parcours and get QA answers mid-flow.
  The guided tree is exempt: free text mid-tree clears the flow and is answered
  by the general matcher (`fallbackToMatcher`). Acceptable by design, worth a
  UX note.
- **In-memory sessions die on server restart/scale-out** (deployment caveat for
  long-running flows; harmless for this phase — no persistence per §10).
- **The CI suite runs without provider keys**, so `ci:true` corpus cases only
  cover the deterministic layer; the HYBRID-REQUIRED cases (single generic
  keyword, e.g. "Qu'est-ce que le cyberharcèlement ?") are asserted by the
  live `npm run eval` instead. Regenerate `data/embeddings.json` with
  `npm run index-embeddings` after knowledge-base edits.
- **Provider model ids drift.** Verified 2026-08-20: Groq retired
  `llama-3.3-70b-versatile` (404) and `gemini-3.5-flash-lite`, while valid,
  answered in 15–86 s on this key. Check the provider's live model list (and
  make one real call) before trusting a model id in `.env`.
- **No `import "server-only"` guard on `lib/llm/*`** although PLANLLM §14 asks
  for it; keys are server-side by construction today (route handler only).

## Technical Debt

- **`data/embeddings.json` is a generated artifact** (75 vectors, model
  `gemini-embedding-001`) — absent by default; regenerate with `npm run
  index-embeddings` after KB edits.
- **Embedding provider only supports Gemini** (`gemini-embedding-001`;
  the legacy `text-embedding-001` family is retired — 404 on v1beta);
  Groq/OpenRouter chains run lexical-only retrieval (not_available is caught).
- **Limited UI/component tests.** `@testing-library/react`/`jsdom` configured;
  only `LinkifiedText` is covered. `QuickReplies`/`BreathingPulse`/AppShell
  session wiring have no component coverage yet.
- **Version defined in two places** (`package.json` + i18n string) and already
  out of sync.
- **Crisis wording stored inline** in `data/crisis-protocol.ts`; if i18n for
  crisis messages is wanted (AGENTS.md §13 mentions it), the strings would need
  to move into the dictionary.

## Important Decisions

- Rule-based matching first, LLM only as a low-confidence understanding layer
  (`PLANLLM` / `docs/architecture-hybrid.md`); the LLM proposes ids, the
  deterministic layer serves text — validated answers only via `qaAnswer()`.
- Safety check precedes everything, always; `physical-danger` (Case 2)
  precedence over `psychological-distress` (Case 1) on overlap; the classifier
  is explicitly instructed to decline danger messages (deterministic gate
  only).
- Confidence gate: one generic keyword (no strong term) → hybrid instead of a
  possibly-wrong static answer; discriminative terms (`STRONG_TERMS`) stay
  static.
- Every LLM failure (timeout, 429, auth, network, bad JSON, breaker) degrades
  to today's fallback — never an error text to the user; per-client rate
  limits only gate the LLM branch (denied = fallback, no 429, no new copy).
- Session context stores routing facts only (profile, last QA ids, pending
  clarification) — never message content or any PII (AGENTS.md §10); metadata
  logs (`emc-meta`) exclude message text.
- Rule-based matching + flows for the deterministic surface only — no LLM
  inside flows, no RAG beyond embeddings (no vector DB; following AGENTS.md §2
  for this phase).
- Static typed knowledge base shipped in the repo instead of a database;
  answers returned verbatim via `qaAnswer()` (never rephrased in flows).
- Flows are opt-in conversations started by explicit intent phrasings, never by
  QA keyword overlap — the general matcher keeps answering validated content.
- Session ids are client-generated (`crypto.randomUUID()`), sent in the POST
  body; store is in-memory with TTL/eviction.
- Single Next.js codebase (Route Handlers as backend) over a decoupled
  SPA + Express split; class-based dark mode without a library.
- `t()` dictionary indirection for all copy from day one (Arabic-ready).

## Next Recommended Tasks

1. **Deploy to Vercel** to close the Jalon 3 requirement (AGENTS.md §14) —
   hybrid layer degrades gracefully without keys (documented above).
2. **Live verification run with a provider key** (internship machine): set
   `GEMINI_API_KEY` in `.env`, run `npm run index-embeddings`, then `npm run
   eval` to read the before/after table; record call counts and the artifact in
   this file.
3. **Pace the eval harness** (or run it in chunks) so the live before/after
   table reflects the hybrid layer instead of free-tier burst limits — today
   most live cases end in `breaker-open`.
4. **Re-test the Groq model choice**: `openai/gpt-oss-120b` produced
   `invalid_payload` on a third of its answered classifier calls.
5. **Extend component tests** for `QuickReplies`, `BreathingPulse`, and the
   AppShell session wiring (`@testing-library/react` already installed).
6. **Align the version string** (`lib/i18n.ts` vs `package.json`).
7. **Confirm `parcours` tagging** for entries 2.1, 2.2, 7.1–7.3 if routing UX
   needs it.
8. **Fill the Arabic dictionary** (later phase, per AGENTS.md §13).