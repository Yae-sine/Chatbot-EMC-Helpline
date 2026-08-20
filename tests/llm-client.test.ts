// LLM provider client tests (PLANLLM Phase 1) — all network calls are stubbed.
// Covers: provider chain selection, Gemini/Groq request shapes, error mapping
// (429/timeout/auth), bad-JSON retry, circuit breaker, embeddings, dotenv.

import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadConfig, loadDotEnv, type Config } from "@/lib/config/env";
import {
  buildProviderChain,
  completeJSON,
  GEMINI_EMBEDDING_MODEL,
  ProviderError,
  resetCircuitBreakers,
} from "@/lib/llm/client";
import { metersSnapshot, resetMeters } from "@/lib/chatbot/meters";

const GEMINI_OK = JSON.stringify({
  candidates: [{ content: { parts: [{ text: '{"route":"qa","qaIds":["3.4"]}' }] } }],
});

const GROQ_OK = JSON.stringify({
  choices: [{ message: { content: '{"route":"qa","qaIds":["3.4"]}' } }],
});

function jsonResponse(status: number, body: string): Response {
  return new Response(body, { status, headers: { "Content-Type": "application/json" } });
}

function baseCfg(overrides: Partial<Config> = {}): Config {
  return {
    llmProvider: "gemini",
    geminiApiKey: "test-key",
    geminiChatModel: "gemini-3.1-flash-lite",
    groqChatModel: "openai/gpt-oss-120b",
    llmTimeoutMs: 5000,
    llmMaxRetries: 1,
    llmSmalltalk: true,
    trustedProxyHops: 1,
    rateLimitPerMinute: 10,
    rateLimitPerDay: 200,
    messageCharLimit: 500,
    sessionTurnCap: 30,
    enableMetaLogging: false,
    enableResponseCache: true,
    ...overrides,
  };
}

describe("loadConfig", () => {
  it("applies defaults with an empty environment and disables the LLM", () => {
    const cfg = loadConfig({});
    expect(cfg.llmProvider).toBeNull();
    expect(cfg.llmTimeoutMs).toBe(6000);
    expect(cfg.llmMaxRetries).toBe(1);
    expect(cfg.llmSmalltalk).toBe(true);
    expect(cfg.rateLimitPerMinute).toBe(10);
    expect(cfg.rateLimitPerDay).toBe(200);
    expect(cfg.messageCharLimit).toBe(500);
    expect(cfg.sessionTurnCap).toBe(30);
    expect(cfg.enableMetaLogging).toBe(false);
    expect(cfg.enableResponseCache).toBe(true);
    expect(cfg.geminiChatModel).toBe("gemini-3.1-flash-lite");
    expect(cfg.groqChatModel).toBe("openai/gpt-oss-120b");
  });

  it("selects the requested provider when its key is present", () => {
    expect(loadConfig({ GROQ_API_KEY: "k", LLM_PROVIDER: "groq" }).llmProvider).toBe("groq");
  });

  it("falls back to the first available provider when the requested one has no key", () => {
    expect(loadConfig({ GROQ_API_KEY: "k", LLM_PROVIDER: "openrouter" }).llmProvider).toBe("groq");
  });

  it("parses numeric and boolean knobs", () => {
    const cfg = loadConfig({
      LLM_TIMEOUT_MS: "1200",
      LLM_MAX_RETRIES: "2",
      LLM_SMALLTALK: "false",
      RATE_LIMIT_PER_MINUTE: "99",
      MESSAGE_CHAR_LIMIT: "100",
      SESSION_TURN_CAP: "7",
      ENABLE_META_LOGGING: "true",
      ENABLE_RESPONSE_CACHE: "0",
      GEMINI_API_KEY: "k",
    });
    expect(cfg.llmTimeoutMs).toBe(1200);
    expect(cfg.llmMaxRetries).toBe(2);
    expect(cfg.llmSmalltalk).toBe(false);
    expect(cfg.rateLimitPerMinute).toBe(99);
    expect(cfg.messageCharLimit).toBe(100);
    expect(cfg.sessionTurnCap).toBe(7);
    expect(cfg.enableMetaLogging).toBe(true);
    expect(cfg.enableResponseCache).toBe(false);
  });

  it("tolerates non-numeric knob values by using defaults", () => {
    expect(loadConfig({ LLM_TIMEOUT_MS: "soon", GEMINI_API_KEY: "k" }).llmTimeoutMs).toBe(6000);
  });
});

describe("buildProviderChain", () => {
  it("returns [] when llmProvider is null", () => {
    expect(buildProviderChain(loadConfig({}))).toEqual([]);
  });

  it("builds only providers that have a key, in the default order", () => {
    const cfg = baseCfg({ groqApiKey: "g", openrouterApiKey: "o", openrouterModel: "m" });
    expect(buildProviderChain(cfg).map((p) => p.id)).toEqual(["gemini", "groq", "openrouter"]);
    expect(buildProviderChain(loadConfig({ GROQ_API_KEY: "g" })).map((p) => p.id)).toEqual(["groq"]);
  });

  it("puts LLM_PROVIDER first and keeps the others as fallbacks", () => {
    const cfg = loadConfig({ GEMINI_API_KEY: "gem", GROQ_API_KEY: "g", LLM_PROVIDER: "groq" });
    expect(cfg.llmProvider).toBe("groq");
    expect(buildProviderChain(cfg).map((p) => p.id)).toEqual(["groq", "gemini"]);
  });

  it("treats openrouter without a model as no provider at all", () => {
    // A key alone cannot be called: counting it as "LLM configured" would
    // spend a rate-limit token per request and then fall back silently.
    const cfg = loadConfig({ OPENROUTER_API_KEY: "k", LLM_PROVIDER: "openrouter" });
    expect(cfg.llmProvider).toBeNull();
    expect(buildProviderChain(cfg)).toEqual([]);
    const configured = loadConfig({ OPENROUTER_API_KEY: "k", OPENROUTER_MODEL: "m" });
    expect(configured.llmProvider).toBe("openrouter");
    expect(buildProviderChain(configured).map((p) => p.id)).toEqual(["openrouter"]);
  });
});

describe("completeJSON (gemini)", () => {
  beforeEach(() => {
    resetCircuitBreakers();
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("posts the Gemini request shape and parses the model JSON", async () => {
    const calls: Array<{ url: string; init?: RequestInit }> = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        calls.push({ url, init });
        return jsonResponse(200, GEMINI_OK);
      }),
    );
    const cfg = baseCfg();
    const result = await completeJSON(
      { prompt: "message brut", system: "règles", temperature: 0.7, maxOutputTokens: 300 },
      buildProviderChain(cfg),
      cfg,
    );
    expect(result.provider).toBe("gemini");
    expect(result.json).toEqual({ route: "qa", qaIds: ["3.4"] });

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toContain("models/gemini-3.1-flash-lite:generateContent");
    expect(calls[0].url).toContain("key=test-key");
    const body = JSON.parse(String(calls[0].init?.body)) as Record<string, unknown>;
    expect(body.systemInstruction).toEqual({ parts: [{ text: "règles" }] });
    expect(body.contents).toEqual([{ role: "user", parts: [{ text: "message brut" }] }]);
    const generationConfig = body.generationConfig as Record<string, unknown>;
    expect(generationConfig.temperature).toBe(0.7);
    expect(generationConfig.maxOutputTokens).toBe(300);
    expect(generationConfig.responseMimeType).toBe("application/json");
  });

  it("maps 429 to rate_limit after exhausting the single retry", async () => {
    const fetchMock = vi.fn(async () => jsonResponse(429, "{}"));
    vi.stubGlobal("fetch", fetchMock);
    vi.useFakeTimers();
    const cfg = baseCfg({ llmTimeoutMs: 60_000 });
    const promise = completeJSON({ prompt: "x" }, buildProviderChain(cfg), cfg);
    const expectation = expect(promise).rejects.toMatchObject({ kind: "rate_limit", provider: "gemini" });
    await vi.advanceTimersByTimeAsync(1100);
    await expectation;
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("retries once after 429 and succeeds", async () => {
    let calls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        calls += 1;
        return calls === 1 ? jsonResponse(429, "{}") : jsonResponse(200, GEMINI_OK);
      }),
    );
    vi.useFakeTimers();
    const cfg = baseCfg({ llmTimeoutMs: 60_000 });
    const promise = completeJSON({ prompt: "x" }, buildProviderChain(cfg), cfg);
    const expectation = expect(promise).resolves.toMatchObject({ provider: "gemini" });
    await vi.advanceTimersByTimeAsync(1100);
    await expectation;
    expect(calls).toBe(2);
  });

  it("rejects invalid model JSON with bad_json after one temperature-0 retry", async () => {
    // Valid HTTP envelope, but the model text is not JSON: completeJSON must
    // retry once at temperature 0, then report bad_json.
    const fetchMock = vi.fn(async () =>
      jsonResponse(200, JSON.stringify({ candidates: [{ content: { parts: [{ text: "pas du json" }] } }] })),
    );
    vi.stubGlobal("fetch", fetchMock);
    const cfg = baseCfg();
    await expect(completeJSON({ prompt: "x" }, buildProviderChain(cfg), cfg)).rejects.toMatchObject({
      kind: "bad_json",
      provider: "gemini",
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not retry JSON parse when llmMaxRetries is 0", async () => {
    const fetchMock = vi.fn(async () => jsonResponse(200, "pas du json"));
    vi.stubGlobal("fetch", fetchMock);
    const cfg = baseCfg({ llmMaxRetries: 0 });
    await expect(completeJSON({ prompt: "x" }, buildProviderChain(cfg), cfg)).rejects.toMatchObject({
      kind: "bad_json",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("keeps the timeout armed while the body is read", async () => {
    // A provider that sends headers and then stalls the stream must still hit
    // LLM_TIMEOUT_MS: clearing the timer once headers arrive left the read
    // unbounded, and the deterministic path would wait on it.
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init?: RequestInit) => ({
        ok: true,
        status: 200,
        // Mirrors a real aborted body read: the promise rejects on abort.
        text: () =>
          new Promise<string>((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () => {
              reject(Object.assign(new Error("aborted"), { name: "AbortError" }));
            });
          }),
      })),
    );
    vi.useFakeTimers();
    const cfg = baseCfg({ llmTimeoutMs: 4000, llmMaxRetries: 0 });
    const promise = completeJSON({ prompt: "x" }, buildProviderChain(cfg), cfg);
    const expectation = expect(promise).rejects.toMatchObject({ kind: "timeout" });
    await vi.advanceTimersByTimeAsync(4100);
    await expectation;
  });

  it("reads the answer part when a reasoning model emits a thought first", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse(
          200,
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [
                    { text: "réflexion interne…", thought: true },
                    { text: '{"route":"offtopic","qaIds":[]}' },
                  ],
                },
              },
            ],
          }),
        ),
      ),
    );
    const cfg = baseCfg();
    const result = await completeJSON({ prompt: "x" }, buildProviderChain(cfg), cfg);
    expect(result.json).toMatchObject({ route: "offtopic" });
  });

  it("meters the failure kind per provider", async () => {
    resetMeters();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        String(url).includes("generativelanguage")
          ? jsonResponse(429, "{}")
          : jsonResponse(200, GROQ_OK),
      ),
    );
    const cfg = baseCfg({ groqApiKey: "grok", llmMaxRetries: 0 });
    const result = await completeJSON({ prompt: "x" }, buildProviderChain(cfg), cfg);
    expect(result.provider).toBe("groq");
    const meters = metersSnapshot();
    expect(meters.byProvider.gemini?.kinds.rate_limit).toBe(1);
    expect(meters.byProvider.groq?.ok).toBe(1);
    resetMeters();
  });

  it("maps an abort to timeout and never retries the same provider", async () => {
    const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
      return new Promise<Response>((_resolve, reject) => {
        if (init?.signal) {
          init.signal.addEventListener("abort", () =>
            reject(new DOMException("aborted", "AbortError")),
          );
        }
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.useFakeTimers();
    const cfg = baseCfg({ llmTimeoutMs: 2000 });
    const promise = completeJSON({ prompt: "x" }, buildProviderChain(cfg), cfg);
    const expectation = expect(promise).rejects.toMatchObject({ kind: "timeout", provider: "gemini" });
    await vi.advanceTimersByTimeAsync(2100);
    await expectation;
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("moves to the next provider on network failure (auth is not retried)", async () => {
    const seen: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (String(url).includes("generativelanguage")) {
          throw new TypeError("fetch failed");
        }
        seen.push(String(url));
        return jsonResponse(200, GROQ_OK);
      }),
    );
    const cfg = baseCfg({ groqApiKey: "grok" });
    const result = await completeJSON({ prompt: "x" }, buildProviderChain(cfg), cfg);
    expect(result.provider).toBe("groq");
    expect(seen).toHaveLength(1);
    expect(seen[0]).toContain("api.groq.com");
  });

  it("never calls a provider twice after auth failure", async () => {
    const geminiCalls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (String(url).includes("generativelanguage")) {
          geminiCalls.push(String(url));
          return jsonResponse(401, "{}");
        }
        return jsonResponse(200, GROQ_OK);
      }),
    );
    const cfg = baseCfg({ groqApiKey: "grok" });
    const result = await completeJSON({ prompt: "x" }, buildProviderChain(cfg), cfg);
    expect(result.provider).toBe("groq");
    expect(geminiCalls).toHaveLength(1);
  });

  it("trips the circuit breaker after 3 failures and allows a half-open probe", async () => {
    const fetchMock = vi.fn(async () => {
      throw new TypeError("réseau down");
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.useFakeTimers();
    const cfg = baseCfg({ llmTimeoutMs: 60_000 });

    for (let i = 0; i < 3; i += 1) {
      await expect(completeJSON({ prompt: "x" }, buildProviderChain(cfg), cfg)).rejects.toMatchObject(
        { kind: "network" },
      );
    }
    expect(fetchMock).toHaveBeenCalledTimes(3);

    // Breaker open: no provider call at all — reported as "not_available",
    // which is what tells the router nobody was even asked (the router counts
    // it as breaker-open rather than a provider failure).
    await expect(completeJSON({ prompt: "x" }, buildProviderChain(cfg), cfg)).rejects.toMatchObject({
      kind: "not_available",
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);

    // Half-open re-probe after the 60 s window: fetches again (probe must be
    // created after the clock advanced, or isOpen evaluates the old clock).
    await vi.advanceTimersByTimeAsync(61_000);
    const probe = completeJSON({ prompt: "x" }, buildProviderChain(cfg), cfg);
    const probeExpectation = expect(probe).rejects.toMatchObject({ kind: "network" });
    await probeExpectation;
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it("parses Gemini batch embeddings", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse(
        200,
        JSON.stringify({ embeddings: [{ values: [0.1, 0.2] }, { values: [0.3, 0.4] }] }),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);
    const cfg = baseCfg();
    const vectors = await buildProviderChain(cfg)[0].embedTexts(["bonjour", "salut"]);
    expect(vectors).toEqual([[0.1, 0.2], [0.3, 0.4]]);

    // Regression: the request must target the current embedding model in both
    // the URL and the body — legacy text-embedding-* models are retired (404).
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain(`models/${GEMINI_EMBEDDING_MODEL}:batchEmbedContents`);
    const body = JSON.parse(String(init.body)) as {
      requests?: Array<{ model?: string }>;
    };
    expect(body.requests?.every((request) => request.model === `models/${GEMINI_EMBEDDING_MODEL}`))
      .toBe(true);
  });

  it("rejects a batch containing an unusable vector instead of returning []", async () => {
    // An empty vector would be written to the artifact and score 0 forever
    // (cosine bails on the length mismatch): the batch must fail loudly.
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse(200, JSON.stringify({ embeddings: [{ values: [0.1, 0.2] }, { values: [] }] })),
      ),
    );
    const cfg = baseCfg();
    await expect(buildProviderChain(cfg)[0].embedTexts(["bonjour", "salut"])).rejects.toMatchObject({
      kind: "bad_json",
      provider: "gemini",
    });
  });

  it("throws not_available for Groq embeddings (retriever falls back lexical-only)", async () => {
    const cfg = loadConfig({ GROQ_API_KEY: "g" });
    let error: unknown;
    try {
      await buildProviderChain(cfg)[0].embedTexts(["x"]);
    } catch (caught) {
      error = caught;
    }
    expect(error).toBeInstanceOf(ProviderError);
    expect((error as ProviderError).kind).toBe("not_available");
    expect((error as ProviderError).provider).toBe("groq");
  });
});

describe("loadDotEnv", () => {
  const originalCwd = process.cwd();

  afterEach(() => {
    process.chdir(originalCwd);
    delete process.env.GEMINI_API_KEY;
    delete process.env.LLM_PROVIDER;
    delete process.env.QUOTED;
  });

  it("loads KEY=VALUE lines, skips comments/blank, never overrides env", () => {
    const dir = mkdtempSync(join(tmpdir(), "emc-env-"));
    try {
      writeFileSync(
        join(dir, ".env"),
        [
          "# commentaire",
          "",
          "GEMINI_API_KEY=from-file",
          "LLM_PROVIDER=groq",
          'QUOTED="bonjour"',
          "INVALID LINE SANS EGALE",
        ].join("\n"),
      );
      process.chdir(dir);
      loadDotEnv(".env");
      expect(process.env.GEMINI_API_KEY).toBe("from-file");
      expect(process.env.LLM_PROVIDER).toBe("groq");
      expect(process.env.QUOTED).toBe("bonjour");
      expect(process.env.INVALID).toBeUndefined();

      process.env.GEMINI_API_KEY = "real-env";
      loadDotEnv(".env");
      expect(process.env.GEMINI_API_KEY).toBe("real-env");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("is a no-op when the file is missing", () => {
    expect(() => loadDotEnv(join(tmpdir(), "definitely-missing", ".env"))).not.toThrow();
  });
});