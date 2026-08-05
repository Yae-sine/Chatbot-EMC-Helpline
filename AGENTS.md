# AGENTS.md — EMC Helpline Chatbot

## 1. Project overview

This is the CMRPI / Espace Maroc Cyberconfiance (EMC) "EMC Helpline" chatbot — a
**rule-based** (not LLM/RAG) conversational assistant that helps victims of
cyberviolence, plus parents, teachers, witnesses, and professionals, get accurate
information and be routed to the right resource (EMC-Helpline, ONDE, Police,
Gendarmerie, legal or psychological support).

This is **Jalon 2 & 3** of a PFA internship (Aug 1–31, 2026). Jalon 1 already
produced a validated knowledge base: `docs/qa-source.md` (25 conversational
scenarios, multiple user profiles, sample phrasings, validated answers, trigger
keywords). That document is the single source of truth for content — nothing in
the chatbot's copy should be invented or paraphrased away from it.

**This is a sensitive-content product.** Read section 6 (Safety protocol) before
touching any matching or routing logic — it is non-negotiable and takes priority
over every other feature.

## 2. Non-goals for this phase

- No LLM, no RAG, no vector DB, no LangChain. Matching is keyword/rule-based only.
  (These are explicitly deferred to a later phase per the project brief.)
- No user accounts, no persistent conversation storage, no analytics that could
  identify a victim (see §10 Privacy).
- Arabic i18n is scaffolded but not filled in this phase (see §9).

## 3. Tech stack

- **Next.js (App Router)**, TypeScript in strict mode, for both frontend and
  backend — Route Handlers under `app/api/*` serve as the Node.js backend, so
  the whole stack stays one deployable TypeScript codebase.
- **Tailwind CSS** for styling.
- **Vitest** + **@testing-library/react** for tests.
- No database this phase — the Q&A knowledge base is static, typed data shipped
  in the repo (`data/qa-database.ts`).

> If a decoupled architecture (separate React SPA + Express API) is preferred
> instead, say so explicitly — everything below still applies, just split
> across two packages.

## 4. Setup & commands

```bash
npm install
npm run dev        # http://localhost:3000
npm run build
npm run start
npm run lint
npm run typecheck
npm run test
npm run test:watch
```

Agents: always run `npm run lint`, `npm run typecheck`, and `npm run test`
before considering a task done. Never weaken `tsconfig.json` strictness to make
errors disappear.

## 5. Project structure

```
app/
  page.tsx                 # chat page
  api/chat/route.ts        # POST endpoint: message in -> response out
components/
  chat/
    ChatWindow.tsx
    MessageBubble.tsx
    ChatInput.tsx
lib/
  chatbot/
    normalize.ts           # lowercasing, accent stripping, punctuation cleanup
    safety.ts              # crisis detection — checked BEFORE anything else
    matcher.ts             # keyword scoring against qa-database
    fallback.ts            # default "didn't understand" response
data/
  qa-database.ts           # typed, generated from docs/qa-source.md
  crisis-protocol.ts       # typed, from §6 below
types/
  qa.ts                    # QAEntry, Profile, Parcours types
  chat.ts                  # ChatMessage, ChatResponse types
docs/
  qa-source.md             # canonical validated content (Jalon 1 deliverable)
tests/
  safety.test.ts
  matcher.test.ts
```

## 6. ⚠️ Safety protocol (read first, non-negotiable)

Before any keyword-matching against the general Q&A database, **every incoming
message must first be checked against the crisis protocol**. If a crisis
keyword is detected, the chatbot immediately returns the crisis message and
skips the normal Q&A flow entirely — no clarifying questions, no "did you
mean," no delay.

This must never be "smart" or model-based in this phase: it is deliberate,
literal substring matching against a fixed keyword list, run on normalized
text (lowercase, accents stripped). Check Case 1 before Case 2; if both match,
Case 2 (physical danger) takes precedence.

### Case 1 — Psychological distress / suicidal ideation

Trigger keywords (French, case/accent-insensitive):
`mourir, me tuer, en finir, finir avec la vie, plus la force, plus envie de vivre, suicide, suicidaire, automutilation, me faire du mal, me scarifier, je ne veux plus vivre`

Response (French, exact wording):
> « Ce que vous écrivez est très important et je le prends au sérieux. Je ne
> suis qu'un assistant automatisé et je ne peux pas vous accompagner seul dans
> ce moment difficile ; votre sécurité mérite l'attention d'une personne
> humaine, dès maintenant. Je vous invite à contacter immédiatement le numéro
> vert 2511 (ONDE) ou une personne de confiance. Vous n'êtes pas seul(e). »

### Case 2 — Immediate physical danger

Trigger keywords:
`danger immédiat, il va me tuer, il me frappe, il est chez moi, je ne suis pas en sécurité, au secours, il me menace avec une arme, j'ai peur pour ma vie`

Response (French, exact wording):
> « Ce que vous décrivez est très grave et je ne peux pas intervenir
> directement. Si vous êtes en danger immédiat, contactez sans attendre les
> services d'urgence : la Police au 19, ou la Gendarmerie Royale au 177 en
> milieu rural. Si un enfant est concerné, le numéro vert 2511 (ONDE) peut
> également vous orienter. Vous pouvez aussi solliciter l'EMC-Helpline pour un
> accompagnement dans les démarches qui suivront. »

**Note on these exact strings:** they're marked in the source document as
working proposals pending sign-off from the encadrante (Mme Belaous) given the
sensitivity of the topic. Implement them exactly as above for development, but
flag clearly (README + a `// TODO: confirm final wording with encadrante`
comment in `crisis-protocol.ts`) that this copy needs her explicit validation
before anything resembling a real deployment.

Tone rule for both cases, enforced in the UI too: empathetic, non-judgmental,
no minimizing, no follow-up questions that would delay pointing to human help.

## 7. Data model

```ts
type Profile =
  | "victime-mineure" | "victime-majeure" | "parent-tuteur"
  | "enseignant-educateur" | "temoin" | "professionnel";

type Parcours = "technique" | "juridique" | "informatif" | "psychologique" | "parental";

interface QAEntry {
  id: string;              // e.g. "3.4"
  question: string;        // canonical question, from the source doc
  profiles: Profile[];
  parcours: Parcours[];
  sampleFormulations: string[]; // natural-language variants, for reference/tests
  answer: string;           // validated response text, verbatim from docs/qa-source.md
  keywords: string[];       // trigger keywords, verbatim from docs/qa-source.md
}

interface CrisisCase {
  id: "psychological-distress" | "physical-danger";
  keywords: string[];
  message: string;
}
```

## 8. Matching engine logic (in order)

1. Normalize the incoming message (lowercase, strip accents/punctuation).
2. Check Case 2 crisis keywords, then Case 1 — return immediately on any match.
3. Score every `QAEntry` by number of matched keywords in the normalized text;
   return the highest-scoring entry above a minimum threshold.
4. On a tie, prefer the entry whose `profiles` list is broadest ("tous
   profils") only as a last resort — otherwise prefer the more specific entry.
5. No match above threshold → return the fallback message, which should invite
   rephrasing and briefly list the five `parcours` themes, never a generic
   "I don't understand."

## 9. Content rules

- All `answer`, `keywords`, and `sampleFormulations` values must come from
  `docs/qa-source.md`, which is itself sourced from the encadrante-validated
  knowledge base. Do not paraphrase or "improve" legal article numbers, phone
  numbers, or URLs — copy them exactly.
- If a scenario needed in the UI isn't in `docs/qa-source.md`, don't invent
  one — flag it instead of writing placeholder content.
- Never let the general matcher intercept a message that should hit the crisis
  protocol; when in doubt, crisis detection wins.

## 10. Privacy & data handling

- No server-side persistence of message content beyond the request/response
  cycle in this phase — no logging of raw user messages, no analytics that
  could fingerprint or re-identify a visitor.
- If logging is added later for QA/debugging, it must exclude message content
  by default and be opt-in.

## 11. Code style

- TypeScript strict mode; no `any` without a comment justifying it.
- Components: PascalCase filenames, one component per file.
- Utility/lib files: kebab-case.
- Prefer small, pure functions in `lib/chatbot/` — matching logic must be unit
  testable without rendering the UI.
- UI tone: warm, plain language, mobile-first (assume some users are on a
  phone in a moment of distress) — avoid clinical or bureaucratic phrasing in
  any copy you write outside the validated answers.

## 12. Testing requirements

- `safety.test.ts`: every crisis keyword from §6 must trigger its case; assert
  the crisis path always short-circuits normal matching, and Case 2 beats
  Case 1 on overlap.
- `matcher.test.ts`: for each `QAEntry`, at least one of its own
  `sampleFormulations` must resolve back to that entry.
- Add a regression test for any bug fix before fixing it.

## 13. i18n / future Arabic support

Keep all user-facing strings (UI chrome, fallback message, crisis messages,
Q&A answers) behind a simple `t()`/dictionary indirection from day one, even
though only French ships now — this is an explicit "extension possible" in the
project brief and much cheaper to support now than to retrofit.

## 14. Deployment

Vercel is the natural fit for a Next.js app and satisfies the Jalon 3
requirement of a simple, online-accessible chat interface — no server to
manage.
