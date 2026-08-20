// Zero-dependency fetch-based LLM client (PLANLLM Phase 1).
//
// Provider chain: LLM_PROVIDER first, then the remaining providers in the
// default gemini → groq → openrouter order. A provider is
// skipped when its key is missing or the circuit breaker is open. Every
// failure degrades to a ProviderError that the router turns into today's
// fallback — the LLM layer can never produce a user-facing error.

import { PROVIDER_ORDER } from "@/lib/config/env";
import type { Config, ProviderId } from "@/lib/config/env";
import { recordCall } from "@/lib/chatbot/meters";

export type { ProviderId } from "@/lib/config/env";

export interface LLMRequest {
  /** RAW user message (never normalized — Arabic must reach the model). */
  prompt: string;
  system?: string;
  maxOutputTokens?: number;
  temperature?: number;
}

export interface LLMResponse {
  text: string;
  provider: ProviderId;
  model: string;
}

export interface LLMProvider {
  id: ProviderId;
  complete(req: LLMRequest): Promise<LLMResponse>;
  embedTexts(texts: string[]): Promise<number[][]>;
}

export type ProviderErrorKind =
  | "timeout"
  | "rate_limit"
  | "auth"
  | "http"
  | "network"
  | "bad_json"
  | "not_available";

export class ProviderError extends Error {
  kind: ProviderErrorKind;
  status?: number;
  provider: ProviderId;

  constructor(kind: ProviderErrorKind, provider: ProviderId, status?: number, message?: string) {
    super(message ?? `${provider}: ${kind}${status !== undefined ? ` (${status})` : ""}`);
    this.name = "ProviderError";
    this.kind = kind;
    this.status = status;
    this.provider = provider;
  }
}

// ── circuit breaker (module-level, shared across requests) ─────────────────

const BREAKER_WINDOW_MS = 60_000;
const BREAKER_TRIP_COUNT = 3;

// Runtime failure timestamps per provider; deletion on success = reset.
const circuits = new Map<ProviderId, number[]>();

function isOpen(provider: ProviderId): boolean {
  const failures = circuits.get(provider);
  if (!failures) return false;
  const recent = failures.filter((at) => Date.now() - at < BREAKER_WINDOW_MS);
  circuits.set(provider, recent);
  return recent.length >= BREAKER_TRIP_COUNT;
}

function recordFailure(provider: ProviderId): void {
  const recent = (circuits.get(provider) ?? []).filter(
    (at) => Date.now() - at < BREAKER_WINDOW_MS,
  );
  recent.push(Date.now());
  circuits.set(provider, recent);
}

function recordSuccess(provider: ProviderId): void {
  circuits.delete(provider);
}

/** Test hook: forget every tripped breaker. */
export function resetCircuitBreakers(): void {
  circuits.clear();
}


// ── HTTP helpers ────────────────────────────────────────────────────────────

async function fetchText(
  provider: ProviderId,
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  // The timer must stay armed until the BODY is read: a provider that sends
  // headers and then stalls the stream would otherwise run unbounded and the
  // deterministic path would wait on it.
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    if (!response.ok) {
      const status = response.status;
      const kind =
        status === 401 || status === 403
          ? "auth"
          : status === 429
            ? "rate_limit"
            : "http";
      throw new ProviderError(kind, provider, status, `HTTP ${status}`);
    }
    return await response.text();
  } catch (error) {
    if (error instanceof ProviderError) throw error;
    const isAbort =
      typeof error === "object" &&
      error !== null &&
      "name" in error &&
      error.name === "AbortError";
    if (isAbort) {
      throw new ProviderError("timeout", provider, undefined, `timeout after ${timeoutMs}ms`);
    }
    throw new ProviderError("network", provider, undefined, String(error));
  } finally {
    clearTimeout(timer);
  }
}

function sleep(ms: number): Promise<void> {
  const { promise, resolve } = Promise.withResolvers<void>();
  setTimeout(resolve, ms);
  return promise;
}

// ── response validation (bounded external JSON, narrowed before access) ─────

function parseJsonBody(raw: string, provider: ProviderId): unknown {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    throw new ProviderError("bad_json", provider, undefined, "non-JSON response body");
  }
}

function readGeminiText(data: unknown, provider: ProviderId): string {
  if (
    typeof data === "object" &&
    data !== null &&
    "candidates" in data &&
    Array.isArray(data.candidates)
  ) {
    const candidate = data.candidates[0] as unknown;
    if (
      typeof candidate === "object" &&
      candidate !== null &&
      "content" in candidate &&
      typeof candidate.content === "object" &&
      candidate.content !== null &&
      "parts" in candidate.content &&
      Array.isArray(candidate.content.parts)
    ) {
      // Reasoning-capable models emit a thought part before the answer, so
      // take the first part that actually carries text (never a thought).
      for (const entry of candidate.content.parts) {
        const part = entry as { text?: unknown; thought?: unknown };
        if (part.thought === true) continue;
        if (typeof part.text === "string" && part.text.trim() !== "") {
          return part.text;
        }
      }
    }
  }
  throw new ProviderError("bad_json", provider, undefined, "missing candidates[0].content.parts[0].text");
}

function readGeminiEmbeddings(value: unknown, provider: ProviderId): number[][] {
  if (
    typeof value === "object" &&
    value !== null &&
    "embeddings" in value &&
    Array.isArray(value.embeddings)
  ) {
    return value.embeddings.map((entry) => {
      const row = entry as { values?: unknown };
      // A row that is not a non-empty number[] cannot be indexed: an empty
      // vector would be written to the artifact and score 0 forever (cosine
      // bails on the length mismatch), leaving that entry retrieval-blind
      // with no error anywhere. Fail the batch instead.
      if (
        !Array.isArray(row.values) ||
        row.values.length === 0 ||
        !row.values.every((n) => typeof n === "number")
      ) {
        throw new ProviderError(
          "bad_json",
          provider,
          undefined,
          "embeddings[].values is not a non-empty number[]",
        );
      }
      return row.values as number[];
    });
  }
  throw new ProviderError("bad_json", provider, undefined, "missing embeddings[]");
}

function readOpenAiContent(value: unknown, provider: ProviderId): string {
  if (
    typeof value === "object" &&
    value !== null &&
    "choices" in value &&
    Array.isArray(value.choices)
  ) {
    const choice = value.choices[0] as unknown;
    if (
      typeof choice === "object" &&
      choice !== null &&
      "message" in choice &&
      typeof choice.message === "object" &&
      choice.message !== null &&
      "content" in choice.message &&
      typeof choice.message.content === "string"
    ) {
      return choice.message.content;
    }
  }
  throw new ProviderError("bad_json", provider, undefined, "missing choices[0].message.content");
}

// ── Gemini ──────────────────────────────────────────────────────────────────

/** Current Gemini embedding model (GA, shutdown 2028). The legacy
 * text-embedding-001/text-embedding-004 family is retired (404 on v1beta). */
export const GEMINI_EMBEDDING_MODEL = "gemini-embedding-001";

function geminiProvider(cfg: Config, apiKey: string): LLMProvider {
  return {
    id: "gemini",
    async complete(req: LLMRequest): Promise<LLMResponse> {
      const url =
        `https://generativelanguage.googleapis.com/v1beta/models/${cfg.geminiChatModel}` +
        `:generateContent?key=${encodeURIComponent(apiKey)}`;
      const raw = await fetchText("gemini", url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: req.system ? { parts: [{ text: req.system }] } : undefined,
          contents: [{ role: "user", parts: [{ text: req.prompt }] }],
          generationConfig: {
            temperature: req.temperature ?? 0,
            maxOutputTokens: req.maxOutputTokens ?? 512,
            responseMimeType: "application/json",
          },
        }),
      }, cfg.llmTimeoutMs);
      const text = readGeminiText(parseJsonBody(raw, "gemini"), "gemini");
      return { text, provider: "gemini", model: cfg.geminiChatModel };
    },
    async embedTexts(texts: string[]): Promise<number[][]> {
      const url =
        `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_EMBEDDING_MODEL}` +
        `:batchEmbedContents?key=${encodeURIComponent(apiKey)}`;
      const raw = await fetchText("gemini", url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requests: texts.map((text) => ({
            model: `models/${GEMINI_EMBEDDING_MODEL}`,
            content: { parts: [{ text }] },
          })),
        }),
      }, cfg.llmTimeoutMs);
      return readGeminiEmbeddings(parseJsonBody(raw, "gemini"), "gemini");
    },
  };
}

// ── Groq / OpenRouter (OpenAI-compatible chat completions) ─────────────────

function openAICompatibleProvider(
  id: "groq" | "openrouter",
  baseUrl: string,
  model: string,
  apiKey: string,
  timeoutMs: number,
): LLMProvider {
  return {
    id,
    async complete(req: LLMRequest): Promise<LLMResponse> {
      const body = {
        model,
        messages: [
          ...(req.system ? [{ role: "system", content: req.system }] : []),
          { role: "user", content: req.prompt },
        ],
        temperature: req.temperature ?? 0,
        max_tokens: req.maxOutputTokens ?? 512,
        response_format: { type: "json_object" },
      };
      const raw = await fetchText(id, baseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      }, timeoutMs);
      const text = readOpenAiContent(parseJsonBody(raw, id), id);
      return { text, provider: id, model };
    },
    async embedTexts(): Promise<number[][]> {
      // Embeddings are unsupported on chat-completions providers; the
      // retriever falls back to lexical-only scoring (never blocks).
      throw new ProviderError("not_available", id, undefined, "embeddings not available");
    },
  };
}

// ── chain ──────────────────────────────────────────────────────────────────

/**
 * Only providers with a usable configuration, cfg.llmProvider (LLM_PROVIDER)
 * first and the rest in PROVIDER_ORDER as fallbacks. [] when llmProvider is
 * null.
 */
export function buildProviderChain(cfg: Config): LLMProvider[] {
  const requested = cfg.llmProvider;
  if (requested === null) return [];
  const build: Record<ProviderId, () => LLMProvider | null> = {
    gemini: () => (cfg.geminiApiKey ? geminiProvider(cfg, cfg.geminiApiKey) : null),
    groq: () =>
      cfg.groqApiKey
        ? openAICompatibleProvider(
            "groq",
            "https://api.groq.com/openai/v1/chat/completions",
            cfg.groqChatModel,
            cfg.groqApiKey,
            cfg.llmTimeoutMs,
          )
        : null,
    openrouter: () =>
      cfg.openrouterApiKey && cfg.openrouterModel
        ? openAICompatibleProvider(
            "openrouter",
            "https://openrouter.ai/api/v1/chat/completions",
            cfg.openrouterModel,
            cfg.openrouterApiKey,
            cfg.llmTimeoutMs,
          )
        : null,
  };
  const order: ProviderId[] = [
    requested,
    ...PROVIDER_ORDER.filter((id) => id !== requested),
  ];
  return order
    .map((id) => build[id]())
    .filter((provider): provider is LLMProvider => provider !== null);
}

export interface CompletionResult {
  json: unknown;
  raw: string;
  provider: ProviderId;
}

/**
 * Asks the first healthy provider for a JSON completion.
 *
 * - per-provider: 429 → wait 1 s and retry once (cap llmMaxRetries);
 * - auth/timeout/http/network → next provider in the chain, remembering the
 *   last error (a provider is never re-called after auth);
 * - invalid JSON, or a payload the caller's `validate` rejects → retry once at
 *   temperature 0, then ProviderError("bad_json");
 * - circuit breaker: 3 failures in 60 s open the breaker (half-open re-probe
 *   after the window); the chain never circles twice.
 */
export async function completeJSON(
  req: LLMRequest,
  chain: LLMProvider[],
  cfg: Config,
  /**
   * Schema check for the parsed payload. Passing it keeps metering honest: a
   * provider that answers well-formed JSON the caller cannot use is a FAILING
   * provider — metered as such and counted by the circuit breaker — instead of
   * a success that gets re-probed on every request forever.
   */
  validate?: (json: unknown) => boolean,
): Promise<CompletionResult> {
  const maxRetries = Math.max(0, cfg.llmMaxRetries);
  let lastError: ProviderError | null = null;

  for (const provider of chain) {
    if (isOpen(provider.id)) continue;
    // Separate budgets: a 429 retry must not consume the bad-JSON retry.
    let rateLimitRetries = 0;
    let jsonRetries = 0;
    while (true) {
      const startedAt = Date.now();
      try {
        const response = await provider.complete({
          ...req,
          temperature: jsonRetries > 0 ? 0 : (req.temperature ?? 0),
        });
        let json: unknown;
        try {
          json = JSON.parse(response.text);
        } catch {
          // Not a success: a provider that answers prose instead of JSON must
          // be metered as a failure and must feed the circuit breaker, or it
          // is re-probed on every request and reported as 100 % healthy.
          recordCall({
            provider: provider.id,
            ok: false,
            latencyMs: Date.now() - startedAt,
            kind: "bad_json",
          });
          recordFailure(provider.id);
          const badJson = new ProviderError(
            "bad_json",
            provider.id,
            undefined,
            `invalid JSON from provider (attempt ${jsonRetries})`,
          );
          if (jsonRetries < maxRetries) {
            jsonRetries += 1;
            continue; // retry once at temperature 0
          }
          lastError = badJson;
          break;
        }
        if (validate !== undefined && !validate(json)) {
          recordCall({
            provider: provider.id,
            ok: false,
            latencyMs: Date.now() - startedAt,
            kind: "invalid_payload",
          });
          recordFailure(provider.id);
          const invalid = new ProviderError(
            "bad_json",
            provider.id,
            undefined,
            `payload failed validation (attempt ${jsonRetries})`,
          );
          if (jsonRetries < maxRetries) {
            jsonRetries += 1;
            continue; // retry once at temperature 0
          }
          lastError = invalid;
          break;
        }
        recordCall({ provider: provider.id, ok: true, latencyMs: Date.now() - startedAt });
        recordSuccess(provider.id);
        return { json, raw: response.text, provider: provider.id };
      } catch (error) {
        const providerError =
          error instanceof ProviderError
            ? error
            : new ProviderError("network", provider.id, undefined, String(error));
        recordCall({
          provider: provider.id,
          ok: false,
          latencyMs: Date.now() - startedAt,
          kind: providerError.kind,
        });
        recordFailure(provider.id);
        if (providerError.kind === "rate_limit" && rateLimitRetries < maxRetries) {
          rateLimitRetries += 1;
          await sleep(1000);
          continue;
        }
        if (providerError.kind === "bad_json") {
          lastError = providerError;
          break;
        }
        lastError = providerError;
        break; // auth / timeout / http / network → next provider
      }
    }
  }

  // No provider failed here: every one was skipped (empty chain, or all
  // breakers open). Reporting that as a network failure hid the difference
  // between "the providers are failing" and "we stopped calling them".
  throw (
    lastError ??
    new ProviderError(
      "not_available",
      "gemini",
      undefined,
      "no provider called (chain empty or every breaker open)",
    )
  );
}