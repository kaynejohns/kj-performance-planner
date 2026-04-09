import { buildRealitySummary } from "./plannerGapAnalysis";
import { usesRunningVolumeBands } from "./plannerSpecificityLogic";
import type { IntakeInput } from "./types";

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function roundKm(n: number) {
  return Math.round(n);
}

function formatKmRange(low: number, high: number) {
  const a = roundKm(low);
  const b = roundKm(high);
  if (a === b) return `~${a} km`;
  return `${a}–${b} km`;
}

function formatMinRange(low: number, high: number) {
  const a = Math.round(low);
  const b = Math.round(high);
  if (a === b) return `~${a} min`;
  return `${a}–${b} min`;
}

function collapseEqualRange(a: number, b: number, singularSuffix: string, pluralSuffix: string) {
  if (a === b) return `${a} ${a === 1 ? singularSuffix : pluralSuffix}`;
  return `${a}–${b} ${pluralSuffix}`;
}

function formatMinutesAsHoursRange(minA: number, minB: number) {
  const a = minA / 60;
  const b = minB / 60;
  if (Math.round(a * 10) === Math.round(b * 10)) return `${a.toFixed(1)} hrs`;
  return `${a.toFixed(1)}–${b.toFixed(1)} hrs`;
}

function formatLoadDisplay(minA: number, minB: number) {
  const low = Math.round(minA);
  const high = Math.round(minB);
  if (Math.max(low, high) >= 120) return formatMinutesAsHoursRange(low, high);
  return formatMinRange(low, high);
}

function formatCountRange(min: number, max: number, noun = "session") {
  return collapseEqualRange(min, max, noun, `${noun}s`);
}

/** Rhythm / repeatability proxy from availability only (no diary data). */
function assessConsistencyBand(input: IntakeInput): "fragile" | "moderate" | "solid" {
  const s = input.sessionsPerWeek || 0;
  const h = input.hoursPerWeek || 0;
  const avg = s > 0 ? h / s : 0;
  if (s <= 2 || avg < 0.5) return "fragile";
  if (s >= 5 && avg >= 0.85) return "solid";
  if (s >= 4 && avg >= 0.65) return "moderate";
  return avg < 0.58 ? "fragile" : "moderate";
}

function consistencyMultiplier(band: "fragile" | "moderate" | "solid", injuryRisk: boolean) {
  if (injuryRisk) return band === "fragile" ? 0.78 : band === "moderate" ? 0.88 : 0.92;
  if (band === "fragile") return 0.86;
  if (band === "solid") return 1.06;
  return 1;
}

function estimateWeeklyKm(input: IntakeInput): number {
  if (input.weeklyKm != null && input.weeklyKm > 0) return input.weeklyKm;
  const h = input.hoursPerWeek || 0;
  if (h <= 0) return 28;
  return clamp(Math.round(h * 8.5), 18, 110);
}

function estimateLongestRunKm(input: IntakeInput, weeklyKm: number): number {
  if (input.longestRun != null && input.longestRun > 0) return input.longestRun;
  const et = input.eventType;
  if (et === "Marathon") return clamp(weeklyKm * 0.32, 24, 38);
  if (et === "Half Marathon") return clamp(weeklyKm * 0.28, 14, 26);
  if (et === "10k" || et === "5k") return clamp(weeklyKm * 0.22, 8, 18);
  return clamp(weeklyKm * 0.25, 10, 22);
}

function longRunShare(eventType: IntakeInput["eventType"]) {
  if (eventType === "Marathon") return { min: 0.28, max: 0.34 };
  if (eventType === "Half Marathon") return { min: 0.24, max: 0.3 };
  if (eventType === "10k" || eventType === "5k") return { min: 0.18, max: 0.26 };
  return { min: 0.2, max: 0.28 };
}

function weeklyProgressionRate(
  classification: string,
  injuryRisk: boolean,
  foundation: boolean,
  consistencyMult: number,
) {
  let r = 0.055;
  if (classification === "Minor jump") r = 0.065;
  else if (classification === "Moderate jump") r = 0.052;
  else if (classification === "Ambitious jump") r = 0.042;
  else r = 0.03;
  if (foundation) r *= 0.78;
  if (injuryRisk) r *= 0.52;
  r *= consistencyMult;
  return clamp(r, 0.015, 0.075);
}

function pctBandFromRate(rate: number) {
  const lo = Math.max(2, Math.round(rate * 100 * 0.72));
  const hi = Math.min(11, Math.round(rate * 100 * 1.28));
  if (hi < lo) return `${lo}%`;
  return `${lo}–${hi}%`;
}

function deloadPctBand(ratio: number) {
  const drop = (1 - ratio) * 100;
  const lo = Math.max(18, Math.round(drop * 0.88));
  const hi = Math.min(35, Math.round(drop * 1.12));
  return `${lo}–${hi}%`;
}

function qualityCountRange(input: IntakeInput, weekIndex: 1 | 2 | 3 | 4): { min: number; max: number } {
  const stated = input.qualitySessionsPerWeek;
  const base =
    stated != null && stated > 0
      ? stated
      : input.sessionsPerWeek <= 4
        ? 1
        : input.sessionsPerWeek <= 6
          ? 2
          : 2;
  const cap = clamp(Math.floor((input.sessionsPerWeek || 4) / 2), 1, 3);
  const w = weekIndex === 4 ? Math.max(1, base - 1) : base;
  const min = clamp(Math.min(w, cap), 1, 3);
  const max = clamp(Math.min(w + (weekIndex === 3 ? 1 : 0), cap), min, 3);
  return { min, max };
}

function strengthCountRange(input: IntakeInput, weekIndex: 1 | 2 | 3 | 4) {
  const hyrox = input.sport === "HYROX" || input.sport === "Hybrid";
  const wantsStrength = input.weakness === "Strength" || hyrox;
  const base = wantsStrength ? 2 : input.sessionsPerWeek >= 5 ? 2 : 1;
  const deload = weekIndex === 4;
  const n = deload ? Math.max(1, base - 1) : base;
  return { min: clamp(n, 1, 3), max: clamp(n, 1, 3) };
}

function isHyroxPath(input: IntakeInput) {
  return input.sport === "HYROX" || input.sport === "Hybrid";
}

/** Aerobic engine minutes / week; scales from stated hours, not generic defaults. */
function hyroxAerobicBand(input: IntakeInput, weekIndex: 1 | 2 | 3 | 4, injuryRisk: boolean, foundation: boolean) {
  const h = input.hoursPerWeek || 4;
  const base = clamp(h * 52, 140, 320);
  const step =
    weekIndex === 4 ? -0.24 : weekIndex === 3 ? (foundation ? 0.08 : 0.11) : weekIndex === 2 ? 0.06 : 0;
  const inj = injuryRisk ? 0.92 : 1;
  const low = base * (1 + step) * inj * 0.9;
  const high = base * (1 + step) * inj * 1.08;
  return formatLoadDisplay(low, high);
}

function hyroxRaceSpecificBand(weekIndex: 1 | 2 | 3 | 4, injuryRisk: boolean) {
  const scale = injuryRisk ? 0.85 : 1;
  const bands: Record<1 | 2 | 3 | 4, [number, number]> = {
    1: [22, 38],
    2: [30, 48],
    3: [38, 58],
    4: [22, 35],
  };
  const [a, b] = bands[weekIndex];
  return formatLoadDisplay(a * scale, b * scale);
}

function hyroxStationDensityLine(weekIndex: 1 | 2 | 3 | 4, injuryRisk: boolean) {
  const rest = injuryRisk ? "generous" : "standard";
  if (weekIndex === 1) return `2–3 station clusters / key session; ${rest} intra-cluster recovery`;
  if (weekIndex === 2) return `3–4 clusters or slightly longer continuous blocks; tighten recovery ~10–20% vs W1`;
  if (weekIndex === 3) return `3–5 clusters; race-like sequencing with controlled walk/jog transitions`;
  return `1–2 short clusters only; crisp movement quality over density`;
}

function thresholdSupportBand(
  weekIndex: 1 | 2 | 3 | 4,
  injuryRisk: boolean,
  event: "Half Marathon" | "Marathon",
) {
  const scale = injuryRisk ? 0.88 : 1;
  const isMarathon = event === "Marathon";
  const base: Record<1 | 2 | 3 | 4, [number, number]> = isMarathon
    ? {
        1: [28, 42],
        2: [32, 48],
        3: [38, 55],
        4: [22, 34],
      }
    : {
        1: [24, 38],
        2: [28, 44],
        3: [34, 52],
        4: [18, 30],
      };
  const [a, b] = base[weekIndex];
  return `${formatLoadDisplay(a * scale, b * scale)} cumulative threshold-type work (tempo / cruise / threshold reps), split across ${weekIndex === 4 ? "1" : "1–2"} sessions`;
}

export interface QuantitativeWeekPayload {
  volumeTarget: string;
  longRunTarget: string;
  qualityTarget: string;
  strengthTarget: string;
  keyAdaptationGoal: string;
  guardrail: string;
  progressionMarkers: string[];
  thresholdSupportTarget?: string;
  hyroxRaceSpecificTarget?: string;
  hyroxStationDensityTarget?: string;
}

export interface QuantitativeBlock {
  startingPoint: {
    weeklyVolume: string;
    longestRun?: string;
    qualitySessions: string;
    strengthExposure: string;
    availability: string;
    raceSpecificExposure?: string;
    thresholdSupport?: string;
    baselineNote: string;
  };
  blockTargets: {
    week3PeakVolume: string;
    week4DeloadVolume: string;
    qualitySessionsPerWeek: string;
    strengthSessionsPerWeek: string;
    raceSpecificExposure?: string;
    thresholdSupport?: string;
  };
  foundationNote?: string;
  phaseLabel?: string;
  progressionContext: string;
  weeks: Record<1 | 2 | 3 | 4, QuantitativeWeekPayload>;
}

export function buildQuantitativeBlock(input: IntakeInput): QuantitativeBlock {
  const gap = buildRealitySummary(input);
  const classification = gap.classification;
  const foundation =
    classification === "Major jump" ||
    classification === "Long-term transformation" ||
    input.goal === "Return from injury";

  const injuryRisk =
    Boolean(input.injuryHistory?.trim()) ||
    input.eventType === "Return from injury" ||
    input.goal === "Return from injury";

  const isRunning = usesRunningVolumeBands(input);
  const hyrox = isHyroxPath(input);
  const consistencyBand = assessConsistencyBand(input);
  const consistencyMult = consistencyMultiplier(consistencyBand, injuryRisk);

  const statedKm = input.weeklyKm != null && input.weeklyKm > 0;
  const statedLong = input.longestRun != null && input.longestRun > 0;
  const enduranceEvent = input.eventType === "Half Marathon" || input.eventType === "Marathon";

  const weeklyKm0 = estimateWeeklyKm(input);
  const long0 = estimateLongestRunKm(input, weeklyKm0);
  const share = longRunShare(input.eventType);
  const rate = weeklyProgressionRate(classification, injuryRisk, foundation, consistencyMult);

  const deloadRatio = foundation ? 0.76 : 0.72;
  const w1 = weeklyKm0;
  const w2 = weeklyKm0 * (1 + rate);
  const w3 = weeklyKm0 * (1 + rate) ** 2;
  const w4 = w3 * deloadRatio;
  const wk = [w1, w2, w3, w4];

  const longRuns: number[] = wk.map((vol, idx) => {
    if (!isRunning) return 0;
    const weekNum = (idx + 1) as 1 | 2 | 3 | 4;
    if (weekNum === 4) {
      const lr = long0 * (1 + rate * 0.52) ** 3 * 0.8;
      const pct = clamp(lr / Math.max(vol, 1), share.min * 0.85, share.max * 1.05);
      return clamp(vol * pct, 6, 48);
    }
    const lr = long0 * (1 + rate * 0.52) ** idx;
    const pct = clamp(lr / Math.max(vol, 1), share.min, share.max * 1.08);
    return clamp(vol * pct, 6, 48);
  });

  const progressionContext = `Weekly step size targets ~${pctBandFromRate(rate)} when load is tolerated; tuned for ${injuryRisk ? "injury caution" : "standard durability"}, ${consistencyBand} weekly rhythm (from your session count + hours), and ${foundation ? "foundation-first pacing" : "regular block progression"}.`;

  const baselineNote = [
    hyrox
      ? "Current block starts from your available training bandwidth, with aerobic support and strength-endurance exposures matched to your stated schedule."
      : statedKm
        ? `Current load is anchored to your reported baseline of ~${roundKm(weeklyKm0)} km/week, with the long run built around your current tolerance.`
        : `Current load is estimated from your weekly availability (${input.hoursPerWeek}h), then constrained into a repeatable progression band.`,
    statedLong
      ? `Long-run anchor uses your stated current longest of ~${roundKm(long0)} km.`
      : isRunning
        ? `Long-run anchor is estimated from current volume and event demands; update once your current tolerance is confirmed.`
        : null,
  ]
    .filter(Boolean)
    .join(" ")
    .trim() || "Use logged training history to tighten these bands after week 1.";

  const phaseLabel = foundation ? "Phase 1 of a larger performance pathway (4 weeks)" : undefined;
  const foundationNote = foundation
    ? "Your goal sits in a longer arc. This block is Phase 1: build repeatability, durability, and load tolerance—then reassess before chasing race-specific peaks."
    : undefined;

  const weeks: QuantitativeBlock["weeks"] = {
    1: {} as QuantitativeBlock["weeks"][1],
    2: {} as QuantitativeBlock["weeks"][2],
    3: {} as QuantitativeBlock["weeks"][3],
    4: {} as QuantitativeBlock["weeks"][4],
  };

  ([1, 2, 3, 4] as const).forEach((wi) => {
    const qc = qualityCountRange(input, wi);
    const sc = strengthCountRange(input, wi);
    const qText =
      formatCountRange(qc.min, qc.max, "quality session");

    if (hyrox) {
      const aerobic = hyroxAerobicBand(input, wi, injuryRisk, foundation);
      const raceSpec = hyroxRaceSpecificBand(wi, injuryRisk);
      const station = hyroxStationDensityLine(wi, injuryRisk);
      const markers: string[] = [
        `Aerobic conditioning (easy + steady): ${aerobic} total across the week`,
        `Race-specific / compromised running exposure: ${raceSpec}`,
        `Station density: ${station}`,
      ];
      weeks[wi] = {
        volumeTarget: `${aerobic} aerobic support (rows, bike, jog, ski—distributed across the week)`,
        longRunTarget: `${raceSpec} compromised running / race-specific support`,
        qualityTarget: qText,
        strengthTarget: `${formatCountRange(sc.min, sc.max)} strength-endurance support`,
        keyAdaptationGoal:
          wi === 1
            ? "Own pacing and transitions; keep repeatability > hero efforts"
            : wi === 2
              ? "Extend time at sustainable race rhythm without breaking running mechanics"
              : wi === 3
                ? "Highest race-like stress; protect technique on the last run segments"
                : "Absorb; keep sharpness with low residual fatigue",
        guardrail: injuryRisk
          ? "Symptoms >3/10 or sharp tissue response → cut station density first, then shorten runs"
          : wi === 3
            ? "If running form degrades in final segments, shorten the run, not the stations"
            : "If morning HRV/resting HR trend wrong 2–3 days, hold volume flat",
        progressionMarkers: markers,
        hyroxRaceSpecificTarget: raceSpec,
        hyroxStationDensityTarget: station,
      };
      return;
    }

    if (!isRunning) {
      const trainMin = Math.round((input.hoursPerWeek || 4) * 55);
      const markers: string[] = [
        `Structured training time: ${formatLoadDisplay(trainMin * (0.9 + (wi - 1) * 0.04), trainMin * (1.02 + (wi - 1) * 0.05))} (excl. warm-up)`,
        wi > 1
          ? `Week-on-week: aim ~${pctBandFromRate(rate * 0.85)} more total productive time vs prior week if recovery holds`
          : "Hold total time stable; prioritize execution quality over novelty",
        `Strength exposure: ${formatCountRange(sc.min, sc.max)}`,
      ];
      weeks[wi] = {
        volumeTarget: `${formatLoadDisplay(trainMin * (0.92 + (wi - 1) * 0.035), trainMin * (1.05 + (wi - 1) * 0.045))} / week structured conditioning`,
        longRunTarget: "Use sport-specific continuous intervals or game-style conditioning; no single long-run metric",
        qualityTarget: qText,
        strengthTarget: `${formatCountRange(sc.min, sc.max)} strength / durability`,
        keyAdaptationGoal:
          wi === 1
            ? "Stabilize weekly rhythm and intensity separation"
            : wi === 2
              ? "Grow work duration before adding complexity"
              : wi === 3
                ? "Peak week for specificity; keep one clear recovery buffer"
                : "Deload time on feet while keeping skills fresh",
        guardrail: injuryRisk
          ? "Pain or joint irritability → reduce impact volume first, keep strength technique work"
          : "If soreness stacks into two hard days in a row, slide the second hard day later",
        progressionMarkers: markers,
      };
      return;
    }

    const volLow = wk[wi - 1] * 0.97;
    const volHigh = wk[wi - 1] * 1.03;
    const lrLow = longRuns[wi - 1] * 0.96;
    const lrHigh = longRuns[wi - 1] * 1.04;

    const wow =
      wi === 1
        ? `Anchor weekly km at ${formatKmRange(volLow, volHigh)}—no forced jump vs your current band`
        : wi === 4
          ? `Deload: plan ~${deloadPctBand(w4 / w3)} less weekly km than week 3 (${formatKmRange(volLow, volHigh)})`
          : `Week-on-week: target ~${pctBandFromRate(rate)} higher weekly km than prior week if sleep, soreness, and sessions stay stable`;

    const lrWow =
      wi === 1
        ? `Long run stays near ${formatKmRange(lrLow, lrHigh)}—extend only if the rest of the week felt easy`
        : wi === 4
          ? `Long run reduced in line with deload (${formatKmRange(lrLow, lrHigh)})`
          : `Long run moves to about ${formatKmRange(lrLow, lrHigh)} (${enduranceEvent ? "priority lever for event durability" : "support aerobic durability"})`;

    const markers = [wow, lrWow, `${qText}; ${sc.min} strength session${sc.min === 1 ? "" : "s"}`];

    const thresholdSupportTarget = enduranceEvent
      ? thresholdSupportBand(
          wi,
          injuryRisk,
          input.eventType === "Marathon" ? "Marathon" : "Half Marathon",
        )
      : undefined;

    weeks[wi] = {
      volumeTarget: `Weekly running volume ${formatKmRange(volLow, volHigh)}`,
      longRunTarget: `Longest continuous run ${formatKmRange(lrLow, lrHigh)}`,
      qualityTarget: qText,
      strengthTarget: `${formatCountRange(sc.min, sc.max)} strength / durability`,
      keyAdaptationGoal:
        enduranceEvent && wi <= 3
          ? wi === 3
            ? "Long-run durability + threshold support are the week’s performance spine"
            : "Build weekly km and long-run tolerance; threshold work supports pace control, not sprints"
          : wi === 1
            ? "Stabilize weekly rhythm and intensity separation"
            : wi === 2
              ? "Grow aerobic support while keeping quality crisp"
              : wi === 3
                ? "Highest specific stress week; execution over extras"
                : "Deload volume while retaining one quality touchpoint",
      guardrail:
        foundation && wi <= 2
          ? "Phase 1 rule: no goal-pace testing until easy volume repeats week-to-week without spikes in fatigue"
          : injuryRisk
            ? "Pain >3/10 or loading pain that warms up worse → remove quality first, keep easy movement"
            : wi === 4
              ? "No time trials; finish key reps with reserve"
              : "If quality days bleed into the next morning’s easy run, hold volume flat",
      progressionMarkers: markers,
      thresholdSupportTarget,
    };
  });

  const trainMin = Math.round((input.hoursPerWeek || 4) * 58);
  const startingPoint: QuantitativeBlock["startingPoint"] = {
    weeklyVolume: isRunning
      ? formatKmRange(weeklyKm0 * 0.98, weeklyKm0 * 1.02)
      : hyrox
        ? `${hyroxAerobicBand(input, 1, injuryRisk, foundation)} aerobic support`
        : `${formatLoadDisplay(trainMin * 0.82, trainMin * 1.06)} / week structured work`,
    longestRun: isRunning ? formatKmRange(long0 * 0.97, long0 * 1.03) : undefined,
    qualitySessions:
      input.qualitySessionsPerWeek != null && input.qualitySessionsPerWeek > 0
        ? `${formatCountRange(input.qualitySessionsPerWeek, input.qualitySessionsPerWeek)} planned`
        : `${formatCountRange(qualityCountRange(input, 1).min, qualityCountRange(input, 1).max)} planned`,
    strengthExposure: `${formatCountRange(strengthCountRange(input, 1).min, strengthCountRange(input, 2).max)} / week`,
    availability: `${input.sessionsPerWeek} sessions · ${input.hoursPerWeek}h`,
    raceSpecificExposure: hyrox ? `${hyroxRaceSpecificBand(1, injuryRisk)} race-specific hybrid work` : undefined,
    thresholdSupport:
      enduranceEvent ? thresholdSupportBand(1, injuryRisk, input.eventType === "Marathon" ? "Marathon" : "Half Marathon") : undefined,
    baselineNote,
  };

  const blockTargets: QuantitativeBlock["blockTargets"] = {
    week3PeakVolume: isRunning
      ? formatKmRange(wk[2] * 0.97, wk[2] * 1.03)
      : hyrox
        ? `${hyroxAerobicBand(input, 3, injuryRisk, foundation)} aerobic support`
        : weeks[3].volumeTarget,
    week4DeloadVolume: isRunning
      ? formatKmRange(wk[3] * 0.97, wk[3] * 1.03)
      : hyrox
        ? `${hyroxAerobicBand(input, 4, injuryRisk, foundation)} aerobic support (deload)`
        : weeks[4].volumeTarget,
    qualitySessionsPerWeek: `${formatCountRange(qualityCountRange(input, 3).min, qualityCountRange(input, 3).max)} (peak week)`,
    strengthSessionsPerWeek: formatCountRange(strengthCountRange(input, 3).min, strengthCountRange(input, 3).max),
    raceSpecificExposure: hyrox ? `${hyroxRaceSpecificBand(3, injuryRisk)} race-specific work (peak)` : undefined,
    thresholdSupport:
      enduranceEvent
        ? `${thresholdSupportBand(3, injuryRisk, input.eventType === "Marathon" ? "Marathon" : "Half Marathon")} in peak week`
        : undefined,
  };

  return {
    startingPoint,
    blockTargets,
    foundationNote,
    phaseLabel,
    progressionContext,
    weeks,
  };
}
