import type { IntakeInput } from "./types";

export interface CoachWarning {
  type: "risk" | "execution" | "reality";
  title: string;
  body: string;
}

/**
 * Section 6 — error / mis-execution triggers (KJ Norwegian Method framework).
 * Each branch below maps a data-derived trigger to a coach warning.
 * Copy follows Section 8: educational, direct, no motivational hype; no banned terms.
 */
export function buildCoachWarnings(intake: IntakeInput): CoachWarning[] {
  const warnings: CoachWarning[] = [];
  const injury = (intake.injuryHistory || "").toLowerCase();
  const hasLowerLimb = ["calf", "achilles", "hamstring", "lower back"].some((x) =>
    injury.includes(x),
  );
  const isHyrox = intake.sport === "HYROX" || intake.sport === "Hybrid";
  const isRunning = intake.sport === "Running";
  const isMarathon = intake.eventType === "Marathon" || intake.eventType === "Half Marathon";

  const quality = intake.qualitySessionsPerWeek || 0;
  const avgMinutesPerSession = (intake.hoursPerWeek / Math.max(intake.sessionsPerWeek, 1)) * 60;

  // §6 — Intensity stacking (quality density vs available hours)
  if (quality >= 3 && intake.hoursPerWeek <= 8) {
    warnings.push({
      type: "risk",
      title: "Intensity stacking risk",
      body: `${quality} quality sessions inside ${intake.hoursPerWeek} training hours per week leaves little room for true low-intensity work. In that layout, several sessions tend to land in the same effort band: hard enough to accumulate fatigue, not structured enough to count as clear high-output work or clear recovery. A more polarised week — fewer quality exposures and the rest strictly conversational — usually improves adaptation efficiency. Consider two quality sessions and protect the remaining days for easy aerobic work.`,
    });
  }

  // §6 — Grey zone / polarisation failure (compressed week + multiple quality → uniform middle effort)
  const greyZoneTrigger =
    quality >= 2 &&
    intake.sessionsPerWeek >= 4 &&
    intake.hoursPerWeek >= 4 &&
    intake.hoursPerWeek <= 10 &&
    avgMinutesPerSession >= 35 &&
    avgMinutesPerSession <= 55;

  if (greyZoneTrigger) {
    warnings.push({
      type: "execution",
      title: "Grey zone: sessions drifting to one middle effort",
      body: `With ${intake.sessionsPerWeek} sessions in about ${intake.hoursPerWeek} hours per week and ${quality} quality sessions flagged, the week is structurally easy to run as one repeated “steady” effort: each outing feels productive, but none are clearly easy (full conversation throughout) and none are clearly maximal. That pattern limits both aerobic base development and top-end adaptation. The fix is intentional separation: some days are only conversational easy; quality days have a defined job (for example LT1-structured work in the Norwegian model) and clear recovery around them.`,
    });
  }

  // §6 — Long run vs weekly volume (structural overload)
  if (intake.weeklyKm && intake.longestRun && intake.longestRun > intake.weeklyKm * 0.38) {
    warnings.push({
      type: "risk",
      title: "Long run is a large share of weekly volume",
      body: `Your longest run (${intake.longestRun} km) is about ${Math.round((intake.longestRun / intake.weeklyKm) * 100)}% of your stated weekly total (${intake.weeklyKm} km). When one run dominates the week, it behaves more like a discrete stress spike than a supported aerobic stimulus, and the days after are often under-recovered for quality work. Building weekly easy volume first, then extending the long easy piece, is usually safer than stretching the long run in isolation.`,
    });
  }

  // §6 — Tissue history + progression
  if (hasLowerLimb) {
    const region = injury.includes("calf")
      ? "calf"
      : injury.includes("achilles")
        ? "Achilles"
        : injury.includes("hamstring")
          ? "hamstring"
          : "lower back";
    warnings.push({
      type: "risk",
      title: "Load progression needs to respect your history",
      body: `With ${region} in your history, textbook week-to-week volume jumps are a population average, not a personal prescription. Smaller increments (roughly 5–7% when increasing load) and treating recurring tightness as a stop signal — not something to train through — reduce the chance of re-flare. Durability work stays in the plan for a reason.`,
    });
  }

  // §6 — Session duration vs frequency (aerobic stimulus)
  if (intake.sessionsPerWeek >= 5 && intake.hoursPerWeek <= 6) {
    warnings.push({
      type: "execution",
      title: "Short frequent sessions limit aerobic development",
      body: `${intake.sessionsPerWeek} sessions in ${intake.hoursPerWeek} hours is roughly ${Math.round(avgMinutesPerSession)} minutes per outing on average. Continuous easy aerobic work needs enough time on task for cardiovascular adaptation; very short slots often turn into the same middle effort repeated. Merging into fewer, slightly longer easy days (keeping weekly hours similar) usually improves the signal you get from easy work.`,
    });
  }

  // §6 — Timeline vs benchmark gap
  if (intake.timelineWeeks && intake.timelineWeeks <= 8 && intake.currentBenchmark && intake.goalBenchmark) {
    warnings.push({
      type: "reality",
      title: "Short timeline vs benchmark change",
      body: "Large benchmark shifts usually need more weeks of consistent aerobic progression than a single 8-week window. In eight weeks you can organise training, stabilise execution, and sharpen what you already have; building new capacity often shows in the following block. Framing the goal that way keeps expectations aligned with physiology.",
    });
  }

  // §6 — Running: LT1 execution (talk test, not pace)
  if (isRunning) {
    warnings.push({
      type: "execution",
      title: "LT1 work: rhythm and talk test, not a time trial",
      body: "Structured quality at LT1 (first lactate turnpoint) should feel controlled and repeatable: breathing allows short phrases but not a full relaxed conversation, and you could repeat the same work next week. If speech disappears completely, the stimulus has usually drifted toward a harder domain than LT1 and recovery cost rises without a matching training benefit. Consistency at the correct sensation beats occasional overshoots.",
    });
  }

  // §6 — Marathon long run intent
  if (isMarathon) {
    warnings.push({
      type: "execution",
      title: "Long runs: easy aerobic structure, not a dress rehearsal",
      body: "The long easy piece is for time on feet and aerobic support. If you finish wishing you had held a full conversation the whole way, you are closer to the intent. Treating it as a fitness test — chasing effort or comparing segments day to day — usually steals recovery from the rest of the week. Save race-specific sharpness for the small high-intensity slice of the plan.",
    });
  }

  // §6 — HYROX: pacing behaviour and sequencing
  if (isHyrox) {
    warnings.push({
      type: "execution",
      title: "HYROX: race-day output often exceeds training rhythm early",
      body: "In training you learn a running rhythm after stations that still allows controlled breathing between efforts. Competition adds arousal; the first half often feels easier than sustainable. Practise a running rhythm after stations that feels almost conservative in training — that is the behaviour that scales. Early overspeed after work intervals is the common error.",
    });

    warnings.push({
      type: "execution",
      title: "Strength timing relative to key runs",
      body: "Heavy lower-body strength close to important running sessions reduces movement quality and increases overload risk. Place the hardest strength work away from key running days; if separation is only one day, reduce strength volume or intensity so the run retains technical quality.",
    });
  }

  // §6 — Fatigue resistance pattern
  if (intake.weakness === "Fatigue resistance") {
    warnings.push({
      type: "execution",
      title: "Fatigue resistance often reflects intensity distribution",
      body: "When every session feels ‘somewhere in the middle’, fatigue stacks without a clear polarised stimulus. Easy days should pass a full talk test for the bulk of the work; hard days should have a clear, bounded job. Redistributing effort that way often resolves the feeling of being tired without getting faster.",
    });
  }

  // §6 — Aerobic base patience
  if (intake.weakness === "Aerobic base") {
    warnings.push({
      type: "execution",
      title: "Aerobic base is built at sensations that feel ‘too easy’",
      body: "Low-intensity aerobic adaptation needs weeks of consistent easy work. The common error is creeping effort on easy days because they do not feel like training. If easy days drift toward the same breathing pattern as quality days, the base week stops doing its job. Protect easy days with a strict talk test for most of the duration.",
    });
  }

  return warnings;
}

export function buildWeekSpecificWarnings(weekNum: number, intake: IntakeInput): string {
  const isHyrox = intake.sport === "HYROX" || intake.sport === "Hybrid";

  const warnings: Record<number, string> = {
    1: "Week 1 often feels easier than expected — your fitness is there from previous training. Do not add sessions or extend runs because it feels good. The adaptation happens when you recover, not when you train. A controlled W1 sets up W2 and W3; an overcooked W1 means you'll be managing fatigue for the rest of the block.",
    2: "Any volume increase in W2 should come from easy running, not from adding quality. Adding km to threshold sessions or intervals is the most common W2 mistake — it compounds fatigue without proportional fitness gain. If you add to your long run this week, reduce easy volume elsewhere to keep the total in range.",
    3: "W3 is peak load — this is the week athletes most commonly overtrain. The goal is to reach W3 peak targets without heroics. If you're feeling good midweek, that is not a signal to add a session. It's a signal that the block is working. Trust the structure.",
    4: isHyrox
      ? "Deload week for HYROX athletes means cutting aerobic volume to ~70% and removing station density work. Keep one short quality run to maintain feel. The most common mistake is treating deload as optional — athletes who skip it consistently underperform in their next block because they never fully absorb the W1-3 stimulus."
      : "Deload is not a rest week — it's a recovery week with structured movement. Cutting to ~70% volume while keeping session frequency is the goal. The most common mistake is doing too much because you feel fresh. Feeling fresh in W4 means the deload is working. Do not add sessions.",
  };

  return warnings[weekNum] || "";
}
