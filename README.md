# EMC Helpline Chatbot

Rule-based (no LLM/RAG) conversational assistant for the CMRPI / Espace Maroc
Cyberconfiance (EMC) Helpline: guides victims of cyberviolence, parents,
teachers, witnesses and professionals to the right resource (EMC-Helpline,
ONDE, Police, Gendarmerie, legal or psychological support).

## Commands

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

Always run `lint`, `typecheck` and `test` before considering a task done.

## Architecture

- Next.js (App Router) + TypeScript (strict) + Tailwind CSS, single codebase.
- `app/api/chat/route.ts` is the backend: `POST { message } -> { text, isCrisis }`.
- **Safety protocol runs before anything else**: every message is checked
  against `data/crisis-protocol.ts` (crisis keywords) before general Q&A
  matching (`lib/chatbot/matcher.ts`). See AGENTS.md §6 — non-negotiable.
- The Q&A knowledge base is static, typed data in `data/qa-database.ts`.

## ⚠️ Pending validation — crisis copy

The crisis messages in `data/crisis-protocol.ts` are **working proposals
pending sign-off from the encadrante (Mme Belaous)**. Do not change their
wording without her validation, and do not deploy anything resembling a real
product before she approves them. (See AGENTS.md §6.)

## Content status

`data/qa-database.ts` currently holds 3 **placeholder** entries only. The
real validated knowledge base (25 scenarios) must come from
`docs/qa-source.md`, converted from `Bases_questions_réponses-Version2.pdf`.
Do not invent Q&A content.
