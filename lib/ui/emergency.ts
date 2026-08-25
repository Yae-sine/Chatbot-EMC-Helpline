import type { TranslationKey } from "@/lib/i18n";

export interface EmergencyNumber {
  numberKey: TranslationKey;
  callLabelKey: TranslationKey;
}

/**
 * The three validated emergency numbers, already stated verbatim in
 * `sidebarSafetyText`, in the greeting and in the crisis protocol. Listing them
 * here adds no content: it only lets the always-on strip and the sidebar card
 * render the same numbers as one-tap `tel:` links.
 */
export const EMERGENCY_NUMBERS: EmergencyNumber[] = [
  { numberKey: "emergencyPoliceNumber", callLabelKey: "emergencyPoliceCall" },
  { numberKey: "emergencyGendarmerieNumber", callLabelKey: "emergencyGendarmerieCall" },
  { numberKey: "emergencyOndeNumber", callLabelKey: "emergencyOndeCall" },
];
