// Session context helpers (PLANLLM Phase 5): turn/answer bookkeeping,
// summarize, guided-profile mapping, pending-clarification resolution.

import { describe, expect, it } from "vitest";
import {
  emptyContext,
  mapGuidedProfile,
  noteAnswer,
  noteTurn,
  resolvePendingClarify,
  setPendingClarify,
  setProfile,
  summarize,
} from "@/lib/chatbot/context";

describe("context helpers", () => {
  it("noteTurn increments the turn counter", () => {
    const ctx = noteTurn(noteTurn(emptyContext()));
    expect(ctx.turnCount).toBe(2);
  });

  it("noteAnswer prepends, dedupes and caps at 6 ids", () => {
    let ctx = emptyContext();
    for (const id of ["3.1", "6.5", "3.1", "4.5", "7.2", "5.9", "4.10", "2.2"]) {
      ctx = noteAnswer(ctx, id);
    }
    expect(ctx.lastQaIds).toEqual(["2.2", "4.10", "5.9", "7.2", "4.5", "3.1"]);
    expect(ctx.lastQaIds.length).toBe(6);
  });

  it("summarize renders profile and last answers in classifier order", () => {
    let ctx = setProfile(emptyContext(), "parent-tuteur");
    ctx = noteAnswer(ctx, "7.3");
    ctx = noteAnswer(ctx, "3.5");
    const summary = summarize(ctx);
    expect(summary).toContain("profil utilisateur: parent-tuteur");
    expect(summary).toContain("dernieres reponses: 3.5, 7.3");
    expect(summarize(emptyContext())).toBe("nouvelle conversation");
  });

  it("mapGuidedProfile maps both option ids and intent-node ids", () => {
    expect(mapGuidedProfile("parent")).toBe("parent-tuteur");
    expect(mapGuidedProfile("enseignant")).toBe("enseignant-educateur");
    expect(mapGuidedProfile("temoin")).toBe("temoin");
    expect(mapGuidedProfile("pro")).toBe("professionnel");
    expect(mapGuidedProfile("victime")).toBe("victime-majeure");
    expect(mapGuidedProfile("autre")).toBeNull();
    expect(mapGuidedProfile("intent-parent")).toBe("parent-tuteur");
    expect(mapGuidedProfile("intent-victime")).toBe("victime-majeure");
    expect(mapGuidedProfile("inconnu")).toBeNull();
  });

  it("setPendingClarify stores ids with an expiry and a fresh stale counter", () => {
    const before = Date.now();
    const ctx = setPendingClarify(emptyContext(), ["3.2", "4.5"], 10_000);
    expect(ctx.pendingClarify?.ids).toEqual(["3.2", "4.5"]);
    expect(ctx.pendingClarify?.expiresAt).toBeGreaterThanOrEqual(before + 10_000);
    expect(ctx.pendingClarify?.stale).toBe(0);
    expect(setPendingClarify(ctx, null).pendingClarify).toBeNull();
  });

  it("resolvePendingClarify resolves ids, indices, letters and question text", () => {
    const ids = ["3.2", "4.5"];
    expect(resolvePendingClarify("4.5", ids)).toBe("4.5");
    expect(resolvePendingClarify("1", ids)).toBe("3.2");
    expect(resolvePendingClarify("2", ids)).toBe("4.5");
    expect(resolvePendingClarify("b", ids)).toBe("4.5");
    expect(
      resolvePendingClarify("Comment signaler un contenu de cyberviolence publié sur les réseaux sociaux ?", ids),
    ).toBe("3.2");
    // ambiguous: both candidates mentioned
    expect(resolvePendingClarify("signaler et porter plainte", ids)).toBeNull();
    // unrelated: no resolution
    expect(resolvePendingClarify("je ne sais pas", ids)).toBeNull();
  });
});
