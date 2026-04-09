// ========================================
// plannerWeeklyTemplates.ts
// Weekly structure + intensity distribution engine
// ========================================

export type SportType =
  | "Running"
  | "HYROX"
  | "Team Sport"
  | "General Performance";

export type EventType =
  | "5k"
  | "10k"
  | "Half Marathon"
  | "Marathon"
  | "HYROX"
  | "Return from injury"
  | "Team sport conditioning"
  | "General endurance";

export type TimeProfile = "low" | "moderate" | "high";
export type RiskProfile = "low" | "moderate" | "high";
export type TrainingStatus =
  | "detrained"
  | "inconsistent"
  | "rebuilding"
  | "currently consistent"
  | "high training load already";

export type WeaknessType =
  | "Aerobic base"
  | "Threshold fitness"
  | "VO2 / top-end aerobic power"
  | "Speed / economy"
  | "Strength"
  | "Fatigue resistance"
  | "Durability / injury resilience"
  | "Race-specific conditioning"
  | "Body composition / fueling support"
  | string;

export interface WeeklyTemplateInput {
  sport: SportType;
  eventType: EventType;
  hoursPerWeek?: number;
  sessionsPerWeek?: number;
  trainingStatus?: TrainingStatus;
  weakness?: WeaknessType;
  secondaryWeakness?: WeaknessType;
  injuryHistory?: string;
  currentInjuryStatus?: "healthy" | "managing niggle" | "returning from injury";
  currentWeeklyKm?: number | null;
  sourceTag?: string;
}

export interface SessionCard {
  day: string;
  title: string;
  systemTag:
    | "Zone 2"
    | "LT2"
    | "Speed"
    | "Strength"
    | "Recovery"
    | "Hybrid"
    | "Race-Specific"
    | "Off";
  intensity: "low" | "moderate" | "high" | "off";
  description: string;
  internalFocus?: string;
}

export interface IntensityDistribution {
  low: string;
  moderate: string;
  high: string;
  summary: string;
}

export interface WeeklyCalendarPreview {
  templateKey: string;
  templateName: string;
  weekHeadline: string;
  weekPurpose: string;
  intensityDistribution: IntensityDistribution;
  sessionCards: SessionCard[];
  progressionCheckpoint: string;
  coachingNote: string;
}

// ========================================
// PUBLIC ENTRY
// ========================================

export function buildWeeklyCalendarPreview(input: WeeklyTemplateInput): WeeklyCalendarPreview {
  const timeProfile = getTimeProfile(input.hoursPerWeek);
  const riskProfile = getRiskProfile(input);
  const templateKey = selectTemplateKey(input, timeProfile);
  const baseTemplate = buildBaseTemplate(templateKey);
  const adaptedSessions = adaptTemplateSessions(baseTemplate.sessionCards, input, riskProfile, timeProfile);

  const intensityDistribution = buildIntensityDistribution(adaptedSessions, input, timeProfile, riskProfile);
  const progressionCheckpoint = buildProgressionCheckpoint(input, templateKey, riskProfile);
  const coachingNote = buildCoachingNote(input, templateKey, timeProfile, riskProfile);

  return {
    templateKey,
    templateName: baseTemplate.templateName,
    weekHeadline: baseTemplate.weekHeadline,
    weekPurpose: baseTemplate.weekPurpose,
    intensityDistribution,
    sessionCards: adaptedSessions,
    progressionCheckpoint,
    coachingNote,
  };
}

// ========================================
// PROFILE HELPERS
// ========================================

function getTimeProfile(hoursPerWeek?: number): TimeProfile {
  if (!hoursPerWeek || hoursPerWeek <= 4) return "low";
  if (hoursPerWeek >= 9) return "high";
  return "moderate";
}

function getRiskProfile(input: WeeklyTemplateInput): RiskProfile {
  const injuryText = (input.injuryHistory || "").toLowerCase();
  const currentInjury = input.currentInjuryStatus || "healthy";
  const trainingStatus = input.trainingStatus || "currently consistent";

  const redFlags = ["calf", "achilles", "hamstring", "knee", "lower back", "back", "shin", "stress"];

  const hasRelevantHistory = redFlags.some((flag) => injuryText.includes(flag));
  const rebuilding = currentInjury === "returning from injury" || trainingStatus === "rebuilding";
  const inconsistent = trainingStatus === "detrained" || trainingStatus === "inconsistent";

  if ((hasRelevantHistory && rebuilding) || currentInjury === "returning from injury") return "high";
  if (hasRelevantHistory || currentInjury === "managing niggle" || inconsistent) return "moderate";
  return "low";
}

function selectTemplateKey(input: WeeklyTemplateInput, timeProfile: TimeProfile): string {
  const event = input.eventType;
  const sport = input.sport;
  const injuryStatus = input.currentInjuryStatus || "healthy";

  if (event === "Return from injury" || injuryStatus === "returning from injury") return "injury_rebuild";

  if (sport === "Running") {
    if (event === "5k" || event === "10k") {
      if (timeProfile === "low") return "running_short_low";
      if (timeProfile === "high") return "running_short_high";
      return "running_short_moderate";
    }
    if (event === "Half Marathon") return "half_marathon";
    if (event === "Marathon") return "marathon";
  }

  if (sport === "HYROX" || event === "HYROX") {
    if (timeProfile === "high") return "hyrox_high";
    return "hyrox_moderate";
  }

  if (sport === "Team Sport" || event === "Team sport conditioning") return "team_sport";
  return "general_endurance";
}

// ========================================
// BASE TEMPLATES
// ========================================

function buildBaseTemplate(templateKey: string): {
  templateName: string;
  weekHeadline: string;
  weekPurpose: string;
  sessionCards: SessionCard[];
} {
  const templates: Record<
    string,
    { templateName: string; weekHeadline: string; weekPurpose: string; sessionCards: SessionCard[] }
  > = {
    running_short_low: {
      templateName: "Running 5k/10k · Low Time",
      weekHeadline: "Week structure: efficient short-course build",
      weekPurpose: "Protect quality, support it with aerobic work, and keep the week highly repeatable.",
      sessionCards: [
        session("MON", "Off / mobility", "Recovery", "off", "Low-load recovery and movement quality work."),
        session(
          "TUE",
          "Threshold intervals",
          "LT2",
          "high",
          "Controlled threshold work to improve sustainable pace and fatigue resistance.",
        ),
        session("WED", "Aerobic run", "Zone 2", "low", "Easy aerobic running to support base development and recovery."),
        session(
          "THU",
          "Off / recovery",
          "Recovery",
          "off",
          "Keep total stress controlled and protect freshness for the next quality exposure.",
        ),
        session(
          "FRI",
          "Speed / economy",
          "Speed",
          "moderate",
          "Short faster work to improve mechanics, stiffness, and running economy.",
        ),
        session(
          "SAT",
          "Long aerobic run",
          "Zone 2",
          "moderate",
          "Extend endurance and improve durability with controlled aerobic work.",
        ),
        session("SUN", "Recovery run", "Recovery", "low", "Very easy running to maintain frequency without adding stress."),
      ],
    },

    running_short_moderate: {
      templateName: "Running 5k/10k · Moderate Time",
      weekHeadline: "Week structure: threshold-led aerobic progression",
      weekPurpose: "Build the aerobic engine while preserving one strong threshold anchor and one economy touch.",
      sessionCards: [
        session("MON", "Recovery run", "Zone 2", "low", "Easy conversational running to reset after the long-run anchor."),
        session("TUE", "Threshold intervals", "LT2", "high", "Controlled threshold development to lift sustainable pace."),
        session("WED", "Aerobic run", "Zone 2", "low", "Low-intensity volume to support base and absorb Tuesday's work."),
        session(
          "THU",
          "Speed / economy",
          "Speed",
          "moderate",
          "Shorter faster running to sharpen mechanics and efficiency.",
        ),
        session("FRI", "Easy aerobic run", "Zone 2", "low", "Low-cost aerobic support without accumulating unnecessary fatigue."),
        session("SAT", "Long aerobic run", "Zone 2", "moderate", "Primary endurance anchor for aerobic support and durability."),
        session("SUN", "Recovery / mobility", "Recovery", "off", "Keep the system fresh and ready to repeat quality next week."),
      ],
    },

    running_short_high: {
      templateName: "Running 5k/10k · High Time",
      weekHeadline: "Week structure: dual-quality performance build",
      weekPurpose: "Use higher training time to support two quality anchors without losing aerobic density.",
      sessionCards: [
        session("MON", "Recovery run", "Zone 2", "low", "Restore freshness and maintain frequency with very low-intensity work."),
        session("TUE", "Threshold intervals", "LT2", "high", "Primary threshold session for sustainable race pace development."),
        session("WED", "Aerobic run", "Zone 2", "low", "Aerobic support between key sessions."),
        session("THU", "Speed / economy", "Speed", "high", "Second quality anchor focused on speed, mechanics, and economy."),
        session(
          "FRI",
          "Easy aerobic run",
          "Zone 2",
          "low",
          "Aerobic support that keeps the week stable rather than adding unnecessary stress.",
        ),
        session("SAT", "Long aerobic run", "Zone 2", "moderate", "Durability and endurance anchor with controlled intensity."),
        session("SUN", "Recovery run", "Recovery", "low", "Reset and maintain running rhythm while protecting repeatability."),
      ],
    },

    half_marathon: {
      templateName: "Half Marathon",
      weekHeadline: "Week structure: threshold + durability support",
      weekPurpose: "Improve sustained race ability by combining threshold support with long-run durability.",
      sessionCards: [
        session("MON", "Recovery run", "Recovery", "low", "Low-intensity reset to support consistency."),
        session("TUE", "Threshold intervals", "LT2", "high", "Controlled threshold work to raise sustainable half-marathon pace."),
        session("WED", "Aerobic run", "Zone 2", "low", "Easy support volume to reinforce aerobic capacity."),
        session("THU", "Steady aerobic run", "Zone 2", "moderate", "Sub-threshold aerobic support to extend durability and control."),
        session(
          "FRI",
          "Strength & durability",
          "Strength",
          "moderate",
          "Strength exposure to support running economy and tissue resilience.",
        ),
        session("SAT", "Long aerobic run", "Zone 2", "moderate", "Key endurance anchor to build durability under duration."),
        session("SUN", "Recovery / easy run", "Recovery", "low", "Maintain frequency without adding meaningful fatigue."),
      ],
    },

    marathon: {
      templateName: "Marathon",
      weekHeadline: "Week structure: durability-led marathon support",
      weekPurpose: "Center the week around long-run durability, fueling readiness, and sustainable aerobic support.",
      sessionCards: [
        session("MON", "Recovery run", "Recovery", "low", "Very easy running to absorb weekend volume."),
        session(
          "TUE",
          "Threshold / marathon-pace support",
          "LT2",
          "high",
          "Controlled work to improve sustainable marathon support speed.",
        ),
        session("WED", "Aerobic run", "Zone 2", "low", "Low-cost aerobic density and recovery support."),
        session("THU", "Aerobic support run", "Zone 2", "moderate", "Steady aerobic exposure to build endurance without overreaching."),
        session(
          "FRI",
          "Strength & durability",
          "Strength",
          "moderate",
          "Strength support to improve robustness and long-run tolerance.",
        ),
        session(
          "SAT",
          "Long aerobic run",
          "Zone 2",
          "high",
          "Cornerstone session for durability, fueling practice, and endurance development.",
        ),
        session("SUN", "Easy aerobic run", "Recovery", "low", "Low-intensity follow-up to reinforce endurance and recovery."),
      ],
    },

    hyrox_moderate: {
      templateName: "HYROX · Moderate Time",
      weekHeadline: "Week structure: hybrid engine + fatigue tolerance",
      weekPurpose: "Blend aerobic support, threshold development, and strength endurance without overwhelming recovery.",
      sessionCards: [
        session("MON", "Aerobic base", "Zone 2", "low", "Easy aerobic conditioning to support recovery and hybrid work capacity."),
        session("TUE", "Strength endurance", "Strength", "high", "Hybrid strength work to improve repeatability under fatigue."),
        session("WED", "Recovery / mobility", "Recovery", "off", "Reduce system stress and protect quality later in the week."),
        session("THU", "Threshold running", "LT2", "high", "Controlled running work to lift sustainable speed and hybrid support."),
        session("FRI", "Strength & durability", "Strength", "moderate", "Support force production and tissue resilience."),
        session("SAT", "Compromised running", "Hybrid", "high", "Run under pre-fatigue to improve race-specific tolerance."),
        session("SUN", "Recovery", "Recovery", "off", "Full reset to protect repeatability."),
      ],
    },

    hyrox_high: {
      templateName: "HYROX · High Time",
      weekHeadline: "Week structure: race-specific hybrid progression",
      weekPurpose: "Use higher training time to build aerobic support, station tolerance, and race-specific execution.",
      sessionCards: [
        session("MON", "Aerobic base", "Zone 2", "low", "Low-intensity aerobic support to maintain recovery and volume."),
        session(
          "TUE",
          "Hybrid intervals",
          "Race-Specific",
          "high",
          "Combined run-plus-station work to build HYROX-specific repeatability.",
        ),
        session("WED", "Strength endurance", "Strength", "moderate", "Target strength under fatigue and muscular repeatability."),
        session("THU", "Threshold running", "LT2", "high", "Controlled threshold support to raise sustainable running output."),
        session("FRI", "Strength & durability", "Strength", "moderate", "Reinforce tissue resilience and force support."),
        session(
          "SAT",
          "Race-specific session",
          "Race-Specific",
          "high",
          "Primary race-relevant exposure focused on pacing and tolerance.",
        ),
        session("SUN", "Recovery / mobility", "Recovery", "off", "Reduce accumulated fatigue and keep the next week executable."),
      ],
    },

    injury_rebuild: {
      templateName: "Injury Rebuild",
      weekHeadline: "Week structure: durability-first rebuild",
      weekPurpose: "Rebuild consistency, tissue tolerance, and confidence before chasing higher-intensity outcomes.",
      sessionCards: [
        session("MON", "Easy aerobic run", "Zone 2", "low", "Low-intensity running to rebuild consistency and tolerance."),
        session("TUE", "Strength & durability", "Strength", "moderate", "Focused strength work to rebuild support and tissue capacity."),
        session("WED", "Easy aerobic run", "Zone 2", "low", "Controlled aerobic work with low mechanical cost."),
        session("THU", "Mobility / recovery", "Recovery", "off", "Lower total stress and support movement quality."),
        session("FRI", "Aerobic progression", "Zone 2", "moderate", "Controlled progression session without aggressive intensity."),
        session("SAT", "Easy aerobic run", "Zone 2", "low", "Maintain frequency and build tolerance gradually."),
        session("SUN", "Off / recovery", "Recovery", "off", "Protect adaptation and keep the rebuild sustainable."),
      ],
    },

    team_sport: {
      templateName: "Team Sport Conditioning",
      weekHeadline: "Week structure: repeatability + robustness",
      weekPurpose: "Support repeat efforts, speed exposure, and durability without accumulating useless fatigue.",
      sessionCards: [
        session("MON", "Recovery / mobility", "Recovery", "off", "Reset after higher-output work or match demands."),
        session(
          "TUE",
          "Speed / acceleration",
          "Speed",
          "high",
          "High-quality speed exposure to support max-speed and acceleration qualities.",
        ),
        session("WED", "Strength", "Strength", "moderate", "Strength support for robustness and force production."),
        session("THU", "Conditioning / repeat efforts", "Hybrid", "high", "Build repeatability and fatigue resistance for field demands."),
        session("FRI", "Strength", "Strength", "moderate", "Secondary strength exposure without unnecessary volume."),
        session("SAT", "Aerobic support / game prep", "Zone 2", "low", "Low-cost conditioning or pre-competition preparation."),
        session("SUN", "Recovery", "Recovery", "off", "Full recovery to preserve readiness."),
      ],
    },

    general_endurance: {
      templateName: "General Endurance",
      weekHeadline: "Week structure: broad aerobic development",
      weekPurpose: "Create a balanced week that builds aerobic support, durability, and repeatability.",
      sessionCards: [
        session("MON", "Recovery / mobility", "Recovery", "off", "Low-stress reset and movement support."),
        session("TUE", "Threshold support", "LT2", "high", "Controlled moderate-high intensity to improve sustainable output."),
        session("WED", "Aerobic run", "Zone 2", "low", "Easy aerobic support work."),
        session("THU", "Strength & durability", "Strength", "moderate", "General strength support and robustness."),
        session("FRI", "Aerobic support", "Zone 2", "low", "Low-cost aerobic volume."),
        session("SAT", "Long aerobic session", "Zone 2", "moderate", "Build endurance capacity and consistency."),
        session("SUN", "Recovery", "Recovery", "off", "Keep fatigue low enough to repeat the week well."),
      ],
    },
  };

  return templates[templateKey] || templates.general_endurance;
}

function session(
  day: string,
  title: string,
  systemTag: SessionCard["systemTag"],
  intensity: SessionCard["intensity"],
  description: string,
): SessionCard {
  return { day, title, systemTag, intensity, description };
}

// ========================================
// TEMPLATE ADAPTATION
// ========================================

function adaptTemplateSessions(
  sessions: SessionCard[],
  input: WeeklyTemplateInput,
  riskProfile: RiskProfile,
  timeProfile: TimeProfile,
): SessionCard[] {
  const weakness = (input.weakness || "").toLowerCase();
  const injuryText = (input.injuryHistory || "").toLowerCase();

  let adapted = [...sessions];

  if (riskProfile === "high") {
    adapted = adapted.map((card) => {
      if (card.intensity === "high" && (card.systemTag === "Speed" || card.systemTag === "Race-Specific")) {
        return {
          ...card,
          title: card.systemTag === "Speed" ? "Controlled economy work" : "Controlled race-specific exposure",
          intensity: "moderate" as const,
          description: "Keep the session technically sharp while controlling mechanical and fatigue cost.",
        };
      }
      return card;
    });
  }

  if (weakness.includes("aerobic")) {
    adapted = adapted.map((card) => {
      if (card.day === "FRI" && card.systemTag === "Strength") {
        return {
          ...card,
          title: "Aerobic support run",
          systemTag: "Zone 2" as const,
          intensity: "low" as const,
          description: "Additional easy aerobic support to reinforce base development without adding heavy stress.",
        };
      }
      return card;
    });
  }

  if (weakness.includes("threshold")) {
    adapted = adapted.map((card) => {
      if (card.day === "THU" && card.systemTag === "Speed") {
        return {
          ...card,
          title: "Controlled threshold support",
          systemTag: "LT2" as const,
          intensity: "moderate" as const,
          description: "Secondary controlled threshold-style support to improve repeatability around sustainable pace.",
        };
      }
      return card;
    });
  }

  if (weakness.includes("strength")) {
    adapted = adapted.map((card) => {
      if (card.day === "FRI" && (card.systemTag === "Zone 2" || card.systemTag === "Recovery")) {
        return {
          ...card,
          title: "Strength & durability",
          systemTag: "Strength" as const,
          intensity: "moderate" as const,
          description: "Strength support to improve force production, resilience, and economy under fatigue.",
        };
      }
      return card;
    });
  }

  if (weakness.includes("fatigue")) {
    adapted = adapted.map((card) => {
      if (card.day === "WED" && card.systemTag !== "Recovery") {
        return {
          ...card,
          title: "Recovery / aerobic reset",
          systemTag: "Recovery" as const,
          intensity: "off" as const,
          description: "Intentionally lower the stress here to improve repeatability across the full training week.",
        };
      }
      return card;
    });
  }

  if (
    injuryText.includes("calf") ||
    injuryText.includes("achilles") ||
    injuryText.includes("hamstring") ||
    injuryText.includes("back") ||
    injuryText.includes("lower back")
  ) {
    adapted = adapted.map((card) => {
      if (card.systemTag === "Speed") {
        return {
          ...card,
          title: "Controlled speed / economy",
          intensity: "moderate" as const,
          description: "Keep speed exposure sub-maximal to improve mechanics while managing tissue load.",
        };
      }
      return card;
    });
  }

  if (timeProfile === "low" && (input.sessionsPerWeek || 0) <= 4) {
    adapted = adapted.map((card) => {
      if (card.day === "SUN") {
        return {
          ...card,
          title: "Off / recovery",
          systemTag: "Off" as const,
          intensity: "off" as const,
          description: "Deliberate rest to keep the limited-session week effective.",
        };
      }
      return card;
    });
  }

  return adapted;
}

// ========================================
// INTENSITY DISTRIBUTION
// ========================================

function buildIntensityDistribution(
  sessions: SessionCard[],
  input: WeeklyTemplateInput,
  timeProfile: TimeProfile,
  riskProfile: RiskProfile,
): IntensityDistribution {
  const counts = sessions.reduce(
    (acc, card) => {
      if (card.intensity === "low") acc.low += 1;
      if (card.intensity === "moderate") acc.moderate += 1;
      if (card.intensity === "high") acc.high += 1;
      return acc;
    },
    { low: 0, moderate: 0, high: 0 },
  );

  const event = input.eventType;
  const weakness = (input.weakness || "").toLowerCase();

  if (event === "5k" || event === "10k" || event === "Half Marathon" || event === "Marathon") {
    if (riskProfile === "high") {
      return {
        low: "70–85%",
        moderate: "10–20%",
        high: "0–10%",
        summary: "Bias heavily toward low intensity to rebuild consistency, durability, and aerobic support.",
      };
    }

    if (event === "Marathon") {
      return {
        low: "80–90%",
        moderate: "8–15%",
        high: "0–5%",
        summary: "The week should be dominated by aerobic work, with only controlled quality layered around the long-run anchor.",
      };
    }

    if (event === "Half Marathon") {
      return {
        low: "75–85%",
        moderate: "10–20%",
        high: "5–10%",
        summary: "Most of the week stays aerobic, with threshold support used to improve sustained race ability.",
      };
    }

    if (weakness.includes("threshold")) {
      return {
        low: "70–80%",
        moderate: "10–20%",
        high: "5–10%",
        summary: "Keep the week mostly aerobic while slightly increasing controlled threshold density.",
      };
    }

    return {
      low: "75–85%",
      moderate: "10–15%",
      high: "5–10%",
      summary: "Use a mostly aerobic week with one threshold anchor and one lighter speed/economy exposure.",
    };
  }

  if (event === "HYROX" || input.sport === "HYROX") {
    if (timeProfile === "high") {
      return {
        low: "55–70%",
        moderate: "15–25%",
        high: "10–20%",
        summary: "HYROX needs a bigger race-specific and strength-endurance component, but low-intensity support still protects repeatability.",
      };
    }

    return {
      low: "60–75%",
      moderate: "15–25%",
      high: "10–15%",
      summary: "Blend aerobic support with race-relevant stress while controlling how often true high-cost work appears.",
    };
  }

  if (input.sport === "Team Sport" || event === "Team sport conditioning") {
    return {
      low: "55–70%",
      moderate: "15–25%",
      high: "10–20%",
      summary: "Keep enough low-intensity work to support recovery, then place speed and repeat-effort stress deliberately.",
    };
  }

  return {
    low: counts.low >= 3 ? "65–80%" : "60–75%",
    moderate: counts.moderate >= 2 ? "15–25%" : "10–20%",
    high: counts.high >= 2 ? "10–15%" : "5–10%",
    summary: "Most of the week should remain support-oriented, with only a small share of truly demanding work.",
  };
}

// ========================================
// COACHING TEXT HELPERS
// ========================================

function buildProgressionCheckpoint(input: WeeklyTemplateInput, _templateKey: string, riskProfile: RiskProfile): string {
  const event = input.eventType;
  const weakness = (input.weakness || "").toLowerCase();

  if (riskProfile === "high") return "Protect repeatability first; progress density and intensity only if tissue response stays stable.";
  if (event === "Marathon")
    return "Do not rush intensity; build long-run durability and aerobic support before chasing pace-specific gains.";
  if (event === "HYROX") return "Race-specific stress should rise only if recovery remains strong between hybrid exposures.";
  if (weakness.includes("aerobic"))
    return "Do not chase sharpness too early; build aerobic density first so later quality has something to sit on.";
  if (weakness.includes("threshold"))
    return "Let threshold quality improve through repeatability, not through forcing harder efforts too soon.";
  return "Establish a repeatable training rhythm before adding more stress to the week.";
}

function buildCoachingNote(
  input: WeeklyTemplateInput,
  templateKey: string,
  timeProfile: TimeProfile,
  riskProfile: RiskProfile,
): string {
  const event = input.eventType;

  if (templateKey === "injury_rebuild") return "This week is designed to rebuild confidence and tolerance, not prove fitness.";

  if (event === "5k" || event === "10k") {
    return riskProfile === "high"
      ? "The structure keeps quality controlled so aerobic development can rise without irritating durability limits."
      : "The week uses one threshold anchor and one lighter mechanical touch so speed sits on top of a growing aerobic base.";
  }
  if (event === "Half Marathon")
    return "The structure is built around sustained output, with threshold work and long-run support doing most of the heavy lifting.";
  if (event === "Marathon")
    return "This week is durability-led: the long run and surrounding aerobic support matter more than trying to force extra intensity.";
  if (event === "HYROX" || input.sport === "HYROX")
    return "The calendar blends aerobic support, strength endurance, and compromised work so hybrid performance improves without constant overreaching.";
  if (input.sport === "Team Sport")
    return "The structure protects speed quality while maintaining enough conditioning and strength to support repeatability.";
  return timeProfile === "low"
    ? "With limited weekly time, the structure keeps only the highest-value exposures."
    : "The week is arranged to balance progression with repeatability rather than just accumulating fatigue.";
}

// ========================================
// OPTIONAL HELPERS FOR UI
// ========================================

export function getIntensityBadgeColor(intensity: SessionCard["intensity"]) {
  switch (intensity) {
    case "low":
      return "emerald";
    case "moderate":
      return "amber";
    case "high":
      return "red";
    case "off":
      return "zinc";
    default:
      return "zinc";
  }
}

export function getSystemTagShort(systemTag: SessionCard["systemTag"]) {
  const map: Record<SessionCard["systemTag"], string> = {
    "Zone 2": "Z2",
    LT2: "LT2",
    Speed: "SPD",
    Strength: "STR",
    Recovery: "REC",
    Hybrid: "HYB",
    "Race-Specific": "RACE",
    Off: "OFF",
  };

  return map[systemTag] || systemTag;
}
