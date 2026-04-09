import { buildPerformancePlan, type PlannerLogicResult } from "./plannerLogicEngine";
import { buildRealitySummary } from "./plannerGapAnalysis";
import { buildDetailedPlanPrompt } from "./plannerPromptBuilder";
import { buildQuantitativeBlock } from "./plannerVolumeProgression";
import type { DetailedPlanOutput, IntakeInput } from "./types";

function hasLowerLimbRisk(injuryHistory?: string) {
  const text = (injuryHistory || "").toLowerCase();
  return ["calf", "achilles", "hamstring", "lower back"].some((x) => text.includes(x));
}

function buildFocus(input: IntakeInput, drivers: string[]): [string, string, string] {
  const focus: string[] = [];
  if (input.weakness === "Aerobic base") focus.push("Aerobic volume consistency");
  if (input.weakness === "Threshold fitness") focus.push("Sustainable threshold capacity");
  if (input.weakness === "Fatigue resistance") focus.push("Fatigue management under load");
  if (input.weakness === "Strength") focus.push("Force production and robustness");
  if (input.sport === "HYROX" || input.sport === "Hybrid") focus.push("Compromised running tolerance");
  if (input.goal === "Return from injury") focus.push("Durability and symptom-free progression");
  if (focus.length < 3) {
    focus.push(
      "Load distribution quality",
      drivers[0] ? drivers[0].slice(0, 52) : "Event-specific preparation",
      "Recovery-driven adaptation",
    );
  }
  return [focus[0], focus[1], focus[2]];
}

export function generate4WeekPlanBase(
  input: IntakeInput,
  drivers: string[],
): { basePlan: DetailedPlanOutput; logicPlan: PlannerLogicResult; refinementPrompt: string } {
  const logicPlan = buildPerformancePlan(input);
  const quantitative = buildQuantitativeBlock(input);
  const resolvedProfile =
    logicPlan.profile.risk === "high" || input.goal === "Return from injury"
      ? "returningFromInjury"
      : logicPlan.profile.timeProfile === "low"
        ? "timeCrunched"
        : logicPlan.profile.timeProfile === "high"
          ? "highCapacity"
          : "standard";
  const injuryRisk = hasLowerLimbRisk(input.injuryHistory);
  const isHyrox = input.sport === "HYROX" || input.sport === "Hybrid";
  const isRunning = input.sport === "Running";
  const enduranceRunning =
    isRunning && (input.eventType === "Half Marathon" || input.eventType === "Marathon");
  const focus = buildFocus(input, [...logicPlan.strategy, ...drivers]);

  const week1 = {
    week: 1 as const,
    theme: "Establish controlled exposure",
    objective: resolvedProfile === "returningFromInjury" ? "Rebuild consistent training tolerance" : "Stabilize baseline load and execution quality",
    structure: [
      `Weekly load target: ${quantitative.weeks[1].volumeTarget}`,
      `Quality vs aerobic split: ${quantitative.weeks[1].qualityTarget}; keep easy days truly easy`,
      resolvedProfile === "timeCrunched" ? "Prioritize 2-3 high-value sessions only" : "Anchor aerobic support volume",
      injuryRisk ? "Include tissue prep and durability sequencing early" : "Protect recovery windows between key exposures",
    ],
    keySessions: [
      {
        type: isHyrox ? "Compromised aerobic quality" : enduranceRunning ? "Controlled threshold / cruise" : "Controlled threshold exposure",
        description: isHyrox
          ? "Station-to-run sequences at submax effort, moderate density"
          : enduranceRunning
            ? "25–40 min threshold-type work in one session (continuous or 6–12 min reps) at sustainable rhythm"
            : "18–30 min LT2-style work in 1 session (reps or steady), finish with reserve",
        purpose: "Set quality benchmark without excess fatigue cost",
      },
      {
        type: "Strength / durability",
        description: injuryRisk ? "Calf-ankle-hip durability emphasis, moderate volume" : "General force + trunk stability exposure",
        purpose: "Build robustness for upcoming progression",
      },
    ],
    progressionNote: "Do not chase intensity in week 1; establish repeatability first.",
    ...quantitative.weeks[1],
  };

  const week2 = {
    week: 2 as const,
    theme: "Extend capacity",
    objective: "Increase total productive load while preserving session quality",
    structure: [
      `Progress weekly load toward: ${quantitative.weeks[2].volumeTarget}`,
      `Long / continuous exposure: ${quantitative.weeks[2].longRunTarget}`,
      isHyrox ? "Add one additional compromised run demand" : "Extend threshold continuity window",
      "Keep recovery support unchanged to preserve adaptation quality",
    ],
    keySessions: [
      {
        type: isHyrox ? "Station density progression" : enduranceRunning ? "Threshold + long-run spine" : "Threshold progression",
        description: isHyrox
          ? "Shorter recoveries between station clusters and runs"
          : enduranceRunning
            ? "30–48 min cumulative threshold-type work across the week; one longer easy-steady run (see weekly long-run band)"
            : "22–38 min threshold-style work total; extend rep duration before adding pace",
        purpose: "Raise sustainable output under controlled fatigue",
      },
      {
        type: isRunning ? "Long aerobic progression" : "Aerobic support block",
        description: isRunning
          ? enduranceRunning
            ? "Easy long run in weekly band; last 10–20% can include steady (not race) if legs are fresh"
            : "Extend easy-long duration with stable HR control"
          : "Build repeatability capacity between quality days",
        purpose: "Improve durability and event-specific work tolerance",
      },
    ],
    progressionNote: "Progress duration before progressing intensity.",
    ...quantitative.weeks[2],
  };

  const week3 = {
    week: 3 as const,
    theme: isHyrox ? "Specific stress week" : "Peak productive stress",
    objective: isHyrox ? "Improve quality under race-like compromise" : "Apply highest specific training stress of the block",
    structure: [
      `Peak-week volume band: ${quantitative.weeks[3].volumeTarget}`,
      `Quality density: ${quantitative.weeks[3].qualityTarget}; strength: ${quantitative.weeks[3].strengthTarget}`,
      resolvedProfile === "timeCrunched" ? "Keep total session count stable; increase session intent quality" : "Maintain aerobic support while lifting quality demand",
      injuryRisk ? "Use strict symptom gating for progression decisions" : "Avoid stacking high neural/metabolic stress days",
    ],
    keySessions: [
      {
        type: isHyrox ? "Race-specific simulation" : enduranceRunning ? "Long-run + threshold peak" : "Threshold + economy blend",
        description: isHyrox
          ? "Compromised running with controlled station sequencing"
          : enduranceRunning
            ? "Long run at upper end of band + 35–55 min threshold-type work split across 1–2 sessions"
            : "Threshold block + short economy strides (6–10 × 20–30s)",
        purpose: "Improve performance transfer to goal demands",
      },
      {
        type: "Strength support",
        description: "Maintain lower-volume, high-quality force exposure",
        purpose: "Retain robustness while quality load peaks",
      },
    ],
    progressionNote: "This is the highest stress week; monitor readiness and execution quality daily.",
    ...quantitative.weeks[3],
  };

  const week4 = {
    week: 4 as const,
    theme: "Consolidate and absorb adaptation",
    objective: "Reduce fatigue, retain stimulus, and lock in gains for next block",
    structure: [
      `Deload volume band: ${quantitative.weeks[4].volumeTarget}`,
      `Maintain: ${quantitative.weeks[4].qualityTarget}; ${quantitative.weeks[4].strengthTarget}`,
      isHyrox ? "Retain one compromised quality touchpoint only" : "Retain one threshold touchpoint only",
      injuryRisk ? "Prioritize symptom-free continuity over performance testing" : "Reassess key markers with low fatigue",
    ],
    keySessions: [
      {
        type: "Quality retention session",
        description: isHyrox
          ? "Low-volume station-to-run quality with full control"
          : enduranceRunning
            ? "Short threshold touch 18–28 min total + optional 6–8 strides; long run shortened vs W3"
            : "Reduced-volume threshold maintenance session (~15–25 min quality)",
        purpose: "Preserve adaptations while reducing fatigue",
      },
      {
        type: "Aerobic reset session",
        description: "Easy, steady session with low autonomic cost",
        purpose: "Support recovery and adaptation consolidation",
      },
    ],
    progressionNote: "Week 4 is for adaptation absorption, not load chasing.",
    ...quantitative.weeks[4],
  };

  const basePlan: DetailedPlanOutput = {
    blockOverview: {
      title: isHyrox ? "4-Week Race-Specific Capacity Block" : "4-Week Performance Progression Block",
      goal: input.goal,
      duration: "4 weeks",
      focus,
      startingPoint: quantitative.startingPoint,
      blockTargets: quantitative.blockTargets,
      foundationNote: quantitative.foundationNote,
      phaseLabel: quantitative.phaseLabel,
      progressionContext: quantitative.progressionContext,
    },
    weeklyBreakdown: [week1, week2, week3, week4],
    coachingInsights: [
      "Your progression is limited more by repeatability than peak output.",
      resolvedProfile === "timeCrunched"
        ? "With limited hours, session precision is more valuable than extra volume."
        : "Do not add extra intensity until week-to-week quality remains stable.",
      injuryRisk
        ? "Durability and load progression control are non-negotiable performance drivers."
        : "Performance transfer improves when quality sessions are protected by recovery spacing.",
    ],
    adjustmentRules: [
      "If fatigue accumulates early, remove one quality exposure and retain aerobic support.",
      injuryRisk
        ? "If pain > 3/10 persists for 24-48h, reduce load for 3-5 days and prioritize durability work."
        : "If sessions are consistently easy, extend aerobic duration before increasing intensity.",
    ],
    cta: {
      title: "Next layer",
      description: "Convert this block into a session-level calendar with progression checkpoints and coach review.",
      buttonLabel: "Unlock Full Build",
    },
  };
  const gapSummary = buildRealitySummary(input);
  const longTermGoal =
    gapSummary.classification === "Major jump" || gapSummary.classification === "Long-term transformation";

  if (longTermGoal) {
    basePlan.blockOverview.title = "Phase 1 (4 weeks): Foundation & durability block";
    week1.theme = "Phase 1 — Week 1: rhythm, tolerance, and honest baselines";
    week1.objective = "Lock in repeatable weeks using your current volume band before chasing performance peaks.";
    week2.theme = "Phase 1 — Week 2: durable progression";
    week2.objective = "Small, measurable increases in total load only if recovery markers stay stable.";
    week3.theme = "Phase 1 — Week 3: controlled specificity";
    week3.objective = "Touch race-relevant work without treating this block as goal completion.";
    week4.theme = "Phase 1 — Week 4: absorb and reset";
    week4.objective = "Reduce fatigue, keep one quality thread, and set up the next phase from demonstrated tolerance.";
    week4.progressionNote =
      "End of Phase 1. Re-test baselines (volume, long run, quality execution) before Phase 2 progression.";
  }

  const refinementPrompt = buildDetailedPlanPrompt(input, basePlan, gapSummary);
  return { basePlan, logicPlan, refinementPrompt };
}
