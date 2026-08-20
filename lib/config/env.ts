// Typed environment access for the hybrid LLM layer (PLANLLM Phase 1).
//
// All knobs flow through Config so tests can inject any combination without
// touching process.env. Nothing here performs network I/O.

import { readFileSync } from "node:fs";

export type ProviderId = "gemini" | "groq" | "openrouter";

export interface Config {
  /** null = LLM disabled (no provider key configured). */
  llmProvider: ProviderId | null;
  geminiApiKey?: string;
  groqApiKey?: string;
  openrouterApiKey?: string;
  geminiChatModel: string; // "gemini-3.1-flash-lite"
  groqChatModel: string; // "openai/gpt-oss-120b"
  openrouterModel?: string; // required iff llmProvider === "openrouter"
  llmTimeoutMs: number; // 6000
  llmMaxRetries: number; // 1
  llmSmalltalk: boolean; // true
  /** hops your infrastructure appends to x-forwarded-for (default 1) */
  trustedProxyHops: number; // 1
  rateLimitPerMinute: number; // 10
  rateLimitPerDay: number; // 200
  messageCharLimit: number; // 500
  sessionTurnCap: number; // 30
  enableMetaLogging: boolean; // false
  enableResponseCache: boolean; // true
}

const DEFAULT_GEMINI_MODEL = "gemini-3.1-flash-lite";
const DEFAULT_GROQ_MODEL = "openai/gpt-oss-120b";

const PROVIDER_KEYS: Record<ProviderId, string> = {
  gemini: "GEMINI_API_KEY",
  groq: "GROQ_API_KEY",
  openrouter: "OPENROUTER_API_KEY",
};

/** Default preference order; LLM_PROVIDER only moves its provider to the front. */
export const PROVIDER_ORDER: readonly ProviderId[] = ["gemini", "groq", "openrouter"];

function intFromEnv(env: Record<string, string | undefined>, name: string, fallback: number): number {
  const raw = env[name];
  if (raw === undefined || raw.trim() === "") return fallback;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function boolFromEnv(env: Record<string, string | undefined>, name: string, fallback: boolean): boolean {
  const raw = env[name];
  if (raw === undefined || raw.trim() === "") return fallback;
  return raw.trim().toLowerCase() === "true" || raw.trim() === "1";
}

function strFromEnv(env: Record<string, string | undefined>, name: string, fallback: string): string {
  const raw = env[name];
  if (raw === undefined || raw.trim() === "") return fallback;
  return raw.trim();
}

export function loadConfig(
  env: Record<string, string | undefined> = process.env,
): Config {
  const available: ProviderId[] = PROVIDER_ORDER.filter((id) => {
    const value = env[PROVIDER_KEYS[id]];
    if (value === undefined || value.trim() === "") return false;
    // OpenRouter cannot be called without an explicit model id: counting the
    // key alone as "configured" would spend a rate-limit token per request
    // and then fall back with no error surfaced anywhere.
    if (id === "openrouter" && strFromEnv(env, "OPENROUTER_MODEL", "") === "") return false;
    return true;
  });

  // llmProvider: the requested provider when it has a key; otherwise the first
  // available provider; null when no provider is configured at all.
  let llmProvider: ProviderId | null = null;
  if (available.length > 0) {
    const requested = strFromEnv(env, "LLM_PROVIDER", "");
    llmProvider =
      requested !== "" && (available as string[]).includes(requested)
        ? (requested as ProviderId)
        : available[0];
  }

  return {
    llmProvider,
    geminiApiKey: strFromEnv(env, "GEMINI_API_KEY", ""),
    groqApiKey: strFromEnv(env, "GROQ_API_KEY", ""),
    openrouterApiKey: strFromEnv(env, "OPENROUTER_API_KEY", ""),
    geminiChatModel: strFromEnv(env, "GEMINI_CHAT_MODEL", DEFAULT_GEMINI_MODEL),
    groqChatModel: strFromEnv(env, "GROQ_CHAT_MODEL", DEFAULT_GROQ_MODEL),
    openrouterModel: strFromEnv(env, "OPENROUTER_MODEL", ""),
    llmTimeoutMs: intFromEnv(env, "LLM_TIMEOUT_MS", 6000),
    llmMaxRetries: intFromEnv(env, "LLM_MAX_RETRIES", 1),
    llmSmalltalk: boolFromEnv(env, "LLM_SMALLTALK", true),
    trustedProxyHops: Math.max(1, intFromEnv(env, "TRUSTED_PROXY_HOPS", 1)),
    rateLimitPerMinute: intFromEnv(env, "RATE_LIMIT_PER_MINUTE", 10),
    rateLimitPerDay: intFromEnv(env, "RATE_LIMIT_PER_DAY", 200),
    messageCharLimit: intFromEnv(env, "MESSAGE_CHAR_LIMIT", 500),
    sessionTurnCap: intFromEnv(env, "SESSION_TURN_CAP", 30),
    enableMetaLogging: boolFromEnv(env, "ENABLE_META_LOGGING", false),
    enableResponseCache: boolFromEnv(env, "ENABLE_RESPONSE_CACHE", true),
  };
}

const DOTENV_LINE_RE = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/;

// Parses `.env` KEY=VALUE lines into process.env (PLANLLM Phase 1).
// Never overrides an existing process.env value; skips comments and blank
// lines; strips surrounding single/double quotes.
export function loadDotEnv(path = ".env"): void {
  let content: string;
  try {
    content = readFileSync(path, "utf8");
  } catch {
    return; // missing .env is a supported mode (keys come from the platform)
  }
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === "" || line.startsWith("#")) continue;
    const match = DOTENV_LINE_RE.exec(line);
    if (!match) continue;
    const key = match[1];
    if (key in process.env) continue; // real env wins over .env
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}