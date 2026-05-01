import { buildPaceFactsBlock } from "./paceCalculator.js";

// ── Beginner detection (server-side mirror of src/lib/beginnerDetection.ts) ──
function isBeginnerPath(input) {
  let score = 0;
  const km = input.weeklyKm || 0;
  const sessions = input.sessionsPerWeek || 0;
  const hours = input.hoursPerWeek || 0;
  const hasNoPB =
    !input.currentBenchmark ||
    input.currentBenchmark.toLowerCase().includes("no") ||
    input.currentBenchmark.trim() === "";
  const injury = (input.injuryHistory || "").toLowerCase();
  const hasLowerLimb = ["calf", "achilles", "hamstring", "knee", "plantar"].some((x) =>
    injury.includes(x),
  );

  if (input.level === "Beginner") score += 3;
  if (input.level === "Recreational") score += 2;
  if (hasNoPB) score += 3;
  if (km > 0 && km < 15) score += 2;
  if (km === 0 && input.sport === "Running") score += 3;
  if (sessions <= 2) score += 2;
  if (hours <= 3) score += 1;
  if (hasLowerLimb && km < 20) score += 2;
  if (input.sport === "HYROX" && km < 15 && sessions <= 2) score += 3;

  return score >= 4;
}

function buildBeginnerPrompt(input) {
  const isHyrox = input.sport === "HYROX" || input.sport === "Hybrid";
  const isMarathon =
    input.eventType === "Marathon" || input.eventType === "Half Marathon";
  const hasLowerLimb = ["calf", "achilles", "hamstring", "knee", "plantar"].some((x) =>
    (input.injuryHistory || "").toLowerCase().includes(x),
  );
  const sessions = Math.min(input.sessionsPerWeek || 3, 4);

  return `You are a senior performance coach. This athlete is not yet ready for structured periodisation. Their primary problem is building the habit of consistent training — not fitness, not threshold, not periodisation. Giving them a Norwegian Method programme right now would be the wrong answer.

ATHLETE:
- Sport: ${input.sport} / ${input.eventType || ""}
- Level: ${input.level}
- Sessions/week: ${input.sessionsPerWeek}
- Hours/week: ${input.hoursPerWeek}h
- Weekly volume: ${input.weeklyKm || "not provided"}km
- Current benchmark: ${input.currentBenchmark || "none"}
- Goal: ${input.goalBenchmark || "not specified"}
- Weakness: ${input.weakness}
- Injury history: ${input.injuryHistory || "none"}

YOUR JOB:
Generate a simplified foundation output. Not a periodisation plan. Not phase structure. A clear, honest picture of where this athlete is and exactly what they need to do for the next 6–8 weeks to build the foundation that makes structured training possible.

RULES FOR THIS OUTPUT:
- headline: One honest statement about where they are right now. Name the real situation — they are building a base before any structured training is appropriate. Do not soften this. Example: "Before threshold work, phase structure, or race-specific training — you need 6–8 weeks of consistent, easy movement first."

- snapshot.mainLimiter: "Consistency and training habit" — this is almost always the real limiter at this stage, not aerobic base or threshold.

- drivers: The 2–3 real reasons structured training won't work yet. Be specific and honest. Examples: no established training base to build quality work on top of; injury risk is high when volume increases without structural foundation; periodisation requires consistent attendance — currently missing.

- bigRocks: 3–4 simple, achievable priorities for the next 6–8 weeks. These should be so simple they are almost impossible to get wrong. Examples: show up for every planned session — completion rate is the only metric that matters right now; every run at fully conversational pace — if you cannot speak, slow down immediately; one strength session per week — bodyweight only, 30 minutes; sleep 7–8 hours.

- weeklyStructure: Simple, achievable for ${sessions} sessions.
  ${isHyrox ? "2 easy aerobic sessions + 1–2 bodyweight strength sessions." : sessions <= 3 ? "All easy runs — no quality sessions yet." : "3 easy runs + 1 bodyweight strength session."}
  No threshold work. No intervals. No quality sessions.
  ${hasLowerLimb ? "Include a specific note about eccentric loading for the injury history." : ""}

- riskFlags: The specific risks for THIS athlete if they skip the foundation and jump straight to structured training.
  ${hasLowerLimb ? "Lead with injury recurrence risk given their history." : "Lead with burnout and dropout risk from too much too soon."}

- metrics: Simple, habit-based metrics only. Examples: sessions completed per week; can hold conversation during runs; feeling recovered between sessions. No pace metrics. No volume targets yet.

- cta.title: "Your foundation phase starts here"
- cta.description: One honest sentence about what becomes possible after 6–8 weeks of consistent foundation work.
- cta.buttonLabel: "Start my foundation phase"

${isHyrox ? `HYROX-SPECIFIC: Do not prescribe km-based targets. Strength sessions are bodyweight only at this stage. Aerobic sessions are easy effort, 30–45 min max. Station work comes after 6–8 weeks of foundation.\n` : ""}${isMarathon ? `MARATHON-SPECIFIC: Long run should be no more than 10–12km at this stage. All running at fully conversational pace. Fuelling practice can wait until base is established.\n` : ""}
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
  "drivers": ["string"],
  "bigRocks": ["string"],
  "weeklyStructure": [{ "day": "string", "focus": "string" }],
  "riskFlags": ["string"],
  "metrics": ["string"],
  "cta": {
    "title": "string",
    "description": "string",
    "buttonLabel": "string"
  }
}`;
}

function buildConstraints(input, hasLowerLimb) {
  const c = [];
  const isHyroxLike = input.sport === "HYROX" || input.sport === "Hybrid";

  if (isHyroxLike) {
    c.push("HYROX/hybrid outputs must reference station-to-run transitions and compromised running. Never give km-based volume. Use hours.");
    c.push("Strength sessions are primary. Aerobic base supports race output, not the other way round.");
  }
  if (input.sport === "Running") {
    c.push(
      "Volume in km ranges. Long run is structural easy aerobic. Name LT1-oriented quality work explicitly (first lactate threshold) — never frame quality aerobic intensity as LT2 or MLSS.",
    );
    if (["Half Marathon", "Marathon"].includes(input.eventType)) {
      c.push("Marathon/HM: fueling and durability are as important as fitness. Name them.");
    }
  }
  if (input.sport === "Team Sport") {
    c.push("Game-day load counts as a session. Aerobic base supports repeatability. Strength prevents breakdown.");
  }

  if (input.level === "Beginner") {
    c.push("Simple language. Consistency before intensity. Foundation before optimisation.");
  }
  if (["Advanced", "Sub-elite", "Elite"].includes(input.level)) {
    c.push("Assume they know the basics. Name the margins. Be specific about what's actually limiting them at this level.");
  }

  if (input.hoursPerWeek <= 5) {
    c.push("Time-limited: name the 2 highest-leverage sessions. Cut anything that doesn't directly serve the goal.");
  }
  if (input.hoursPerWeek >= 10) {
    c.push("High volume: recovery quality is as important as load. Flag intensity stacking risk if quality sessions are high.");
  }

  if (hasLowerLimb) {
    c.push("Lower limb history: durability work is non-negotiable. Progressive load only. Name re-injury risk explicitly in flags.");
  }

  if (input.weakness === "Fatigue resistance") {
    c.push("Fatigue resistance: the problem is usually intensity stacking or insufficient easy volume, not fitness ceiling.");
  }
  if (input.weakness === "Strength") {
    c.push("Strength limiter in an endurance context means force production, not gym maxes. Name the movement patterns that matter.");
  }

  if (input.currentBenchmark && input.goalBenchmark) {
    c.push(
      `Gap between current (${input.currentBenchmark}) and goal (${input.goalBenchmark}) must shape the timeline tone. Honest framing over optimism.`,
    );
  }

  if ((input.qualitySessionsPerWeek || 0) >= 3 && input.hoursPerWeek <= 7) {
    c.push("High quality session ratio for available hours — flag intensity stacking as a risk.");
  }

  return c;
}

/** Norwegian Method framework: LT1, 80/10/10, language rules, sport-specific emphasis. */
function buildNorwegianMethodFramework(input) {
  const lines = [];

  lines.push(
    "INTENSITY MODEL — 80 / 10 / 10: Approximately 80% of training should be low intensity (well below LT1: truly easy, conversational breathing, aerobic base). About 10% should be LT1-associated work (first lactate threshold — controlled, sustainable rhythm where lactate rises slightly but stays manageable; use full sentences when you explain this in drivers, big rocks, or weekly structure). About 10% should be high-intensity work. If the athlete's stated quality-session count or hours make that split unrealistic, say so honestly in drivers or riskFlags and describe how to move toward the model.",
  );

  lines.push(
    "THRESHOLD LANGUAGE — LT1 ONLY: Whenever you prescribe or name structured aerobic intensity (often called 'threshold' colloquially), you must frame it as work at or around LT1 — the first lactate threshold (first lactate turnpoint). You may use full sentences to define LT1 for the athlete. Never describe this bucket as LT2, anaerobic threshold, MLSS, or 'race-pace threshold'.",
  );

  lines.push(
    'LANGUAGE RULES (Section 8): Do not use the word "moderate" (or synonyms like "medium intensity") for training zones. Do not say "push yourself", "dig deep", or similar hype. If pace values are relevant (e.g. in headline or gap analysis), use ONLY the pre-computed values from the PRE-COMPUTED PACE FACTS block — never calculate, derive, or estimate pace yourself. Do not prescribe pace in session descriptions — use duration, breathing pattern (conversational, short phrases only), rhythm, and perceived effort.',
  );

  lines.push(
    "VOICE: Educational and direct. Briefly explain why a choice matters. No generic motivation or filler.",
  );

  if (input.sport === "Running") {
    lines.push(
      "SPORT-SPECIFIC (Section 7 — Running): Easy volume below LT1 is the backbone. Long runs are primarily structural easy aerobic. LT1 sessions are discrete, controlled, and a small fraction of the week. Sharper race-specific work belongs in the high-intensity 10% bucket. Tie weeklyStructure to feel and duration, not pace.",
    );
  } else if (input.sport === "HYROX" || input.sport === "Hybrid") {
    lines.push(
      "SPORT-SPECIFIC (Section 7 — HYROX / hybrid): Aerobic base and strength-endurance both matter; describe running segments with feel, breathing, and duration — not pace. Race-specific work is station work plus running transitions; preserve quality of movement under fatigue. Apply 80/10/10 across the whole weekly plan (stations + runs combined).",
    );
  } else if (input.sport === "Team Sport") {
    lines.push(
      "SPORT-SPECIFIC (Section 7 — Team sport): Intermittent efforts and repeatability — easy aerobic work builds recovery between high outputs. The high-intensity 10% includes game-like and acceleration-style work; LT1-oriented work supports repeat efforts without pace prescriptions.",
    );
  } else {
    lines.push(
      "SPORT-SPECIFIC (Section 7 — General performance): Apply 80/10/10 and LT1 framing to the dominant training modes (conditioning, strength, movement) without pace-based prescriptions; use the same language rules.",
    );
  }

  return lines;
}

export function buildPrompt(input) {
  if (isBeginnerPath(input)) return buildBeginnerPrompt(input);

  const hasBenchmarks = Boolean(input.currentBenchmark?.trim() && input.goalBenchmark?.trim());
  const hasLowerLimb = ["calf", "achilles", "hamstring", "lower back"].some((x) =>
    (input.injuryHistory || "").toLowerCase().includes(x),
  );

  const benchmarkBlock = hasBenchmarks
    ? `- Current PB: ${input.currentBenchmark}
- Goal time: ${input.goalBenchmark}
- Gap note: Apply honest framing — large gaps require multi-phase language, not single-block promises`
    : `- Current benchmark: Not provided`;

  const hasWeeklyKm = input.weeklyKm != null && Number(input.weeklyKm) > 0;
  const weeklyLoadBlock = hasWeeklyKm
    ? `- Current weekly volume: ${input.weeklyKm}km/week
- Longest run: ${input.longestRun != null ? `${input.longestRun}km` : "Not provided"}`
    : input.sport === "HYROX" || input.sport === "Hybrid"
      ? `- Weekly training load measured in hours, not km`
      : `- Weekly volume: Not provided`;

  const constraints = buildConstraints(input, hasLowerLimb);
  const norwegianFramework = buildNorwegianMethodFramework(input);
  const paceFactsBlock = buildPaceFactsBlock(input);

  return `You are a senior performance scientist with 20 years working with endurance and hybrid athletes.
You have just reviewed this athlete's intake. Write a sharp, specific performance summary.
Every claim must be earned by their data. No filler. No generic motivation. No vague advice.
Sound like a coach who has seen exactly this profile before and knows what's actually limiting them.
Your recommendations follow the Norwegian Method coaching framework below (LT1-based intensity language, 80/10/10 distribution, and output language rules).

ATHLETE PROFILE:
- Sport: ${input.sport}
- Event: ${input.eventType}
- Level: ${input.level}
- Primary goal: ${input.goal}
- Sessions per week: ${input.sessionsPerWeek}
- Hours available: ${input.hoursPerWeek}h/week
- Quality sessions: ${input.qualitySessionsPerWeek != null ? `${input.qualitySessionsPerWeek}` : "Not specified"}/week
- Main weakness (self-reported): ${input.weakness}
${benchmarkBlock}
${weeklyLoadBlock}
- Injury history: ${input.injuryHistory || "None reported"}
- Equipment: ${(input.equipmentAccess || []).join(", ") || "Not specified"}
- Priority note: ${input.priority || "None"}
- Timeline: ${input.timelineWeeks ? `${input.timelineWeeks} weeks` : "Not specified"}
${paceFactsBlock ? `\n${paceFactsBlock}` : ""}
CONSTRAINTS — apply these silently, do not state them:
${constraints.map((x) => `- ${x}`).join("\n")}

NORWEGIAN METHOD FRAMEWORK — follow in all JSON strings (this section is not silent; your wording must comply):
${norwegianFramework.map((x) => `- ${x}`).join("\n")}

OUTPUT QUALITY BAR:
- headline: One punchy sentence naming the real bottleneck. Reference their specific event or gap if possible. Not generic. Obey Norwegian Method language rules (no banned words, no pace).
- snapshot.mainLimiter: The single most important thing holding this athlete back. Be specific, not categorical.
- drivers: 2–4 actual physiological or structural reasons they're not progressing. Skip the obvious. Be specific. Where intensity is relevant, reference LT1 (first lactate threshold) for controlled quality work — not LT2.
- bigRocks: 3–5 strategic priorities in impact order. Each must be actionable and tied to their numbers. Reflect the 80/10/10 distribution unless you explicitly justify a temporary skew.
- weeklyStructure: Match their ${input.sessionsPerWeek} sessions and ${input.hoursPerWeek}h. If they train 4 days, only schedule 4 days. Rest days are legitimate structure. Session foci must respect ~80% easy (below LT1), ~10% LT1-oriented work, ~10% high intensity — describe each day with feel and duration, never pace.
- riskFlags: Real risks from their actual profile. Not boilerplate warnings.
- metrics: Measurable KPIs tied to their event and goal — session completion, consistency, subjective readiness, time-at-intent, breathing markers, or load progression. Do not use pace-based metrics (e.g. avoid "threshold pace" or min/km).

Return ONLY valid JSON in exactly this schema. Arrays may have 2–5 items — use as many as genuinely apply:
{
  "headline": "string",
  "snapshot": {
    "sport": "string",
    "level": "string",
    "goal": "string",
    "availability": "string",
    "mainLimiter": "string"
  },
  "drivers": ["string"],
  "bigRocks": ["string"],
  "weeklyStructure": [
    { "day": "string", "focus": "string" }
  ],
  "riskFlags": ["string"],
  "metrics": ["string"],
  "cta": {
    "title": "string",
    "description": "string",
    "buttonLabel": "string"
  },
  "gapSummary": {
    "currentBenchmark": "string",
    "goalBenchmark": "string",
    "improvementRequired": "string",
    "classification": "string",
    "timelineEstimate": "string",
    "summary": "string",
    "primaryPriorities": ["string"]
  },
  "readout": {
    "feasibilityScore": 0,
    "feasibilityLabel": "string",
    "capacityMetrics": [
      { "label": "string", "score": 0, "delta": 0, "status": "string" }
    ],
    "phases": [
      { "label": "string", "duration": "string", "focus": "string" }
    ],
    "flags": [
      { "tag": "string", "message": "string" }
    ]
  }
}

For gapSummary:
- currentBenchmark / goalBenchmark: echo back what was provided, or "Not provided". If PRE-COMPUTED PACE FACTS are present, append the correct pace in brackets, e.g. "2:23:00 (3:23/km)"
- improvementRequired: the delta in plain language (e.g. "15 minutes off marathon time"). Use the pre-computed time gap if provided — do not calculate it yourself.
- classification: one of "Achievable in one block", "Moderate challenge — 2–3 blocks", "Significant challenge — 4–6 blocks", "Long-term transformation — 6+ blocks"
- timelineEstimate: honest plain-language estimate (e.g. "12–20 weeks with consistent training")
- summary: 1–2 sentences on what closing this gap actually requires
- primaryPriorities: 2–3 the most important things to close the gap

For readout:
- feasibilityScore: integer 0–100. How feasible the athlete's goal is given their current capacity. 90+ = aligned, 75–89 = achievable, 60–74 = ambitious, 40–59 = significant challenge, <40 = unrealistic without major changes. Be honest — do not inflate.
- feasibilityLabel: one of "aligned", "achievable", "ambitious", "significant challenge", "unrealistic"
- capacityMetrics: exactly 4 metrics scored 0–100 relevant to this athlete's sport and goal. Choose the 4 most relevant from: Aerobic Base, Load Tolerance, Consistency, Strength Base, Speed Reserve, Race-Specific Fitness, Threshold Fitness, Recovery Quality, Mental Resilience, Fuelling Readiness. Score each honestly based on their data. delta: the gap to where they need to be for their goal (negative = deficit, 0 = adequate). status: one of "strong", "adequate", "limiting", "critical".
- phases: 3–5 training phases that map the path from now to the athlete's goal. Each phase has a label (e.g. Base, Build, Specific, Taper, Foundation, Race-Specific), a duration in weeks (e.g. "6 weeks"), and a focus — one short sentence on what this phase develops. Sequence should be logical and sum to roughly the athlete's timeline. If timeline is unknown, use a sensible default (16–20 weeks for most goals).
- flags: 2–3 short, specific callouts. tag is a 1-word label (e.g. TIME, LOAD, INJURY, VOLUME, INTENSITY). message is one direct sentence about the flag.`;
}

/** Hardcoded conversion CTA (applied after model parse; overrides `cta` in the JSON). */
export function buildCTA(input) {
  if (input.sport === "HYROX" || input.sport === "Hybrid") {
    return {
      title: "Get your full HYROX block",
      description:
        "Your 4-week plan includes station-specific conditioning, hybrid load structure, and weekly targets built around your race date.",
      buttonLabel: "Unlock my HYROX plan",
    };
  }
  if (["Marathon", "Half Marathon"].includes(input.eventType)) {
    return {
      title: "Get your full training block",
      description:
        "Your 4-week plan includes progressive volume targets, long run structure, and the threshold work that actually moves your race time.",
      buttonLabel: "Unlock my plan",
    };
  }
  return {
    title: "Get your full 4-week plan",
    description:
      "Your plan includes weekly load targets, session structure, and progression markers built around your specific goal and timeline.",
    buttonLabel: "Unlock my plan",
  };
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
