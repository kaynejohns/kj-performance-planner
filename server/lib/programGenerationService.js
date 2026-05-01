export function buildProgramPrompt(intake, existingPlan, programLength) {
  const isHyrox = intake.sport === "HYROX" || intake.sport === "Hybrid";
  const isMarathon = intake.eventType === "Marathon" || intake.eventType === "Half Marathon";
  const lowerLimbAreas = ["Calf / Achilles", "Knee", "Hip / Glute", "Lower back / SI", "Foot / Plantar"];
  const hasLowerLimb =
    (intake.injuryAreas || []).some(a => lowerLimbAreas.includes(a)) ||
    ["calf", "achilles", "hamstring", "lower back", "knee", "hip", "plantar"]
      .some(x => (intake.injuryHistory || "").toLowerCase().includes(x));

  const volumeUnit = isHyrox ? "hours" : "km";
  const startVol = intake.weeklyKm
    ? `${intake.weeklyKm}–${intake.weeklyKm + 3} ${volumeUnit}`
    : `4–5 ${volumeUnit}`;

  const phases = programLength === 12
    ? [
        { label: "Phase 1 — Aerobic Foundation", weeks: "1-4", rules: "Zone 1 easy running ONLY. No threshold work. 1 strength session/week. Volume builds 5-8% week on week. Week 4 is deload at 70% of week 3 volume." },
        { label: "Phase 2 — Threshold Development", weeks: "5-8", rules: "Introduce 1 LT1 session weeks 5-6. Add 2 LT1 sessions weeks 7-8. LT1 = full sentences possible, NOT race effort. Volume maintained. Week 8 is deload." },
        { label: "Phase 3 — Race-Specific Sharpening", weeks: "9-12", rules: "LT1 twice weekly. Introduce LT2 work from week 10. Volume reduces 15-20%. Race-pace exposure. Week 12 is taper." },
      ]
    : [
        { label: "Phase 1A — Aerobic Foundation", weeks: "1-4", rules: "Zone 1 only. No threshold. Strength foundation. Week 4 deload." },
        { label: "Phase 1B — Foundation Consolidation", weeks: "5-8", rules: "Continue Zone 1. First LT1 session week 7 only. Volume grows. Week 8 deload." },
        { label: "Phase 2A — Threshold Introduction", weeks: "9-12", rules: "2 LT1 sessions/week. Volume peaks. Strength maintained. Week 12 deload." },
        { label: "Phase 2B — Threshold Development", weeks: "13-16", rules: "2 LT1 + occasional LT2. Volume maintained high. Week 16 deload." },
        { label: "Phase 3 — Race-Specific Sharpening", weeks: "17-20", rules: "LT2 + race-pace work. Volume -15%. Strength reduces. Week 20 deload." },
        { label: "Phase 4 — Peak and Taper", weeks: "21-24", rules: "Volume -40%. Intensity maintained. Sleep and nutrition priority. Race prep." },
      ];

  return `You are a senior performance coach applying the Norwegian Method (Bakken and Magness).
Generate a complete ${programLength}-week training programme as a JSON array.

ATHLETE:
- Sport: ${intake.sport} / ${intake.eventType}
- Level: ${intake.level}
- Current: ${intake.currentBenchmark || "Not provided"} → Goal: ${intake.goalBenchmark || "Not provided"}
- Sessions/week: ${intake.sessionsPerWeek}
- Hours/week: ${intake.hoursPerWeek}h
- Starting volume: ${startVol}
- Main limiter: ${intake.weakness}
- Injury status: ${intake.injuryStatus || intake.injuryHistory || "None reported"}
${intake.injuryAreas?.length ? `- Areas to protect: ${intake.injuryAreas.join(", ")}` : ""}
- Training consistency (last 6 weeks): ${intake.trainingConsistency || "Not specified"}
- Fatigue level heading in: ${intake.fatigueLevel || "Not specified"}
- Equipment: ${(intake.equipmentAccess || []).join(", ") || "Standard"}

PHASE STRUCTURE:
${phases.map(p => `${p.label} (Weeks ${p.weeks}): ${p.rules}`).join("\n")}

NORWEGIAN METHOD RULES — apply strictly:
- 80% Zone 1 (fully conversational), 10% LT1 threshold, 10% LT2+
- LT1 = full sentences possible, slight breathing awareness — NOT race effort, NOT LT2
- NEVER prescribe pace — use feel and talk-test cues only
- 4-week block pattern: W1 establish, W2 build, W3 peak, W4 deload (70% of W3 volume)
- Volume increases: max ${hasLowerLimb ? "5-7" : "7-10"}% week on week
${isHyrox ? "- HYROX: volume in HOURS not km. Include station-to-run transitions in race-specific sessions." : ""}
${isMarathon ? "- Marathon: all long runs over 75 min must include fuelling instructions in the session structure steps." : ""}
${hasLowerLimb ? "- Lower limb history: conservative progression. Include calf/Achilles durability work in every strength session." : ""}

OUTPUT RULES:
- Return ONLY a valid JSON array of exactly ${programLength} week objects
- No markdown, no code fences, no wrapper object — just the raw JSON array starting with [
- dailySessions must include ONLY the ${intake.sessionsPerWeek} training days — omit rest days entirely
- Each session structure must have exactly 2 short steps (under 15 words each)
- Keep all string values concise — no long explanations

Week object schema:
{
  "week": 1,
  "theme": "short theme",
  "objective": "one sentence",
  "volumeTarget": "e.g. 39-41 km",
  "longRunTarget": "e.g. 11-12 km",
  "qualityTarget": "e.g. 1 LT1 session",
  "strengthTarget": "e.g. 1 session",
  "keyAdaptationGoal": "one sentence",
  "guardrail": "one short rule",
  "progressionMarkers": ["marker 1", "marker 2"],
  "dailySessions": [
    {
      "day": "Monday",
      "type": "easy",
      "title": "Zone 1 aerobic run",
      "duration": "45 min",
      "structure": [
        "Run at fully conversational pace for full duration",
        "Slow down if you cannot speak in full sentences"
      ],
      "intensityGuide": "Conversational throughout.",
      "coachNote": "Slower is correct."
    }
  ]
}`;
}
