import type { IntakeInput } from "./types";

export interface PlannerLogicProfile {
  sportProfile: "running_short" | "running_long" | "hyrox" | "general";
  timeProfile: "low" | "moderate" | "high";
  trainingStatus: "low" | "moderate" | "high";
  risk: "low" | "moderate" | "high";
}

export interface PlannerLogicResult {
  profile: PlannerLogicProfile;
  primaryDriver: string;
  secondaryDriver: string;
  strategy: string[];
  weeklyStructure: string[];
  progression: { week: number; theme: string; focus: string }[];
  metrics: string[];
  risks: string[];
}

function normalizeWeakness(weakness: IntakeInput["weakness"]) {
  const map: Record<IntakeInput["weakness"], string> = {
    "Aerobic base": "aerobic",
    "Threshold fitness": "threshold",
    Speed: "speed",
    Strength: "strength",
    "Fatigue resistance": "fatigue",
    "Durability / injury resilience": "durability",
    "Race-specific conditioning": "race_specific",
  };
  return map[weakness] || "aerobic";
}

export function buildPerformancePlan(input: IntakeInput & { trainingStatus?: "low" | "moderate" | "high" }): PlannerLogicResult {
  const profile = classifyAthlete(input);
  const primary = selectPrimaryDriver(input, profile);
  const secondary = selectSecondaryDriver(primary);
  const strategy = buildStrategy(primary);
  const weeklyStructure = buildWeeklyStructure(profile);
  const progression = build4WeekProgression(profile);
  const metrics = selectMetrics(profile);
  const risks = buildRiskFlags(profile, input);

  return {
    profile,
    primaryDriver: primary,
    secondaryDriver: secondary,
    strategy,
    weeklyStructure,
    progression,
    metrics,
    risks,
  };
}

function classifyAthlete(input: IntakeInput & { trainingStatus?: "low" | "moderate" | "high" }): PlannerLogicProfile {
  let sportProfile: PlannerLogicProfile["sportProfile"] = "general";
  const goal = (input.goal || "").toLowerCase();

  if (input.sport === "Running") {
    if (goal.includes("5k") || goal.includes("10k")) sportProfile = "running_short";
    else if (goal.includes("marathon")) sportProfile = "running_long";
  }
  if (input.sport === "HYROX") sportProfile = "hyrox";

  let timeProfile: PlannerLogicProfile["timeProfile"] = "moderate";
  if (input.hoursPerWeek <= 4) timeProfile = "low";
  if (input.hoursPerWeek >= 9) timeProfile = "high";

  let risk: PlannerLogicProfile["risk"] = "low";
  if (input.injuryHistory?.trim()) risk = "moderate";
  if (input.injuryHistory?.trim() && (input.trainingStatus || "moderate") === "low") risk = "high";

  return {
    sportProfile,
    timeProfile,
    trainingStatus: input.trainingStatus || "moderate",
    risk,
  };
}

function selectPrimaryDriver(input: IntakeInput, profile: PlannerLogicProfile) {
  if (input.injuryHistory?.trim()) return "durability";
  const weakness = normalizeWeakness(input.weakness);
  if (weakness === "aerobic") return "aerobic_base";
  if (weakness === "threshold") return "threshold";
  if (weakness === "fatigue") return "fatigue_resistance";
  if (weakness === "strength") return "strength";
  if (profile.sportProfile === "hyrox") return "hybrid_performance";
  return "aerobic_base";
}

function selectSecondaryDriver(primary: string) {
  const map: Record<string, string> = {
    aerobic_base: "threshold",
    threshold: "fatigue_resistance",
    strength: "economy",
    hybrid_performance: "fatigue_resistance",
    durability: "load_management",
  };
  return map[primary] || "fatigue_resistance";
}

function buildStrategy(primary: string) {
  const strategies: Record<string, string[]> = {
    aerobic_base: [
      "Increase total aerobic exposure",
      "Reduce unnecessary intensity",
      "Introduce controlled threshold work",
    ],
    threshold: [
      "Increase time at LT2",
      "Improve repeatability of efforts",
      "Support with aerobic volume",
    ],
    fatigue_resistance: [
      "Improve repeatability under load",
      "Distribute intensity better",
      "Build session durability",
    ],
    strength: [
      "Increase force production",
      "Add structured strength sessions",
      "Improve economy under fatigue",
    ],
    hybrid_performance: [
      "Build aerobic support",
      "Develop strength endurance",
      "Improve compromised running tolerance",
    ],
    durability: [
      "Gradual load progression",
      "Restore tissue tolerance",
      "Prioritize consistency",
    ],
  };
  return strategies[primary] || strategies.aerobic_base;
}

function buildWeeklyStructure(profile: PlannerLogicProfile) {
  const { sportProfile, timeProfile } = profile;

  if (sportProfile === "running_short") {
    if (timeProfile === "low") return ["Threshold", "Long run", "2 easy runs"];
    if (timeProfile === "moderate") return ["Threshold", "Speed", "Long run", "2-3 easy runs"];
    return ["2 quality sessions", "Long run", "3-4 easy runs", "Strength"];
  }

  if (sportProfile === "hyrox") {
    if (timeProfile === "moderate") {
      return ["Threshold", "Strength endurance", "Compromised run", "Aerobic base", "Strength"];
    }
    return ["2 race-specific sessions", "Threshold", "2 strength", "Long aerobic", "Recovery"];
  }

  return ["Balanced training week"];
}

function build4WeekProgression(profile: PlannerLogicProfile) {
  const base = [
    { week: 1, theme: "Establish", focus: "Introduce load and key sessions" },
    { week: 2, theme: "Build", focus: "Increase duration or density" },
    { week: 3, theme: "Peak", focus: "Highest stress and specificity" },
    { week: 4, theme: "Adapt", focus: "Reduce load, consolidate gains" },
  ];

  if (profile.risk === "high") {
    base[2].focus = "Controlled stress, avoid overload";
    base[3].focus = "Extended recovery and adaptation";
  }
  return base;
}

function selectMetrics(profile: PlannerLogicProfile) {
  if (profile.sportProfile.includes("running")) {
    return ["Easy pace at HR", "Threshold pace", "HR drift", "Weekly consistency"];
  }
  if (profile.sportProfile === "hyrox") {
    return ["Compromised run pace", "Station repeatability", "Session density", "Fatigue resistance"];
  }
  return ["Consistency", "Load tolerance"];
}

function buildRiskFlags(profile: PlannerLogicProfile, input: IntakeInput) {
  const flags: string[] = [];
  if (profile.timeProfile === "low") flags.push("Limited time increases importance of session quality.");
  if (profile.risk !== "low") flags.push("Monitor injury risk closely with progressive load changes.");
  if (normalizeWeakness(input.weakness) === "strength") flags.push("Strength deficits may cap performance transfer under fatigue.");
  return flags;
}
