// Grounding checks + classifier output validation (PLANLLM Phase 0/3).
//
// The automated assistant must never invent phone numbers or URLs in
// user-facing text: any URL or grouped-phone token that appears in a
// proposed answer must occur verbatim in the validated context texts
// (QA answers, crisis messages). Pure functions, unit-testable.

import { detectCrisis } from "@/lib/chatbot/safety";

const URL_TOKEN_RE = /https?:\/\/\S+/g;
// Grouped phone-ish token: 2–4 digits, separator(s), 2–4 digits, 1–3 times.
// Separators are space, ".", "/" and "-" — "/" matters because the validated
// database writes numbers as "0522/12/34/56". Built via RegExp so the "/" in
// the character class needs no escaping.
const PHONE_TOKEN_RE = new RegExp("\\d{2,4}([\\s./-]\\d{2,4}){1,3}", "g");

const MAX_SMALLTALK_LENGTH = 300;
const MAX_FREE_TEXT_LENGTH = 300;

function containsVerbatim(text: string, contextTexts: string[]): boolean {
  return contextTexts.some((context) => context.includes(text));
}

/**
 * A text is grounded when every URL token and every grouped-phone token it
 * contains occurs verbatim in `contextTexts`. Texts without such tokens pass.
 */
export function isGrounded(text: string, contextTexts: string[]): boolean {
  const urls = text.match(URL_TOKEN_RE) ?? [];
  for (const url of urls) {
    if (!containsVerbatim(url, contextTexts)) return false;
  }
  // Phone-like tokens inside URLs were already audited with the URL; skip
  // them to avoid double-flagging (e.g. "https://2511.ma/").
  const withoutUrls = text.replace(URL_TOKEN_RE, "");
  const phones = withoutUrls.match(PHONE_TOKEN_RE) ?? [];
  for (const phone of phones) {
    if (!containsVerbatim(phone, contextTexts)) return false;
  }
  return true;
}

// ── classifier output validation ────────────────────────────────────────────

export type ClassifierRoute = "qa" | "flow" | "clarify" | "offtopic" | "smalltalk";

export interface ClassifierValidated {
  route: ClassifierRoute;
  /** ⊆ allowedIds; non-empty for qa (len 1) and clarify (2–3) */
  qaIds: string[];
  /** ∈ allowedFlows when route === "flow" */
  flow: string | null;
  /** ≤ 300 chars when route === "smalltalk" */
  smalltalk: string | null;
  /** 0..1 */
  confidence: number;
}

const ROUTES: ReadonlySet<string> = new Set(["qa", "flow", "clarify", "offtopic", "smalltalk"]);
const FLOW_RE = /^[a-z0-9-]+$/;

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

function readStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const strings = value.filter((item): item is string => typeof item === "string");
  return strings.length === value.length ? strings : null;
}

function readConfidence(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return 0.5;
  return Math.min(1, Math.max(0, value));
}

function readSmalltalk(value: unknown): string | null {
  if (typeof value !== "string" || value.trim() === "") return null;
  return value.trim();
}

/**
 * Validates a raw classifier payload against the allowed candidates/flows.
 * Returns null for every shape violation — the router then degrades to
 * fallback. qa requires exactly 1 id, clarify requires 2–3 ids.
 */
export function parseAndValidateClassifier(
  raw: unknown,
  allowedIds: string[],
  allowedFlows: readonly string[],
): ClassifierValidated | null {
  const record = asRecord(raw);
  if (!record) return null;
  const route = record.route;
  if (typeof route !== "string" || !ROUTES.has(route)) return null;

  const qaIds = readStringArray(record.qaIds);
  if (qaIds === null) return null;
  for (const id of qaIds) {
    if (!allowedIds.includes(id)) return null;
  }

  const flow = typeof record.flow === "string" ? record.flow : null;
  if (flow !== null && (!allowedFlows.includes(flow) || !FLOW_RE.test(flow))) return null;

  const smalltalk = readSmalltalk(record.smalltalk);
  if (smalltalk !== null && smalltalk.length > MAX_SMALLTALK_LENGTH) return null;

  switch (route) {
    case "qa":
      if (qaIds.length !== 1) return null;
      return { route, qaIds, flow: null, smalltalk: null, confidence: readConfidence(record.confidence) };
    case "clarify":
      if (qaIds.length < 2 || qaIds.length > 3) return null;
      return { route, qaIds, flow: null, smalltalk: null, confidence: readConfidence(record.confidence) };
    case "flow":
      if (flow === null || qaIds.length !== 0) return null;
      return { route, qaIds, flow, smalltalk: null, confidence: readConfidence(record.confidence) };
    case "smalltalk":
      if (smalltalk === null || qaIds.length !== 0 || flow !== null) return null;
      return { route, qaIds, flow: null, smalltalk, confidence: readConfidence(record.confidence) };
    case "offtopic":
      if (qaIds.length !== 0 || flow !== null || smalltalk !== null) return null;
      return { route, qaIds, flow: null, smalltalk: null, confidence: readConfidence(record.confidence) };
    default:
      return null;
  }
}

// ── free-text safety check (smalltalk answers) ──────────────────────────────

export type FreeTextVerdict =
  | { ok: true }
  | { ok: false; reason: "crisis" | "url" | "phone" | "length" };

/**
 * A proposed free-text answer is acceptable only when it is short, grounded
 * (no invented URLs/phones) and not a hidden crisis demand. The crisis check
 * is the literal safety.ts detector — the same one the route runs first —
 * so a smalltalk reply can never slip a crisis past the gate.
 */
export function checkFreeText(text: string, contextTexts: string[]): FreeTextVerdict {
  if (text.length > MAX_FREE_TEXT_LENGTH) return { ok: false, reason: "length" };
  if (detectCrisis(text).isCrisis) return { ok: false, reason: "crisis" };
  if (!isGrounded(text, contextTexts)) {
    return { ok: false, reason: text.match(URL_TOKEN_RE) ? "url" : "phone" };
  }
  return { ok: true };
}