import type { DetailedPlanOutput, IntakeInput } from "./types";

export function buildDetailedPlanPrompt(input: IntakeInput, basePlan: DetailedPlanOutput, gapSummary: {
  classification: string;
  timelineEstimate: string;
  summary: string;
  primaryPriorities: string[];
}) {
  return `You are drafting as a senior performance coach for KJ Performance.
Refine this 4-week block with concise, high-value coaching language.
Honor the goal reality check and do not imply full goal completion if classification is major/long-term.

Athlete input:
${JSON.stringify(input, null, 2)}

Gap summary:
${JSON.stringify(gapSummary, null, 2)}

Base detailed block:
${JSON.stringify(basePlan, null, 2)}

Preserve every field in the JSON schema, including:
- blockOverview.startingPoint (weeklyVolume, longestRun, qualitySessions, strengthExposure, availability, baselineNote)
- blockOverview.blockTargets (week3PeakVolume, week4DeloadVolume, qualitySessionsPerWeek, strengthSessionsPerWeek)
- blockOverview.progressionContext, blockOverview.phaseLabel, blockOverview.foundationNote when present
- Each week: volumeTarget, longRunTarget, qualityTarget, strengthTarget, keyAdaptationGoal, guardrail, progressionMarkers (array)
- When present: thresholdSupportTarget, hyroxRaceSpecificTarget, hyroxStationDensityTarget

You may tighten wording and align session descriptions with the numeric targets, but do not remove ranges, arrays, or weekly measurable fields.

Return ONLY valid JSON matching the same schema as the base block.`;
}
