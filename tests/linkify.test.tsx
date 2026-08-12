import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { QA_DATABASE } from "@/data/qa-database";
import { linkify, URL_PATTERN } from "@/lib/chatbot/linkify";
import { LinkifiedText } from "@/components/chat/LinkifiedText";

describe("linkify (URL segmentation)", () => {
  it("returns a single text segment when there is no URL", () => {
    expect(linkify("Bonjour, comment allez-vous ?")).toEqual([
      { type: "text", value: "Bonjour, comment allez-vous ?" },
    ]);
  });

  it("splits text around a single URL", () => {
    const segments = linkify("Signalez ici : https://evigilance.ma/fr/signaler rapidement.");
    expect(segments.map((s) => s.type)).toEqual(["text", "url", "text"]);
    expect(segments.find((s) => s.type === "url")).toEqual({
      type: "url",
      value: "https://evigilance.ma/fr/signaler",
    });
  });

  it("strips trailing punctuation from the URL", () => {
    expect(linkify("https://2511.ma/.")[0]).toEqual({ type: "url", value: "https://2511.ma/" });
    expect(linkify("https://plaintes.pmp.ma/),")[0]).toEqual({
      type: "url",
      value: "https://plaintes.pmp.ma/",
    });
  });

  it("preserves query strings", () => {
    const segments = linkify("(https://stopncii.org/?lang=fr-fr)");
    expect(segments.find((s) => s.type === "url")).toEqual({
      type: "url",
      value: "https://stopncii.org/?lang=fr-fr",
    });
    expect(segments.map((s) => s.value).join("")).toBe("(https://stopncii.org/?lang=fr-fr)");
  });

  it("handles multiple URLs in one message", () => {
    const segments = linkify("Voir https://a.ma/ et https://b.ma/.");
    expect(segments.filter((s) => s.type === "url")).toEqual([
      { type: "url", value: "https://a.ma/" },
      { type: "url", value: "https://b.ma/" },
    ]);
  });

  it("reconstructs every QA_DATABASE answer losslessly and linkifies each URL exactly once", () => {
    for (const entry of QA_DATABASE) {
      const segments = linkify(entry.answer);
      expect(segments.map((s) => s.value).join(""), `answer ${entry.id}`).toBe(entry.answer);

      const rawMatches = Array.from(entry.answer.matchAll(URL_PATTERN)).length;
      const urlSegments = segments.flatMap((s) => (s.type === "url" ? [s] : []));
      expect(urlSegments.length, `answer ${entry.id}`).toBe(rawMatches);

      for (const url of urlSegments) {
        expect(url.value, `answer ${entry.id}`).toMatch(/^https?:\/\//);
        expect(url.value).not.toMatch(/[.,;:!?)\]}]+$/);
      }
    }
  });
});

describe("LinkifiedText rendering", () => {
  const sampleUrl = "https://www.cyberconfiance.ma/signalment/";

  it("renders a URL as an anchor opening in a new tab", () => {
    render(<LinkifiedText text={`Contactez ${sampleUrl}.`} />);
    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toBe(sampleUrl);
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
  });

  it("renders plain text without any link", () => {
    render(<LinkifiedText text="Je vais bien." />);
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.getByText("Je vais bien.")).not.toBeNull();
  });
});