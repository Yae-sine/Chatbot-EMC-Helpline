// Route-level hybrid tests (PLANLLM Phase 3): the real POST handler.
// First describe: provider-less run — the LLM path is off, low-confidence
// messages get today's fallback, the static gate and flows are unchanged.
// Second describe: a stubbed provider exercises the classifier path
// end-to-end through the real route.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QA_DATABASE } from "@/data/qa-database";
import { emptyContext, setProfile } from "@/lib/chatbot/context";
import { getContext } from "@/lib/chatbot/session";

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

async function post(body: Record<string, unknown>): Promise<ChatResponse> {
  const { POST } = await ensureRouteLoaded();
  const response = await POST(
    new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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