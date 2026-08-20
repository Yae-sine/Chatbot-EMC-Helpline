// Route-level hybrid tests (PLANLLM Phase 3): the real POST handler.
// First describe: provider-less run — the LLM path is off, low-confidence
// messages get today's fallback, the static gate and flows are unchanged.
// Second describe: a stubbed provider exercises the classifier path
// end-to-end through the real route.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QA_DATABASE } from "@/data/qa-database";
import { emptyContext, setPendingClarify, setProfile } from "@/lib/chatbot/context";
import { EMOTION_SUPPORT_OPTION } from "@/lib/chatbot/emotion";
import { getContext, setContext } from "@/lib/chatbot/session";

interface ChatResponse {
  text: string;
  isCrisis: boolean;
  mode?: "static" | "llm" | "fallback";
  matchedId?: string | null;
  options?: string[];
  flowId?: string;
}

// The route builds its provider chain from process.env at module load, so
// the route module (and the session store it shares) is loaded lazily via
// dynamic import: the first describe loads it without keys, the second
// resets the module registry (vi.resetModules) after setting a stub key.
// Static imports would freeze the env-dependent singletons.
let routeModule: { POST: (request: Request) => Promise<Response> } | null = null;

async function ensureRouteLoaded(): Promise<{ POST: (request: Request) => Promise<Response> }> {
  if (routeModule) return routeModule;
  routeModule = (await import("@/app/api/chat/route")) as unknown as {
    POST: (request: Request) => Promise<Response>;
  };
  return routeModule;
}

function resetRouteModule(): void {
  vi.resetModules();
  routeModule = null;
}

async function post(
  body: Record<string, unknown>,
  headers: Record<string, string> = {},
): Promise<ChatResponse> {
  const { POST } = await ensureRouteLoaded();
  const response = await POST(
    new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: JSON.stringify(body),
    }),
  );
  return (await response.json()) as ChatResponse;
}

function answerOf(id: string): string {
  return QA_DATABASE.find((entry) => entry.id === id)?.answer ?? "";
}

describe("provider-less route (no LLM keys)", () => {
  it("no key in this worker: the hybrid path is off", () => {
    expect(process.env.GEMINI_API_KEY).toBeUndefined();
  });

  it(`"Je veux aider mon fils" degrades to fallback — primary weakness regression`, async () => {
    const response = await post({ message: "Je veux aider mon fils" });
    expect(response.mode).toBe("fallback");
    expect(response.text).not.toBe(answerOf("2.2"));
    expect(response.text).toContain("Je n'ai pas");
  });

  it(`"C'est quoi le doxing ?" stays static on entry 6.10`, async () => {
    const response = await post({ message: "C'est quoi le doxing ?" });
    expect(response.mode).toBe("static");
    expect(response.matchedId).toBe("6.10");
  });

  it(`"je veux mourir" still hits the crisis gate (2511)`, async () => {
    const response = await post({ message: "je veux mourir" });
    expect(response.isCrisis).toBe(true);
    expect(response.text).toContain("2511");
  });

  it(`"exercice de respiration" still launches the breathing flow`, async () => {
    const response = await post({ message: "je veux faire un exercice de respiration" });
    expect(response.flowId).toBe("breathing-4-2-6");
    expect(response.options).toEqual(["Continuer"]);
  });

  it(`"Quelle heure est-il ?" falls back`, async () => {
    const response = await post({ message: "Quelle heure est-il ?" });
    expect(response.mode).toBe("fallback");
    expect(response.text).toContain("Je n'ai pas");
  });

  it("counts exactly one turn per request", async () => {
    // Double counting would silence the LLM layer after half the intended
    // conversation length (SESSION_TURN_CAP).
    const sessionId = "turn-count-once";
    await post({ message: "Quelle heure est-il ?", sessionId });
    expect(getContext(sessionId)?.turnCount).toBe(1);
    await post({ message: "Et demain ?", sessionId });
    await post({ message: "Et après ?", sessionId });
    expect(getContext(sessionId)?.turnCount).toBe(3);
  });

  it("never 500s on a pending clarification whose id left the database", async () => {
    const sessionId = "clarify-stale-id";
    setContext(sessionId, setPendingClarify(emptyContext(), ["9.99", "3.1"]));
    const response = await post({ message: "1", sessionId });
    expect(typeof response.text).toBe("string");
    expect(response.text.length).toBeGreaterThan(0);
    expect(response.isCrisis).toBe(false);
    // The unusable clarification is dropped, never re-asked.
    expect(getContext(sessionId)?.pendingClarify).toBeNull();
  });

  it("an emotional statement opens the météo des émotions without any key", async () => {
    const response = await post({
      message: "Depuis que cela m'arrive, j'ai très peur et je n'arrive plus à penser à autre chose",
      sessionId: "emotional-open",
    });
    expect(response.flowId).toBe("emotion-weather");
    expect(response.isCrisis).toBe(false);
    expect(response.text).toContain("météo intérieure");
    expect(response.options).toHaveLength(5);

    // The flow then behaves exactly as when it is launched by its trigger.
    const next = await post({ message: "3 - Très affecté(e) ⛈️", sessionId: "emotional-open" });
    expect(next.text).toContain("sentiment le plus fort");
  });

  it("a factual question mid-exercise is answered instead of re-prompted", async () => {
    const sessionId = "emotional-escape";
    const launched = await post({ message: "je suis submergée", sessionId });
    expect(launched.flowId).toBe("emotion-weather");

    const question = await post({ message: "Comment porter plainte ?", sessionId });
    expect(question.flowId).toBeUndefined();
    expect(question.mode).toBe("static");
    expect(question.matchedId).toBe("4.5");
  });

  it("a message mixing emotion and a real question keeps the validated answer plus the pill", async () => {
    const response = await post({ message: "j'ai très peur, comment porter plainte ?" });
    expect(response.flowId).toBeUndefined();
    expect(response.mode).toBe("static");
    expect(response.text).toBe(answerOf(response.matchedId ?? ""));
    expect(response.options).toEqual([EMOTION_SUPPORT_OPTION]);
  });

  it("does not open the flow when the emotion belongs to someone else", async () => {
    const response = await post({ message: "ma fille a peur d'aller à l'école" });
    expect(response.flowId).toBeUndefined();
  });

  it("crisis still wins over an emotional statement", async () => {
    const response = await post({ message: "je veux mourir, j'ai très peur" });
    expect(response.isCrisis).toBe(true);
    expect(response.flowId).toBeUndefined();
    expect(response.text).toContain("2511");
  });

  it("learns the parent profile from the guided tree (Phase 5)", async () => {
    const sessionId = "phase5-guided-profile";
    const launch = await post({ message: "Je ne sais pas quoi demander", sessionId });
    expect(launch.flowId).toBe("guided-qualification");

    const answered = await post({ message: "Je suis parent ou tuteur", sessionId });
    expect(answered.flowId).toBe("guided-qualification");
    expect(getContext(sessionId)?.profile).toBe("parent-tuteur");
  });
});

describe("hybrid route with a stubbed provider", () => {
  // A functional classifier stub: always returns the first candidate id
  // from the request's Candidats list — never an invalid id.
  function stubClassifier() {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: unknown, init?: RequestInit) => {
        const body = JSON.parse(String(init?.body)) as {
          contents?: Array<{ parts: Array<{ text: string }> }>;
        };
        const prompt = body.contents?.[0]?.parts?.[0]?.text ?? "";
        const ids = [...prompt.matchAll(/(\d+\.\d+) \|/g)].map((match) => match[1]);
        const first = ids[0] ?? "3.1";
        const payload = JSON.stringify({
          route: "qa",
          qaIds: [first],
          flow: null,
          smalltalk: null,
          confidence: 0.9,
        });
        return new Response(
          JSON.stringify({ candidates: [{ content: { parts: [{ text: payload }] } }] }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }),
    );
  }

  beforeEach(() => {
    resetRouteModule();
    process.env.GEMINI_API_KEY = "stub-key";
    stubClassifier();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.GEMINI_API_KEY;
    resetRouteModule();
  });

  it("routes a low-confidence message through the classifier and serves a verbatim answer", async () => {
    const response = await post({ message: "Je veux aider mon fils" });
    expect(response.mode).toBe("llm");
    const matchedId = response.matchedId ?? "";
    expect(QA_DATABASE.some((entry) => entry.id === matchedId)).toBe(true);
    expect(answerOf(matchedId)).toBe(response.text);
    expect(response.text.length).toBeGreaterThan(20);
  });

  it("serves the météo des émotions when the classifier answers flow/emotion-weather", async () => {
    // Paraphrases the deterministic list does not carry are the classifier's
    // job; the flow id whitelist must reach the model for this to be possible.
    const prompts: string[] = [];
    vi.unstubAllGlobals();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: unknown, init?: RequestInit) => {
        const body = JSON.parse(String(init?.body)) as {
          contents?: Array<{ parts: Array<{ text: string }> }>;
        };
        prompts.push(body.contents?.[0]?.parts?.[0]?.text ?? "");
        const payload = JSON.stringify({
          route: "flow",
          qaIds: [],
          flow: "emotion-weather",
          smalltalk: null,
          confidence: 0.9,
        });
        return new Response(
          JSON.stringify({ candidates: [{ content: { parts: [{ text: payload }] } }] }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }),
    );

    const response = await post({ message: "tout ça me ronge de l'intérieur en ce moment" });
    expect(response.mode).toBe("llm");
    expect(response.flowId).toBe("emotion-weather");
    expect(response.text).toContain("météo intérieure");
    expect(prompts.some((prompt) => prompt.includes("Flux autorisés"))).toBe(true);
    expect(prompts.some((prompt) => prompt.includes("emotion-weather"))).toBe(true);
  });

  it("budgets the LLM path per client, and a spoofed forwarded-for cannot reset it", async () => {
    // Default budget is 10/min. Distinct clients each get their own.
    for (let i = 0; i < 12; i += 1) {
      const response = await post({ message: "Je veux aider mon fils" }, { "x-real-ip": `9.9.9.${i}` });
      expect(response.mode).toBe("llm");
    }
    // One client: the 11th call in the same minute is denied and falls back.
    const modes: Array<string | undefined> = [];
    for (let i = 0; i < 11; i += 1) {
      const response = await post({ message: "Je veux aider mon fils" }, { "x-real-ip": "9.9.9.100" });
      modes.push(response.mode);
    }
    expect(modes.slice(0, 10).every((mode) => mode === "llm")).toBe(true);
    expect(modes[10]).toBe("fallback");

    // Rotating the client-supplied leftmost hop must not buy a fresh budget:
    // only the last hop (what our proxy observed) identifies the caller.
    const spoofed = await post(
      { message: "Je veux aider mon fils" },
      { "x-forwarded-for": "1.2.3.4, 9.9.9.100" },
    );
    expect(spoofed.mode).toBe("fallback");
    const otherHop = await post(
      { message: "Je veux aider mon fils" },
      { "x-forwarded-for": "1.2.3.4, 9.9.9.200" },
    );
    expect(otherHop.mode).toBe("llm");
  });

  it("a follow-up anchored by a parent profile never resolves to the generic 2.2", async () => {
    const sessionId = "hybrid-parent-followup";
    const session = await import("@/lib/chatbot/session");
    session.setContext(sessionId, setProfile(emptyContext(), "parent-tuteur"));

    const response = await post({ message: "et si c'est mon fils ?", sessionId });
    expect(response.mode).toBe("llm");
    expect(response.matchedId).not.toBe("2.2");
    expect(response.text).not.toBe(answerOf("2.2"));
    expect(session.getContext(sessionId)?.profile).toBe("parent-tuteur");
  });

  it("reissues the clarification prompt and serves the deterministic answer to '1' (Phase 5)", async () => {
    // Stub: a clarify with the two first candidates.
    vi.unstubAllGlobals();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: unknown, init?: RequestInit) => {
        const body = JSON.parse(String(init?.body)) as {
          contents?: Array<{ parts: Array<{ text: string }> }>;
        };
        const prompt = body.contents?.[0]?.parts?.[0]?.text ?? "";
        const ids = [...prompt.matchAll(/(\d+\.\d+) \|/g)].map((match) => match[1]);
        const payload = JSON.stringify({
          route: "clarify",
          qaIds: ids.slice(0, 2),
          flow: null,
          smalltalk: null,
          confidence: 0.9,
        });
        return new Response(
          JSON.stringify({ candidates: [{ content: { parts: [{ text: payload }] } }] }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }),
    );

    const sessionId = "phase5-clarify-loop";
    const clarified = await post({ message: "Je veux aider mon fils", sessionId });
    expect(clarified.mode).toBe("llm");
    expect(clarified.text).toContain("Pouvez-vous préciser");
    expect(clarified.text).toContain("?");

    const first = await import("@/lib/chatbot/session");
    const pending = first.getContext(sessionId)?.pendingClarify;
    expect(pending?.ids.length).toBeGreaterThanOrEqual(2);

    const resolved = await post({ message: "1", sessionId });
    expect(resolved.mode).toBe("static");
    expect(resolved.matchedId).toBe(pending?.ids[0]);
    expect(answerOf(resolved.matchedId ?? "")).toBe(resolved.text);
    expect(first.getContext(sessionId)?.pendingClarify).toBeNull();
  });
});