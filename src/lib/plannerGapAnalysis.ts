import type { EventType, IntakeInput } from "./types";

export function parseTimeToSeconds(value?: string): number | null {
  if (!value) return null;
  const raw = value.trim().toLowerCase();
  if (!raw || raw.includes("no current pb")) return null;
  const parts = raw.split(":").map((x) => Number(x));
  if (parts.some(Number.isNaN)) return null;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return null;
}

export const parsePerformanceTime = parseTimeToSeconds;

export function formatSecondsToTime(seconds: number | null, eventType: EventType): string {
  if (!seconds || seconds <= 0) return "N/A";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0 || eventType === "Marathon" || eventType === "Half Marathon") {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

export const formatPerformanceTime = formatSecondsToTime;

export function calculatePercentImprovement(currentSeconds: number | null, goalSeconds: number | null): number | null {
  if (!currentSeconds || !goalSeconds || currentSeconds <= goalSeconds) return null;
  return ((currentSeconds - goalSeconds) / currentSeconds) * 100;
}

export const calculateGoalGap = calculatePercentImprovement;

export function classifyGapDifficulty(eventType: EventType, pct: number | null): string {
  if (pct == null) return "Insufficient benchmark data";
  const conservative = eventType === "Half Marathon" || eventType === "Marathon";
  const t1 = conservative ? 3 : 5;
  const t2 = conservative ? 7 : 10;
  const t3 = conservative ? 12 : 15;
  const t4 = conservative ? 18 : 25;
  if (pct < t1) return "Minor jump";
  if (pct < t2) return "Moderate jump";
  if (pct < t3) return "Ambitious jump";
  if (pct < t4) return "Major jump";
  return "Long-term transformation";
}

export const classifyGoalDifficulty = classifyGapDifficulty;

export function estimateTimelineFromGap(input: IntakeInput, classification: string): string {
  const provided = input.timelineWeeks;
  const enduranceEvent = input.eventType === "Half Marathon" || input.eventType === "Marathon";

  let recommended = "";
  if (classification === "Minor jump") recommended = "Near-term target (roughly 6-10 weeks)";
  else if (classification === "Moderate jump") recommended = "Medium-term target (roughly 10-16 weeks)";
  else if (classification === "Ambitious jump") recommended = enduranceEvent
    ? "Medium-to-long target (roughly 16-24+ weeks)"
    : "Medium-to-long target (roughly 16-22+ weeks)";
  else if (classification === "Major jump") recommended = enduranceEvent
    ? "Long-term target (roughly 24-40+ weeks, multi-phase)"
    : "Long-term target (roughly 22-36+ weeks, multi-phase)";
  else recommended = "Long-term transformation (multi-phase, potentially multi-year)";

  if (!provided || provided <= 0) return recommended;
  const providedWindow = `${provided} weeks`;
  const likelyUnrealistic =
    (classification === "Major jump" || classification === "Long-term transformation") && provided <= 16
      ? " Provided timeline appears aggressive for this jump."
      : classification === "Ambitious jump" && provided <= 10
        ? " Provided timeline is likely tight; progression quality must be strict."
        : "";
  return `${providedWindow} provided. ${recommended}.${likelyUnrealistic}`.trim();
}

export const estimateDevelopmentTimeline = estimateTimelineFromGap;

export function buildPrimaryPrioritiesFromGap(input: IntakeInput, classification: string): string[] {
  const priorities: string[] = [];
  if (input.eventType === "HYROX") {
    priorities.push("Compromised running tolerance", "Station repeatability", "Strength endurance density");
  } else if (["5k", "10k"].includes(input.eventType)) {
    priorities.push("Aerobic volume consistency", "Threshold development", "Durability and recovery support");
  } else if (["Half Marathon", "Marathon"].includes(input.eventType)) {
    priorities.push("Aerobic durability and long-run tolerance", "Fueling strategy under load", "Threshold and economy support");
  } else {
    priorities.push("Load consistency", "Event-specific conditioning", "Recovery control");
  }
  if (classification === "Major jump" || classification === "Long-term transformation") {
    priorities.unshift("Long-horizon development strategy");
  }
  if ((input.hoursPerWeek || 0) <= 5) priorities.unshift("High-value session prioritization");
  return priorities.slice(0, 4);
}

export function buildRealitySummary(input: IntakeInput) {
  const current = parseTimeToSeconds(input.currentBenchmark);
  const goal = parseTimeToSeconds(input.goalBenchmark);
  const pct = calculatePercentImprovement(current, goal);
  const classification = classifyGapDifficulty(input.eventType, pct);
  const timeline = estimateTimelineFromGap(input, classification);
  const priorities = buildPrimaryPrioritiesFromGap(input, classification);
  const improvementRequired = pct == null ? "N/A" : `${pct.toFixed(1)}%`;
  const enduranceEvent = input.eventType === "Half Marathon" || input.eventType === "Marathon";
  const horizon =
    classification === "Minor jump"
      ? "near-term"
      : classification === "Moderate jump"
        ? "medium-term"
        : classification === "Ambitious jump"
          ? "medium-to-long-term"
          : "long-term";

  const summary =
    classification === "Long-term transformation"
      ? `This is a long-term transformation, not a short-cycle target. Treat this as a multi-phase pathway with durable progression, not a quick fix.`
      : classification === "Major jump"
        ? `This is a large ${horizon} target. A single 4-12 week block will not close this gap; the immediate objective is building the right foundation.`
        : classification === "Ambitious jump"
          ? `This is an ambitious ${horizon} target. It is plausible with disciplined consistency, but not by forcing intensity early.`
          : `This is a ${horizon} target and can be progressed with structured, consistent execution.`;

  const eventSpecificNote =
    enduranceEvent && (classification === "Major jump" || classification === "Long-term transformation")
      ? "For long-distance events, this typically requires substantial development in aerobic capacity, threshold speed, fueling execution, and durability across multiple phases."
      : "";

  return {
    currentBenchmark: input.currentBenchmark || "N/A",
    goalBenchmark: input.goalBenchmark || "N/A",
    improvementRequired,
    classification,
    timelineEstimate: timeline,
    summary: `${summary}${eventSpecificNote ? ` ${eventSpecificNote}` : ""}`,
    primaryPriorities: priorities,
    // Optional normalized values for other logic layers.
    _currentSeconds: current,
    _goalSeconds: goal,
  };
}

export const buildGoalRealitySummary = buildRealitySummary;

/*
Test examples:
1) 5k 22:00 -> 16:00 => Long-term transformation
2) Marathon 4:00:00 -> 2:30:00 => Long-term transformation
3) Half Marathon 1:35:00 -> 1:29:00 => Moderate/Ambitious jump
4) HYROX 1:20:00 -> 1:10:00 => Ambitious jump, hybrid priorities
*/
