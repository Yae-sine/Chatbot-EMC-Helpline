import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { EmergencyBar } from "@/components/layout/EmergencyBar";
import { CRISIS_PROTOCOL } from "@/data/crisis-protocol";

// The emergency numbers must stay reachable from the static UI at every
// breakpoint (AGENTS.md §6). They used to live only in the sidebar, which is a
// closed drawer below `lg`. This file is the regression guard.
describe("EmergencyBar", () => {
  it("exposes the three validated numbers as tel: links", () => {
    render(<EmergencyBar />);

    const links = screen.getAllByRole("link");
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "tel:19",
      "tel:177",
      "tel:2511",
    ]);
    expect(links.map((link) => link.textContent)).toEqual(["19", "177", "2511"]);
  });

  it("names the service behind each number for screen readers", () => {
    render(<EmergencyBar />);

    expect(screen.getByLabelText("Appeler la Police au 19")).not.toBeNull();
    expect(screen.getByLabelText("Appeler la Gendarmerie Royale au 177")).not.toBeNull();
    expect(screen.getByLabelText("Appeler le numéro vert ONDE au 2511")).not.toBeNull();
  });

  it("surfaces exactly the numbers the crisis protocol points people to", () => {
    render(<EmergencyBar />);

    const shown = screen.getAllByRole("link").map((link) => link.textContent ?? "");
    const crisisCopy = CRISIS_PROTOCOL.map((entry) => entry.message).join(" ");
    for (const number of shown) {
      expect(crisisCopy.includes(number)).toBe(true);
    }
  });
});
