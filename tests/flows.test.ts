import { describe, expect, it } from "vitest";
import { handleFlow } from "@/lib/chatbot/flows";
import type { FlowState } from "@/types/flow";

const start = (flowId: FlowState["flowId"]): FlowState => ({ flowId, step: "start", data: {} });

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

describe("handleFlow orchestration", () => {
  it("emotion-weather asks the Phase-2 dominant-emotion question with the emotion buttons", () => {
    const s1 = handleFlow(start("emotion-weather"), "");
    expect(s1.nextState?.step).toBe("intensity");
    expect(s1.output.options?.length).toBe(5);

    const s2 = handleFlow(s1.nextState as FlowState, "2");
    expect(s2.output.text).toContain("le sentiment le plus fort");
    expect(s2.output.options).toContain("😨 La peur / l'anxiété");
    expect(s2.output.options).toContain("😕 Je suis perdu(e) / je ne sais pas");
    expect(s2.nextState?.step).toBe("emotion");

    const s3 = handleFlow(s2.nextState as FlowState, "La peur / l'anxiété");
    expect(s3.nextState?.step).toBe("proposal");
    expect(s3.output.options?.[0]).toContain("respiration");

    const s4 = handleFlow(s3.nextState as FlowState, "Oui, essayer l'exercice de respiration");
    expect(s4.nextState?.flowId).toBe("breathing-4-2-6");
    expect(s4.nextState?.step).toBe("c1-inhale");
  });

  it("emotion-weather routes sadness to the grounding exercise", () => {
    const s1 = handleFlow(start("emotion-weather"), "");
    const s2 = handleFlow(s1.nextState as FlowState, "4");
    const s3 = handleFlow(s2.nextState as FlowState, "La tristesse");
    const s4 = handleFlow(s3.nextState as FlowState, "Oui");
    expect(s4.nextState?.flowId).toBe("grounding-5-4-3-2-1");
  });

  it("a refusal at the proposal step ends the flow with the assurance message", () => {
    const s1 = handleFlow(start("emotion-weather"), "");
    const s2 = handleFlow(s1.nextState as FlowState, "3");
    const s3 = handleFlow(s2.nextState as FlowState, "La colère");
    const s4 = handleFlow(s3.nextState as FlowState, "Non, pas pour le moment");
    expect(s4.nextState).toBeNull();
    expect(s4.output.text).toContain("Personne ne devrait affronter cela seul(e)");
  });

  it("a wrong answer at any step keeps the flow alive (state is retained)", () => {
    const s1 = handleFlow(start("parcours-juridique"), "");
    const s2 = handleFlow(s1.nextState as FlowState, "message hors sujet");
    expect(s2.nextState?.step).toBe("menu");
    expect(s2.output.text).toContain("Je n'ai pas bien compris");

    const s3 = handleFlow(s2.nextState as FlowState, "Le cyberharcèlement est-il puni par la loi ?");
    expect(s3.output.text.length).toBeGreaterThan(50);
  });

  it("breathing flow runs 4 cycles of 4-2-6 then offers redo/terminate", () => {
    let state: FlowState = { flowId: "breathing-4-2-6", step: "start", data: {} };
    let steps = 0;
    while (state.step !== "done" && steps < 20) {
      const res = handleFlow(state, "Continuer");
      if (!res.nextState) break;
      state = res.nextState;
      steps += 1;
    }
    expect(state.step).toBe("done");
    expect(steps).toBe(13);

    const redo = handleFlow(state, "Refaire l'exercice de respiration");
    expect(redo.nextState?.step).toBe("c1-inhale");

    const done = handleFlow(state, "Terminer");
    expect(done.nextState).toBeNull();
    expect(done.output.text).toContain("reste à votre disposition");
  });

  it("grounding validates each sense step and only advances on validation", () => {
    const s1 = handleFlow(start("grounding-5-4-3-2-1"), "");
    expect(s1.nextState?.step).toBe("view");

    const s2 = handleFlow(s1.nextState as FlowState, "quelque chose hors sujet");
    expect(s2.nextState?.step).toBe("view");
    expect(s2.output.options).toEqual(["Continuer"]);
    expect(s2.output.text).toContain("Prenez tout votre temps");

    const s3 = handleFlow(s1.nextState as FlowState, "suivant");
    expect(s3.nextState?.step).toBe("touch");

    const res = walk(
      s3.nextState as FlowState,
      ["Continuer", "d'accord", "Continuer", "ok", "Terminer"],
    );
    expect(res.state).toBeNull();
    expect(res.output?.text).toContain("reste à votre disposition");
  });

  it("grounding can be aborted mid-exercise with a clean end", () => {
    const s1 = handleFlow(start("grounding-5-4-3-2-1"), "");
    const s2 = handleFlow(s1.nextState as FlowState, "Continuer");
    const s3 = handleFlow(s2.nextState as FlowState, "stop");
    expect(s3.nextState).toBeNull();
    expect(s3.output.text).toContain("reste à votre disposition");
  });

  it("technical flow qualifies the case then switches to the legal parcours", () => {
    const s1 = handleFlow(start("parcours-technique"), "");
    expect(s1.nextState?.step).toBe("content-type");

    const s2 = handleFlow(s1.nextState as FlowState, "Une photo ou une vidéo");
    expect(s2.nextState?.step).toBe("platform");

    const s3 = handleFlow(s2.nextState as FlowState, "Instagram");
    expect(s3.nextState?.step).toBe("nature");

    const s4 = handleFlow(s3.nextState as FlowState, "Photos ou vidéos d'abus sur un enfant");
    expect(s4.nextState?.step).toBe("end");
    expect(s4.output.options?.[0]).toBe("Porter plainte en ligne");

    const s5 = handleFlow(s4.nextState as FlowState, "Porter plainte en ligne");
    expect(s5.nextState?.flowId).toBe("parcours-juridique");
  });

  it("juridique parcours serves validated answers and returns to the menu", () => {
    const s1 = handleFlow(start("parcours-juridique"), "");
    expect(s1.nextState?.step).toBe("menu");

    const s2 = handleFlow(s1.nextState as FlowState, "Le cyberharcèlement est-il puni par la loi ?");
    expect(s2.output.text.length).toBeGreaterThan(50);
    expect(s2.nextState?.step).toBe("back");

    const s3 = handleFlow(s2.nextState as FlowState, "Retour au menu");
    expect(s3.nextState?.step).toBe("menu");

    const s4 = handleFlow(s3.nextState as FlowState, "Terminer");
    expect(s4.nextState).toBeNull();
  });

  it("juridique parcours walks the authorities submenu with validated links", () => {
    const s1 = handleFlow(start("parcours-juridique"), "");
    const s2 = handleFlow(s1.nextState as FlowState, "Les autorités où porter plainte");
    expect(s2.nextState?.step).toBe("autorites");
    expect(s2.output.options).toContain("Le Parquet (plainte en ligne)");
    expect(s2.output.options).toContain("Le Ministère de la Justice");

    const s3 = handleFlow(s2.nextState as FlowState, "La Police (E-Blagh)");
    expect(s3.output.text).toContain("https://www.e-blagh.ma/");
    expect(s3.nextState?.step).toBe("autorites-back");

    const s4 = handleFlow(s3.nextState as FlowState, "Retour aux autorités");
    expect(s4.nextState?.step).toBe("autorites");

    const s5 = handleFlow(s4.nextState as FlowState, "Le Ministère de la Justice");
    expect(s5.output.text).toContain("+212537266600");
  });

  it("informatif parcours walks into the 16 facettes and back", () => {
    const s1 = handleFlow(start("parcours-informatif"), "");
    const s2 = handleFlow(s1.nextState as FlowState, "Les formes du cyberharcèlement");
    expect(s2.nextState?.step).toBe("facette");
    expect(s2.output.options).toContain("Doxing");

    const s3 = handleFlow(s2.nextState as FlowState, "Doxing");
    expect(s3.output.text.length).toBeGreaterThan(50);
    expect(s3.nextState?.step).toBe("facette-back");

    const s4 = handleFlow(s3.nextState as FlowState, "Retour au menu");
    expect(s4.nextState?.step).toBe("menu");
  });

  it("informatif parcours walks the child-risk facettes (6.19–6.26)", () => {
    const s1 = handleFlow(start("parcours-informatif"), "");
    const s2 = handleFlow(
      s1.nextState as FlowState,
      "Les cyberviolences que mon enfant peut rencontrer",
    );
    expect(s2.nextState?.step).toBe("risques");
    expect(s2.output.options).toContain("Le chantage à la webcam");

    const s3 = handleFlow(s2.nextState as FlowState, "Le chantage à la webcam");
    expect(s3.output.text).toContain("webcam");
    expect(s3.nextState?.step).toBe("risques-back");

    const s4 = handleFlow(s3.nextState as FlowState, "Retour aux risques");
    expect(s4.nextState?.step).toBe("risques");

    const s5 = handleFlow(s4.nextState as FlowState, "La fraude et l'escroquerie");
    expect(s5.output.text).toContain("fraude");
  });

  it("informatif parcours serves the prevention good practices (7.8–7.12)", () => {
    const s1 = handleFlow(start("parcours-informatif"), "");
    const s2 = handleFlow(s1.nextState as FlowState, "Prévention et bonnes pratiques");
    expect(s2.nextState?.step).toBe("prevention");

    const s3 = handleFlow(s2.nextState as FlowState, "Comment choisir un bon mot de passe ?");
    expect(s3.output.text).toContain("minuscules");
    expect(s3.nextState?.step).toBe("prevention-back");
  });

  it("psychologique parcours hops into the emotion-weather module", () => {
    const s1 = handleFlow(start("parcours-psychologique"), "");
    const s2 = handleFlow(s1.nextState as FlowState, "Aide-moi à gérer mes émotions");
    expect(s2.nextState?.flowId).toBe("emotion-weather");
    expect(s2.nextState?.step).toBe("intensity");
  });

  it("psychologique parcours mentions PHQ-4 / DASS-21 as non-diagnostic orientation", () => {
    const s1 = handleFlow(start("parcours-psychologique"), "");
    const s2 = handleFlow(
      s1.nextState as FlowState,
      "PHQ-4 et DASS-21 : explorer mon état",
    );
    expect(s2.output.text).toContain("pas un outil de diagnostic");
    expect(s2.output.text).toContain("PHQ-4");
    expect(s2.output.text).toContain("DASS-21");
    expect(s2.output.text).toContain("dizaine de minutes");
  });

  it("psychologique parcours surfaces the physical/social/durable consequences answers", () => {
    const s1 = handleFlow(start("parcours-psychologique"), "");
    const s2 = handleFlow(
      s1.nextState as FlowState,
      "Les conséquences physiques, sociales et durables",
    );
    expect(s2.output.text).toContain("insomnie");
    expect(s2.output.text).toContain("ostracisée");
    expect(s2.output.text).toContain("durables");
  });
});