import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/chat/route";
import { qaAnswer } from "@/lib/chatbot/flows/helpers";

interface ChatResponse {
  text: string;
  isCrisis: boolean;
  options?: string[];
  flowId?: string;
  exercise?: string;
  matchedId?: string | null;
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
  it("the météo des émotions ends on validated resources, through the real route", async () => {
    const sessionId = "flow-resources-1";

    const launch = await post({ message: "je veux faire la météo des émotions", sessionId });
    expect(launch.flowId).toBe("emotion-weather");

    const intensity = await post({ message: "3 - Très affecté(e) ⛈️", sessionId });
    expect(intensity.text).toContain("sentiment le plus fort");

    const emotion = await post({ message: "😨 La peur / l'anxiété", sessionId });
    expect(emotion.options).toContain("Voir les ressources d'aide");

    const resources = await post({ message: "Voir les ressources d'aide", sessionId });
    expect(resources.text).toBe(qaAnswer("3.1"));
    // The exercise offer survives the detour.
    expect(resources.options).toContain("Oui, essayer l'exercice de respiration");

    const sites = await post({ message: "Les sites de signalement", sessionId });
    expect(sites.text).toBe(qaAnswer("3.7"));

    // The route reports the flow that handled the turn; the switch shows in
    // the served text and in who handles the next message.
    const exercise = await post({ message: "Oui, essayer l'exercice de respiration", sessionId });
    expect(exercise.text).toContain("inspirez pendant 4 secondes");
    const firstPhase = await post({ message: "Continuer", sessionId });
    expect(firstPhase.flowId).toBe("breathing-4-2-6");
  });

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

  // Inverted deliberately: this used to assert that a question mid-parcours was
  // answered with « Je n'ai pas bien compris » and the user stayed trapped
  // until they typed an exact farewell phrase. A real question now ends the
  // parcours and gets a real answer.
  it("a question mid-flow ends the parcours and is answered", async () => {
    const sessionId = "flow-test-5";
    const launch = await post({ message: "parcours juridique", sessionId });
    expect(launch.flowId).toBe("parcours-juridique");
    expect(launch.options).toBeDefined();

    const midFlow = await post({ message: "C'est quoi l'EMC ?", sessionId });
    expect(midFlow.flowId).toBeUndefined();
    expect(midFlow.text).not.toContain("Je n'ai pas bien compris");
    expect(midFlow.matchedId).toBe("2.1");

    // The flow is gone, so the next turn is plain Q&A — a simple chatbot.
    const after = await post({ message: "C'est quoi l'EMC ?", sessionId });
    expect(after.flowId).toBeUndefined();
    expect(after.matchedId).toBe("2.1");
  });

  it("a hesitation mid-flow keeps the parcours alive", async () => {
    const sessionId = "flow-test-5b";
    await post({ message: "parcours juridique", sessionId });

    for (const message of ["ok", "je ne sais pas"]) {
      const reply = await post({ message, sessionId });
      expect(reply.flowId).toBe("parcours-juridique");
      expect(reply.text).toContain("Je n'ai pas bien compris");
    }

    // Still able to walk the menu afterwards.
    const resumed = await post({ message: "Terminer", sessionId });
    expect(resumed.text).toContain("24h/24");
  });

  it("stops marking the exercise once the breathing flow moves on to resources", async () => {
    // The reported bug: the flow keeps its id through the ressources menu, so a
    // client keying the animation on flowId kept it running for the rest of the
    // conversation.
    const sessionId = "flow-exercise-1";
    await post({ message: "exercice de respiration", sessionId });

    for (let i = 0; i < 12; i += 1) {
      const cycle = await post({ message: "Continuer", sessionId });
      expect(cycle.exercise, `cycle turn ${i + 1}`).toBe("breathing-4-2-6");
    }

    const assurance = await post({ message: "Continuer", sessionId });
    expect(assurance.flowId).toBe("breathing-4-2-6");
    expect(assurance.exercise).toBeUndefined();

    const resources = await post({ message: "Voir les ressources d'aide", sessionId });
    expect(resources.flowId).toBe("breathing-4-2-6");
    expect(resources.exercise).toBeUndefined();
    expect(resources.text).toBe(qaAnswer("3.1"));

    const pill = await post({ message: "La ligne d'assistance EMC-Helpline", sessionId });
    expect(pill.exercise).toBeUndefined();
  });

  it("marks the exercise on the launch turn too, whichever door opens it", async () => {
    // The launch branches build their own JSON, so the intro used to reach the
    // client without `exercise` and the guide only appeared from cycle 1.
    const direct = await post({ message: "exercice de respiration", sessionId: "flow-launch-1" });
    expect(direct.exercise).toBe("breathing-4-2-6");

    // And through the emotional path, where the turn reports the *previous*
    // flow id because the switch happens inside handleFlow.
    const sessionId = "flow-launch-2";
    await post({ message: "je veux faire la météo des émotions", sessionId });
    await post({ message: "3 - Très affecté(e) ⛈️", sessionId });
    await post({ message: "😨 La peur / l'anxiété", sessionId });
    const intro = await post({ message: "Oui, essayer l'exercice de respiration", sessionId });
    expect(intro.flowId).toBe("emotion-weather");
    expect(intro.exercise).toBe("breathing-4-2-6");
  });

  it("a question mid-exercise ends it and answers, through the real route", async () => {
    const sessionId = "flow-exercise-2";
    await post({ message: "exercice de respiration", sessionId });
    await post({ message: "Continuer", sessionId });

    const question = await post({ message: "Comment porter plainte ?", sessionId });
    expect(question.exercise).toBeUndefined();
    expect(question.flowId).toBeUndefined();
    expect(question.text).toBe(qaAnswer("4.5"));

    // The exercise is gone: « Continuer » is now just an unmatched message.
    const after = await post({ message: "Continuer", sessionId });
    expect(after.flowId).toBeUndefined();
    expect(after.text).not.toContain("Inspirez");
  });

  it("a message the knowledge base answers leaves the parcours even without a question mark", async () => {
    const sessionId = "flow-answerable-1";
    const launch = await post({ message: "parcours juridique", sessionId });
    expect(launch.flowId).toBe("parcours-juridique");

    const answerable = await post({ message: "Qu'est-ce que l'Espace Maroc Cyberconfiance", sessionId });
    expect(answerable.flowId).toBeUndefined();
    expect(answerable.matchedId).toBe("2.1");
  });

  it("a menu option that reads as a question still advances the flow", async () => {
    // Options are matched before the escape ever runs, so pills phrased as
    // questions must keep working.
    const sessionId = "flow-option-question-1";
    const launch = await post({ message: "parcours juridique", sessionId });
    const option = launch.options?.find((label) => label.includes("?"));
    expect(option).toBeDefined();

    const reply = await post({ message: option as string, sessionId });
    expect(reply.flowId).toBe("parcours-juridique");
    expect(reply.text).not.toContain("Je n'ai pas bien compris");
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