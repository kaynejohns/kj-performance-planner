import type { IntakeInput } from "./types";

export function classifyTrainingStatus(input: IntakeInput) {
  if ((input.sessionsPerWeek || 0) <= 3 || (input.hoursPerWeek || 0) <= 4) return "low";
  if ((input.sessionsPerWeek || 0) >= 7 || (input.hoursPerWeek || 0) >= 10) return "high";
  return "moderate";
}

export function classifyAthleteProfile(input: IntakeInput) {
  return {
    trainingStatus: classifyTrainingStatus(input),
    hasInjuryRisk: Boolean(input.injuryHistory?.trim()),
    runningSpecific: ["5k", "10k", "Half Marathon", "Marathon"].includes(input.eventType),
    hybridSpecific: input.eventType === "HYROX" || input.sport === "HYROX" || input.sport === "Hybrid",
  };
}
