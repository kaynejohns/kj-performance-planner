export function buildDeterministicContext(input) {
  const lines = [];
  const injury = (input.injuryHistory || "").toLowerCase();
  const hasLowerLimb = ["calf", "achilles", "hamstring", "lower back"].some((x) => injury.includes(x));

  if (input.weakness === "Aerobic base") lines.push("Prioritize aerobic volume consistency and easy intensity distribution.");
  if (input.weakness === "Strength") lines.push("Include 2 strength exposures weekly to improve force production and economy.");
  if (input.weakness === "Fatigue resistance") lines.push("Control load distribution and avoid intensity stacking.");
  if (hasLowerLimb) lines.push("Include progressive loading and durability language in recommendations and risk flags.");
  if (input.hoursPerWeek <= 5) lines.push("Prioritize efficiency and fewer high-value sessions; reduce junk volume.");
  if (input.level === "Beginner") lines.push("Keep language simple and avoid advanced terminology.");
  if (["Advanced", "Sub-elite", "Elite"].includes(input.level)) lines.push("Use sharper, performance-specific wording.");
  if (input.goal === "Return from injury") lines.push("Prioritize controlled load progression, durability, and strength support.");
  if (input.sport === "HYROX") lines.push("Blend aerobic development, strength endurance, and race-specific conditioning.");
  if (input.sport === "Running") lines.push("Bias toward aerobic development, threshold work, economy, and long-run structure.");
  if (input.sport === "Team Sport") lines.push("Bias toward repeatability, robustness, aerobic support, and strength qualities.");
  if (input.goal === "Improve 5k / 10k") lines.push("Reference pacing economy, threshold durability, and long-run progression.");
  if (input.goal === "Improve HYROX performance") lines.push("Reference station-to-run transitions, compromised running, and sustainable race output.");
  if (input.goal === "Improve race readiness") lines.push("Use race-specific microcycle focus and controlled sharpening language.");

  return lines;
}

export function buildPrompt(input) {
  const rules = buildDeterministicContext(input).map((x) => `- ${x}`).join("\n");
  return `You are an elite performance coach specializing in endurance, hybrid, and field sport preparation.

Your job is to analyze the athlete intake below and return a structured performance summary.

This is not a detailed training program.
Do not write a day-by-day prescription.
Do not write long explanations.
Be concise, practical, and specific.

Athlete intake:
- Sport: ${input.sport}
- Level: ${input.level}
- Goal: ${input.goal}
- Sessions per week: ${input.sessionsPerWeek}
- Hours per week: ${input.hoursPerWeek}
- Main weakness: ${input.weakness}
- Injury / training history: ${input.injuryHistory || "None provided"}
- Equipment access: ${(input.equipmentAccess || []).join(", ") || "Not specified"}
- Priority note: ${input.priority || "None provided"}

Coaching rules:
- Identify the most important performance bottlenecks first
- Match the output to the athlete’s level and available time
- If the athlete has low available time, prioritize efficiency
- If injury history suggests calf, Achilles, hamstring, or lower back issues, include durability and load-progression language
- If the sport is running, prioritize aerobic development, threshold structure, economy, and long-run support
- If the sport is HYROX or hybrid, combine aerobic development, strength endurance, and race-specific conditioning
- If the athlete is beginner, keep the advice simple and foundational
- If the athlete is advanced or sub-elite, use more performance-specific language
- Recommendations should be high-level strategic priorities only
- Avoid hype, fluff, or vague motivation
- Sound like a real coach

Additional deterministic context:
${rules}

Return ONLY valid JSON in exactly this schema:
{
  "headline": "string",
  "snapshot": {
    "sport": "string",
    "level": "string",
    "goal": "string",
    "availability": "string",
    "mainLimiter": "string"
  },
  "drivers": ["string", "string", "string"],
  "bigRocks": ["string", "string", "string", "string"],
  "weeklyStructure": [
    { "day": "Mon", "focus": "string" },
    { "day": "Tue", "focus": "string" },
    { "day": "Wed", "focus": "string" },
    { "day": "Thu", "focus": "string" },
    { "day": "Fri", "focus": "string" },
    { "day": "Sat", "focus": "string" },
    { "day": "Sun", "focus": "string" }
  ],
  "riskFlags": ["string", "string", "string"],
  "metrics": ["string", "string", "string", "string", "string"],
  "cta": {
    "title": "string",
    "description": "string",
    "buttonLabel": "string"
  }
}`;
}

export function mockPlanFromInput(input) {
  const injury = (input.injuryHistory || "").toLowerCase();
  const hasCalfRisk = ["calf", "achilles", "hamstring", "lower back"].some((x) => injury.includes(x));
  const isLowTime = Number(input.hoursPerWeek || 0) <= 5;
  const isRunning = input.sport === "Running";
  const isHyroxOrHybrid = input.sport === "HYROX" || input.sport === "Hybrid";
  const isReturnFromInjury = input.goal === "Return from injury";

  let headline = "From Guesswork to Structure: Build a Stronger Engine in 12 Weeks";
  let drivers = [
    "Current limiter indicates a need for better training distribution and intent.",
    "Quality output improves when weekly load is progressed predictably.",
    "Execution consistency is likely the highest-leverage performance driver right now.",
  ];
  let bigRocks = [
    "Build aerobic support before adding extra race-specific intensity.",
    "Introduce 2 weekly strength exposures to improve robustness and economy.",
    "Protect recovery days to preserve quality session output.",
    "Progress volume and intensity with clear week-to-week control.",
  ];
  let weeklyStructure = [
    { day: "Mon", focus: "Easy aerobic + mobility" },
    { day: "Tue", focus: "Threshold / quality" },
    { day: "Wed", focus: "Strength + recovery" },
    { day: "Thu", focus: "Aerobic volume" },
    { day: "Fri", focus: "Strength / skill" },
    { day: "Sat", focus: "Long session" },
    { day: "Sun", focus: "Off / recovery" },
  ];
  let riskFlags = [
    "Rapid load spikes may increase injury risk and reduce consistency.",
    "Excess moderate intensity can blunt adaptation quality.",
    "Unclear session intent can create fatigue without clear return.",
  ];
  let metrics = ["Pace at easy HR", "Threshold pace", "HR drift", "Strength consistency", "Session completion rate"];

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
      description: "Turn this performance summary into a sharper 4-week build, race-week strategy, or coach-led progression.",
      buttonLabel: "Build 4-Week Performance Plan",
      url: "",
    },
  };
}
