import type { IntakeInput, PlannerOutput } from "./types";
import { buildRealitySummary } from "./plannerGapAnalysis";

export function buildMockPlanner(input: IntakeInput): PlannerOutput {
  const injury = (input.injuryHistory || "").toLowerCase();
  const hasCalfRisk = ["calf", "achilles", "hamstring", "lower back"].some((x) => injury.includes(x));
  const isLowTime = Number(input.hoursPerWeek || 0) <= 5;
  const isRunning = input.sport === "Running";
  const isHyroxOrHybrid = input.sport === "HYROX" || input.sport === "Hybrid";
  const isReturnFromInjury = input.goal === "Return from injury";

  let headline = "From Guesswork to Structure: Build Sharper Performance in 12 Weeks";
  let drivers = [
    "Primary limiter suggests current adaptation is constrained by inconsistent training distribution.",
    "Load management and session intent need tighter control to improve quality repeatability.",
    "Progress will come from consistent high-value work matched to your available weekly hours.",
  ];
  let bigRocks = [
    "Prioritize the key limiter first and keep week-to-week progression controlled.",
    "Protect aerobic support and recovery quality before adding extra intensity.",
    "Use strength or durability exposures to improve resilience and repeatability.",
    "Reduce low-return moderate load and focus on high-value sessions with clear intent.",
  ];
  let weeklyStructure: PlannerOutput["weeklyStructure"] = [
    { day: "Mon", focus: "Aerobic support + mobility" },
    { day: "Tue", focus: "Primary quality session" },
    { day: "Wed", focus: "Strength + recovery support" },
    { day: "Thu", focus: "Aerobic volume or technical work" },
    { day: "Fri", focus: "Secondary quality or strength exposure" },
    { day: "Sat", focus: "Longer sport-specific session" },
    { day: "Sun", focus: "Recovery or off" },
  ];
  let riskFlags = [
    "Rapid progression without clear recovery structure can stall adaptation.",
    "Inconsistent easy-intensity control can increase fatigue carryover.",
    "Unclear session intent may reduce return from limited training time.",
  ];
  let metrics = ["Session completion rate", "Easy-intensity quality", "Threshold response", "Durability trend", "Recovery readiness"];

  if (isRunning && input.goal === "Improve 5k / 10k" && input.weakness === "Aerobic base") {
    headline = "Build the Engine First: Convert Aerobic Consistency into Faster 5k Output";
    drivers = [
      "Inconsistent weekly density is likely suppressing aerobic progression and threshold stability.",
      "Current profile suggests too much drift into moderate intensity without enough easy-volume support.",
      "5k performance upside is tied to better aerobic durability before extra top-end work.",
    ];
    weeklyStructure = [
      { day: "Mon", focus: "Easy aerobic + mobility reset" },
      { day: "Tue", focus: "Threshold intervals (controlled)" },
      { day: "Wed", focus: "Easy run + short strength" },
      { day: "Thu", focus: "Aerobic volume / steady easy" },
      { day: "Fri", focus: "Strides + durability strength" },
      { day: "Sat", focus: "Long run progression" },
      { day: "Sun", focus: "Recovery / off" },
    ];
    metrics = ["Easy pace at fixed HR", "Threshold pace", "Long-run decoupling", "Weekly run frequency", "Session completion rate"];
    riskFlags = [
      "Jumping quality load before base stability may stall 5k progress.",
      "Too much moderate running can blunt aerobic development.",
      "Inconsistent long-run exposure can limit late-race resilience.",
    ];
  }

  if (isHyroxOrHybrid && Number(input.hoursPerWeek || 0) >= 10) {
    headline = "Race-Ready in 10 Weeks: Improve Compromised Running Under Station Fatigue";
    drivers = [
      "Limiter profile indicates station fatigue is degrading run mechanics between efforts.",
      "High training availability allows a sharper split between aerobic support and race-specific compromise.",
      "Performance ceiling now depends on repeatable transitions, not just standalone fitness.",
    ];
    bigRocks = [
      "Build compromised running quality after stations without sacrificing movement economy.",
      "Distribute high-intensity stress to avoid stacking glycolytic sessions back-to-back.",
      "Use strength-endurance exposures specific to HYROX station demands.",
      "Keep one high-volume aerobic day to protect repeatability across race segments.",
    ];
    weeklyStructure = [
      { day: "Mon", focus: "Aerobic volume + mobility" },
      { day: "Tue", focus: "HYROX station-to-run quality block" },
      { day: "Wed", focus: "Strength endurance + easy flush" },
      { day: "Thu", focus: "Threshold run progression" },
      { day: "Fri", focus: "Skill/transition session + recovery" },
      { day: "Sat", focus: "Race-specific compromised simulation" },
      { day: "Sun", focus: "Recovery aerobic / off" },
    ];
    riskFlags = [
      "Overloading compromised sessions can degrade mechanics and increase injury risk.",
      "Poor transition control may cause avoidable pace collapse in later race stages.",
      "Insufficient recovery separation between quality days can blunt race readiness.",
    ];
    metrics = ["Compromised run pace", "Station split repeatability", "Transition HR recovery", "Threshold pace durability", "High-quality session completion"];
  }

  if (isReturnFromInjury || hasCalfRisk || isLowTime) {
    headline = "Rebuild Safely: Restore Running Consistency Without Calf Flare-Ups";
    drivers = [
      "Current constraint is tissue tolerance and consistency, not top-end intensity.",
      "Low available time increases the cost of poorly targeted sessions.",
      "Progress depends on controlled load progression and durable strength support.",
    ];
    bigRocks = [
      "Use conservative week-to-week volume progression with clear symptom checkpoints.",
      "Prioritize two durability-focused strength exposures for calf-ankle complex support.",
      "Keep quality work submaximal until symptom-free consistency is established.",
      "Bias high-value sessions and remove low-return training noise.",
    ];
    weeklyStructure = [
      { day: "Mon", focus: "Easy run/walk aerobic + mobility" },
      { day: "Tue", focus: "Durability strength + calf capacity" },
      { day: "Wed", focus: "Controlled aerobic session" },
      { day: "Thu", focus: "Off or low-impact cross-train" },
      { day: "Fri", focus: "Sub-threshold quality (if symptom-free)" },
      { day: "Sat", focus: "Progressive long easy run" },
      { day: "Sun", focus: "Recovery / tissue care" },
    ];
    riskFlags = [
      "Rapid reloading may trigger calf symptom recurrence.",
      "Stacking intensity early can outpace tissue tolerance.",
      "Skipping strength durability work may delay stable return-to-performance.",
    ];
    metrics = ["Calf symptom response", "Weekly load change (%)", "Easy pace at low HR", "Durability strength completion", "Symptom-free session streak"];
  }

  return {
    headline,
    snapshot: {
      sport: input.sport,
      level: input.level,
      goal: input.goal,
      availability: `${input.sessionsPerWeek} sessions / ${input.hoursPerWeek}h`,
      mainLimiter: input.weakness,
    },
    drivers,
    bigRocks,
    weeklyStructure,
    riskFlags,
    metrics,
    cta: {
      title: "Your next step",
      description: "Turn this summary into a sharper 4-week build, race-week strategy, or coach-led progression.",
      buttonLabel: "Build 4-Week Performance Plan",
    },
    gapSummary: buildRealitySummary(input),
  };
}
