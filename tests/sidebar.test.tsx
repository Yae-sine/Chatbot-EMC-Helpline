import { beforeAll, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Sidebar } from "@/components/layout/Sidebar";
import { TOPICS } from "@/lib/suggestions";
import { CRISIS_PROTOCOL } from "@/data/crisis-protocol";
import { t } from "@/lib/i18n";

// jsdom has no matchMedia. Reporting "no match" puts the sidebar in its mobile
// drawer mode, which is the mode with behaviour worth testing.
beforeAll(() => {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }),
  });
});

describe("Sidebar (mobile drawer)", () => {
  it("is a modal dialog while open", () => {
    render(<Sidebar open onClose={() => {}} onSelectPrompt={() => {}} />);

    const dialog = screen.getByRole("dialog", { name: t("fr", "sidebarTitle") });
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(dialog.hasAttribute("inert")).toBe(false);
  });

  it("closes on Escape", () => {
    const onClose = vi.fn();
    render(<Sidebar open onClose={onClose} onSelectPrompt={() => {}} />);

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("is inert while closed, so it stays out of the tab order", () => {
    const { container } = render(
      <Sidebar open={false} onClose={() => {}} onSelectPrompt={() => {}} />,
    );

    const panel = container.querySelector("aside");
    expect(panel).not.toBeNull();
    expect(panel?.hasAttribute("inert")).toBe(true);
  });

  it("moves focus into the panel when it opens", () => {
    render(<Sidebar open onClose={() => {}} onSelectPrompt={() => {}} />);

    const panel = screen.getByRole("dialog");
    expect(panel.contains(document.activeElement)).toBe(true);
  });

  it("hands a topic's validated prompt to the composer untouched", () => {
    const onSelectPrompt = vi.fn();
    render(<Sidebar open onClose={() => {}} onSelectPrompt={onSelectPrompt} />);

    const topic = TOPICS[2];
    fireEvent.click(screen.getByText(t("fr", topic.labelKey)));
    expect(onSelectPrompt).toHaveBeenCalledWith(topic.prompt);
  });

  // The sidebar is the only place the emergency numbers live in the static UI,
  // so these are the regression guards for AGENTS.md §6.
  it("offers the three validated emergency numbers as tel: links", () => {
    render(<Sidebar open onClose={() => {}} onSelectPrompt={() => {}} />);

    const telLinks = screen
      .getAllByRole("link")
      .filter((link) => link.getAttribute("href")?.startsWith("tel:"));
    expect(telLinks.map((link) => link.getAttribute("href"))).toEqual([
      "tel:19",
      "tel:177",
      "tel:2511",
    ]);
    expect(telLinks.map((link) => link.textContent)).toEqual(["19", "177", "2511"]);
  });

  it("names the service behind each number for screen readers", () => {
    render(<Sidebar open onClose={() => {}} onSelectPrompt={() => {}} />);

    expect(screen.getByLabelText("Appeler la Police au 19")).not.toBeNull();
    expect(screen.getByLabelText("Appeler la Gendarmerie Royale au 177")).not.toBeNull();
    expect(screen.getByLabelText("Appeler le numéro vert ONDE au 2511")).not.toBeNull();
  });

  it("surfaces exactly the numbers the crisis protocol points people to", () => {
    render(<Sidebar open onClose={() => {}} onSelectPrompt={() => {}} />);

    const shown = screen
      .getAllByRole("link")
      .filter((link) => link.getAttribute("href")?.startsWith("tel:"))
      .map((link) => link.textContent ?? "");
    const crisisCopy = CRISIS_PROTOCOL.map((entry) => entry.message).join(" ");
    for (const number of shown) {
      expect(crisisCopy.includes(number)).toBe(true);
    }
  });
});
