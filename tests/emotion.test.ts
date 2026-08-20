// Emotional-state detection (deterministic tier). The gate must fire on a
// victim describing how they feel, and stay silent on a question, on a
// third-person description, and on anything the crisis protocol owns.

import { describe, expect, it } from "vitest";
import {
  EMOTION_SUPPORT_OPTION,
  hasEmotionalSignal,
  hasThirdPersonSubject,
  isEmotionalStatement,
  looksFactual,
} from "@/lib/chatbot/emotion";
import { detectIntent } from "@/lib/chatbot/intents";
import { detectCrisis } from "@/lib/chatbot/safety";

describe("isEmotionalStatement", () => {
  it("fires on the reference formulation", () => {
    expect(
      isEmotionalStatement(
        "Depuis que cela m'arrive, j'ai très peur et je n'arrive plus à penser à autre chose",
      ),
    ).toBe(true);
  });

  it("fires on first-person present-state phrasings", () => {
    const inputs = [
      "je suis terrorisée depuis que ça a commencé",
      "je n'en dors plus",
      "je ne dors plus depuis une semaine",
      "je suis submergée",
      "j'ai honte de ce qui s'est passé",
      "je n'arrive plus à me concentrer",
      "ça me hante",
      "je me sens nulle",
      "je suis à bout",
      "j'angoisse tout le temps",
      "je pleure tous les jours",
    ];
    for (const input of inputs) {
      expect(isEmotionalStatement(input), input).toBe(true);
    }
  });

  it("stays silent on questions and procedure requests", () => {
    const inputs = [
      "Comment porter plainte ?",
      "j'ai peur de porter plainte, comment faire ?",
      "Quelles sont les conséquences psychologiques du cyberharcèlement ?",
      "Comment signaler un contenu ?",
      "j'ai très peur, est-ce que je peux porter plainte",
    ];
    for (const input of inputs) {
      expect(isEmotionalStatement(input), input).toBe(false);
    }
  });

  it("stays silent when the emotion belongs to someone else", () => {
    const inputs = [
      "ma fille a peur d'aller à l'école",
      "mon fils ne dort plus",
      "j'ai peur pour ma fille",
      "mon élève est terrorisé",
    ];
    for (const input of inputs) {
      expect(isEmotionalStatement(input), input).toBe(false);
    }
  });

  it("stays silent on neutral, empty and unrelated messages", () => {
    for (const input of ["", "   ", "bonjour", "c'est quoi le doxing", "merci beaucoup"]) {
      expect(isEmotionalStatement(input), JSON.stringify(input)).toBe(false);
    }
  });
});

describe("the looser signal (used only to attach the support pill)", () => {
  it("still recognises the emotion inside a factual question", () => {
    const mixed = "j'ai peur de porter plainte, comment faire ?";
    expect(hasEmotionalSignal(mixed)).toBe(true);
    expect(looksFactual(mixed)).toBe(true);
    // signal + factual ⇒ answer the question, only offer the pill
    expect(isEmotionalStatement(mixed)).toBe(false);
  });

  it("recognises a parent's own distress about their child", () => {
    const input = "j'ai très peur pour ma fille";
    expect(hasEmotionalSignal(input)).toBe(true);
    expect(hasThirdPersonSubject(input)).toBe(true);
    expect(isEmotionalStatement(input)).toBe(false);
  });

  it("treats an Arabic question mark as a question", () => {
    expect(looksFactual("كيف أشتكي؟")).toBe(true);
  });
});

describe("the support pill", () => {
  it("is the exact text the emotion-weather intent already listens for", () => {
    expect(detectIntent(EMOTION_SUPPORT_OPTION)).toBe("emotion-weather");
  });
});

describe("crisis stays untouched", () => {
  it("crisis phrasings are still crisis, whatever this module thinks", () => {
    for (const input of ["je veux mourir", "j'ai peur pour ma vie", "j'ai très peur pour ma vie"]) {
      expect(detectCrisis(input).isCrisis, input).toBe(true);
    }
  });
});
