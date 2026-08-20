// Classifier metering: a provider that answers parseable JSON which fails
// schema validation is a FAILING provider. If that is metered as a success it
// never trips the circuit breaker and is re-probed on every request, while the
// eval report claims a 100% success rate.

import { beforeEach, describe, expect, it } from "vitest";
import { classify } from "@/lib/llm/classifier";
import { resetCircuitBreakers, type LLMProvider } from "@/lib/llm/client";
import { metersSnapshot, resetMeters } from "@/lib/chatbot/meters";
import type { Config } from "@/lib/config/env";
import type { RetrievalCandidate } from "@/lib/rag/retriever";

function testCfg(overrides: Partial<Config> = {}): Config {
  return {
    llmProvider: "gemini",
    geminiApiKey: "test-key",
    geminiChatModel: "gemini-3.1-flash-lite",
    groqChatModel: "openai/gpt-oss-120b",
    llmTimeoutMs: 5000,
    llmMaxRetries: 0,
    llmSmalltalk: true,
    trustedProxyHops: 1,
    rateLimitPerMinute: 10,
    rateLimitPerDay: 200,
    messageCharLimit: 500,
    sessionTurnCap: 30,
    enableMetaLogging: false,
    enableResponseCache: false,
    ...overrides,
  };
}

/** Answers well-formed JSON that violates the classifier schema. */
function invalidPayloadProvider(payload: unknown): LLMProvider {
  return {
    id: "gemini",
    async complete() {
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

const CANDIDATES: RetrievalCandidate[] = [
  { id: "3.4", question: "Mes photos intimes circulent", keywords: [], score: 0.2 },
];

describe("classify (schema violations)", () => {
  beforeEach(() => {
    resetCircuitBreakers();
    resetMeters();
  });

  it("meters an unusable payload as a provider failure, not a success", async () => {
    // route "qa" requires exactly one id: [] violates the contract.
    const provider = invalidPayloadProvider({
      route: "qa",
      qaIds: [],
      flow: null,
      smalltalk: null,
      confidence: 0.9,
    });

    await expect(
      classify({ message: "mes photos circulent", contextSummary: null, candidates: CANDIDATES }, testCfg(), [provider]),
    ).rejects.toMatchObject({ kind: "bad_json" });

    const meters = metersSnapshot();
    expect(meters.ok).toBe(0);
    expect(meters.byProvider.gemini?.fail).toBeGreaterThanOrEqual(1);
    expect(meters.byProvider.gemini?.kinds.invalid_payload).toBeGreaterThanOrEqual(1);
  });

  it("rejects an id outside the retrieved candidates", async () => {
    const provider = invalidPayloadProvider({
      route: "qa",
      qaIds: ["9.99"],
      flow: null,
      smalltalk: null,
      confidence: 0.9,
    });

    await expect(
      classify({ message: "question", contextSummary: null, candidates: CANDIDATES }, testCfg(), [provider]),
    ).rejects.toMatchObject({ kind: "bad_json" });
    expect(metersSnapshot().byProvider.gemini?.kinds.invalid_payload).toBeGreaterThanOrEqual(1);
  });

  it("still returns a valid decision and meters it as a success", async () => {
    const provider = invalidPayloadProvider({
      route: "qa",
      qaIds: ["3.4"],
      flow: null,
      smalltalk: null,
      confidence: 0.8,
    });

    const result = await classify(
      { message: "mes photos circulent", contextSummary: null, candidates: CANDIDATES },
      testCfg(),
      [provider],
    );
    expect(result.result.qaIds).toEqual(["3.4"]);
    const meters = metersSnapshot();
    expect(meters.ok).toBe(1);
    expect(meters.fail).toBe(0);
  });
});
