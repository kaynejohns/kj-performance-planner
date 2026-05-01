/**
 * Server-side prescription engine.
 * Takes AI-generated week skeletons and injects specific set/rep/rest prescriptions
 * for quality sessions. Easy/aerobic sessions keep their AI description.
 *
 * Cost: zero extra AI tokens. All logic is pure JS.
 */

// ── Intensity zone definitions (injected into calibration page, referenced here) ─
export const ZONE_GUIDE = {
  zone1: {
    label: "Zone 1 — Easy / Recovery",
    feel: "Fully conversational. Could hold a phone call. Nose breathing possible.",
    hr: "60–72% max HR",
    rpe: "RPE 2–4 / 10",
  },
  lt1: {
    label: "LT1 — Threshold (aerobic threshold)",
    feel: "Full sentences possible but you're aware of your breathing. Comfortable discomfort.",
    hr: "75–83% max HR",
    rpe: "RPE 5–6 / 10",
  },
  lt2: {
    label: "LT2 — Race-pace / Lactate threshold",
    feel: "Short phrases only. Breathing is laboured. Sustainable for 20–40 min max.",
    hr: "84–91% max HR",
    rpe: "RPE 7–8 / 10",
  },
  vo2: {
    label: "VO2 / Hard",
    feel: "Single words only. Hard effort. Used sparingly.",
    hr: "92%+ max HR",
    rpe: "RPE 9 / 10",
  },
};

// ── Normalise AI session type string ─────────────────────────────────────────
function classifyType(raw = "") {
  const t = raw.toLowerCase();
  if (t.includes("lt2") || t.includes("race-pace") || t.includes("race pace") || t.includes("cruise interval")) return "lt2";
  if (t.includes("lt1") || t.includes("threshold")) return "lt1";
  if (t.includes("long")) return "long";
  if (t.includes("strength") || t.includes("gym")) return "strength";
  if (t.includes("station") || t.includes("hyrox") || t.includes("compromised")) return "hyrox_quality";
  if (t.includes("stride") || t.includes("economy")) return "strides";
  if (t.includes("rest") || t.includes("recovery")) return "rest";
  return "easy";
}

// ── Phase within a 4-week block (1 = intro, 2 = build, 3 = peak, 4 = deload) ─
function blockPhase(weekNum) {
  const rem = ((weekNum - 1) % 4) + 1;
  return rem; // 1,2,3,4
}

// ── LT1 threshold prescriptions (progressive across the block) ────────────────
function lt1Prescription(weekNum, level) {
  const phase = blockPhase(weekNum);
  const isAdvanced = ["Advanced", "Sub-elite", "Elite"].includes(level);

  // Deload week — light touch
  if (phase === 4) {
    return {
      structure: [
        "Warm up 10 min easy, then 2 × 6 min at LT1 threshold effort.",
        "2 min easy jog between reps. Cool down 10 min easy.",
      ],
      intensityGuide: "LT1: full sentences possible, slight breathing awareness. Deload — feel it out, don't force it.",
      coachNote: "Deload version — retain the stimulus, shed the fatigue.",
      whyThisWhyNow: `Deload week. The threshold session stays in because removing it entirely causes a sharper fitness drop than reducing it. Two short reps at the right effort is enough to keep the adaptation alive while your body absorbs the previous weeks of work.`,
    };
  }

  // Progressive prescription by phase
  const prescriptions = {
    1: { reps: isAdvanced ? 3 : 2, repDuration: 8, rest: 2 },
    2: { reps: isAdvanced ? 3 : 3, repDuration: isAdvanced ? 10 : 8, rest: isAdvanced ? 90 : 2 },
    3: { reps: isAdvanced ? 4 : 3, repDuration: isAdvanced ? 10 : 10, rest: isAdvanced ? 90 : 90 },
  };

  const p = prescriptions[phase] || prescriptions[1];
  const restDisplay = p.rest === 2 ? "2 min" : p.rest === 90 ? "90 sec" : `${p.rest} min`;

  const whyThisWhyNow = {
    1: `Week ${weekNum} is about finding your threshold — not pushing it. These ${p.reps} × ${p.repDuration}-minute reps exist to establish what LT1 feels like at your current fitness. The data shows most athletes start this kind of session 8–12% too fast and fade on the later reps. If all reps feel even, you nailed it.`,
    2: `You did ${p.reps === 3 ? "2" : "2"} reps last week. This week adds a rep or extends duration — not because the intensity changes, but because volume at threshold is the stimulus. More time at the right effort builds more mitochondrial density. Same feel, more adaptation.`,
    3: `This is the peak threshold week of the block. ${p.reps} × ${p.repDuration} min is the highest threshold load you'll carry. The goal is even splits — not a faster last rep. If reps 1 and ${p.reps} feel the same, your aerobic system absorbed the previous two weeks correctly.`,
  }[phase];

  return {
    structure: [
      `Warm up 10 min easy, then ${p.reps} × ${p.repDuration} min at LT1 threshold effort.`,
      `${restDisplay} easy jog recovery between reps. Cool down 10 min easy.`,
    ],
    intensityGuide: "LT1: full sentences still possible, slight breathing awareness. HR 75–83% max. RPE 5–6.",
    coachNote: phase === 1
      ? "First exposure — find the effort, don't force the pace."
      : phase === 2
        ? "Add volume before adding intensity — same feel, more time at threshold."
        : "Peak threshold week — even splits across all reps is the goal.",
    whyThisWhyNow,
  };
}

// ── LT2 / race-pace prescriptions ────────────────────────────────────────────
function lt2Prescription(weekNum, _level, eventType) {
  const phase = blockPhase(weekNum);
  const isMarathon = eventType === "Half Marathon" || eventType === "Marathon";

  if (phase === 4) {
    return {
      structure: [
        "Warm up 10 min easy, then 3 × 4 min at LT2 / race-pace effort.",
        "3 min easy jog between reps. Cool down 10 min easy.",
      ],
      intensityGuide: "LT2: short sentences only. Controlled discomfort — not all-out. RPE 7.",
      coachNote: "Deload touch — maintain race-pace feel without accumulating fatigue.",
      whyThisWhyNow: `Deload week but race-pace feel is retained. Three short reps keep the neuromuscular pattern of race effort without the fatigue cost of a full session. Your body needs to remember what race pace feels like — this does that without digging a hole.`,
    };
  }

  const prescriptions = {
    1: { reps: 4, dur: 3, rest: "3 min" },
    2: { reps: 5, dur: 4, rest: "3 min" },
    3: { reps: 4, dur: 5, rest: "2 min 30 sec" },
  };
  const p = prescriptions[phase] || prescriptions[1];

  if (isMarathon) {
    const cruiseDur = phase === 1 ? 12 : phase === 2 ? 15 : 20;
    const cruiseReps = phase === 3 ? 2 : 1;
    return {
      structure: [
        `Warm up 10 min easy, then ${cruiseReps > 1 ? `${cruiseReps} × ` : ""}${cruiseDur} min at marathon/LT2 cruise effort.`,
        cruiseReps > 1 ? "3 min easy jog between reps. Cool down 10 min easy." : "Steady pace throughout. Cool down 10 min easy.",
      ],
      intensityGuide: "Cruise / LT2: short sentences. Marathon effort — sustainable but not comfortable. RPE 6–7.",
      coachNote: "Cruise intervals train your race engine. Pace is controlled, not maximal.",
      whyThisWhyNow: `Marathon race pace is a sustained aerobic effort, not a sprint. Cruise intervals train your body to hold that specific output for long periods by repeatedly practising it. ${cruiseDur} minutes is long enough to create the adaptation without the fatigue of a race simulation.`,
    };
  }

  const whyByPhase = {
    1: `Week ${weekNum} introduces race-pace effort. ${p.reps} × ${p.dur} min is intentionally short — enough to feel race effort, not enough to accumulate meaningful fatigue. The LT1 work in earlier weeks built the base this session draws on.`,
    2: `The reps get longer this week. Same race-pace effort, more time at it. The adaptation signal from LT2 work is proportional to time spent at that intensity — this week raises that ceiling. Recovery between reps is generous so each rep is executed, not survived.`,
    3: `Peak race-pace week. ${p.reps} × ${p.dur} min with shorter recovery is the highest race-specific load of the block. If you can hold consistent splits across all ${p.reps} reps, your aerobic system is ready for the next phase.`,
  };

  return {
    structure: [
      `Warm up 10 min easy, then ${p.reps} × ${p.dur} min at LT2 / race-pace effort.`,
      `${p.rest} easy jog between reps. Cool down 10 min easy.`,
    ],
    intensityGuide: "LT2: short sentences only. Breathing is laboured. HR 84–91% max. RPE 7–8.",
    coachNote: "Race-pace development — consistency across reps matters more than chasing the last one.",
    whyThisWhyNow: whyByPhase[phase] || whyByPhase[1],
  };
}

// ── Long run prescriptions ────────────────────────────────────────────────────
function longRunPrescription(weekNum, eventType, intake) {
  const phase = blockPhase(weekNum);
  const isMarathon = eventType === "Half Marathon" || eventType === "Marathon";
  const baseKm = intake.longestRun || 12;
  const targetKm = Math.min(baseKm + (phase - 1) * 2, eventType === "Marathon" ? 32 : 21);
  const fuelNote = isMarathon && targetKm >= 16
    ? " Take on fuel (30–60g carbs) every 40–45 min from the 30-min mark."
    : "";

  const whyLong = {
    1: `The long run at this stage exists purely for aerobic volume — not fitness testing. ${targetKm}km at Zone 1 builds mitochondrial density in your slow-twitch fibres. That infrastructure is what makes every quality session in weeks 5–12 actually land. If you run it too fast, you get fatigue without the adaptation.`,
    2: `Two kilometres longer than last week. The progression is deliberate — your aerobic system adapts to volume before it adapts to intensity. Each additional kilometre at easy effort extends your aerobic ceiling, which raises the floor of everything else.`,
    3: `Peak long run of the block. The optional steady finish in the last 20% exists because at this point in the block, your aerobic base is strong enough to tolerate a small drift toward LT1. It's optional — only use it if the preceding 80% felt controlled and easy.`,
    4: `Deload long run — 25–30% shorter than week 3. The adaptation from the previous three weeks is locked in during recovery, not during the training itself. Protecting this recovery is part of the programme.`,
  };

  return {
    structure: [
      `Run ${targetKm - 1}–${targetKm} km at fully conversational Zone 1 pace.${fuelNote}`,
      phase === 3
        ? "Last 15–20% of run can include steady Zone 1/LT1 boundary effort if legs feel strong."
        : "Keep effort fully aerobic — slow down on hills rather than pushing HR up.",
    ],
    intensityGuide: "Zone 1: full sentences throughout. If you can't, you're going too fast.",
    coachNote: phase === 4
      ? "Deload long run — cut distance 25–30% vs last week. Freshness is the point."
      : "The long run builds aerobic base. It only works at easy effort.",
    whyThisWhyNow: whyLong[phase] || whyLong[1],
  };
}

// ── Strength prescriptions ────────────────────────────────────────────────────
function strengthPrescription(weekNum, injuryAreas = [], isHyrox = false) {
  const phase = blockPhase(weekNum);
  const hasLowerLimb = injuryAreas.some(a =>
    ["Calf / Achilles", "Knee", "Hip / Glute", "Lower back / SI", "Foot / Plantar"].includes(a)
  );

  const durabilityFocus = hasLowerLimb
    ? "Calf raises 3 × 15, single-leg RDL 3 × 10 each, hip hinge (deadlift) 3 × 8, Copenhagen plank 3 × 20 sec."
    : "Hip hinge (deadlift or trap bar) 3 × 6–8, split squat 3 × 8 each, single-leg calf raise 3 × 12.";

  const hyroxExtra = isHyrox
    ? " Finish with 2 rounds: 20 × wall ball → 15 × burpee broad jump (full recovery between)."
    : "";

  const whyStrength = phase <= 2
    ? `Strength training at this stage is about durability, not power. The exercises build the connective tissue and force production capacity that prevents injury as running volume grows. Skipping this session when running increases is the most common mistake endurance athletes make — it's also when it matters most.`
    : phase === 3
      ? `Peak training load week means peak injury risk. This strength session exists specifically to maintain the structural robustness that keeps you training through the hardest week. Reduced sets, maintained quality — protect the tissue, don't add to the fatigue.`
      : `Deload strength. Maintaining the pattern without adding load. The neuromuscular signal is enough to retain the adaptation — you don't need to accumulate more this week.`;

  return {
    structure: [
      phase <= 2
        ? `Foundation strength: ${durabilityFocus}`
        : `Maintain: ${durabilityFocus}${hyroxExtra}`,
      "Trunk: dead bug 3 × 8 each, pallof press 3 × 10 each. Keep rest full (2 min) between sets.",
    ],
    intensityGuide: phase <= 2 ? "Moderate load — technique before weight. RPE 6–7." : "Maintain load, reduce sets if fatigued. RPE 6–7.",
    coachNote: hasLowerLimb
      ? "Calf and Achilles durability is non-negotiable — protect the tissue before loading."
      : "Strength sessions protect you from injury. Don't skip them when running volume increases.",
    whyThisWhyNow: whyStrength,
  };
}

// ── HYROX quality session prescriptions ──────────────────────────────────────
function hyroxQualityPrescription(weekNum) {
  const phase = blockPhase(weekNum);

  const blocks = {
    1: {
      structure: [
        "4 rounds: 500m SkiErg → 500m run (submax, controlled HR). Full 3 min rest between rounds.",
        "Focus on form off the erg — hips back, drive with lats. Run at conversation pace.",
      ],
      coachNote: "Station-to-run tolerance. The goal is quality mechanics, not speed.",
    },
    2: {
      structure: [
        "5 rounds: 500m SkiErg → 200m sled push (light-moderate load) → 500m run. 90 sec rest.",
        "Cut rest to 90 sec this week — building density not speed.",
      ],
      coachNote: "Compromised running is the HYROX skill. Sled will trash your legs — run anyway.",
    },
    3: {
      structure: [
        "Race simulation: 3 full station sequences (SkiErg → Sled push → Sled pull → Burpee broad jump → 500m run).",
        "60–90 sec rest between full rounds. Final run at race-pace effort.",
      ],
      coachNote: "Peak specificity — this is race rehearsal. Control your start, negative split the rounds.",
    },
    4: {
      structure: [
        "2 rounds: 500m SkiErg → 500m run at submax effort. Full 3 min rest.",
        "Deload volume — touch the stimulus, don't accumulate fatigue.",
      ],
      coachNote: "Deload quality — enough to retain the adaptation, not enough to dig a hole.",
    },
  };

  const whyHyrox = {
    1: `HYROX is won and lost on the runs between stations — not on the stations themselves. This week's station-to-run sequence trains your body to run at pace after your legs are already loaded. That's a specific physiological skill you cannot develop by training running and stations separately.`,
    2: `Shorter rest this week. Same stations, less recovery — that's the progression. Your cardiovascular system adapts to density (less recovery time) differently than it adapts to volume. Compressing rest forces your body to clear lactate faster, which is exactly what happens in a race.`,
    3: `Race simulation. Three full sequences is as close as you get to a race in a training environment. The final run at race-pace effort is the key data point — if you can hold race pace after two full rounds of station work, your specific race fitness is there.`,
    4: `Two rounds only — deload. The station-to-run tolerance you've built doesn't disappear in one easy week. Two controlled rounds maintain the neuromuscular pattern while your body absorbs the adaptation from the previous three weeks.`,
  };

  return {
    ...blocks[phase] || blocks[1],
    intensityGuide: "Submax effort — controlled output. RPE 6–7 throughout.",
    whyThisWhyNow: whyHyrox[phase] || whyHyrox[1],
  };
}

// ── Strides / economy ────────────────────────────────────────────────────────
function stridesPrescription() {
  return {
    structure: [
      "After easy run: 6 × 20 sec strides at relaxed fast effort — not a sprint.",
      "Full 60 sec walk recovery between each. Focus on quick feet, tall posture.",
    ],
    intensityGuide: "Strides: fast but not max. Smooth and controlled. RPE 7 for 20 sec only.",
    coachNote: "Strides maintain neuromuscular sharpness without meaningful fatigue cost.",
  };
}

// ── Main export: enrich a weeks array with prescriptions ─────────────────────
export function applyPrescriptions(weeks, intake) {
  const level = intake.level || "Intermediate";
  const eventType = intake.eventType || "5k";
  const injuryAreas = intake.injuryAreas || [];
  const isHyrox = intake.sport === "HYROX" || intake.sport === "Hybrid";

  return weeks.map((week) => {
    const sessions = Array.isArray(week.dailySessions) ? week.dailySessions : [];

    const enriched = sessions.map((session) => {
      const type = classifyType(session.type);

      let prescription = null;
      if (type === "lt1") prescription = lt1Prescription(week.week, level);
      else if (type === "lt2") prescription = lt2Prescription(week.week, level, eventType);
      else if (type === "long") prescription = longRunPrescription(week.week, eventType, intake);
      else if (type === "strength") prescription = strengthPrescription(week.week, injuryAreas, isHyrox);
      else if (type === "hyrox_quality") prescription = hyroxQualityPrescription(week.week);
      else if (type === "strides") prescription = stridesPrescription();

      if (!prescription) return session; // easy/rest — keep AI version

      return {
        ...session,
        structure: prescription.structure,
        intensityGuide: prescription.intensityGuide,
        coachNote: prescription.coachNote,
      };
    });

    return { ...week, dailySessions: enriched };
  });
}
