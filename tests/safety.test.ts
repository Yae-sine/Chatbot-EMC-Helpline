import { describe, expect, it } from "vitest";
import { CRISIS_PROTOCOL } from "@/data/crisis-protocol";
import { QA_DATABASE } from "@/data/qa-database";
import { detectCrisis } from "@/lib/chatbot/safety";
import { POST } from "@/app/api/chat/route";

describe("safety protocol (AGENTS.md §6)", () => {
  it("triggers the correct case for every crisis keyword", () => {
    for (const crisisCase of CRISIS_PROTOCOL) {
      for (const keyword of crisisCase.keywords) {
        const result = detectCrisis(`Voici mon message : ${keyword}`);
        expect(result.isCrisis, `keyword "${keyword}" should trigger a crisis`).toBe(true);
        expect(result.crisisCaseId, `keyword "${keyword}" should map to ${crisisCase.id}`).toBe(
          crisisCase.id,
        );
      }
    }
  });

  it("returns the exact validated message for each case", () => {
    for (const crisisCase of CRISIS_PROTOCOL) {
      const result = detectCrisis(crisisCase.keywords[0]);
      expect(result.isCrisis).toBe(true);
      expect(result.message).toBe(crisisCase.message);
    }
  });

  it("Case 2 (physical danger) beats Case 1 (psychological distress) on overlap", () => {
    const result = detectCrisis("il me frappe et je veux en finir avec la vie");
    expect(result.isCrisis).toBe(true);
    expect(result.crisisCaseId).toBe("physical-danger");
  });

  it("short-circuits the general matcher on a crisis keyword", async () => {
    // "porter plainte" is a QA keyword (entry 4.5); the crisis protocol must win.
    const entryPlainte = QA_DATABASE.find((entry) => entry.id === "4.5");
    expect(entryPlainte).toBeDefined();
    const psychologicalDistress = CRISIS_PROTOCOL.find(
      (crisisCase) => crisisCase.id === "psychological-distress",
    );
    expect(psychologicalDistress).toBeDefined();

    const response = await POST(
      new Request("http://localhost/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: "je veux mourir et porter plainte" }),
      }),
    );
    const body = (await response.json()) as { text: string; isCrisis: boolean };
    expect(body.isCrisis).toBe(true);
    expect(body.text).not.toBe(entryPlainte!.answer);
    expect(body.text).toBe(psychologicalDistress!.message);
  });

  it("is case- and accent-insensitive", () => {
    const upper = detectCrisis("JE VEUX MOURIR À CAUSE DE CETTE SITUATION");
    expect(upper.crisisCaseId).toBe("psychological-distress");
    const accented = detectCrisis("je ne suis pas en sécurité");
    expect(accented.crisisCaseId).toBe("physical-danger");
  });

  it("returns no crisis for an ordinary message", () => {
    const result = detectCrisis("Comment porter plainte pour harcèlement ?");
    expect(result.isCrisis).toBe(false);
    expect(result.crisisCaseId).toBeUndefined();
  });
});
