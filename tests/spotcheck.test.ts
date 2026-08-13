import { describe, expect, it } from "vitest";
import { QA_DATABASE } from "@/data/qa-database";
import { matchEntry } from "@/lib/chatbot/matcher";

const cases: Array<[string, string]> = [
  ["C'est quoi le doxing ?", "6.10"],
  ["On me harcèle et je veux que ça cesse, comment porter plainte ?", "4.5"],
  ["Qu'est-ce que le grooming ?", "6.14"],
  ["Le harcèlement en ligne est-il interdit par la loi ?", "4.1"],
  ["Comment signaler des contenus d'abus sexuels sur des enfants ?", "3.3"],
  ["Qui est l'EMC et à quoi ça sert ?", "2.1"],
  ["Comment bloquer et signaler un compte qui me harcèle ?", "7.2"],
  ["Je suis enseignant, un élève est victime de cyberharcèlement", "3.6"],
  ["Quels sont les liens pour signaler ?", "3.7"],
  ["Mon fils est en colère après le harcèlement", "5.6"],
  ["Qu'est-ce que le flaming ?", "6.12"],
  ["Mes photos intimes circulent sans mon accord", "3.4"],
  ["Quelles lois protègent contre la cyberviolence ?", "4.9"],
  ["Comment réagir si j'assiste à une moquerie en ligne ?", "7.7"],
  ["Qu'est-ce que le revenge porn et est-ce puni ?", "6.17"],
  ["Comment choisir un bon mot de passe ?", "7.8"],
  ["C'est quoi le sexting ?", "6.19"],
  ["Qu'est-ce que le chantage à la webcam ?", "6.20"],
  ["Qu'est-ce que les rumeurs et fausses informations en ligne ?", "6.21"],
  ["C'est quoi le piratage de compte ?", "6.22"],
  ["Ils ont créé un groupe Facebook contre mon fils", "6.23"],
  ["Comment éviter l'exposition à des contenus inappropriés ?", "6.24"],
  ["Mon enfant reçoit des propos racistes en ligne", "6.25"],
  ["Comment protéger mon enfant des arnaques en ligne ?", "6.26"],
  ["C'est quoi la plateforme E-Blagh de la DGSN ?", "4.11"],
  ["Où porter plainte à la gendarmerie royale en milieu rural ?", "4.12"],
  ["Quel est le numéro du ministère de la justice ?", "4.13"],
  ["Comment s'adresser aux cellules de prise en charge des femmes et enfants victimes de violence ?", "4.14"],
];

describe("qualitative spot-check", () => {
  it.each(cases)("%s => %s", (query, expectedId) => {
    const result = matchEntry(query, QA_DATABASE);
    expect(result.entry?.id).toBe(expectedId);
  });
});