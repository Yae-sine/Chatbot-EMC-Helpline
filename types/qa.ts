export type Profile =
  | "victime-mineure"
  | "victime-majeure"
  | "parent-tuteur"
  | "enseignant-educateur"
  | "temoin"
  | "professionnel";

export type Parcours =
  | "technique"
  | "juridique"
  | "informatif"
  | "psychologique"
  | "parental";

export type Category =
  | "presentation-emc"
  | "signalement-assistance"
  | "juridique"
  | "psychologique"
  | "informatif"
  | "protection-prevention";

export interface QAEntry {
  id: string;
  category: Category;
  question: string;
  profiles: Profile[];
  parcours: Parcours[];
  sampleFormulations: string[];
  answer: string;
  keywords: string[];
  synonyms: string[];
  tags: string[];
}

export type CrisisCaseId = "psychological-distress" | "physical-danger";

export interface CrisisCase {
  id: CrisisCaseId;
  keywords: string[];
  message: string;
}
