export type Sport = "Running" | "HYROX" | "Hybrid" | "Team Sport" | "General Performance";
export type Level = "Beginner" | "Intermediate" | "Advanced" | "Sub-elite" | "Elite";
export type EventType =
  | "5k"
  | "10k"
  | "Half Marathon"
  | "Marathon"
  | "HYROX"
  | "General endurance"
  | "Return from injury"
  | "Team sport conditioning";
export type Weakness =
  | "Aerobic base"
  | "Threshold fitness"
  | "Speed"
  | "Strength"
  | "Fatigue resistance"
  | "Durability / injury resilience"
  | "Race-specific conditioning";

export interface IntakeInput {
  sport: Sport;
  eventType: EventType;
  level: Level;
  goal: string;
  currentBenchmark: string;
  goalBenchmark: string;
  sessionsPerWeek: number;
  hoursPerWeek: number;
  weeklyKm?: number;
  longestRun?: number;
  qualitySessionsPerWeek?: number;
  timelineWeeks?: number;
  weakness: Weakness;
  injuryHistory?: string;
  equipmentAccess?: string[];
  priority?: string;
}

export interface LeadInput {
  firstName: string;
  email: string;
  consentToMarketing?: boolean;
  source?: string;
}

export interface PlannerOutput {
  headline: string;
  snapshot: {
    sport: string;
    level: string;
    goal: string;
    availability: string;
    mainLimiter: string;
  };
  drivers: string[];
  bigRocks: string[];
  weeklyStructure: { day: string; focus: string }[];
  riskFlags: string[];
  metrics: string[];
  cta: {
    title: string;
    description: string;
    buttonLabel: string;
    url?: string;
  };
  gapSummary?: {
    currentBenchmark: string;
    goalBenchmark: string;
    improvementRequired: string;
    classification: string;
    timelineEstimate: string;
    summary: string;
    primaryPriorities: string[];
  };
}

export interface DetailedPlanWeekSession {
  type: string;
  description: string;
  purpose: string;
}

export interface DetailedPlanWeek {
  week: number;
  theme: string;
  objective: string;
  structure: string[];
  keySessions: DetailedPlanWeekSession[];
  progressionNote: string;
  volumeTarget: string;
  longRunTarget: string;
  qualityTarget: string;
  strengthTarget: string;
  keyAdaptationGoal: string;
  guardrail: string;
  /** Measurable week targets (ranges). */
  progressionMarkers?: string[];
  /** Half / marathon running: cumulative threshold-type work band for the week. */
  thresholdSupportTarget?: string;
  /** HYROX / hybrid: compromised or race-pace running exposure for the week. */
  hyroxRaceSpecificTarget?: string;
  /** HYROX / hybrid: station cluster / density progression for the week. */
  hyroxStationDensityTarget?: string;
}

export interface DetailedPlanOutput {
  blockOverview: {
    title: string;
    goal: string;
    duration: "4 weeks";
    focus: [string, string, string];
    startingPoint: {
      weeklyVolume: string;
      longestRun?: string;
      qualitySessions: string;
      strengthExposure: string;
      availability: string;
      raceSpecificExposure?: string;
      thresholdSupport?: string;
      /** Stated vs estimated baseline (coaching transparency). */
      baselineNote: string;
    };
    /** How progression rate was set (injury + rhythm). */
    progressionContext: string;
    blockTargets: {
      week3PeakVolume: string;
      week4DeloadVolume: string;
      qualitySessionsPerWeek: string;
      strengthSessionsPerWeek: string;
      raceSpecificExposure?: string;
      thresholdSupport?: string;
    };
    foundationNote?: string;
    /** Long-horizon goals: explicit phase label on the block. */
    phaseLabel?: string;
  };
  weeklyBreakdown: [DetailedPlanWeek, DetailedPlanWeek, DetailedPlanWeek, DetailedPlanWeek];
  coachingInsights: [string, string, string];
  adjustmentRules: [string, string];
  cta: {
    title: string;
    description: string;
    buttonLabel: string;
  };
}

export interface SubmissionRecord extends LeadInput, IntakeInput {
  id: string;
  createdAt: string;
  generatedPlan?: PlannerOutput;
  status: "pending" | "generated" | "error";
}

export interface SubmitResponse {
  ok: boolean;
  submissionId: string;
  plan: PlannerOutput;
}

export interface MonetizationLinks {
  detailedPlanUrl?: string;
  bookingUrl?: string;
  checkoutUrl?: string;
}
