// Session store tests: the MAX_SESSIONS cap must hold whichever field is
// written. setContext runs on every request that carries a sessionId, so a
// client posting fresh random ids must not be able to grow the map.

import { describe, expect, it } from "vitest";
import { emptyContext, noteTurn } from "@/lib/chatbot/context";
import { getContext, getFlowState, setContext, setFlowState } from "@/lib/chatbot/session";

describe("session store capacity", () => {
  it("evicts the oldest sessions when setContext floods the store", () => {
    setContext("flood-first", noteTurn(emptyContext()));
    expect(getContext("flood-first")?.turnCount).toBe(1);

    for (let i = 0; i < 700; i += 1) {
      setContext(`flood-${i}`, noteTurn(emptyContext()));
    }

    // The very first session was pushed out by the cap...
    expect(getContext("flood-first")).toBeNull();
    // ...while recent ones are still served.
    expect(getContext("flood-699")?.turnCount).toBe(1);
  });

  it("updating an existing session does not consume a new slot", () => {
    setContext("stable", emptyContext());
    for (let i = 0; i < 50; i += 1) {
      setContext("stable", { ...emptyContext(), turnCount: i });
    }
    expect(getContext("stable")?.turnCount).toBe(49);
  });

  it("keeps flow and context side by side for the same session", () => {
    setFlowState("paired", { flowId: "breathing-4-2-6", step: "intro", data: {} });
    setContext("paired", noteTurn(emptyContext()));
    expect(getFlowState("paired")?.flowId).toBe("breathing-4-2-6");
    expect(getContext("paired")?.turnCount).toBe(1);
  });
});
