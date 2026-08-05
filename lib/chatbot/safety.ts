import { CRISIS_PROTOCOL } from "@/data/crisis-protocol";
import type { CrisisCaseId } from "@/types/qa";
import { normalize } from "./normalize";

export interface SafetyResult {
  isCrisis: boolean;
  crisisCaseId?: CrisisCaseId;
  message?: string;
}

export function detectCrisis(rawMessage: string): SafetyResult {
  const text = normalize(rawMessage);

  for (const crisisCase of CRISIS_PROTOCOL) {
    for (const keyword of crisisCase.keywords) {
      if (text.includes(normalize(keyword))) {
        return {
          isCrisis: true,
          crisisCaseId: crisisCase.id,
          message: crisisCase.message,
        };
      }
    }
  }

  return { isCrisis: false };
}
