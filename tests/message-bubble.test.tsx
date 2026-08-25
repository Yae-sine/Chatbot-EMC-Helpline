import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { CRISIS_PROTOCOL } from "@/data/crisis-protocol";
import { t } from "@/lib/i18n";
import type { ChatMessage } from "@/types/chat";

function assistant(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: "m1",
    role: "assistant",
    text: "Une réponse ordinaire.",
    timestamp: "14:32",
    ...overrides,
  };
}

describe("MessageBubble", () => {
  it("renders an ordinary answer without the crisis treatment", () => {
    render(<MessageBubble message={assistant()} />);

    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.queryByText(t("fr", "crisisNotice"))).toBeNull();
    expect(screen.getByText("Une réponse ordinaire.")).not.toBeNull();
  });

  it("renders a crisis answer as an alert carrying the crisis label", () => {
    const crisisText = CRISIS_PROTOCOL[0].message;
    render(<MessageBubble message={assistant({ text: crisisText, isCrisis: true })} />);

    const alert = screen.getByRole("alert");
    expect(alert.textContent?.includes(t("fr", "crisisNotice"))).toBe(true);
    // The validated wording must reach the screen untouched.
    expect(alert.textContent?.includes(crisisText)).toBe(true);
    expect(alert.getAttribute("data-crisis")).not.toBeNull();
  });

  it("guides the breathing exercise on the newest exercise turn", () => {
    render(<MessageBubble message={assistant({ exercise: "breathing-4-2-6" })} isLatest />);
    expect(screen.getByRole("group", { name: t("fr", "breathingLabel") })).not.toBeNull();
  });

  it("drops the guide once the exercise turn is superseded", () => {
    // The orb is a live aid, not transcript content: a scrollback of a dozen
    // pulsing circles is the opposite of what the exercise is for.
    render(
      <MessageBubble message={assistant({ exercise: "breathing-4-2-6" })} isLatest={false} />,
    );
    expect(screen.queryByRole("group", { name: t("fr", "breathingLabel") })).toBeNull();
  });

  it("does not guide a turn that merely belongs to the breathing flow", () => {
    // The breathing flow also serves the assurance message and the whole
    // ressources menu, so `flowId` alone kept the animation running long after
    // the exercise was over.
    render(<MessageBubble message={assistant({ flowId: "breathing-4-2-6" })} isLatest />);
    expect(screen.queryByRole("group", { name: t("fr", "breathingLabel") })).toBeNull();
  });

  it("shows the assistant name and time once per group", () => {
    const { unmount } = render(<MessageBubble message={assistant()} isGroupStart />);
    expect(screen.getByText(t("fr", "assistantName"))).not.toBeNull();
    expect(screen.getByText("14:32")).not.toBeNull();
    unmount();

    render(<MessageBubble message={assistant()} isGroupStart={false} />);
    expect(screen.queryByText(t("fr", "assistantName"))).toBeNull();
    expect(screen.queryByText("14:32")).toBeNull();
  });

  it("renders a user message as its own text without an assistant header", () => {
    render(
      <MessageBubble
        message={{ id: "u1", role: "user", text: "je ne dors plus", timestamp: "14:33" }}
      />,
    );

    expect(screen.getByText("je ne dors plus")).not.toBeNull();
    expect(screen.queryByText(t("fr", "assistantName"))).toBeNull();
  });
});
