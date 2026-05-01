import { z } from "zod";

const sport = z.enum(["Running", "HYROX", "Hybrid", "Team Sport", "General Performance"]);
const eventType = z.enum(["5k", "10k", "Half Marathon", "Marathon", "HYROX", "General endurance", "Return from injury", "Team sport conditioning"]);
const level = z.enum(["Beginner", "Recreational", "Intermediate", "Advanced", "Sub-elite", "Elite"]);
const weakness = z.enum([
  "Aerobic base",
  "Threshold fitness",
  "Speed",
  "Strength",
  "Fatigue resistance",
  "Durability / injury resilience",
  "Race-specific conditioning",
]);

/** JSON often sends null for absent fields; curl/tools may send numeric strings. */
function toOptionalNumber(v) {
  if (v === null || v === undefined || v === "") return undefined;
  const n = typeof v === "number" ? v : Number(String(v).trim());
  return Number.isFinite(n) ? n : undefined;
}

function toRequiredNumber(v) {
  if (v === null || v === undefined || v === "") return v;
  const n = typeof v === "number" ? v : Number(String(v).trim());
  return Number.isFinite(n) ? n : v;
}

const optionalNum = (min, max) =>
  z.preprocess(toOptionalNumber, z.number().min(min).max(max).optional());

const requiredSessions = z.preprocess(toRequiredNumber, z.number().min(1).max(14));
const requiredHours = z.preprocess(toRequiredNumber, z.number().min(1).max(40));

function toStringArray(v) {
  if (v === null || v === undefined) return undefined;
  if (Array.isArray(v)) return v.map((x) => String(x));
  return undefined;
}

export const intakeSchema = z.object({
  sport,
  eventType,
  level,
  goal: z.string().min(1).max(80),
  // Benchmarks can be blank at initial submit; prompt logic treats empty as "not provided".
  currentBenchmark: z.string().max(60),
  goalBenchmark: z.string().max(60),
  sessionsPerWeek: requiredSessions,
  hoursPerWeek: requiredHours,
  weeklyKm: optionalNum(0, 300),
  longestRun: optionalNum(0, 100),
  qualitySessionsPerWeek: optionalNum(0, 7),
  timelineWeeks: optionalNum(0, 208),
  weakness,
  // Structured injury & load fields
  injuryStatus: z.enum([
    "None — training pain-free",
    "Minor niggle (not affecting training)",
    "Managing a recurring issue",
    "Returning from injury / time off",
  ]).optional(),
  injuryAreas: z.preprocess(toStringArray, z.array(z.string()).optional()),
  trainingConsistency: z.enum([
    "Very consistent — hitting nearly every session",
    "Mostly consistent — missing 1–2 sessions/week",
    "Patchy — training when I can",
    "Just getting back into it",
  ]).optional(),
  recentBigWeek: optionalNum(0, 500),
  fatigueLevel: z.enum([
    "Fresh and recovered",
    "Normal — some accumulated fatigue",
    "Tired — carrying significant fatigue",
    "Burnt out — need a lighter start",
  ]).optional(),
  // Legacy free-text kept for backward compat
  injuryHistory: z.string().max(1000).optional(),
  equipmentAccess: z.preprocess(toStringArray, z.array(z.string()).optional()),
  priority: z.string().max(500).optional(),
});

export const leadSchema = z.object({
  firstName: z.string().trim().min(2).max(40),
  email: z.string().email(),
  consentToMarketing: z.boolean().optional(),
  source: z.string().optional(),
});
