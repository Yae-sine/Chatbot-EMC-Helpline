"use client";

import { useEffect, useState } from "react";
import { t } from "@/lib/i18n";

const PHASES = [
  { key: "inhale", labelKey: "breathingInhale", seconds: 4, scale: "scale-[1.25]" },
  { key: "hold", labelKey: "breathingHold", seconds: 2, scale: "scale-[1.25]" },
  { key: "exhale", labelKey: "breathingExhale", seconds: 6, scale: "scale-100" },
] as const;

// Animated companion to the breathing-4-2-6 flow: a circle that expands
// (4s), holds (2s) and contracts (6s), with a matching label.
export function BreathingPulse() {
  const [phaseIndex, setPhaseIndex] = useState(0);

  useEffect(() => {
    const phase = PHASES[phaseIndex];
    const timer = setTimeout(() => setPhaseIndex((phaseIndex + 1) % PHASES.length), phase.seconds * 1000);
    return () => clearTimeout(timer);
  }, [phaseIndex]);

  const phase = PHASES[phaseIndex];

  return (
    <div className="flex flex-col items-center gap-2 py-2" role="presentation">
      <div className="flex size-24 items-center justify-center">
        <div
          className={`size-16 rounded-full bg-primary/15 transition-transform ease-in-out ${phase.scale}`}
          style={{ transitionDuration: `${phase.seconds * 1000}ms` }}
        />
      </div>
      <p className="text-xs font-medium text-muted-foreground">
        {t("fr", phase.labelKey)}
      </p>
    </div>
  );
}