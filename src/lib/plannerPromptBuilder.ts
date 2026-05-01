import type { DetailedPlanOutput, IntakeInput } from "./types";

export function buildDetailedPlanPrompt(input: IntakeInput, basePlan: DetailedPlanOutput, gapSummary: {
  classification: string;
  timelineEstimate: string;
  summary: string;
  primaryPriorities: string[];
}) {
  const isHyroxLike = input.sport === "HYROX" || input.sport === "Hybrid";
  const isRunning = input.sport === "Running";
  const phaseLabel = basePlan.blockOverview.phaseLabel || "";
  const sharpeningHint =
    /sharpen|peak|pre-race|race prep|race-readiness|taper/i.test(phaseLabel) ||
    basePlan.weeklyBreakdown.some(
      (w) =>
        /sharpen|peak|pre-race|race prep|race-readiness/i.test(`${w.theme} ${w.objective}`),
    );

  return `You are drafting as a senior performance coach for KJ Performance.
Build this 4-week block fresh with concise, high-value coaching language.
Honor the goal reality check and do not imply full goal completion if classification is major/long-term.
All prescribed sessions must follow the KJ Norwegian Method framework below.

Athlete input:
${JSON.stringify(input, null, 2)}

Gap summary:
${JSON.stringify(gapSummary, null, 2)}

NORWEGIAN METHOD — SESSION TYPES (Section 4; map each training day to JSON \`type\`):
- Easy aerobic (Zone 1) → \`easy\`: default majority of non-rest days; very light, restorative aerobic work.
- Long easy aerobic (structural volume) → \`long\`: extended easy session; still Zone 1 / below LT1 — not a fitness test.
- LT1 threshold (first lactate threshold / first turnpoint) → \`threshold\`: controlled, sustainable quality; lactate-stable repeatable work. This is the ONLY "threshold" intensity outside sharpening (see below).
- High neuromuscular / race-specific density → \`race-specific\`: short, fast, or race-format work in the small high-intensity bucket; use only where the block calls for specificity.
- Running-specific strength (Section 4.3) → \`strength\`: complement running — patterns that support tissue tolerance, posture, and power without conflicting key runs (hinge, squat, single-leg, calf-ankle, trunk; controlled loads; not bodybuilding).
- Active recovery / mobility flush → \`recovery\`: very easy movement, optional light drills; talk test easy throughout.
- Rest → \`rest\`: non-training day; minimal content.

ZONE 1 — EASY SESSION FEEL (Section 2; use for every \`easy\` and for the aerobic portions of \`long\`):
- Full conversational ability: complete sentences, relaxed breathing, no strain.
- Sensation is "all day" easy — patience over productivity; if conversation becomes difficult, ease off.
- Describe only with feel and talk test — never pace, splits, or heart rate.

THRESHOLD SESSIONS — LT1 ONLY:
- All \`threshold\` sessions are LT1 (first lactate threshold) work: sustainable rhythm, controlled breathing (e.g. short phrases possible but not full conversation), repeatable reps or steady segments without accumulating burn.
- Do not frame quality aerobic work as LT2, MLSS, or anaerobic threshold.
- LT2-style or second-threshold language is forbidden except in an explicit **sharpening phase** (final block weeks focused on race readiness or sessions clearly labelled peak/sharpening in theme/objective). ${sharpeningHint ? "This block may include sharpening cues — if so, confine harder repeat work to those weeks and to \`race-specific\` where appropriate." : "Treat this block as foundation/development unless week theme explicitly signals sharpening; default remains LT1-only for \`threshold\`."}

STRENGTH — RUNNING-SPECIFIC (Section 4.3):
${isRunning || input.sport === "Team Sport" || input.sport === "General Performance"
    ? "- Prioritise patterns that support running durability and economy; keep sessions supplementary to aerobic work; avoid crushing legs 24–36h before key LT1 or long runs; coachNote can flag sequencing mistakes."
    : "- For non-running sports, keep strength athletic and full-body; still avoid conflicting with primary sport quality days."}

HYROX / HYBRID — STATION-TO-RUN (Section 7.3):
${isHyroxLike
    ? "- Race-specific and key quality days must include station-to-run transitions: clusters or rounds where running immediately follows station work; build repeatability of movement quality under fatigue; name transition control, not pace."
    : "- Not applicable unless athlete is HYROX/hybrid."}

GLOBAL OUTPUT RULES:
- Never prescribe pace, min/km, mph, or heart rate zones. Use duration, talk test, breathing pattern, and subjective effort only.
- Do not use the word "moderate" for intensity. Avoid "push yourself" or hype.

Block structure constraints (use as guardrails, not a template to copy):
- Starting weekly volume: ${basePlan.blockOverview?.startingPoint?.weeklyVolume || "match athlete's current load"}
- Peak week (W3) target: ${basePlan.blockOverview?.blockTargets?.week3PeakVolume || "~10% above start"}
- Deload (W4): reduce to 70% of peak
- Quality sessions per week: ${input.qualitySessionsPerWeek || 2}
- Strength sessions: ${isHyroxLike ? "2/week primary" : "1-2/week support"}

You MUST include dailySessions for every week. This is required — do not omit it.
Each training day gets a full session entry. Rest days get type: 'rest'.
The number of non-rest sessions must exactly match intake.sessionsPerWeek.

dailySessions schema — include this exactly in the JSON:
{
  dailySessions: [
    {
      day: "Monday",
      type: "easy",
      title: "Zone 1 aerobic run",
      duration: "45 min",
      structure: [
        "10 min easy warm-up walk/jog",
        "35 min continuous running at fully conversational pace",
        "If you cannot hold a full sentence, slow down immediately",
        "Focus on relaxed form — do not check your pace"
      ],
      intensityGuide: "Fully conversational throughout. Should feel almost too easy.",
      purpose: "Aerobic base development — mitochondrial density and fat metabolism.",
      coachNote: "Most athletes run this 20-30 sec/km too fast. Slower is correct."
    }
  ]
}

Apply Norwegian Method intensity rules:
- easy sessions: Zone 1, fully conversational, no pace checking
- threshold sessions: LT1 only, full sentences possible, slight breathing awareness
- long sessions: Zone 1 same as easy, extended duration
- strength sessions: running-specific single-leg exercises, list 4-5 specific exercises
- recovery: very short, very easy, or walking
- rest: type='rest', title='Rest day', no structure needed

For HYROX athletes: include station work in race-specific sessions.
For marathon athletes: include fuelling instructions in long run sessions.
Always match sessionsPerWeek exactly.

weeklyBreakdown JSON shape must include dailySessions for each week:
weeklyBreakdown: [{
  week: number,
  theme: string,
  objective: string,
  volumeTarget: string,
  longRunTarget: string,
  qualityTarget: string,
  strengthTarget: string,
  keyAdaptationGoal: string,
  guardrail: string,
  progressionMarkers: string[],
  dailySessions: [{
    day: string,
    type: string,
    title: string,
    duration: string,
    structure: string[],
    intensityGuide: string,
    purpose: string,
    coachNote: string | null
  }]
}]

Preserve every field in the JSON schema, including:
- blockOverview.startingPoint (weeklyVolume, longestRun, qualitySessions, strengthExposure, availability, baselineNote)
- blockOverview.blockTargets (week3PeakVolume, week4DeloadVolume, qualitySessionsPerWeek, strengthSessionsPerWeek)
- blockOverview.progressionContext, blockOverview.phaseLabel, blockOverview.foundationNote when present
- Each week: volumeTarget, longRunTarget, qualityTarget, strengthTarget, keyAdaptationGoal, guardrail, progressionMarkers (array), dailySessions (array as specified above)
- When present: thresholdSupportTarget, hyroxRaceSpecificTarget, hyroxStationDensityTarget

Generate the 4-week block fresh from these constraints and the athlete profile above.
Do not copy or lightly edit pre-generated content.
Do not remove ranges, arrays, or weekly measurable fields.

Return ONLY valid JSON matching the same schema as the base block.`;
}
