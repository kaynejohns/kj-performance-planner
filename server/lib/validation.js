import { z } from "zod";

const sport = z.enum(["Running", "HYROX", "Hybrid", "Team Sport", "General Performance"]);
const eventType = z.enum(["5k", "10k", "Half Marathon", "Marathon", "HYROX", "General endurance", "Return from injury", "Team sport conditioning"]);
const level = z.enum(["Beginner", "Intermediate", "Advanced", "Sub-elite", "Elite"]);
const weakness = z.enum([
  "Aerobic base",
  "Threshold fitness",
  "Speed",
  "Strength",
  "Fatigue resistance",
  "Durability / injury resilience",
  "Race-specific conditioning",
]);

export const intakeSchema = z.object({
  sport,
  eventType,
  level,
  goal: z.string().min(1).max(80),
  currentBenchmark: z.string().min(1).max(20),
  goalBenchmark: z.string().min(1).max(20),
  sessionsPerWeek: z.number().min(1).max(14),
  hoursPerWeek: z.number().min(1).max(40),
  weeklyKm: z.number().min(0).max(300).optional(),
  longestRun: z.number().min(0).max(100).optional(),
  qualitySessionsPerWeek: z.number().min(0).max(7).optional(),
  timelineWeeks: z.number().min(0).max(208).optional(),
  weakness,
  injuryHistory: z.string().max(1000).optional(),
  equipmentAccess: z.array(z.string()).optional(),
  priority: z.string().max(500).optional(),
});

export const leadSchema = z.object({
  firstName: z.string().trim().min(2).max(40),
  email: z.string().email(),
  consentToMarketing: z.boolean().optional(),
  source: z.string().optional(),
});
