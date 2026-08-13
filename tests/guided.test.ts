import { describe, expect, it } from "vitest";
import { handleFlow } from "@/lib/chatbot/flows";
import { GUIDED_TREE, collectLeafQaIds } from "@/lib/chatbot/flows/guided";
import { QA_DATABASE } from "@/data/qa-database";
import { POST } from "@/app/api/chat/route";
import type { FlowState } from "@/types/flow";

const start = (flowId: FlowState["flowId"]): FlowState => ({ flowId, step: "start", data: {} });

// The launch turn (route intent -> handleFlow) only presents the profile
// question; resolve that first step so walks start at a real choice.
const tree = (): FlowState => handleFlow(start("guided-qualification"), "").nextState as FlowState;

function walk(initial: FlowState, replies: string[]) {
  let state: FlowState = initial;
  let output;
  for (const reply of replies) {
    const res = handleFlow(state, reply);
    output = res.output;
    if (!res.nextState) return { output, state: null };
    state = res.nextState;
  }
  return { output, state };
}

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

const entryIds = new Set(QA_DATABASE.map((e) => e.id));
const nodeIds = new Set(GUIDED_TREE.map((n) => n.id));
const profileLabels = GUIDED_TREE.find((n) => n.id === "profile")?.options.map((o) => o.label) ?? [];

describe("guided qualification tree — integrity", () => {
  it("every targetQaId in the tree exists in QA_DATABASE (no dead leaf)", () => {
    const leafIds = collectLeafQaIds();
    expect(leafIds.length).toBeGreaterThan(0);
    for (const id of leafIds) {
      expect(entryIds.has(id), `dead leaf targetQaId ${id}`).toBe(true);
    }
  });

  it("every next link and targetQaId resolves, and every node is reachable from profile", () => {
    for (const node of GUIDED_TREE) {
      for (const option of node.options) {
        if (option.next) {
          expect(nodeIds.has(option.next), `unknown next node ${option.next} from ${node.id}`).toBe(true);
        }
        if (option.targetQaId) {
          expect(entryIds.has(option.targetQaId), `unknown QA entry ${option.targetQaId} from ${node.id}`).toBe(true);
        }
      }
    }

    const reached = new Set<string>();
    const queue = ["profile"];
    while (queue.length > 0) {
      const id = queue.shift() as string;
      if (reached.has(id)) continue;
      reached.add(id);
      const node = GUIDED_TREE.find((n) => n.id === id);
      for (const option of node?.options ?? []) {
        if (option.next && !reached.has(option.next)) queue.push(option.next);
      }
    }
    for (const node of GUIDED_TREE) {
      expect(reached.has(node.id), `node ${node.id} unreachable from profile`).toBe(true);
    }
  });
});

describe("guided qualification tree — qualification walks", () => {
  it("victime -> information -> difference cyberviolence/cyberharcèlement (6.1)", () => {
    const res = walk(tree(), [
      "Je suis victime",
      "Comprendre ce qui m'arrive ou obtenir une information",
      "Comprendre la différence entre cyberviolence et cyberharcèlement",
    ]);
    expect(res.state).toBeNull();
    expect(res.output?.text).toContain("cyberviolence regroupe");
  });

  it("victime -> signalement -> photo/vidéo intime (3.4)", () => {
    const res = walk(tree(), [
      "Je suis victime",
      "Signaler un contenu publié en ligne",
      "Une photo ou une vidéo intime diffusée sans mon accord",
    ]);
    expect(res.state).toBeNull();
    expect(res.output?.text).toContain("StopNCII");
  });

  it("victime -> plainte -> Police E-Blagh (4.11)", () => {
    const res = walk(tree(), [
      "Je suis victime",
      "Démarches juridiques / porter plainte",
      "Où déposer ma plainte ?",
      "La Police (plateforme E-Blagh)",
    ]);
    expect(res.state).toBeNull();
    expect(res.output?.text).toContain("e-blagh.ma");
  });

  it("victime -> soutien psychologique -> accompagnement (3.1)", () => {
    const res = walk(tree(), [
      "Je suis victime",
      "Soutien psychologique",
      "Être accompagné(e) : où trouver de l'aide ?",
    ]);
    expect(res.state).toBeNull();
    expect(res.output?.text).toContain("EMC-Helpline");
    expect(res.output?.text).toContain("24h/24");
  });

  it("parent -> situation concernant un enfant (7.6)", () => {
    const res = walk(tree(), [
      "Je suis parent ou tuteur",
      "Mon enfant est concerné : comprendre la situation ou que faire",
      "Mon enfant est victime de cyberviolence : que faire ?",
    ]);
    expect(res.state).toBeNull();
    expect(res.output?.text).toContain("DIALOGUER");
  });

  it("témoin -> aider une victime (7.3)", () => {
    const res = walk(tree(), [
      "Je suis témoin",
      "Aider une victime concrètement",
    ]);
    expect(res.state).toBeNull();
    expect(res.output?.text).toContain("ne pas liker");
  });

  it("enseignant -> élève victime de cyberharcèlement (3.6)", () => {
    const res = walk(tree(), [
      "Je suis enseignant ou éducateur",
      "Un élève est victime de cyberharcèlement : comment réagir ?",
    ]);
    expect(res.state).toBeNull();
    expect(res.output?.text).toContain("Ne confrontez jamais");
  });

  it("professionnel -> classification internationale (6.4)", () => {
    const res = walk(tree(), [
      "Je suis un professionnel (psychologue, avocat, association…)",
      "La classification internationale des cyberviolences",
    ]);
    expect(res.state).toBeNull();
    expect(res.output?.text).toContain("Safer Internet Day");
  });
});

describe("guided qualification tree — exits", () => {
  it("'Je ne sais pas' at intent-victime ends the tree gracefully", () => {
    const res = walk(tree(), ["Je suis victime", "Je ne sais pas"]);
    expect(res.state).toBeNull();
    expect(res.output?.text).toContain("librement");
  });

  it("'Je ne sais pas de quoi il s'agit' at forms serves 6.1 and ends", () => {
    const res = walk(tree(), [
      "Je suis victime",
      "Comprendre ce qui m'arrive ou obtenir une information",
      "Comprendre ce qui m'arrive / identifier la situation",
      "Je ne sais pas de quoi il s'agit",
    ]);
    expect(res.state).toBeNull();
    expect(res.output?.text).toContain("cyberviolence regroupe");
  });

  it("'Autre' at signal ends the tree gracefully", () => {
    const res = walk(tree(), [
      "Je suis victime",
      "Signaler un contenu publié en ligne",
      "Autre",
    ]);
    expect(res.state).toBeNull();
    expect(res.output?.text).toContain("librement");
  });
});

describe("guided qualification tree — back navigation", () => {
  it("Retour walks back node by node and profile has no Retour pill", () => {
    const s1 = handleFlow(tree(), "Je suis victime");
    expect(s1.nextState?.step).toBe("intent-victime");

    const s2 = handleFlow(s1.nextState as FlowState, "Signaler un contenu publié en ligne");
    expect(s2.nextState?.step).toBe("signal");
    expect(s2.output.options?.[0]).toBe("Retour");

    const s3 = handleFlow(s2.nextState as FlowState, "Retour");
    expect(s3.nextState?.step).toBe("intent-victime");

    const s4 = handleFlow(s3.nextState as FlowState, "Retour");
    expect(s4.nextState?.step).toBe("profile");
    expect(s4.output.options).toEqual(profileLabels);
    expect(s4.output.options).not.toContain("Retour");
  });
});

describe("guided qualification tree — route integration", () => {
  it("free text mid-tree abandons the tree to the matcher, flow cleared", async () => {
    const sessionId = "guided-route-1";

    const launch = await post({ message: "Aidez-moi à comprendre ma situation", sessionId });
    expect(launch.flowId).toBe("guided-qualification");
    expect(launch.options?.[0]).toBe("Je suis victime");

    const abandon = await post({ message: "C'est quoi le doxing ?", sessionId });
    expect(abandon.flowId).toBeUndefined();
    expect(abandon.text).toBe(QA_DATABASE.find((e) => e.id === "6.10")?.answer);

    const after = await post({ message: "Continuer", sessionId });
    expect(after.flowId).toBeUndefined();
    expect(after.text).not.toContain("qui vous êtes");
  });

  it("a crisis keyword mid-tree aborts the flow immediately", async () => {
    const sessionId = "guided-route-2";

    const launch = await post({ message: "Aidez-moi à comprendre ma situation", sessionId });
    expect(launch.flowId).toBe("guided-qualification");

    const crisis = await post({ message: "je veux mourir", sessionId });
    expect(crisis.isCrisis).toBe(true);
    expect(crisis.text).toContain("2511");

    const after = await post({ message: "Continuer", sessionId });
    expect(after.flowId).toBeUndefined();
    expect(after.text).not.toContain("qui vous êtes");
  });
});

describe("guided qualification tree — acknowledgments", () => {
  it("nine contextually distinct acks, all non-empty", () => {
    const acks = GUIDED_TREE.flatMap((node) =>
      node.options.map((o) => o.ack).filter((a): a is string => typeof a === "string"),
    );
    expect(acks.length).toBe(9);
    for (const ack of acks) {
      expect(ack.length).toBeGreaterThan(0);
    }
    expect(new Set(acks).size).toBe(acks.length);
  });

  it("each profile choice presents its ack above the intent question, never 'Très bien'", () => {
    const profile = GUIDED_TREE.find((n) => n.id === "profile");
    const routed = (profile?.options ?? []).filter((o) => o.next !== undefined);
    expect(routed.map((o) => o.label)).toEqual([
      "Je suis victime",
      "Je suis parent ou tuteur",
      "Je suis enseignant ou éducateur",
      "Je suis témoin",
      "Je suis un professionnel (psychologue, avocat, association…)",
    ]);
    for (const option of routed) {
      const ack = option.ack;
      if (!ack) throw new Error(`profile option ${option.id} is missing its ack`);
      const res = handleFlow(tree(), option.label);
      expect(res.nextState?.step).toBe(option.next);
      expect(res.output.text).toContain(ack);
      expect(res.output.text).not.toContain("Très bien");
    }
  });

  it("a deep in-tree choice shows its ack (victime -> signal)", () => {
    const first = handleFlow(tree(), "Je suis victime");
    const res = handleFlow(first.nextState as FlowState, "Signaler un contenu publié en ligne");
    expect(res.nextState?.step).toBe("signal");
    expect(res.output.text).toContain("étape difficile");
  });
});

describe("guided qualification tree — end-of-tree support proposal", () => {
  it("a resolved QA leaf offers exactly the emotion-weather pill", () => {
    const res = walk(tree(), [
      "Je suis victime",
      "Comprendre ce qui m'arrive ou obtenir une information",
      "Comprendre la différence entre cyberviolence et cyberharcèlement",
    ]);
    expect(res.state).toBeNull();
    expect(res.output?.options).toEqual(["Aide-moi à gérer mes émotions"]);
    expect(res.output?.text).toContain("cyberviolence regroupe");
  });

  it("selecting the pill launches the real emotion-weather module via intent routing", async () => {
    const sessionId = "ack-route-1";
    const launch = await post({ message: "Aidez-moi à comprendre ma situation", sessionId });
    expect(launch.flowId).toBe("guided-qualification");
    await post({ message: "Je suis victime", sessionId });
    await post({ message: "Comprendre ce qui m'arrive ou obtenir une information", sessionId });
    const leaf = await post({
      message: "Comprendre la différence entre cyberviolence et cyberharcèlement",
      sessionId,
    });
    expect(leaf.options).toEqual(["Aide-moi à gérer mes émotions"]);

    const support = await post({ message: "Aide-moi à gérer mes émotions", sessionId });
    expect(support.flowId).toBe("emotion-weather");
    expect(support.text).toContain("échelle de 1 à 5");
    expect(support.options?.[0]).toContain("1 - Un peu troublé(e)");
  });

  it("declining the pill keeps free-typing QA routing (flow cleared at leaf)", async () => {
    const sessionId = "ack-route-3";
    await post({ message: "Aidez-moi à comprendre ma situation", sessionId });
    await post({ message: "Je suis victime", sessionId });
    await post({ message: "Comprendre ce qui m'arrive ou obtenir une information", sessionId });
    const leaf = await post({
      message: "Comprendre la différence entre cyberviolence et cyberharcèlement",
      sessionId,
    });
    expect(leaf.options).toEqual(["Aide-moi à gérer mes émotions"]);

    const followUp = await post({ message: "C'est quoi le doxing ?", sessionId });
    expect(followUp.flowId).toBeUndefined();
    expect(followUp.text).toBe(QA_DATABASE.find((e) => e.id === "6.10")?.answer);
  });

  it("emergency keywords still beat the flow after an acknowledgment", async () => {
    const sessionId = "ack-route-2";
    const launch = await post({ message: "Aidez-moi à comprendre ma situation", sessionId });
    expect(launch.flowId).toBe("guided-qualification");
    const ack = await post({ message: "Je suis victime", sessionId });
    expect(ack.text).toContain("Je suis vraiment désolé(e)");

    const crisis = await post({ message: "je veux mourir", sessionId });
    expect(crisis.isCrisis).toBe(true);
    expect(crisis.text).toContain("2511");

    const after = await post({ message: "C'est quoi le doxing ?", sessionId });
    expect(after.flowId).toBeUndefined();
    expect(after.text).toBe(QA_DATABASE.find((e) => e.id === "6.10")?.answer);
  });
});

describe("guided qualification tree — emotion-weather from Soutien psychologique", () => {
  it("the Soutien psychologique menu offers the emotion-weather option, which hands off to the real module", () => {
    const res = walk(tree(), [
      "Je suis victime",
      "Soutien psychologique",
      "Aide-moi à gérer mes émotions",
    ]);
    expect(res.output?.text).toContain("échelle de 1 à 5");
    expect(res.output?.options?.[0]).toContain("1 - Un peu troublé(e)");
    expect(res.state?.flowId).toBe("emotion-weather");
    expect(res.state?.step).toBe("intensity");
  });

  it("route-level: the handoff persists the emotion-weather flow and the walk continues in it", async () => {
    const sessionId = "ack-route-5";
    const launch = await post({ message: "Aidez-moi à comprendre ma situation", sessionId });
    expect(launch.flowId).toBe("guided-qualification");
    await post({ message: "Je suis victime", sessionId });
    const support = await post({ message: "Soutien psychologique", sessionId });
    expect(support.options).toContain("Aide-moi à gérer mes émotions");

    const emotion = await post({ message: "Aide-moi à gérer mes émotions", sessionId });
    expect(emotion.text).toContain("échelle de 1 à 5");
    expect(emotion.options?.[0]).toContain("1 - Un peu troublé(e)");

    const intensity = await post({ message: "2 - Assez mal à l'aise 🌧️", sessionId });
    expect(intensity.text).toContain("sentiment le plus fort");
  });
});
