/**
 * Server-side pace calculator.
 * Parses athlete benchmark times and returns correct pace/km values
 * so the AI never has to derive them itself.
 */

const EVENT_DISTANCES_KM = {
  "5k": 5,
  "10k": 10,
  "Half Marathon": 21.0975,
  "Marathon": 42.195,
};

/**
 * Parse a time string to total seconds.
 * Handles:
 *   H:MM:SS  → e.g. "2:23:45"
 *   H:MM     → e.g. "2:23"  (for long events like marathon/half)
 *   MM:SS    → e.g. "45:30" (for 5k/10k)
 */
function parseTimeToSeconds(timeStr, eventType) {
  if (!timeStr || typeof timeStr !== "string") return null;

  // Strip any trailing text like "2:23:00 marathon" or "sub-3"
  const cleaned = timeStr.trim().replace(/[^0-9:]/g, " ").trim();
  const match = cleaned.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (!match) return null;

  const a = parseInt(match[1], 10);
  const b = parseInt(match[2], 10);
  const c = match[3] != null ? parseInt(match[3], 10) : null;

  if (c != null) {
    // H:MM:SS — unambiguous
    return a * 3600 + b * 60 + c;
  }

  // Two-part: interpret based on event
  const isLongEvent = ["Marathon", "Half Marathon"].includes(eventType);
  if (isLongEvent) {
    // Treat as H:MM
    return a * 3600 + b * 60;
  } else {
    // Treat as MM:SS
    return a * 60 + b;
  }
}

/** Format seconds-per-km as "M:SS/km" */
function formatPace(secondsPerKm) {
  if (!secondsPerKm || secondsPerKm <= 0) return null;
  const mins = Math.floor(secondsPerKm / 60);
  const secs = Math.round(secondsPerKm % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}/km`;
}

/** Format total seconds as "H:MM:SS" or "MM:SS" */
function formatTime(totalSeconds) {
  if (!totalSeconds || totalSeconds <= 0) return null;
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * Compute pace facts from intake data.
 * Returns an object with currentPace, goalPace, and a formatted fact block
 * ready to inject into the AI prompt.
 *
 * Returns null if the event type has no known distance (HYROX, team sport, etc.)
 */
export function computePaceFacts(input) {
  const distance = EVENT_DISTANCES_KM[input.eventType];
  if (!distance) return null; // HYROX, team sport, general — no pace calc

  const currentSeconds = parseTimeToSeconds(input.currentBenchmark, input.eventType);
  const goalSeconds = parseTimeToSeconds(input.goalBenchmark, input.eventType);

  const currentPace = currentSeconds ? formatPace(currentSeconds / distance) : null;
  const goalPace = goalSeconds ? formatPace(goalSeconds / distance) : null;

  // Gap in minutes
  const gapMinutes =
    currentSeconds && goalSeconds
      ? Math.round((currentSeconds - goalSeconds) / 60)
      : null;

  return {
    currentPace,
    goalPace,
    gapMinutes,
    currentTime: currentSeconds ? formatTime(currentSeconds) : null,
    goalTime: goalSeconds ? formatTime(goalSeconds) : null,
    distance,
    eventType: input.eventType,
  };
}

/**
 * Build the pre-computed facts block to inject into prompts.
 * The AI must use these values and never recalculate pace itself.
 */
export function buildPaceFactsBlock(input) {
  const facts = computePaceFacts(input);
  if (!facts) return "";

  const lines = [
    "PRE-COMPUTED PACE FACTS (use these exact values — do not recalculate or convert pace yourself):",
    `- Event distance: ${facts.distance}km`,
  ];

  if (facts.currentPace && facts.currentTime) {
    lines.push(`- Current benchmark: ${facts.currentTime} = ${facts.currentPace}`);
  }
  if (facts.goalPace && facts.goalTime) {
    lines.push(`- Goal benchmark: ${facts.goalTime} = ${facts.goalPace}`);
  }
  if (facts.gapMinutes != null) {
    lines.push(`- Time gap to close: ${facts.gapMinutes} minutes`);
  }
  if (facts.currentPace && facts.goalPace) {
    lines.push(
      `- When referencing pace in your output, use only the values above. Do not derive, estimate, or calculate any pace yourself.`,
    );
  }

  return lines.join("\n");
}
