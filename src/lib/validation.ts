import type { IntakeInput, LeadInput } from "./types";

export const sportOptions = ["Running", "HYROX", "Hybrid", "Team Sport", "General Performance"] as const;
export const eventOptions = [
  "5k",
  "10k",
  "Half Marathon",
  "Marathon",
  "HYROX",
  "General endurance",
  "Return from injury",
  "Team sport conditioning",
] as const;
export const levelOptions = ["Beginner", "Recreational", "Intermediate", "Advanced", "Sub-elite", "Elite"] as const;
export const goalOptions = [
  "Improve 5k / 10k",
  "Improve HYROX performance",
  "Build aerobic base",
  "Return from injury",
  "Improve strength",
  "Improve race readiness",
  "Improve durability",
  "General performance",
] as const;
export const weaknessOptions = [
  "Aerobic base",
  "Threshold fitness",
  "Speed",
  "Strength",
  "Fatigue resistance",
  "Durability / injury resilience",
  "Race-specific conditioning",
] as const;
export const equipmentOptions = ["Gym", "Treadmill", "Bike", "Rower", "Track", "No gym"] as const;

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validateLead(lead: LeadInput): string[] {
  const errors: string[] = [];
  const firstName = lead.firstName?.trim() || "";
  if (!firstName) errors.push("First name is required.");
  if (firstName && firstName.length < 2) errors.push("First name must be at least 2 characters.");
  if (!lead.email?.trim() || !isValidEmail(lead.email)) errors.push("Valid email is required.");
  return errors;
}

export function validateIntake(input: IntakeInput): string[] {
  const errors: string[] = [];
  if (!input.sport) errors.push("Sport is required.");
  if (!input.eventType) errors.push("Event type is required.");
  if (!input.level) errors.push("Level is required.");
  // goal is auto-derived from eventType — not required from user input
  // currentBenchmark is optional — form allows blank for first-timers
  if (!input.goalBenchmark?.trim()) errors.push("Goal benchmark is required.");
  if (!input.weakness) errors.push("Main weakness is required.");
  if (!input.sessionsPerWeek || input.sessionsPerWeek < 1) errors.push("Sessions per week must be at least 1.");
  if (input.sessionsPerWeek > 14) errors.push("Sessions per week cannot be greater than 14.");
  if (!input.hoursPerWeek || input.hoursPerWeek < 1) errors.push("Hours per week must be at least 1.");
  if (input.hoursPerWeek > 40) errors.push("Hours per week cannot be greater than 40.");
  if (
    input.equipmentAccess?.includes("No gym") &&
    input.equipmentAccess.some((item) => ["Gym", "Treadmill", "Bike", "Rower", "Track"].includes(item))
  ) {
    errors.push("Select either 'No gym' or specific equipment options, not both.");
  }
  return errors;
}
