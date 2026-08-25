import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MessageText } from "@/components/chat/MessageText";
import { QA_DATABASE } from "@/data/qa-database";

describe("MessageText (paragraph rendering)", () => {
  it("splits a blank-line separated answer into one paragraph per part", () => {
    const { container } = render(<MessageText text={"Premier bloc.\n\nDeuxième bloc."} />);

    const paragraphs = container.querySelectorAll("p");
    expect(paragraphs.length).toBe(2);
    expect(paragraphs[0].textContent).toBe("Premier bloc.");
    expect(paragraphs[1].textContent).toBe("Deuxième bloc.");
  });

  it("collapses runs of more than two newlines into a single break", () => {
    const { container } = render(<MessageText text={"A.\n\n\n\nB."} />);
    expect(container.querySelectorAll("p").length).toBe(2);
  });

  it("keeps a single newline inside its paragraph", () => {
    const { container } = render(<MessageText text={"Ligne un\nLigne deux"} />);

    const paragraphs = container.querySelectorAll("p");
    expect(paragraphs.length).toBe(1);
    expect(paragraphs[0].textContent).toBe("Ligne un\nLigne deux");
  });

  it("renders a single-paragraph answer as one paragraph", () => {
    const { container } = render(<MessageText text="Une seule réponse." />);
    expect(container.querySelectorAll("p").length).toBe(1);
  });

  it("still linkifies URLs inside a paragraph", () => {
    render(<MessageText text={"Voir ceci :\n\nhttps://example.ma/aide pour la suite."} />);

    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toBe("https://example.ma/aide");
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
  });

  it("reproduces every validated answer without losing or adding characters", () => {
    for (const entry of QA_DATABASE) {
      // Two entries joined the way lib/chatbot/flows/psychologique.ts joins them.
      const composed = `${entry.answer}\n\n${entry.answer}`;
      const { container, unmount } = render(<MessageText text={composed} />);

      const rendered = Array.from(container.querySelectorAll("p"))
        .map((p) => p.textContent)
        .join("\n\n");
      expect(rendered).toBe(composed);
      unmount();
    }
  });
});
