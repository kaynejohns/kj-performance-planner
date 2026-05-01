import type { IntakeInput } from "./types";

export interface BeginnerProfile {
  isBeginnerPath: boolean;
  reason: string;
  foundationWeeks: number;
  simplifiedGoal: string;
}

export function detectBeginnerPath(intake: IntakeInput): BeginnerProfile {
  const level = intake.level;
  const sessionsPerWeek = intake.sessionsPerWeek || 0;
  const hoursPerWeek = intake.hoursPerWeek || 0;
  const weeklyKm = intake.weeklyKm || 0;
  const currentBenchmark = intake.currentBenchmark || "";
  const goalBenchmark = intake.goalBenchmark || "";
  const hasNoPB =
    !currentBenchmark ||
    currentBenchmark.toLowerCase().includes("no") ||
    currentBenchmark.trim() === "";
  const injuryHistory = (intake.injuryHistory || "").toLowerCase();

  let beginnerScore = 0;
  const reasons: string[] = [];

  if (level === "Beginner") {
    beginnerScore += 3;
    reasons.push("self-identified as beginner");
  }
  if (level === "Recreational") {
    beginnerScore += 2;
    reasons.push("recreational training level");
  }

  if (hasNoPB) {
    beginnerScore += 3;
    reasons.push("no current race benchmark");
  }

  if (weeklyKm > 0 && weeklyKm < 15) {
    beginnerScore += 2;
    reasons.push("very low current weekly volume");
  }
  if (weeklyKm === 0 && intake.sport === "Running") {
    beginnerScore += 3;
    reasons.push("no reported weekly running volume");
  }

  if (sessionsPerWeek <= 2) {
    beginnerScore += 2;
    reasons.push("training 2 or fewer sessions per week");
  }
  if (hoursPerWeek <= 3) {
    beginnerScore += 1;
    reasons.push("under 3 hours training per week");
  }

  if (
    hasNoPB &&
    goalBenchmark &&
    intake.timelineWeeks &&
    intake.timelineWeeks < 12
  ) {
    beginnerScore += 2;
    reasons.push("ambitious goal with no current baseline");
  }

  const hasLowerLimb = ["calf", "achilles", "hamstring", "knee", "plantar"].some((x) =>
    injuryHistory.includes(x),
  );
  if (hasLowerLimb && weeklyKm < 20) {
    beginnerScore += 2;
    reasons.push("injury history with low training base");
  }

  if (intake.sport === "HYROX" && weeklyKm < 15 && sessionsPerWeek <= 2) {
    beginnerScore += 3;
    reasons.push("HYROX goal with insufficient aerobic and strength base");
  }

  const isBeginnerPath = beginnerScore >= 4;

  const foundationWeeks =
    beginnerScore >= 8 ? 12 : beginnerScore >= 6 ? 8 : 6;

  const simplifiedGoal = buildSimplifiedGoal(intake, foundationWeeks);

  return {
    isBeginnerPath,
    reason: reasons.slice(0, 2).join(" and "),
    foundationWeeks,
    simplifiedGoal,
  };
}

function buildSimplifiedGoal(intake: IntakeInput, foundationWeeks: number): string {
  const isHyrox = intake.sport === "HYROX" || intake.sport === "Hybrid";
  const isMarathon =
    intake.eventType === "Marathon" || intake.eventType === "Half Marathon";
  const sessions = Math.min(intake.sessionsPerWeek || 3, 4);

  if (isHyrox) {
    return (
      `Train ${sessions} times per week for ${foundationWeeks} weeks — ` +
      `2 aerobic sessions and ${sessions - 2} strength sessions. ` +
      `Every session completed. That is the entire goal.`
    );
  }
  if (isMarathon) {
    return (
      `Run ${sessions} times per week for ${foundationWeeks} weeks at ` +
      `fully conversational pace. Build your long run to 14–16km. ` +
      `Consistency is the only metric that matters right now.`
    );
  }
  return (
    `Run ${sessions} times per week for ${foundationWeeks} weeks. ` +
    `Every run at fully conversational pace — if you cannot speak in ` +
    `full sentences, slow down. Show up consistently. That is the goal.`
  );
}
