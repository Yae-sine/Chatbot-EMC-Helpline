// isGrounded checks (PLANLLM Phase 0/1): LLM-produced copy must never invent
// URLs or phone numbers — any such token must occur verbatim in the validated
// context texts.

import { describe, expect, it } from "vitest";
import { isGrounded } from "@/lib/chatbot/validator";

const VALIDATED = [
  "Deux options complémentaires : contacter le numéro vert de l'Observatoire National des Droits de l'Enfant (ONDE), le 2511 (https://2511.ma/), ou solliciter la ligne d'assistance EMC-Helpline via https://www.cyberconfiance.ma/signalment/. L'assistance est disponible 24h/24 et 7j/7.",
  "Le centre d'aide et d'orientation du Ministère de la Justice est disponible au numéro +212537266600.",
  "la Police au 19, ou la Gendarmerie Royale au 177",
];

describe("isGrounded", () => {
  it("passes text without URLs or phone tokens", () => {
    expect(isGrounded("Voici quelques conseils simples.", VALIDATED)).toBe(true);
    expect(isGrounded("", VALIDATED)).toBe(true);
  });

  it("accepts a URL that occurs verbatim in the context", () => {
    expect(isGrounded("Vous pouvez signaler sur https://www.cyberconfiance.ma/signalment/.", VALIDATED)).toBe(true);
    expect(isGrounded("Le site est https://2511.ma/", VALIDATED)).toBe(true);
  });

  it("rejects a URL with trailing punctuation as a different token", () => {
    // "https://2511.ma/." is not the verbatim context token "https://2511.ma/".
    expect(isGrounded("Le site est https://2511.ma/.", VALIDATED)).toBe(false);
  });

  it("rejects a URL that is not in the context", () => {
    expect(isGrounded("Rendez-vous sur https://evil.example.com/now.", VALIDATED)).toBe(false);
    expect(isGrounded("Voir https://2511.ma/zgrep ?", VALIDATED)).toBe(false);
  });

  it("accepts a grouped phone number occurring verbatim", () => {
    expect(isGrounded("Appelez le 2511, il est disponible 24h/24.", VALIDATED)).toBe(true);
    expect(isGrounded("Le centre répond au +212537266600.", VALIDATED)).toBe(true);
  });

  it("rejects a grouped phone number absent from the context", () => {
    expect(isGrounded("Composez le 06 12 34 56 78 pour être aidé.", VALIDATED)).toBe(false);
    expect(isGrounded("Contacter le 05 22 33 44 55.", VALIDATED)).toBe(false);
  });

  it("ignores bare short numbers that are not grouped phone tokens", () => {
    // "2511" alone is not a grouped phone pattern (no separator + group).
    expect(isGrounded("Le numéro vert est le 2511.", VALIDATED)).toBe(true);
  });

  it("ignores phone-like tokens that are part of a grounded URL", () => {
    // The URL token was already verified verbatim; its digits must not
    // double-flag as an ungrounded phone number.
    expect(isGrounded("Voir https://2511.ma/ pour plus d'information.", VALIDATED)).toBe(true);
  });
});