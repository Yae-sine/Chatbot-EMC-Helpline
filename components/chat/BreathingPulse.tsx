"use client";

import { useEffect, useState } from "react";
import { Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { t } from "@/lib/i18n";

const PHASES = [
  { key: "inhale", labelKey: "breathingInhale", seconds: 4, scale: "scale-[1.25]" },
  { key: "hold", labelKey: "breathingHold", seconds: 2, scale: "scale-[1.25]" },
  { key: "exhale", labelKey: "breathingExhale", seconds: 6, scale: "scale-100" },
] as const;

// Animated companion to the breathing-4-2-6 flow: a circle that expands
// (4s), holds (2s) and contracts (6s), with a matching label.
//
// The label sits in a polite live region so the exercise is followable without
// seeing the circle, and it can be paused — an animation someone cannot stop is
// the wrong thing to put in front of a person who is already overwhelmed.
// Under `prefers-reduced-motion` the orb is pinned by `.breathing-orb` in
// globals.css and the label alone carries the rhythm.
export function BreathingPulse() {
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [running, setRunning] = useState(true);

  useEffect(() => {
    if (!running) return;
    const phase = PHASES[phaseIndex];
    const timer = setTimeout(
      () => setPhaseIndex((index) => (index + 1) % PHASES.length),
      phase.seconds * 1000,
    );
    return () => clearTimeout(timer);
  }, [phaseIndex, running]);

  const phase = PHASES[phaseIndex];

  return (
    <div
      role="group"
      aria-label={t("fr", "breathingLabel")}
      className="mt-4 flex flex-col items-center gap-3 rounded-xl border border-border bg-muted/60 px-4 py-5"
    >
      <div className="flex size-24 items-center justify-center" aria-hidden="true">
        <div
          className={`breathing-orb size-16 rounded-full bg-primary/15 ring-1 ring-primary/25 transition-transform ease-in-out ${phase.scale}`}
          style={{ transitionDuration: `${phase.seconds * 1000}ms` }}
        />
      </div>
      <p role="status" className="text-sm font-medium text-muted-foreground">
        {t("fr", phase.labelKey)}
      </p>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setRunning((value) => !value)}
        className="gap-2"
      >
        {running ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
        {t("fr", running ? "breathingPause" : "breathingResume")}
      </Button>
    </div>
  );
}
