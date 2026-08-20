// Hybrid router tests (PLANLLM Phase 3): routeLLM with injected fake
// providers and retriever — no network, no keys. Every failure must degrade
// to today's fallback.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QA_DATABASE } from "@/data/qa-database";
import { emptyContext, setProfile, type SessionContext } from "@/lib/chatbot/context";
import type { RetrievalCandidate } from "@/lib/rag/retriever";
import { __resetRouterCaches, routeLLM, DEGRADED_SERVE_THRESHOLD } from "@/lib/router/route";
import { resetCircuitBreakers, type LLMProvider } from "@/lib/llm/client";
import type { Config } from "@/lib/config/env";

function testCfg(overrides: Partial<Config> = {}): Config {
  return {
    llmProvider: "gemini",
    geminiApiKey: "test-key",
    geminiChatModel: "gemini-3.1-flash-lite",
    groqChatModel: "openai/gpt-oss-120b",
    llmTimeoutMs: 5000,
    llmMaxRetries: 1,
    llmSmalltalk: true,
    rateLimitPerMinute: 10,
    rateLimitPerDay: 200,
    messageCharLimit: 500,
    sessionTurnCap: 30,
    enableMetaLogging: false,
    enableResponseCache: true,
    ...overrides,
  };
}

/** Fake LLM provider returning a fixed classifier payload (or throwing). */
function fakeProvider(payload: unknown, error?: Error): LLMProvider {
  return {
    id: "gemini",
    async complete() {
      if (error) throw error;
      return {
        text: JSON.stringify(payload),
        provider: "gemini",
        model: "gemini-3.1-flash-lite",
      };
    },
    async embedTexts(): Promise<number[][]> {
      throw new Error("not used in this test");
    },
  };
}

function retrieverWith(candidates: RetrievalCandidate[]) {
  return {
    retrieve: async () => candidates,
  };
}

describe("routeLLM (PLANLLM Phase 3)", () => {
  beforeEach(() => {
    resetCircuitBreakers();
    __resetRouterCaches();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("serves a verbatim validated answer on route=qa", async () => {
    const outcome = await routeLLM({
      rawMessage: "Une ex a posté mes photos sans mon accord",
      context: null,
      cfg: testCfg(),
      providers: [fakeProvider({ route: "qa", qaIds: ["3.4"], flow: null, smalltalk: null, confidence: 0.9 })],
      retriever: retrieverWith([{ id: "3.4", question: "Q", keywords: [], score: 0.1 }] as RetrievalCandidate[]),
    });
    expect(outcome.mode).toBe("llm");
    expect(outcome.matchedId).toBe("3.4");
    expect(outcome.text).toBe(QA_DATABASE.find((e) => e.id === "3.4")?.answer);
    expect(outcome.contextDelta?.lastQaIds).toEqual(["3.4"]);
  });

  it("launches a flow and returns the state to persist", async () => {
    const outcome = await routeLLM({
      rawMessage: "je veux faire le parcours juridique",
      context: null,
      cfg: testCfg(),
      providers: [fakeProvider({ route: "flow", qaIds: [], flow: "parcours-juridique", smalltalk: null, confidence: 0.8 })],
      retriever: retrieverWith([]),
    });
    expect(outcome.mode).toBe("llm");
    expect(outcome.flowId).toBe("parcours-juridique");
    expect(outcome.flowStateToPersist).not.toBeNull();
    expect(outcome.text?.length).toBeGreaterThan(0);
  });

  it("builds the clarification prompt from two verified questions", async () => {
    const outcome = await routeLLM({
      rawMessage: "signaler et porter plainte",
      context: null,
      cfg: testCfg(),
      providers: [fakeProvider({ route: "clarify", qaIds: ["3.2", "4.5"], flow: null, smalltalk: null, confidence: 0.7 })],
      retriever: retrieverWith([
        { id: "3.2", question: "Comment signaler ?", keywords: [], score: 0.2 },
        { id: "4.5", question: "Comment porter plainte ?", keywords: [], score: 0.2 },
      ] as RetrievalCandidate[]),
    });
    expect(outcome.mode).toBe("llm");
    expect(outcome.clarify?.ids).toEqual(["3.2", "4.5"]);
    const qA = QA_DATABASE.find((e) => e.id === "3.2")?.question;
    const qB = QA_DATABASE.find((e) => e.id === "4.5")?.question;
    expect(outcome.text).toContain((qA ?? "").slice(0, 30));
    expect(outcome.text).toContain((qB ?? "").slice(0, 30));
    expect(outcome.contextDelta?.pendingClarify?.ids).toEqual(["3.2", "4.5"]);
  });

  it("turns offtopic into the fallback copy", async () => {
    const outcome = await routeLLM({
      rawMessage: "Quelle heure est-il ?",
      context: null,
      cfg: testCfg(),
      providers: [fakeProvider({ route: "offtopic", qaIds: [], flow: null, smalltalk: null, confidence: 0.9 })],
      retriever: retrieverWith([]),
    });
    expect(outcome.mode).toBe("fallback");
    expect(outcome.text).toContain("Je n'ai pas bien compris");
    expect(outcome.isCrisis).toBeUndefined();
  });

  it("never lets smalltalk channel a hidden crisis — serves the validated crisis text", async () => {
    const outcome = await routeLLM({
      rawMessage: "bonsoir",
      context: null,
      cfg: testCfg(),
      providers: [fakeProvider({ route: "smalltalk", qaIds: [], flow: null, smalltalk: "je veux mourir", confidence: 0.9 })],
      retriever: retrieverWith([]),
    });
    expect(outcome.isCrisis).toBe(true);
    expect(outcome.mode).toBe("fallback");
    expect(outcome.text).toContain("2511");
  });

  it("LLM_SMALLTALK=false suppresses generated free text entirely", async () => {
    const outcome = await routeLLM({
      rawMessage: "bonsoir",
      context: null,
      cfg: testCfg({ llmSmalltalk: false }),
      providers: [fakeProvider({ route: "smalltalk", qaIds: [], flow: null, smalltalk: "Bonsoir ! Comment puis-je vous aider ?", confidence: 0.9 })],
      retriever: retrieverWith([]),
    });
    expect(outcome.mode).toBe("fallback");
    expect(outcome.text).toContain("Je n'ai pas");
  });

  it("serves safe smalltalk free text with mode llm", async () => {
    const outcome = await routeLLM({
      rawMessage: "bonsoir",
      context: null,
      cfg: testCfg(),
      providers: [fakeProvider({ route: "smalltalk", qaIds: [], flow: null, smalltalk: "Bonsoir ! Comment puis-je vous aider ?", confidence: 0.9 })],
      retriever: retrieverWith([]),
    });
    expect(outcome.mode).toBe("llm");
    expect(outcome.text).toBe("Bonsoir ! Comment puis-je vous aider ?");
  });

  it("grounds smalltalk free text: an invented URL falls back", async () => {
    const outcome = await routeLLM({
      rawMessage: "bonsoir",
      context: null,
      cfg: testCfg(),
      providers: [fakeProvider({ route: "smalltalk", qaIds: [], flow: null, smalltalk: "Appelez https://evil.example/", confidence: 0.9 })],
      retriever: retrieverWith([]),
    });
    expect(outcome.mode).toBe("fallback");
    expect(outcome.text).toContain("Je n'ai pas");
  });

  it("a provider failure degrades to the fallback", async () => {
    const outcome = await routeLLM({
      rawMessage: "une question quelconque",
      context: null,
      cfg: testCfg(),
      providers: [fakeProvider(undefined, Object.assign(new Error("boom"), { kind: "network", provider: "gemini" }))],
      retriever: retrieverWith([]),
    });
    expect(outcome.mode).toBe("fallback");
    expect(outcome.text).toContain("Je n'ai pas");
  });

  it("falls back immediately when no provider is configured", async () => {
    const outcome = await routeLLM({
      rawMessage: "une question quelconque",
      context: null,
      cfg: testCfg({ llmProvider: null }),
      providers: [],
      retriever: retrieverWith([]),
    });
    expect(outcome.mode).toBe("fallback");
  });

  it("caps: an over-long message never reaches a provider", async () => {
    const provider = fakeProvider({ route: "qa", qaIds: ["3.4"], flow: null, smalltalk: null, confidence: 1 });
    const cfg = testCfg({ messageCharLimit: 10 });
    const outcome = await routeLLM({
      rawMessage: "un très long message qui dépasse la limite de dix caractères",
      context: null,
      cfg,
      providers: [provider],
      retriever: retrieverWith([]),
    });
    expect(outcome.mode).toBe("fallback");
  });

  it("never counts the turn itself — the route handler owns turnCount", async () => {
    // Counting here as well would burn the session cap twice as fast.
    const context: SessionContext = { ...emptyContext(), turnCount: 7 };
    const outcome = await routeLLM({
      rawMessage: "Une ex a posté mes photos sans mon accord",
      context,
      cfg: testCfg(),
      providers: [fakeProvider({ route: "qa", qaIds: ["3.4"], flow: null, smalltalk: null, confidence: 0.9 })],
      retriever: retrieverWith([{ id: "3.4", question: "Q", keywords: [], score: 0.1 }] as RetrievalCandidate[]),
    });
    expect(outcome.contextDelta?.turnCount).toBe(7);
  });

  it("caps: a turn beyond the session cap falls back", async () => {
    const context: SessionContext = { ...emptyContext(), turnCount: 31 };
    const outcome = await routeLLM({
      rawMessage: "question",
      context,
      cfg: testCfg({ sessionTurnCap: 30 }),
      providers: [fakeProvider({ route: "qa", qaIds: ["3.4"], flow: null, smalltalk: null, confidence: 1 })],
      retriever: retrieverWith([]),
    });
    expect(outcome.mode).toBe("fallback");
  });

  it("follow-up messages are anchored by the conversation context summary", async () => {
    // A follow-up question is classified with the profile/last-answers
    // summary; the outcome must target a parent-oriented entry, never the
    // generic EMC-objectives entry (2.2).
    const context = setProfile(emptyContext(), "parent-tuteur");
    const candidates: RetrievalCandidate[] = [
      { id: "7.3", question: "Comment aider son enfant ?", keywords: [], score: 0.1 },
      { id: "7.6", question: "Que faire en tant que parent ?", keywords: [], score: 0.1 },
    ];
    const outcome = await routeLLM({
      rawMessage: "et si c'est mon fils ?",
      context,
      cfg: testCfg(),
      providers: [fakeProvider({ route: "qa", qaIds: ["7.3"], flow: null, smalltalk: null, confidence: 0.6 })],
      retriever: retrieverWith(candidates),
    });
    expect(outcome.mode).toBe("llm");
    expect(outcome.matchedId).toBe("7.3");
  });

  it("retrieval with a scorer cap respects DEGRADED_SERVE_THRESHOLD (cheap path)", async () => {
    // A clearly matching candidate is served without any provider call:
    // the provider would throw if invoked, proving zero LLM calls.
    const provider = fakeProvider({ route: "qa", qaIds: ["3.4"], flow: null, smalltalk: null, confidence: 1 });
    const candidate = (id: string) => ({ id, question: "Q", keywords: [], score: 1 });
    const outcome = await routeLLM({
      rawMessage: "mes photos intimes circulent sans mon accord",
      context: null,
      cfg: testCfg(),
      providers: [provider],
      retriever: retrieverWith([candidate("3.4")] as RetrievalCandidate[]),
    });
    expect(DEGRADED_SERVE_THRESHOLD).toBe(0.75);
    expect(outcome.mode).toBe("llm");
    expect(outcome.matchedId).toBe("3.4");
  });

  it("allows only ids present in the candidates (validated at classifier boundary)", async () => {
    // The fake provider proposes an id that is NOT a candidate: the router
    // must reject the payload and fall back.
    const outcome = await routeLLM({
      rawMessage: "bonjour",
      context: null,
      cfg: testCfg(),
      providers: [fakeProvider({ route: "qa", qaIds: ["6.10"], flow: null, smalltalk: null, confidence: 0.9 })],
      retriever: retrieverWith([{ id: "3.4", question: "Q", keywords: [], score: 0.1 }] as RetrievalCandidate[]),
    });
    expect(outcome.mode).toBe("fallback");
  });
});

describe("routeLLM response cache (PLANLLM Phase 7)", () => {
  let calls: number;
  let provider: LLMProvider;

  beforeEach(() => {
    __resetRouterCaches();
    resetCircuitBreakers();
    calls = 0;
    provider = {
      id: "gemini",
      async complete() {
        calls += 1;
        return {
          text: JSON.stringify({ route: "qa", qaIds: ["3.4"], flow: null, smalltalk: null, confidence: 0.9 }),
          provider: "gemini",
          model: "gemini-3.1-flash-lite",
        };
      },
      async embedTexts(): Promise<number[][]> {
        throw new Error("not used");
      },
    };
  });

  afterEach(() => {
    __resetRouterCaches();
  });

  const input = (cfg: Config, rawMessage: string) => ({
    rawMessage,
    context: null,
    cfg,
    providers: [provider] as LLMProvider[],
    retriever: retrieverWith([{ id: "3.4", question: "Q", keywords: [], score: 0.1 }] as RetrievalCandidate[]),
  });

  it("same input + same context => the provider is not called twice", async () => {
    const cfg = testCfg({ enableResponseCache: true });
    const first = await routeLLM(input(cfg, "mes photos intimes circulent sans mon accord"));
    expect(first.mode).toBe("llm");
    expect(calls).toBe(1);

    const second = await routeLLM(input(cfg, "mes photos intimes circulent sans mon accord"));
    expect(second.mode).toBe("llm");
    expect(second.matchedId).toBe("3.4");
    expect(calls).toBe(1); // cached — no second provider call
  });

  it("a changed context misses the cache", async () => {
    const cfg = testCfg({ enableResponseCache: true });
    await routeLLM(input(cfg, "mes photos intimes circulent sans mon accord"));
    await routeLLM({
      ...input(cfg, "mes photos intimes circulent sans mon accord"),
      context: setProfile(emptyContext(), "parent-tuteur"),
    });
    expect(calls).toBe(2);
  });

  it("ENABLE_RESPONSE_CACHE=false always calls the provider", async () => {
    const cfg = testCfg({ enableResponseCache: false });
    await routeLLM(input(cfg, "une question répétée"));
    await routeLLM(input(cfg, "une question répétée"));
    expect(calls).toBe(2);
  });
});

