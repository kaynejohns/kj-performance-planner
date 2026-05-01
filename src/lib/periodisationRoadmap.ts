import type { IntakeInput } from "./types";

export interface Phase {
  name: string;
  weekStart: number;
  weekEnd: number;
  goal: string;
  focus: string[];
  kpis: string[];
  type: "foundation" | "development" | "specific" | "taper";
}

export interface PeriodisationRoadmap {
  totalWeeks: number;
  totalBlocks: number;
  summary: string;
  phases: Phase[];
}

export function buildPeriodisationRoadmap(
  intake: IntakeInput,
  classification: string,
  timelineEstimate: string,
): PeriodisationRoadmap | null {
  const isLongTerm = ["major jump", "long-term", "multi-phase", "multi-year", "major", "transformation"].some(
    (k) => classification.toLowerCase().includes(k) || timelineEstimate.toLowerCase().includes(k),
  );

  if (!isLongTerm) return null;

  const isHyrox = intake.sport === "HYROX" || intake.sport === "Hybrid";
  const isMarathon = intake.eventType === "Marathon" || intake.eventType === "Half Marathon";

  // Estimate total weeks from timelineEstimate string
  // e.g. "22-36+ weeks" → extract max number
  const weekMatches = timelineEstimate.match(/\d+/g);
  const estimatedWeeks = weekMatches ? Math.max(...weekMatches.map(Number)) : 32;
  const totalWeeks = Math.min(Math.max(estimatedWeeks, 20), 52);

  if (isHyrox) {
    return {
      totalWeeks,
      totalBlocks: Math.ceil(totalWeeks / 8),
      summary:
        "HYROX performance requires building aerobic capacity and strength endurance in sequence before combining them into race-specific work. Rushing either phase produces athletes who are fit but not race-ready.",
      phases: [
        {
          name: "Phase 1 — Aerobic base + movement quality",
          weekStart: 1,
          weekEnd: 8,
          goal: "Build the aerobic engine and establish strength movement patterns before loading either intensively.",
          focus: ["Zone 2 aerobic work", "Fundamental strength patterns", "Running economy", "Low race-specific work"],
          kpis: ["Easy run pace improves", "Strength session quality", "Recovery between sessions"],
          type: "foundation",
        },
        {
          name: "Phase 2 — Strength endurance development",
          weekStart: 9,
          weekEnd: Math.round(totalWeeks * 0.5),
          goal: "Increase load capacity in both domains. This is where the hybrid athlete is built.",
          focus: ["Higher strength loads", "Threshold aerobic work", "Compromised running", "Station efficiency"],
          kpis: ["Strength numbers", "Running pace under fatigue", "HR recovery between stations"],
          type: "development",
        },
        {
          name: "Phase 3 — Race-specific integration",
          weekStart: Math.round(totalWeeks * 0.5) + 1,
          weekEnd: totalWeeks - 4,
          goal: "Combine strength and aerobic work into race-format training. Station-to-run transitions, sustained race pace.",
          focus: ["Full HYROX simulations", "Race-pace running after stations", "Pacing strategy", "Competition prep"],
          kpis: ["Simulation times", "Sustainable race pace", "Station completion rates"],
          type: "specific",
        },
        {
          name: "Phase 4 — Taper",
          weekStart: totalWeeks - 3,
          weekEnd: totalWeeks,
          goal: "Reduce volume, protect sharpness. The fitness is built — let it consolidate.",
          focus: ["Volume −40%", "Keep intensity", "Race strategy", "Recovery priority"],
          kpis: ["Feel sharp on race simulations", "Sleep and nutrition"],
          type: "taper",
        },
      ],
    };
  }

  if (isMarathon) {
    return {
      totalWeeks,
      totalBlocks: Math.ceil(totalWeeks / 8),
      summary:
        "Marathon performance is almost entirely aerobic. The phase structure reflects this: build volume first, add threshold work second, add race-specific long run work third. Reversing this order is the most common marathon training mistake.",
      phases: [
        {
          name: "Phase 1 — Volume foundation",
          weekStart: 1,
          weekEnd: 10,
          goal: "Establish consistent weekly volume and long run progression. No intensity until the base is genuine.",
          focus: ["Easy aerobic volume", "Long run to 25–28km", "Strength foundation", "Fuelling practice"],
          kpis: ["Weekly km 40→60", "Long run progression", "Easy pace improvement"],
          type: "foundation",
        },
        {
          name: "Phase 2 — Threshold + marathon pace",
          weekStart: 11,
          weekEnd: Math.round(totalWeeks * 0.6),
          goal: "Introduce structured quality on top of the aerobic base. Marathon-pace work begins.",
          focus: ["Threshold intervals", "Marathon-pace long run segments", "Volume maintained", "Strength continues"],
          kpis: ["Threshold pace improves", "Marathon pace feels controlled", "HRV stable"],
          type: "development",
        },
        {
          name: "Phase 3 — Race-specific long runs",
          weekStart: Math.round(totalWeeks * 0.6) + 1,
          weekEnd: totalWeeks - 4,
          goal: "Peak long runs with race-pace segments. The body learns to run fast when tired.",
          focus: ["Long runs 28–32km", "Race-pace final segments", "Fuelling rehearsal", "Volume peaks"],
          kpis: ["Long run completion quality", "Race-pace sustainability", "Fuelling tolerance"],
          type: "specific",
        },
        {
          name: "Phase 4 — Taper",
          weekStart: totalWeeks - 3,
          weekEnd: totalWeeks,
          goal: "3-week taper. Volume drops significantly, intensity maintained. Trust the training.",
          focus: ["Volume −40–50%", "Keep race-pace work", "Sleep priority", "Carb loading prep"],
          kpis: ["Legs feel fresh", "Race-pace feels easy"],
          type: "taper",
        },
      ],
    };
  }

  // Default running (5k/10k)
  return {
    totalWeeks,
    totalBlocks: Math.ceil(totalWeeks / 8),
    summary: `A ${Math.round(totalWeeks / 4)}-month progression for a goal of this size requires building in sequence. Each phase creates the conditions for the next one — skipping ahead doesn't save time, it just means hitting a ceiling earlier.`,
    phases: [
      {
        name: "Phase 1 — Aerobic foundation",
        weekStart: 1,
        weekEnd: 8,
        goal: "Build the aerobic engine before adding speed. Without a genuine base, threshold and speed work has a ceiling.",
        focus: ["Easy volume build", "Long run progression", "Strength foundation", "Minimal intensity"],
        kpis: [
          "Easy pace settles",
          "Resting HR drops",
          "Weekly km +" + Math.round((intake.weeklyKm || 30) * 0.3) + "km",
        ],
        type: "foundation",
      },
      {
        name: "Phase 2 — Threshold development",
        weekStart: 9,
        weekEnd: Math.round(totalWeeks * 0.55),
        goal: "Introduce structured threshold work on top of the aerobic base. This is where race fitness is built.",
        focus: ["Threshold runs", "Tempo intervals", "Volume maintained", "Strength continues"],
        kpis: ["Threshold pace improves", "2 quality sessions sustainable", "Recovery between sessions"],
        type: "development",
      },
      {
        name: "Phase 3 — Race-specific sharpening",
        weekStart: Math.round(totalWeeks * 0.55) + 1,
        weekEnd: totalWeeks - 3,
        goal: "Convert fitness into race-ready speed. Shorter, faster work at and above goal pace.",
        focus: ["Race-pace intervals", "Volume −15–20%", "Time trials", "Reduce strength load"],
        kpis: ["5k time trial", "Goal pace sustained", "Legs feel sharp"],
        type: "specific",
      },
      {
        name: "Phase 4 — Peak & race",
        weekStart: totalWeeks - 2,
        weekEnd: totalWeeks,
        goal: "Short taper for 5k/10k. Keep sharpness, reduce volume slightly. Race ready.",
        focus: ["Volume −20–25%", "Keep intensity", "Race prep", "Rest"],
        kpis: ["Feeling fresh", "Confidence in pace"],
        type: "taper",
      },
    ],
  };
}
