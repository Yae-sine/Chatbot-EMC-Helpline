import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { QuickReplies } from "@/components/chat/QuickReplies";
import { RESOURCE_OPTIONS } from "@/lib/chatbot/flows/resources";

describe("QuickReplies", () => {
  it("renders one button per option", () => {
    render(<QuickReplies options={["Oui", "Non"]} onSelect={() => {}} />);

    expect(screen.getAllByRole("button").map((b) => b.textContent)).toEqual(["Oui", "Non"]);
  });

  it("sends the option label unmodified on click", () => {
    const onSelect = vi.fn();
    render(<QuickReplies options={RESOURCE_OPTIONS} onSelect={onSelect} />);

    // Flow steps match on the exact label, so any trimming here would silently
    // break the resources menu.
    fireEvent.click(screen.getByText("La ligne d'assistance EMC-Helpline"));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(onSelect).toHaveBeenCalledWith("La ligne d'assistance EMC-Helpline");
  });

  it("renders the hint only when one is given", () => {
    const { unmount } = render(<QuickReplies options={["Oui"]} onSelect={() => {}} />);
    expect(screen.queryByText("Choisissez")).toBeNull();
    unmount();

    render(<QuickReplies options={["Oui"]} onSelect={() => {}} hint="Un indice" />);
    expect(screen.getByText("Un indice")).not.toBeNull();
  });

  it("groups the pills in a labelled list", () => {
    render(<QuickReplies options={["Oui", "Non"]} onSelect={() => {}} />);

    const list = screen.getByRole("list", { name: "Réponses suggérées" });
    expect(list.querySelectorAll("li").length).toBe(2);
  });
});
