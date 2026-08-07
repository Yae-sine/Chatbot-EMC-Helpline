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


