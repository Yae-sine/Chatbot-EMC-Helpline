import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/chat/route";

interface ChatResponse {
  text: string;
  isCrisis: boolean;
  options?: string[];
  flowId?: string;
}

async function post(body: Record<string, unknown>): Promise<ChatResponse> {
  const response = await POST(
    new Request("http://localhost/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
  return (await response.json()) as ChatResponse;
}

describe("route orchestration (AGENTS.md §8)", () => {
  it("launches a flow from an explicit intent and keeps the session stateful", async () => {
    const sessionId = "flow-test-1";

    const launch = await post({ message: "je veux faire un exercice de respiration", sessionId });
    expect(launch.flowId).toBe("breathing-4-2-6");
    expect(launch.options).toEqual(["Continuer"]);

    const step = await post({ message: "Continuer", sessionId });
    expect(step.text).toContain("Inspirez");
    expect(step.options).toEqual(["Continuer"]);

    const hold = await post({ message: "Continuer", sessionId });
    expect(hold.text).toContain("Retenez");

    const exhale = await post({ message: "Continuer", sessionId });
    expect(exhale.text).toContain("Expirez");
  });

  it("does not leak flow state across sessions", async () => {
    const launch = await post({ message: "je veux faire un exercice de respiration", sessionId: "flow-test-2" });
    expect(launch.flowId).toBe("breathing-4-2-6");

    const otherSession = await post({ message: "Continuer", sessionId: "flow-test-3" });
    expect(otherSession.flowId).toBeUndefined();
    expect(otherSession.text).not.toContain("Inspirez");
  });

  it("farewell clears the active flow", async () => {
    const sessionId = "flow-test-4";
    await post({ message: "exercice d'ancrage", sessionId });
    const farewell = await post({ message: "Merci beaucoup", sessionId });
    expect(farewell.flowId).toBeUndefined();

    const after = await post({ message: "Continuer", sessionId });
    expect(after.flowId).toBeUndefined();
    expect(after.text).not.toContain("LA VUE");
  });

  it("keeps the user inside an active flow until Terminer, then QA resumes", async () => {
    const sessionId = "flow-test-5";
    const launch = await post({ message: "parcours juridique", sessionId });
    expect(launch.flowId).toBe("parcours-juridique");
    expect(launch.options).toBeDefined();

    const midFlow = await post({ message: "C'est quoi l'EMC ?", sessionId });
    expect(midFlow.flowId).toBe("parcours-juridique");
    expect(midFlow.text).toContain("Je n'ai pas bien compris");

    const stillInFlow = await post({ message: "Terminer", sessionId });
    expect(stillInFlow.flowId).toBeUndefined();
    expect(stillInFlow.text).toContain("24h/24");

    const after = await post({ message: "C'est quoi l'EMC ?", sessionId });
    expect(after.flowId).toBeUndefined();
    expect(after.text.length).toBeGreaterThan(20);
  });

  it("a crisis keyword inside an active flow aborts the flow immediately", async () => {
    const sessionId = "flow-test-6";
    await post({ message: "exercice d'ancrage", sessionId });

    const crisis = await post({ message: "je veux mourir", sessionId });
    expect(crisis.isCrisis).toBe(true);
    expect(crisis.text).toContain("2511");

    const after = await post({ message: "Continuer", sessionId });
    expect(after.flowId).toBeUndefined();
    expect(after.text).not.toContain("LA VUE");
  });

  it("a raw option echo outside any flow falls back gracefully", async () => {
    const response = await post({ message: "Continuer" });
    expect(response.flowId).toBeUndefined();
    expect(response.text.length).toBeGreaterThan(0);
  });
});