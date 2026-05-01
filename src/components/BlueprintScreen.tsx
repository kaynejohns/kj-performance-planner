import { useState } from "react";
import type { IntakeInput, PlannerOutput } from "../lib/types";
import { detectBeginnerPath } from "../lib/beginnerDetection";

// ── Design tokens ─────────────────────────────────────────────────────────────
const ORANGE = "#ff8a1a";
const BG     = "#080808";
const CARD   = "#0e0e0e";
const BORDER = "rgba(255,255,255,0.08)";
const RULE   = "rgba(255,255,255,0.06)";
const MUTED  = "rgba(255,255,255,0.28)";
const BODY   = "rgba(255,255,255,0.72)";
const WHITE  = "#ffffff";

// ── Phase data ────────────────────────────────────────────────────────────────
interface Phase {
  name: string;
  weeks: string;
  focus: string;
  sessions: string;
  why: string;
  color: string;
}

function buildPhases(intake: IntakeInput, plan: PlannerOutput): Phase[] {
  const isHyrox = intake.sport === "HYROX" || intake.sport === "Hybrid";
  const classification = plan.gapSummary?.classification ?? "";
  const isLong = classification.toLowerCase().includes("major") ||
    classification.toLowerCase().includes("long") ||
    classification.toLowerCase().includes("transform");

  if (isHyrox) {
    return isLong ? [
      { name: "Aerobic Base + Movement Quality", weeks: "Wks 1–8",  color: "#1A7A4A", focus: "Build aerobic engine and station mechanics",     sessions: "Zone 1 runs, station technique, foundation strength", why: "Station efficiency without an aerobic base just produces fast fatigue. You need the engine before the race-specific work." },
      { name: "Strength Endurance",              weeks: "Wks 9–16", color: ORANGE,    focus: "Develop force under fatigue",                    sessions: "Station loading, compromised runs, LT1 threshold", why: "HYROX times are set on the runs after heavy station work. This phase trains that specific demand." },
      { name: "Race-Specific Integration",       weeks: "Wks 17–24",color: "#C0392B", focus: "Full station sequences at race pace",             sessions: "Race simulations, LT2 intervals, reduced strength", why: "The previous phases built the components. This phase assembles them into race-specific output." },
      { name: "Peak and Taper",                  weeks: "Wks 25+",  color: "#2C5F8A", focus: "Maintain sharpness, reduce fatigue",              sessions: "Short quality sessions, minimal volume, sleep priority", why: "Fitness is already built. This phase removes fatigue so you can express it on race day." },
    ] : [
      { name: "Aerobic Base + Movement Quality", weeks: "Wks 1–4",  color: "#1A7A4A", focus: "Build aerobic engine and station mechanics",     sessions: "Zone 1 runs, station technique, foundation strength", why: "Station efficiency without an aerobic base just produces fast fatigue. You need the engine before the race-specific work." },
      { name: "Strength Endurance",              weeks: "Wks 5–8",  color: ORANGE,    focus: "Develop force under fatigue",                    sessions: "Station loading, compromised runs, LT1 threshold", why: "HYROX times are set on the runs after heavy station work. This phase trains that specific demand." },
      { name: "Race-Specific Integration",       weeks: "Wks 9–12", color: "#C0392B", focus: "Full station sequences + taper",                 sessions: "Race simulations, LT2, taper volume", why: "The previous phases built the components. This phase converts them to race-day output then reduces fatigue." },
    ];
  }

  return isLong ? [
    { name: "Aerobic Foundation",         weeks: "Wks 1–8",  color: "#1A7A4A", focus: "Build the aerobic base everything else rests on",  sessions: "Zone 1 easy runs, long run, foundation strength", why: "Threshold fitness, speed, and economy all have a ceiling determined by aerobic base. This phase raises that ceiling before adding quality work." },
    { name: "Threshold Development",      weeks: "Wks 9–16", color: ORANGE,    focus: "Raise the sustainable hard effort ceiling",        sessions: "LT1 intervals, continued easy volume, strength maintenance", why: "With the aerobic base built, threshold work now drives the biggest performance gains. This phase is where most of the time improvement happens." },
    { name: "Race-Specific Sharpening",   weeks: "Wks 17–24",color: "#C0392B", focus: "Convert fitness to race-specific output",          sessions: "LT2 race-pace work, reduced volume, economy strides", why: "General fitness doesn't automatically transfer to race-day performance. This phase trains the specific pace you'll race at." },
    { name: "Peak and Taper",             weeks: "Wks 25+",  color: "#2C5F8A", focus: "Maintain fitness, eliminate fatigue",              sessions: "Short quality sessions, significant volume reduction", why: "The hard work is done. Taper removes accumulated fatigue so you can express your fitness on race day." },
  ] : [
    { name: "Aerobic Foundation",       weeks: "Wks 1–4",  color: "#1A7A4A", focus: "Build the base everything else rests on",       sessions: "Zone 1 easy runs, long run, foundation strength", why: "Threshold fitness and speed both have a ceiling determined by your aerobic base. This phase raises that ceiling before adding quality work." },
    { name: "Threshold Development",    weeks: "Wks 5–8",  color: ORANGE,    focus: "Raise the sustained hard effort ceiling",       sessions: "LT1 threshold intervals, aerobic volume, strength", why: "With base built, threshold work drives the biggest performance gains. This phase converts aerobic fitness into race-pace capacity." },
    { name: "Race-Specific Sharpening", weeks: "Wks 9–12", color: "#C0392B", focus: "Convert fitness to race output + taper",        sessions: "LT2 race-pace work, reduced volume, strides, taper", why: "General fitness doesn't automatically transfer to race performance. This phase trains the specific pace and taper eliminates fatigue." },
  ];
}

// ── Volume bar data ───────────────────────────────────────────────────────────
// Compounding 10% per build week. Block 2 picks up at block 1 peak.
// Deload = 70% of that block's peak week.
function buildVolumeBars(weeklyKm?: number) {
  const base = weeklyKm || 40;
  // Block 1
  const w1 = Math.round(base);
  const w2 = Math.round(base * 1.10);
  const w3 = Math.round(base * 1.21);          // +10% on w2
  const w4 = Math.round(base * 1.21 * 0.70);   // deload
  // Block 2 — picks up at w3 level, compounds again
  const w5 = Math.round(base * 1.21);
  const w6 = Math.round(base * 1.33);
  const w7 = Math.round(base * 1.46);          // +10% on w6
  const w8 = Math.round(base * 1.46 * 0.70);   // deload
  const max = w7;
  const toPct = (km: number) => Math.max(18, Math.round((km / max) * 88));
  return [
    { week: 1, pct: toPct(w1), deload: false, km: w1 },
    { week: 2, pct: toPct(w2), deload: false, km: w2 },
    { week: 3, pct: toPct(w3), deload: false, km: w3 },
    { week: 4, pct: toPct(w4), deload: true,  km: w4 },
    { week: 5, pct: toPct(w5), deload: false, km: w5 },
    { week: 6, pct: toPct(w6), deload: false, km: w6 },
    { week: 7, pct: toPct(w7), deload: false, km: w7 },
    { week: 8, pct: toPct(w8), deload: true,  km: w8 },
  ];
}

// ── Injury profile builder ────────────────────────────────────────────────────
interface InjuryInsight {
  injuryName: string;
  whyItHappens: string;
  whyStrengthFixes: string;
  keyExercises: { name: string; prescription: string; why: string }[];
  warningSign: string;
  timelineNote: string;
}
interface InjuryProfile {
  hasAnyInjury: boolean;
  hasBoneStress: boolean;
  insights: InjuryInsight[];
}

function buildInjuryProfile(intake: IntakeInput): InjuryProfile | null {
  const history = (intake.injuryHistory || "").toLowerCase();

  const hasCalf       = history.includes("calf");
  const hasAchilles   = history.includes("achilles");
  const hasHamstring  = history.includes("hamstring");
  const hasKnee       = history.includes("knee") || history.includes("patella") || history.includes("itb") || history.includes("it band");
  const hasHip        = history.includes("hip") || history.includes("glute");
  const hasLowerBack  = history.includes("lower back") || history.includes("lumbar");
  const hasPlantar    = history.includes("plantar") || history.includes("fascia");
  const hasAnkle      = history.includes("ankle") || history.includes("sprain") || history.includes("inversion");
  // Bone stress must be detected before shins — "stress fracture" should NOT fall into hasShins
  const hasBoneStress = ["bone stress", "stress fracture", "fracture", "bmd", "bone density", "metatarsal stress", "navicular", "femoral stress"].some(x => history.includes(x));
  // Shins: "shin" keyword, or tibial stress specifically — never the generic word "stress" alone
  const hasShins      = history.includes("shin") || (history.includes("tibial") && history.includes("stress"));

  const hasAnyInjury = hasCalf || hasAchilles || hasHamstring || hasKnee || hasHip || hasLowerBack || hasPlantar || hasShins || hasAnkle || hasBoneStress;
  if (!hasAnyInjury) return null;

  const insights: InjuryInsight[] = [];

  if (hasCalf || hasAchilles) {
    insights.push({
      injuryName: hasCalf && hasAchilles ? "Calf + Achilles" : hasCalf ? "Calf tightness" : "Achilles",
      whyItHappens: "The Achilles tendon and calf complex fail under running load when the tendon hasn't been progressively loaded to match training demands. It's not a flexibility problem — tendons don't respond to stretching the way muscles do. It's a load tolerance problem. The tendon can only handle a certain amount of stress before it breaks down, and most runners exceed that limit by increasing volume too quickly without building tendon strength first.",
      whyStrengthFixes: "Eccentric calf loading — specifically the slow lowering phase of a single-leg calf raise — is the most evidence-supported intervention for Achilles and calf issues in runners. It progressively loads the tendon through its full range, stimulating collagen remodelling and increasing tensile strength. Done consistently, it raises your tendon's load ceiling so your running volume doesn't exceed it.",
      keyExercises: [
        { name: "Single-leg eccentric calf raise", prescription: "3 × 15 each side · 3-second slow lowering · on a step for full range", why: "The gold standard for Achilles tendinopathy rehabilitation and prevention. The slow eccentric phase is where tendon adaptation happens." },
        { name: "Single-leg standing calf raise (full ROM)", prescription: "3 × 12 each side · slow and controlled throughout", why: "Builds the concentric strength that propels you forward in each running stride." },
        { name: "Seated calf raise", prescription: "3 × 15 · moderate load", why: "Targets the soleus specifically — the deeper calf muscle that is the primary load-bearer for the Achilles tendon during running." },
      ],
      warningSign: "Pain above 3/10 during or after calf raise that does not settle within 24 hours means you are loading above your current tolerance. Reduce range of motion or load — do not push through.",
      timelineNote: "Tendon adaptation is slower than muscle adaptation — allow 8–12 weeks of consistent eccentric loading before expecting significant change in tolerance. This is why strength work starts in week 1, not week 8.",
    });
  }

  if (hasHamstring) {
    insights.push({
      injuryName: "Hamstring",
      whyItHappens: "Hamstring issues in runners almost always relate to high-speed running without adequate eccentric hamstring strength, or a mismatch between hip flexor flexibility and hamstring capacity. The hamstring has to decelerate the leg at high speed — if it doesn't have the eccentric strength for that load, it tears.",
      whyStrengthFixes: "Nordic hamstring curls and single-leg Romanian deadlifts are the primary interventions. They build eccentric hamstring strength specifically in the range where running injuries occur — the long, loaded position. This directly addresses the mechanism of injury.",
      keyExercises: [
        { name: "Nordic hamstring curl", prescription: "3 × 5 · full eccentric lowering · use hands to assist on the way up", why: "The most effective hamstring injury prevention exercise in existence. Builds eccentric strength in the exact range where running injuries occur." },
        { name: "Single-leg Romanian deadlift", prescription: "3 × 10 each side · controlled descent · feel hamstring load throughout", why: "Builds functional hamstring strength in a movement pattern that transfers directly to running mechanics." },
        { name: "Glute bridge with hamstring curl", prescription: "3 × 12 · feet on a slider or ball", why: "Builds the hip extension and hamstring capacity that supports running economy." },
      ],
      warningSign: "Any sharp pain in the posterior thigh during Nordic curls or sprinting is a stop signal. This is different from the burn of muscle fatigue.",
      timelineNote: "Nordic hamstring curls should be introduced conservatively — 2 × 3 in week 1, building to 3 × 8 over 6–8 weeks. The adaptation timeline for hamstring tendons is 8–12 weeks.",
    });
  }

  if (hasKnee) {
    insights.push({
      injuryName: "Knee / ITB",
      whyItHappens: "Runner's knee and ITB issues are almost always hip weakness problems, not knee problems. When the glutes can't control the femur during single-leg loading, the knee tracks inward, increasing stress on the lateral structures and patella. The knee is the victim. The hip is the cause.",
      whyStrengthFixes: "Single-leg strengthening that targets hip abductors, external rotators, and glutes directly addresses the mechanism. When the hip controls the femur properly, knee stress reduces significantly.",
      keyExercises: [
        { name: "Bulgarian split squat", prescription: "3 × 8 each side · controlled descent · knee tracks over second toe", why: "The most effective single-leg exercise for developing the hip and quad strength runners need." },
        { name: "Lateral band walk", prescription: "3 × 15 steps each direction · band above knees", why: "Directly targets the hip abductors that control femoral alignment during running." },
        { name: "Copenhagen plank", prescription: "3 × 20 seconds each side", why: "Builds hip adductor strength that works with the abductors to control the pelvis during single-leg stance." },
      ],
      warningSign: "Pain on the outside of the knee during downhill running or descending stairs is early ITB warning. Reduce intensity and add hip strengthening before increasing load.",
      timelineNote: "Hip weakness takes 6–8 weeks of consistent work to meaningfully improve. Expect symptoms to reduce around week 4–6 of consistent strengthening.",
    });
  }

  if (hasLowerBack) {
    insights.push({
      injuryName: "Lower back",
      whyItHappens: "Lower back issues in runners usually mean the core isn't transferring force efficiently between the upper and lower body during the running stride. The lower back compensates for insufficient hip extension and core stability — and eventually breaks down under the repetitive load.",
      whyStrengthFixes: "Anti-rotation and anti-extension core exercises, combined with hip flexor work, directly address the cause. The goal isn't a stronger back — it's a more efficient force transfer system so the back doesn't have to do work it wasn't designed for.",
      keyExercises: [
        { name: "Dead bug", prescription: "3 × 10 each side · lower back must stay in contact with floor throughout", why: "Builds anti-extension core strength — the exact quality needed to stabilise the spine during running." },
        { name: "Pallof press", prescription: "3 × 12 each side · resist rotation throughout", why: "Anti-rotation strength is what keeps the core stable during the rotational demands of running." },
        { name: "Hip flexor stretch + activation", prescription: "90 sec each side stretch → 3 × 10 glute bridge", why: "Tight hip flexors pull the pelvis into anterior tilt, compressing the lower back. Lengthening them and activating the glutes corrects this pattern." },
      ],
      warningSign: "Any radiating pain down the leg (sciatica-type symptoms) during exercise is a medical referral, not a training issue. Stop and see a physiotherapist.",
      timelineNote: "Lower back issues typically respond within 4–6 weeks of consistent core strengthening and hip flexor work — provided the root cause is muscle imbalance and not structural.",
    });
  }

  if (hasPlantar) {
    insights.push({
      injuryName: "Plantar fascia",
      whyItHappens: "Plantar fasciitis in runners is a load tolerance problem at the foot and arch. The plantar fascia is a thick band of connective tissue that acts like a spring during running — it absorbs load on landing and releases it on toe-off. When the load exceeds the fascia's tolerance (too much volume, too quickly), it becomes inflamed.",
      whyStrengthFixes: "Foot intrinsic strengthening and progressive loading of the plantar fascia — through calf raises on a step — build the tissue's tolerance to handle running load. Stretching alone does not resolve plantar fasciitis.",
      keyExercises: [
        { name: "Single-leg calf raise on step", prescription: "3 × 15 · full range · slow eccentric · pain-free range only", why: "Progressively loads the plantar fascia and Achilles complex to build tissue tolerance." },
        { name: "Towel toe curls", prescription: "3 × 20 each foot", why: "Builds intrinsic foot muscle strength that supports the arch and reduces plantar fascia load." },
        { name: "Single-leg balance with small knee bend", prescription: "3 × 30 seconds each side · eyes open then closed", why: "Improves foot and ankle proprioception — how the foot stabilises under load." },
      ],
      warningSign: "Severe first-step pain in the morning that persists beyond the first 5 minutes of walking is a sign the load is currently too high. Reduce running volume before progressing strength.",
      timelineNote: "Plantar fascia has very poor blood supply — tissue adaptation takes 3–6 months. Strength work manages load tolerance while the tissue heals.",
    });
  }

  if (hasShins) {
    insights.push({
      injuryName: "Shin / Stress reaction",
      whyItHappens: "Shin splints and tibial stress reactions happen when bone remodelling can't keep pace with training load. The tibia is under compression on every landing — when volume increases faster than the bone can adapt, microdamage accumulates. This is a volume management problem, not a footwear or gait problem.",
      whyStrengthFixes: "Calf and tibialis anterior strengthening reduce the impact forces the tibia absorbs on every landing step. Stronger surrounding musculature acts as a shock absorber, reducing the mechanical load on the bone itself.",
      keyExercises: [
        { name: "Tibialis anterior raise", prescription: "3 × 20 · stand with heels on a step · raise toes up slowly", why: "Directly strengthens the anterior compartment — the muscle most involved in controlling foot strike forces." },
        { name: "Single-leg calf raise (slow eccentric)", prescription: "3 × 12 each side · 3-second lowering", why: "Calf strength reduces ground reaction force on every footstrike." },
        { name: "Single-leg hop and hold", prescription: "3 × 5 each side · land soft · hold for 2 seconds", why: "Builds the reactive strength and joint stiffness that reduces bone stress on impact." },
      ],
      warningSign: "Localised bone pain that is worse with activity and does not warm up is a stress fracture until proven otherwise. Stop running and see a sports medicine doctor.",
      timelineNote: "Bone stress injuries require 6–8 weeks of reduced load before returning to full training. Strength work during this period maintains fitness without stressing the tibia.",
    });
  }

  if (hasAnkle) {
    insights.push({
      injuryName: "Ankle / Sprain",
      whyItHappens: "Ankle sprains leave behind a chronic proprioception deficit that most athletes never address. The lateral ankle ligaments heal, but the sensory feedback system that tells the brain where the foot is in space stays impaired. This is why ankle sprains recur — not because the ligament is weak, but because the joint's protective reflex is slower than it was before the first injury.",
      whyStrengthFixes: "Single-leg balance and reactive strength work restores the proprioceptive feedback loop. Combined with peroneal strengthening, it rebuilds the active stabilisation system that protects the joint when the ground shifts unexpectedly — which is every trail run and every uneven surface.",
      keyExercises: [
        { name: "Single-leg balance — eyes closed", prescription: "3 × 30 seconds each side · progress to unstable surface (folded mat or wobble board)", why: "Restores the proprioceptive deficit that almost every ankle sprain leaves behind. Eyes closed removes visual compensation." },
        { name: "Banded ankle eversion", prescription: "3 × 20 each side · band around forefoot · slow and controlled", why: "Directly strengthens the peroneal muscles — the primary active stabilisers of the lateral ankle during running." },
        { name: "Lateral hop and hold", prescription: "3 × 8 each side · lateral hop · land and hold 2 seconds without wavering", why: "Builds reactive ankle stability in a movement that mimics the demand of running on uneven surfaces." },
      ],
      warningSign: "Giving way, sharp pain on weight bearing, or significant swelling after ankle loading means the ligament may not be fully healed. Get assessed before progressing plyometric work.",
      timelineNote: "Proprioceptive deficits respond within 4–6 weeks of consistent balance training. Peroneal strength takes 8 weeks to meaningfully improve. Both need to happen before returning to trail or uneven surfaces.",
    });
  }

  if (hasHip && !hasKnee) {
    insights.push({
      injuryName: "Hip / Glute",
      whyItHappens: "Hip and glute issues in runners are almost always weakness-driven. The glute medius and minimus control pelvic drop during single-leg stance — if they're weak, the pelvis tilts on every stride, creating cascading stress at the hip, knee, and lower back.",
      whyStrengthFixes: "Targeted hip abductor and glute strengthening corrects the movement pattern. Once the hip can control the pelvis during single-leg stance, the compensatory stress at every downstream structure reduces.",
      keyExercises: [
        { name: "Single-leg glute bridge", prescription: "3 × 12 each side · drive through heel · hold 1 sec at top", why: "Builds isolated glute strength in a pattern that directly transfers to running stance." },
        { name: "Clamshell with band", prescription: "3 × 20 each side · band above knees · keep pelvis still", why: "Targets the hip abductors specifically — the muscles responsible for pelvic control during running." },
        { name: "Step-up with knee drive", prescription: "3 × 10 each side · controlled lowering · use a box at knee height", why: "Functional single-leg strength that builds the hip capacity runners actually use." },
      ],
      warningSign: "Deep groin pain or pain at the front of the hip during hip flexion exercises may indicate labral pathology — get assessed before loading aggressively.",
      timelineNote: "Glute activation improvements are felt within 2–3 weeks. Meaningful strength changes take 8 weeks of consistent work.",
    });
  }

  if (hasBoneStress) {
    insights.push({
      injuryName: "Bone stress / Stress fracture",
      whyItHappens: "Bone stress injuries — stress reactions, stress fractures, metatarsal fractures — happen when bone remodelling cannot keep pace with the mechanical load applied. But in endurance athletes, this is frequently not just a load management problem. Low energy availability (eating less than training demands) impairs bone metabolism directly. The body prioritises energy to vital systems, and bone remodelling is deprioritised. Training harder on insufficient fuel accelerates bone breakdown rather than building it.",
      whyStrengthFixes: "Impact loading through progressive bone-loading exercises — when volume is appropriate and energy availability is sufficient — stimulates bone remodelling and increases density over time. But strength work alone is not the answer if fuelling is the underlying issue. Both levers need to be addressed simultaneously.",
      keyExercises: [
        { name: "Single-leg hop and hold (low volume)", prescription: "2 × 5 each side · pain-free only · build over 8 weeks", why: "Controlled impact loading stimulates bone remodelling at the specific sites used in running. Volume must be increased extremely slowly." },
        { name: "Single-leg calf raise on step", prescription: "3 × 12 each side · pain-free range only", why: "Builds the muscular buffer around lower leg bones, reducing the mechanical load transmitted to the tibia and metatarsals on every stride." },
        { name: "Hip strengthening circuit (non-impact)", prescription: "3 × 12 each side · glute bridge, clamshell, lateral band walk", why: "Addresses the hip weakness that increases ground reaction force and compensatory tibial stress during running." },
      ],
      warningSign: "Any localised bone pain during or after exercise — particularly point tenderness over a bone — is a stress fracture until a scan proves otherwise. Do not run through this. Get imaging.",
      timelineNote: "Bone stress injuries require 6–12 weeks of significantly reduced loading. Return to full training must be gradual and is predicated on both imaging clearance and addressing any nutritional contributors.",
    });
  }

  return { hasAnyInjury, hasBoneStress, insights };
}

// ── Zone cards ────────────────────────────────────────────────────────────────
const ZONES = [
  {
    id: "z1",
    label: "Zone 1",
    tag: "Easy",
    color: "#1A7A4A",
    pct: "80%",
    feel: "You could sing along to a song. Nose breathing possible. Should feel almost embarrassingly slow.",
    session: "All easy runs, long runs, warm-ups and cool-downs.",
    mistake: "Running too fast. If you can't hold a full conversation, it's not Zone 1 — it's the grey zone that accumulates fatigue without driving aerobic adaptation.",
  },
  {
    id: "lt1",
    label: "LT1",
    tag: "Threshold",
    color: ORANGE,
    pct: "~10%",
    feel: "Full sentences, but you notice your breathing. Slight controlled discomfort. Sustainable for 60–90 min.",
    session: "Threshold intervals (e.g. 3 × 8 min), cruise intervals.",
    mistake: "Running it too hard — hitting LT2 instead of LT1. The result is fatigue without the adaptation. If it feels like race effort, you've gone too far.",
  },
  {
    id: "lt2",
    label: "LT2",
    tag: "Race pace",
    color: "#C0392B",
    pct: "~8%",
    feel: "2–3 words only between breaths. Breathing is laboured. Sustainable for 20–40 min maximum.",
    session: "Race-pace intervals (Phase 3 only), race simulations.",
    mistake: "Introducing LT2 work before the aerobic base is ready. Most athletes jump to race-pace intervals too early — the base has to come first or the adaptation doesn't land.",
  },
  {
    id: "race",
    label: "Race",
    tag: "Race day",
    color: "#7B1A1A",
    pct: "~2%",
    feel: "Cannot speak. Maximum sustainable effort for the event duration.",
    session: "Race day and final race simulations only.",
    mistake: "Training at race effort regularly. Race pace should be rare in training — the fitness that produces it is built at lower intensities.",
  },
];

// ── Sub-components ────────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: string }) {
  return (
    <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", color: ORANGE, textTransform: "uppercase", margin: "0 0 14px", fontFamily: "sans-serif" }}>
      {children}
    </p>
  );
}

function Divider() {
  return <div style={{ height: 1, background: RULE, margin: "40px 0" }} />;
}

// ── Main component ────────────────────────────────────────────────────────────
export default function BlueprintScreen({ plan, intake, onContinue }: {
  plan: PlannerOutput;
  intake: IntakeInput;
  onContinue: () => void;
}) {
  const [activePhase, setActivePhase] = useState(0);
  const [activeZone, setActiveZone] = useState<string | null>(null);

  const beginnerProfile = detectBeginnerPath(intake);
  const phases        = buildPhases(intake, plan);
  const volBars       = buildVolumeBars(intake.weeklyKm);
  const injuryProfile = buildInjuryProfile(intake);
  const isHyrox       = intake.sport === "HYROX" || intake.sport === "Hybrid";
  const context       = `${intake.sport} · ${intake.eventType} · ${intake.currentBenchmark || "—"} → ${intake.goalBenchmark || "—"}`;

  const weaknessNote: Record<string, string> = {
    "Aerobic base":         "Most athletes spend 60% of training at moderate intensity — hard enough to accumulate fatigue, not hard enough to drive aerobic adaptation. Your plan corrects this.",
    "Fatigue resistance":   "Fatigue resistance issues almost always mean too much time in the grey zone. 80% genuinely easy training is the fix, not more intensity.",
    "Threshold fitness":    "Threshold gains require precise intensity control. LT1 work done too hard turns into LT2 — the wrong adaptation entirely. Your plan keeps it precise.",
    "Strength":             "Strength sessions sit outside the aerobic intensity zones but are just as important for structural capacity and injury prevention.",
  };
  const intensityNote = weaknessNote[intake.weakness] ??
    "The Norwegian Method eliminates the grey zone. Easy is genuinely easy. Quality is precisely controlled.";

  const summaryStats = [
    { label: "Current",        value: intake.currentBenchmark || "—" },
    { label: "Goal",           value: intake.goalBenchmark    || "—" },
    { label: "Timeline",       value: plan.gapSummary?.timelineEstimate || "—" },
    { label: "Classification", value: plan.gapSummary?.classification   || "—" },
    { label: "Sessions / wk",  value: `${intake.sessionsPerWeek} sessions` },
    { label: "Primary limiter",value: plan.snapshot?.mainLimiter || intake.weakness },
  ];

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9998, background: BG, overflowY: "auto", fontFamily: "sans-serif" }}>

      {/* ── Fixed top bar ── */}
      <div style={{
        position: "sticky", top: 0, height: 56, zIndex: 10,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 28px",
        background: "rgba(8,8,8,0.95)", backdropFilter: "blur(12px)",
        borderBottom: `1px solid ${BORDER}`,
      }}>
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.16em", color: ORANGE, textTransform: "uppercase" }}>
          KJ Performance
        </span>
        <span style={{ fontSize: 11, color: MUTED, display: "none" }} className="blueprint-context">
          {context}
        </span>
        <button
          onClick={onContinue}
          style={{
            background: "transparent", color: MUTED, border: `1px solid ${BORDER}`,
            borderRadius: 8, padding: "6px 14px", fontSize: 13, fontWeight: 500,
            cursor: "pointer", letterSpacing: "0.02em",
          }}
        >
          ✕
        </button>
      </div>

      {/* ── Scrollable content ── */}
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "48px 28px 80px" }}>

        {/* ── BEGINNER FOUNDATION PATH ── */}
        {beginnerProfile.isBeginnerPath ? (
          <>
            {/* Heading */}
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.18em", color: ORANGE, textTransform: "uppercase", margin: "0 0 10px" }}>
              Foundation Phase
            </p>
            <h1 style={{ fontSize: "clamp(24px, 5vw, 38px)", fontWeight: 700, color: WHITE, lineHeight: 1.2, margin: "0 0 10px" }}>
              {plan.headline}
            </h1>
            <p style={{ fontSize: 14, color: MUTED, margin: "0 0 0", lineHeight: 1.6 }}>
              Triggered by: {beginnerProfile.reason}
            </p>

            <Divider />

            {/* Honest framing banner */}
            <div style={{
              background: "rgba(255,138,26,0.07)", border: "1px solid rgba(255,138,26,0.25)",
              borderLeft: "3px solid #ff8a1a", borderRadius: 10, padding: "18px 20px", marginBottom: 28,
            }}>
              <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: ORANGE, margin: "0 0 8px" }}>
                Why structure can wait
              </p>
              <p style={{ fontSize: 14, color: BODY, lineHeight: 1.65, margin: 0 }}>
                Periodisation, threshold work, and phase structure only drive adaptation when there is a consistent training habit underneath them. Right now, the highest-leverage thing you can do is show up — every session, every week, for {beginnerProfile.foundationWeeks} weeks.
              </p>
            </div>

            {/* Simplified goal */}
            <SectionLabel>{`Your Goal For The Next ${beginnerProfile.foundationWeeks} Weeks`}</SectionLabel>
            <div style={{
              background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12, padding: "20px 22px", marginBottom: 28,
            }}>
              <p style={{ fontSize: 16, fontWeight: 600, color: WHITE, lineHeight: 1.6, margin: 0 }}>
                {beginnerProfile.simplifiedGoal}
              </p>
            </div>

            {/* What's holding you back */}
            <SectionLabel>Why You're Not Ready for Structure Yet</SectionLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
              {plan.drivers.map((d, i) => (
                <div key={i} style={{
                  background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10,
                  padding: "14px 18px", display: "flex", gap: 14, alignItems: "flex-start",
                }}>
                  <span style={{ fontSize: 15, color: ORANGE, flexShrink: 0, marginTop: 1 }}>→</span>
                  <p style={{ fontSize: 14, color: BODY, lineHeight: 1.6, margin: 0 }}>{d}</p>
                </div>
              ))}
            </div>

            {/* Big rocks */}
            <SectionLabel>The 4 Things That Matter Right Now</SectionLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 28 }}>
              {plan.bigRocks.map((rock, i) => (
                <div key={i} style={{
                  background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10,
                  padding: "14px 18px", display: "flex", gap: 14, alignItems: "flex-start",
                }}>
                  <span style={{
                    fontSize: 11, fontWeight: 700, color: ORANGE,
                    background: "rgba(255,138,26,0.12)", border: "1px solid rgba(255,138,26,0.3)",
                    borderRadius: "50%", width: 24, height: 24, display: "flex", alignItems: "center",
                    justifyContent: "center", flexShrink: 0,
                  }}>
                    {i + 1}
                  </span>
                  <p style={{ fontSize: 14, color: BODY, lineHeight: 1.6, margin: 0 }}>{rock}</p>
                </div>
              ))}
            </div>

            {/* Weekly structure */}
            <SectionLabel>Weekly Structure</SectionLabel>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 8, marginBottom: 28 }}>
              {plan.weeklyStructure.map((s) => (
                <div key={s.day} style={{
                  background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "12px 14px",
                }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: ORANGE, textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 6px" }}>
                    {s.day}
                  </p>
                  <p style={{ fontSize: 13, color: BODY, lineHeight: 1.5, margin: 0 }}>{s.focus}</p>
                </div>
              ))}
            </div>

            {/* Risk flags */}
            <SectionLabel>What Happens If You Skip This Step</SectionLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 28 }}>
              {plan.riskFlags.map((flag, i) => (
                <div key={i} style={{
                  background: "rgba(220,50,50,0.05)", border: "1px solid rgba(220,50,50,0.15)",
                  borderRadius: 10, padding: "12px 16px", display: "flex", gap: 12, alignItems: "flex-start",
                }}>
                  <span style={{ color: "#e05555", flexShrink: 0, marginTop: 1 }}>⚠</span>
                  <p style={{ fontSize: 13, color: BODY, lineHeight: 1.55, margin: 0 }}>{flag}</p>
                </div>
              ))}
            </div>

            {/* Metrics */}
            <SectionLabel>How to Know It's Working</SectionLabel>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 40 }}>
              {plan.metrics.map((m, i) => (
                <span key={i} style={{
                  fontSize: 13, color: BODY, background: CARD,
                  border: `1px solid ${BORDER}`, borderRadius: 20, padding: "6px 14px",
                }}>
                  {m}
                </span>
              ))}
            </div>

            {/* Closing note */}
            <div style={{
              background: `${ORANGE}08`, border: `1px solid ${ORANGE}25`,
              borderRadius: 12, padding: "20px 24px", textAlign: "center",
            }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: ORANGE, margin: "0 0 6px", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                Your foundation plan is ready
              </p>
              <p style={{ fontSize: 13, color: BODY, margin: 0, lineHeight: 1.65 }}>
                Check your inbox — your plan details have been sent. Follow the foundation structure for {beginnerProfile.foundationWeeks} weeks before adding intensity or phase structure.
              </p>
            </div>
          </>
        ) : (
          <>
        {/* Page heading */}
        <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.18em", color: ORANGE, textTransform: "uppercase", margin: "0 0 10px" }}>
          Training Blueprint
        </p>
        <h1 style={{ fontSize: "clamp(26px, 5vw, 40px)", fontWeight: 700, color: WHITE, lineHeight: 1.15, margin: "0 0 8px" }}>
          How we get you there
        </h1>
        <p style={{ fontSize: 15, color: MUTED, margin: "0 0 0", lineHeight: 1.6 }}>
          {context}
        </p>

        <Divider />

        {/* ── BLUEPRINT READOUT ── */}
        {plan.readout && (() => {
          const r = plan.readout;
          const feasColor = r.feasibilityScore >= 90 ? "#4ade80"
            : r.feasibilityScore >= 75 ? ORANGE
            : r.feasibilityScore >= 60 ? "#facc15"
            : "#ef4444";
          const barColor = (status: string) =>
            status === "strong" ? "#4ade80"
            : status === "adequate" ? "#4ade80"
            : status === "limiting" ? "#facc15"
            : "#ef4444";
          return (
            <div style={{ marginBottom: 28 }}>
              {/* Header row */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                <div>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", color: MUTED, textTransform: "uppercase", margin: "0 0 8px" }}>
                    Blueprint / Readout
                  </p>
                  <h2 style={{ fontSize: "clamp(18px, 4vw, 26px)", fontWeight: 700, color: WHITE, lineHeight: 1.2, margin: 0 }}>
                    Goal is{" "}
                    <span style={{ color: feasColor }}>{r.feasibilityLabel}</span>
                    {" "}with current capacity.
                  </h2>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 20 }}>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", color: MUTED, textTransform: "uppercase", margin: "0 0 2px" }}>
                    Feasibility
                  </p>
                  <p style={{ fontSize: 42, fontWeight: 800, color: feasColor, margin: 0, lineHeight: 1 }}>
                    {r.feasibilityScore}%
                  </p>
                </div>
              </div>

              {/* Capacity metric bars */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
                {r.capacityMetrics.map((m, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: MUTED, textTransform: "uppercase", width: 130, flexShrink: 0, margin: 0 }}>
                      {m.label}
                    </p>
                    <div style={{ flex: 1, height: 6, background: "rgba(255,255,255,0.07)", borderRadius: 3, position: "relative" }}>
                      <div style={{
                        width: `${Math.min(m.score, 100)}%`,
                        height: "100%",
                        background: barColor(m.status),
                        borderRadius: 3,
                        transition: "width 0.6s ease",
                      }} />
                      {/* Target marker at 80 */}
                      <div style={{
                        position: "absolute", top: -3, left: "80%",
                        width: 1, height: 12, background: "rgba(255,255,255,0.2)",
                      }} />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, width: 60, justifyContent: "flex-end", flexShrink: 0 }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: WHITE, margin: 0 }}>{m.score}</p>
                      {m.delta < 0 ? (
                        <p style={{ fontSize: 11, fontWeight: 600, color: "#ef4444", margin: 0 }}>{m.delta}</p>
                      ) : (
                        <p style={{ fontSize: 11, fontWeight: 700, color: "#4ade80", margin: 0 }}>✓</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Phase breakdown */}
              {r.phases && r.phases.length > 0 && (
                <div style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${Math.min(r.phases.length, 4)}, 1fr)`,
                  gap: 8,
                  marginBottom: 12,
                }}>
                  {r.phases.map((ph, i) => (
                    <div key={i} style={{
                      background: "rgba(255,255,255,0.04)",
                      border: `1px solid ${BORDER}`,
                      borderRadius: 10,
                      padding: "14px 14px 16px",
                    }}>
                      <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", color: MUTED, textTransform: "uppercase", margin: "0 0 6px" }}>
                        Phase {String(i + 1).padStart(2, "0")}
                      </p>
                      <p style={{ fontSize: 15, fontWeight: 700, color: WHITE, margin: "0 0 4px" }}>{ph.label}</p>
                      <p style={{ fontSize: 12, fontWeight: 600, color: ORANGE, margin: "0 0 8px" }}>{ph.duration}</p>
                      <p style={{ fontSize: 12, color: MUTED, lineHeight: 1.5, margin: 0 }}>{ph.focus}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Flags */}
              {r.flags && r.flags.length > 0 && (
                <div style={{
                  background: "rgba(255,138,26,0.05)", border: "1px solid rgba(255,138,26,0.15)",
                  borderRadius: 10, padding: "14px 18px", display: "flex", flexDirection: "column", gap: 8,
                }}>
                  {r.flags.map((f, i) => (
                    <div key={i} style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                      <p style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", color: ORANGE, textTransform: "uppercase", margin: 0, flexShrink: 0, paddingTop: 1, width: 60 }}>
                        {f.tag}
                      </p>
                      <p style={{ fontSize: 13, color: BODY, lineHeight: 1.6, margin: 0 }}>{f.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}

        <Divider />

        {/* ── YOUR ANALYSIS ── */}
        <SectionLabel>Your Analysis</SectionLabel>

        <h2 style={{ fontSize: 22, fontWeight: 700, color: WHITE, lineHeight: 1.25, margin: "0 0 16px" }}>
          {plan.headline}
        </h2>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 8 }}>
          {plan.drivers.map((driver, i) => (
            <div key={i} style={{
              display: "flex", gap: 14, alignItems: "flex-start",
              background: CARD, border: `1px solid ${BORDER}`,
              borderLeft: `3px solid ${ORANGE}`, borderRadius: 10, padding: "14px 18px",
            }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: ORANGE, flexShrink: 0, marginTop: 1 }}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <p style={{ fontSize: 13, color: BODY, lineHeight: 1.65, margin: 0 }}>{driver}</p>
            </div>
          ))}
        </div>

        <Divider />

        {/* ── YOUR GAP ── */}
        {plan.gapSummary && (
          <>
            <SectionLabel>Your Gap Analysis</SectionLabel>

            {/* Current → Goal bar */}
            <div style={{
              background: CARD, border: `1px solid ${BORDER}`, borderRadius: 12,
              padding: "20px 22px", marginBottom: 16,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 0, marginBottom: 16 }}>
                <div style={{ flex: 1, textAlign: "center" }}>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: MUTED, margin: "0 0 4px" }}>Current</p>
                  <p style={{ fontSize: 22, fontWeight: 700, color: WHITE, margin: 0 }}>{plan.gapSummary.currentBenchmark}</p>
                </div>
                <div style={{ padding: "0 16px", color: MUTED, fontSize: 20 }}>→</div>
                <div style={{ flex: 1, textAlign: "center" }}>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: MUTED, margin: "0 0 4px" }}>Goal</p>
                  <p style={{ fontSize: 22, fontWeight: 700, color: ORANGE, margin: 0 }}>{plan.gapSummary.goalBenchmark}</p>
                </div>
                <div style={{ padding: "0 16px", color: MUTED, fontSize: 20 }}>·</div>
                <div style={{ flex: 1, textAlign: "center" }}>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: MUTED, margin: "0 0 4px" }}>To find</p>
                  <p style={{ fontSize: 18, fontWeight: 700, color: WHITE, margin: 0 }}>{plan.gapSummary.improvementRequired}</p>
                </div>
              </div>

              {/* Classification + timeline */}
              <div style={{ display: "flex", gap: 10 }}>
                <div style={{
                  flex: 1, background: "rgba(255,138,26,0.08)", border: "1px solid rgba(255,138,26,0.2)",
                  borderRadius: 8, padding: "10px 14px",
                }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: ORANGE, letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 3px" }}>Classification</p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: WHITE, margin: 0 }}>{plan.gapSummary.classification}</p>
                </div>
                <div style={{
                  flex: 1, background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}`,
                  borderRadius: 8, padding: "10px 14px",
                }}>
                  <p style={{ fontSize: 10, fontWeight: 700, color: MUTED, letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 3px" }}>Realistic timeline</p>
                  <p style={{ fontSize: 13, fontWeight: 600, color: WHITE, margin: 0 }}>{plan.gapSummary.timelineEstimate}</p>
                </div>
              </div>

              {plan.gapSummary.summary && (
                <p style={{ fontSize: 13, color: BODY, lineHeight: 1.65, margin: "14px 0 0", borderTop: `1px solid ${RULE}`, paddingTop: 14 }}>
                  {plan.gapSummary.summary}
                </p>
              )}
            </div>

            <Divider />
          </>
        )}

        {/* ── YOUR BIG ROCKS ── */}
        <SectionLabel>Your Top Priorities</SectionLabel>

        <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.6, margin: "0 0 14px" }}>
          In order of impact — these are the levers that will move your performance most.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 8 }}>
          {plan.bigRocks.map((rock, i) => (
            <div key={i} style={{
              display: "flex", gap: 14, alignItems: "flex-start",
              background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "14px 18px",
            }}>
              <span style={{
                fontSize: 13, fontWeight: 800, color: ORANGE,
                background: "rgba(255,138,26,0.1)", border: "1px solid rgba(255,138,26,0.25)",
                borderRadius: "50%", width: 28, height: 28, display: "flex", alignItems: "center",
                justifyContent: "center", flexShrink: 0,
              }}>
                {i + 1}
              </span>
              <p style={{ fontSize: 13, color: BODY, lineHeight: 1.65, margin: 0, paddingTop: 4 }}>{rock}</p>
            </div>
          ))}
        </div>

        <Divider />

        {/* ── YOUR WEEK 1 ── */}
        <SectionLabel>Your Week 1</SectionLabel>

        <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.6, margin: "0 0 14px" }}>
          Matched to your {intake.sessionsPerWeek} sessions and {intake.hoursPerWeek}h. This is what your first week actually looks like.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 8 }}>
          {plan.weeklyStructure.map((s, i) => {
            const isRest = s.focus.toLowerCase().includes("rest") || s.focus.toLowerCase().includes("off") || s.focus.toLowerCase().includes("recovery");
            return (
              <div key={i} style={{
                display: "flex", alignItems: "flex-start", gap: 14,
                background: isRest ? "rgba(255,255,255,0.02)" : CARD,
                border: `1px solid ${isRest ? "rgba(255,255,255,0.05)" : BORDER}`,
                borderRadius: 10, padding: "12px 18px",
              }}>
                <div style={{
                  width: 44, flexShrink: 0, textAlign: "center",
                  paddingTop: 2,
                }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: isRest ? MUTED : ORANGE, margin: 0, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    {s.day.slice(0, 3)}
                  </p>
                </div>
                <div style={{ width: 1, alignSelf: "stretch", background: isRest ? "rgba(255,255,255,0.05)" : "rgba(255,138,26,0.2)", flexShrink: 0 }} />
                <p style={{ fontSize: 13, color: isRest ? MUTED : BODY, lineHeight: 1.6, margin: 0 }}>
                  {s.focus}
                </p>
              </div>
            );
          })}
        </div>

        {plan.riskFlags && plan.riskFlags.length > 0 && (
          <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 6 }}>
            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(239,68,68,0.7)", margin: "0 0 6px" }}>
              Watch for
            </p>
            {plan.riskFlags.map((flag, i) => (
              <div key={i} style={{
                display: "flex", gap: 10, alignItems: "flex-start",
                background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.12)",
                borderRadius: 8, padding: "10px 14px",
              }}>
                <span style={{ color: "rgba(239,68,68,0.6)", flexShrink: 0, fontSize: 13 }}>⚠</span>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", lineHeight: 1.6, margin: 0 }}>{flag}</p>
              </div>
            ))}
          </div>
        )}

        <Divider />

        {/* ── SECTION 1: Phase journey ── */}
        <SectionLabel>Phase Journey</SectionLabel>

        {/* Phase timeline */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 0, marginBottom: 24, overflowX: "auto", paddingBottom: 4 }}>
          {phases.map((phase, i) => {
            const isActive = i === activePhase;
            return (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", flex: 1, minWidth: 0 }}>
                {/* Phase node */}
                <button
                  onClick={() => setActivePhase(i)}
                  style={{
                    display: "flex", flexDirection: "column", alignItems: "center",
                    background: "none", border: "none", cursor: "pointer", padding: "0 8px",
                    flex: 1, minWidth: 0,
                  }}
                >
                  {/* Dot */}
                  <div style={{
                    width: isActive ? 18 : 12, height: isActive ? 18 : 12,
                    borderRadius: "50%",
                    background: isActive ? phase.color : i < activePhase ? phase.color + "60" : "#222",
                    border: `2px solid ${isActive ? phase.color : "#333"}`,
                    boxShadow: isActive ? `0 0 12px ${phase.color}80` : "none",
                    transition: "all 0.25s ease",
                    flexShrink: 0,
                    marginBottom: 8,
                  }} />
                  {/* Label */}
                  <p style={{
                    fontSize: 10, fontWeight: isActive ? 700 : 400,
                    color: isActive ? WHITE : MUTED,
                    textAlign: "center", margin: 0, lineHeight: 1.4,
                    transition: "color 0.2s",
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    width: "100%",
                  }}>
                    {phase.name.split(" ")[0]} {phase.name.split(" ")[1] ?? ""}
                  </p>
                  <p style={{ fontSize: 9, color: MUTED, margin: "2px 0 0", textAlign: "center" }}>
                    {phase.weeks}
                  </p>
                </button>

                {/* Connector line */}
                {i < phases.length - 1 && (
                  <div style={{
                    height: 2, flex: 1, background: i < activePhase ? phases[i].color + "50" : "#1e1e1e",
                    marginTop: 8, transition: "background 0.3s",
                  }} />
                )}
              </div>
            );
          })}
        </div>

        {/* Active phase detail card */}
        {(() => {
          const p = phases[activePhase];
          return (
            <div style={{
              background: CARD, border: `1px solid ${BORDER}`,
              borderRadius: 12, padding: "20px 24px",
              borderLeft: `3px solid ${p.color}`,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: p.color, letterSpacing: "0.12em", textTransform: "uppercase" }}>
                  {p.name}
                </span>
                {activePhase === 0 && (
                  <span style={{
                    fontSize: 9, fontWeight: 700, letterSpacing: "0.12em",
                    color: "#000", background: ORANGE, borderRadius: 4, padding: "2px 7px",
                  }}>
                    YOU ARE HERE
                  </span>
                )}
              </div>
              <p style={{ fontSize: 14, fontWeight: 600, color: WHITE, margin: "0 0 8px" }}>{p.focus}</p>
              <p style={{ fontSize: 13, color: BODY, margin: "0 0 12px", lineHeight: 1.6 }}>
                <span style={{ color: MUTED, fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase" }}>Sessions: </span>
                {p.sessions}
              </p>
              <p style={{ fontSize: 13, color: BODY, margin: 0, lineHeight: 1.65, borderLeft: `2px solid ${p.color}40`, paddingLeft: 12 }}>
                {p.why}
              </p>
            </div>
          );
        })()}

        <Divider />

        {/* ── SECTION 2: Intensity distribution ── */}
        <SectionLabel>Intensity Distribution</SectionLabel>

        {/* 80/10/10 bar */}
        <div style={{ display: "flex", borderRadius: 8, overflow: "hidden", height: 40, marginBottom: 10, gap: 2 }}>
          <div style={{ flex: 80, background: "#1A7A4A", display: "flex", alignItems: "center", paddingLeft: 12 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: WHITE, whiteSpace: "nowrap" }}>Zone 1 · Easy · 80%</span>
          </div>
          <div style={{ flex: 10, background: ORANGE, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: "#000", whiteSpace: "nowrap" }}>LT1 · 10%</span>
          </div>
          <div style={{ flex: 10, background: "#C0392B", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: WHITE, whiteSpace: "nowrap" }}>LT2 · 10%</span>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
          {[["80%", "Zone 1 — Easy aerobic"], ["10%", "LT1 — Threshold"], ["10%", "LT2 + Race pace"]].map(([pct, label]) => (
            <span key={label} style={{ fontSize: 11, color: MUTED }}><span style={{ color: WHITE, fontWeight: 600 }}>{pct}</span> {label}</span>
          ))}
        </div>

        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "14px 18px" }}>
          <p style={{ fontSize: 13, color: BODY, margin: 0, lineHeight: 1.65 }}>{intensityNote}</p>
        </div>

        <Divider />

        {/* ── SECTION 3: Periodization models ── */}
        <SectionLabel>Periodization Model</SectionLabel>

        <h2 style={{ fontSize: 20, fontWeight: 700, color: WHITE, margin: "0 0 6px" }}>
          Block periodization · Norwegian Method
        </h2>
        <p style={{ fontSize: 14, color: MUTED, margin: "0 0 24px", lineHeight: 1.6 }}>
          Two proven frameworks combined. Block periodization organises training into concentrated phases. The Norwegian Method controls intensity distribution within those phases.
        </p>

        {/* Model comparison row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 24 }}>
          {[
            {
              label: "Linear (old approach)",
              color: "#444",
              textColor: MUTED,
              principles: [
                "Same type of training every week",
                "Gradual load increase across all qualities",
                "No recovery structure — plateaus are common",
                "Athletes peak randomly, not on race day",
              ],
              verdict: "Produces mediocre athletes who train hard and don't improve.",
              verdictColor: "#888",
              tag: "NOT YOUR PLAN",
              tagBg: "#222",
              tagColor: MUTED,
            },
            {
              label: "Block Periodization",
              color: ORANGE,
              textColor: BODY,
              principles: [
                "Concentrated focus — one quality at a time",
                "4-week blocks: build → build → peak → deload",
                "Each phase builds the foundation for the next",
                "Athletes peak when it matters",
              ],
              verdict: "The structure used by every successful elite endurance programme in the last 20 years.",
              verdictColor: ORANGE,
              tag: "YOUR PLAN",
              tagBg: `${ORANGE}20`,
              tagColor: ORANGE,
            },
          ].map((model) => (
            <div key={model.label} style={{
              background: CARD, border: `1px solid ${model.color}40`,
              borderTop: `3px solid ${model.color}`,
              borderRadius: 10, padding: "16px 18px",
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: model.color, margin: 0, letterSpacing: "0.06em" }}>
                  {model.label}
                </p>
                <span style={{
                  fontSize: 9, fontWeight: 700, letterSpacing: "0.12em",
                  background: model.tagBg, color: model.tagColor,
                  borderRadius: 4, padding: "2px 7px",
                }}>
                  {model.tag}
                </span>
              </div>
              <ul style={{ margin: "0 0 12px", padding: "0 0 0 14px", display: "flex", flexDirection: "column", gap: 5 }}>
                {model.principles.map((p) => (
                  <li key={p} style={{ fontSize: 12, color: model.textColor, lineHeight: 1.5 }}>{p}</li>
                ))}
              </ul>
              <p style={{ fontSize: 11, color: model.verdictColor, margin: 0, lineHeight: 1.5, fontStyle: "italic" }}>
                {model.verdict}
              </p>
            </div>
          ))}
        </div>

        {/* Norwegian Method explanation */}
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, marginBottom: 10, overflow: "hidden" }}>
          <div style={{ background: `${ORANGE}12`, padding: "12px 18px", borderBottom: `1px solid ${BORDER}` }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: ORANGE, margin: 0, letterSpacing: "0.08em" }}>
              THE NORWEGIAN METHOD — HOW IT WORKS
            </p>
          </div>
          <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              { num: "01", title: "Eliminate the grey zone", body: "Most athletes train at moderate intensity — hard enough to accumulate fatigue, not hard enough to drive adaptation. The Norwegian Method eliminates this zone entirely. Easy is genuinely easy (Zone 1). Hard is precisely controlled (LT1 or LT2). Nothing in between." },
              { num: "02", title: "Double threshold sessions", body: "Elite Norwegian athletes (Ingebrigtsen, Blummenfelt, Iden) run two LT1 threshold sessions per day. Your programme uses one LT1 session per week — the same mechanism, scaled to amateur volume. The point is precise intensity control, not extreme volume." },
              { num: "03", title: "Lactate testing over feel", body: "Professionals find their zones via lactate strips. Your programme uses the talk test — validated as accurate to within 5% of lab-measured LT1. If you can speak in full sentences, you're at or below LT1. If you're reduced to words, you've crossed into LT2." },
            ].map((item) => (
              <div key={item.num} style={{ display: "flex", gap: 16 }}>
                <span style={{ fontSize: 18, fontWeight: 800, color: `${ORANGE}50`, flexShrink: 0, lineHeight: 1 }}>{item.num}</span>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 700, color: WHITE, margin: "0 0 4px" }}>{item.title}</p>
                  <p style={{ fontSize: 12, color: BODY, margin: 0, lineHeight: 1.65 }}>{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 4-week block pattern visual */}
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "16px 18px" }}>
          <p style={{ fontSize: 10, fontWeight: 700, color: ORANGE, letterSpacing: "0.14em", textTransform: "uppercase", margin: "0 0 12px" }}>
            Load Structure
          </p>
          <p style={{ fontSize: 16, fontWeight: 700, color: WHITE, margin: "0 0 4px" }}>The 4-week block pattern</p>
          <p style={{ fontSize: 12, color: MUTED, margin: "0 0 18px" }}>Every block follows this pattern. Week 4 is not optional.</p>

          {/* Pattern bar chart */}
          {(() => {
            // Bar heights based on actual 10% compounding: W1=base, W2=+10%, W3=+10%, W4=deload -30%
            // Normalised so W3 = 100% of chart height
            const blocks = [
              { label: "Establish", wk: "W1", changeLabel: "Base",  barPct: 83, color: "#22a86a", deload: false },
              { label: "Build",     wk: "W2", changeLabel: "+10%",  barPct: 91, color: "#2ecc71", deload: false },
              { label: "Peak",      wk: "W3", changeLabel: "+10%",  barPct: 100, color: "#4ade80", deload: false },
              { label: "Deload",    wk: "W4", changeLabel: "−30%",  barPct: 70, color: "#60a5fa", deload: true  },
            ];
            const chartH = 120;
            const gridLines = [25, 50, 75, 100];
            return (
              <div style={{ position: "relative", marginBottom: 8 }}>
                {/* Grid lines */}
                <div style={{ position: "absolute", inset: 0, bottom: 22, pointerEvents: "none" }}>
                  {gridLines.map((g) => (
                    <div key={g} style={{
                      position: "absolute", left: 0, right: 0,
                      bottom: `${g}%`,
                      borderTop: `1px dashed rgba(255,255,255,0.06)`,
                    }}>
                      <span style={{ position: "absolute", right: "100%", paddingRight: 6, fontSize: 8, color: "rgba(255,255,255,0.15)", transform: "translateY(-50%)", whiteSpace: "nowrap" }}>
                        {g}%
                      </span>
                    </div>
                  ))}
                </div>

                {/* Bars */}
                <div style={{ display: "flex", gap: 8, alignItems: "flex-end", height: chartH, paddingLeft: 24 }}>
                  {blocks.map((b) => (
                    <div key={b.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 0 }}>
                      {/* Change label above bar */}
                      <span style={{ fontSize: 10, fontWeight: 700, color: b.deload ? "#60a5fa" : "#4ade80", marginBottom: 4 }}>
                        {b.changeLabel}
                      </span>
                      {/* Bar */}
                      <div style={{
                        width: "100%",
                        height: `${(b.barPct / 100) * (chartH - 28)}px`,
                        background: b.deload
                          ? "linear-gradient(180deg, #60a5fa 0%, #2563eb 100%)"
                          : `linear-gradient(180deg, ${b.color} 0%, ${b.color}99 100%)`,
                        borderRadius: "5px 5px 0 0",
                        boxShadow: b.deload
                          ? "0 0 12px rgba(96,165,250,0.25)"
                          : "0 0 12px rgba(46,204,113,0.2)",
                        transition: "height 0.4s ease",
                      }} />
                      {/* Baseline tick */}
                      <div style={{ width: "100%", height: 2, background: "rgba(255,255,255,0.1)" }} />
                      {/* Labels below */}
                      <span style={{ fontSize: 10, fontWeight: 700, color: b.deload ? "#60a5fa" : MUTED, marginTop: 6, letterSpacing: "0.04em" }}>
                        {b.wk}
                      </span>
                      <span style={{ fontSize: 9, color: "rgba(255,255,255,0.2)" }}>{b.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
            {[
              { wk: "Week 1", label: "Establish", detail: "Introduce the stimulus. Moderate load. Find the effort." },
              { wk: "Week 2", label: "Build", detail: "Add volume or density. Same intensity. More adaptation." },
              { wk: "Week 3", label: "Peak", detail: "Highest load of the block. Even splits, not all-out." },
              { wk: "Week 4", label: "Deload", detail: "70% of peak volume. Adaptation is locked in here, not in the hard weeks." },
            ].map((w) => (
              <div key={w.wk} style={{ background: "#111", border: `1px solid ${BORDER}`, borderRadius: 8, padding: "10px 14px" }}>
                <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4 }}>
                  <span style={{ fontSize: 9, fontWeight: 700, color: MUTED, letterSpacing: "0.1em" }}>{w.wk.toUpperCase()}</span>
                  <span style={{ fontSize: 9, fontWeight: 700, color: ORANGE }}>{w.label.toUpperCase()}</span>
                </div>
                <p style={{ fontSize: 11, color: BODY, margin: 0, lineHeight: 1.5 }}>{w.detail}</p>
              </div>
            ))}
          </div>
        </div>

        <Divider />

        {/* ── SECTION 4: Volume progression ── */}
        <SectionLabel>{isHyrox ? "Training Load — First 8 Weeks" : "Volume Progression — First 8 Weeks"}</SectionLabel>

        {isHyrox ? (
          /* HYROX: hours-based load table instead of km bars */
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
            {[
              { week: "W1", label: "Base", hours: intake.hoursPerWeek || 6, deload: false },
              { week: "W2", label: "+10%", hours: Math.round((intake.hoursPerWeek || 6) * 1.10), deload: false },
              { week: "W3", label: "+10%", hours: Math.round((intake.hoursPerWeek || 6) * 1.21), deload: false },
              { week: "W4", label: "Deload −30%", hours: Math.round((intake.hoursPerWeek || 6) * 1.21 * 0.70), deload: true },
              { week: "W5", label: "+10%", hours: Math.round((intake.hoursPerWeek || 6) * 1.21), deload: false },
              { week: "W6", label: "+10%", hours: Math.round((intake.hoursPerWeek || 6) * 1.33), deload: false },
              { week: "W7", label: "+10%", hours: Math.round((intake.hoursPerWeek || 6) * 1.46), deload: false },
              { week: "W8", label: "Deload −30%", hours: Math.round((intake.hoursPerWeek || 6) * 1.46 * 0.70), deload: true },
            ].map((row) => (
              <div key={row.week} style={{
                display: "flex", alignItems: "center", gap: 12,
                background: row.deload ? "rgba(44,95,138,0.08)" : CARD,
                border: `1px solid ${row.deload ? "rgba(44,95,138,0.3)" : BORDER}`,
                borderRadius: 8, padding: "10px 16px",
              }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: row.deload ? "#60a5fa" : ORANGE, width: 28 }}>{row.week}</span>
                <div style={{
                  flex: 1, height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden",
                }}>
                  <div style={{
                    height: "100%", borderRadius: 3,
                    width: `${Math.round((row.hours / Math.round((intake.hoursPerWeek || 6) * 1.46)) * 100)}%`,
                    background: row.deload ? "#2C5F8A" : ORANGE,
                  }} />
                </div>
                <span style={{ fontSize: 12, color: BODY, width: 42, textAlign: "right" }}>{row.hours}h</span>
                <span style={{ fontSize: 10, color: MUTED, width: 80 }}>{row.label}</span>
              </div>
            ))}
          </div>
        ) : (
          /* Running: horizontal row chart */
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 16 }}>
            {volBars.map((b) => {
              const maxKm = volBars[volBars.length - 2].km;
              const barPct = Math.max(12, Math.round((b.km / maxKm) * 100));
              const isDeload = b.deload;
              const blockLabel = b.week <= 4 ? "Block 1" : "Block 2";
              return (
                <div key={b.week} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, width: 24, flexShrink: 0, color: isDeload ? "#60a5fa" : ORANGE }}>
                    W{b.week}
                  </span>
                  <div style={{ flex: 1, height: 28, background: "rgba(255,255,255,0.04)", borderRadius: 6, overflow: "hidden" }}>
                    <div style={{
                      height: "100%", width: `${barPct}%`,
                      background: isDeload
                        ? "linear-gradient(90deg, #1e3a5f, #2C5F8A)"
                        : "linear-gradient(90deg, #c45a00, #ff8a1a)",
                      borderRadius: 6,
                      display: "flex", alignItems: "center", paddingLeft: 10,
                      boxSizing: "border-box" as const,
                    }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: isDeload ? "rgba(255,255,255,0.9)" : "#000", whiteSpace: "nowrap" as const }}>
                        {b.km} km
                      </span>
                    </div>
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 600, flexShrink: 0, width: 80, textAlign: "right" as const, color: isDeload ? "#60a5fa" : "rgba(255,255,255,0.3)" }}>
                    {b.week === 1 ? `Base · ${blockLabel}` : isDeload ? "−30% deload" : `+10% · ${blockLabel}`}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 10, padding: "14px 18px" }}>
          <p style={{ fontSize: 13, color: BODY, margin: 0, lineHeight: 1.65 }}>
            Week 4 and Week 8 are deload weeks. The fitness gained in the hard weeks is absorbed during deload — not during the training itself. Skipping deload weeks is the most common reason athletes plateau.
          </p>
        </div>

        <Divider />

        {/* ── SECTION 5: Strength & injury resilience ── */}
        <SectionLabel>Strength &amp; Injury Resilience</SectionLabel>

        <h2 style={{ fontSize: 20, fontWeight: 700, color: WHITE, margin: "0 0 6px" }}>
          Why strength training is non-negotiable for your goal
        </h2>

        {/* Always-visible callout */}
        <div style={{
          background: `${ORANGE}08`, border: `1px solid ${ORANGE}30`,
          borderLeft: `3px solid ${ORANGE}`, borderRadius: 10,
          padding: "16px 20px", margin: "16px 0 24px",
        }}>
          <p style={{ fontSize: 13, color: BODY, margin: 0, lineHeight: 1.7 }}>
            Strength training is in this plan because running performance is limited by structural capacity, not just cardiovascular fitness. Single-leg strength, eccentric loading, and hip stability directly improve running economy and reduce injury risk — the two things that most reliably determine whether athletes reach their goals.
          </p>
        </div>

        {/* Injury-specific section */}
        {injuryProfile && injuryProfile.hasAnyInjury && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <p style={{ fontSize: 14, color: BODY, margin: 0, lineHeight: 1.65 }}>
              Most athletes treat strength as optional cross-training. For you, given your history, it is the primary intervention that will determine whether you reach your goal — not because it directly makes you faster, but because it raises your body's capacity to handle the training load that does.
            </p>

            {/* RED-S warning — only shown when bone stress is flagged */}
            {injuryProfile.hasBoneStress && (
              <div style={{
                background: "rgba(220,38,38,0.08)", border: "1px solid rgba(220,38,38,0.4)",
                borderLeft: "4px solid #dc2626", borderRadius: 12, padding: "20px 22px",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <span style={{ fontSize: 18 }}>🚨</span>
                  <p style={{ fontSize: 13, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#ef4444", margin: 0 }}>
                    RED-S Flag — Relative Energy Deficiency in Sport
                  </p>
                </div>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", lineHeight: 1.7, margin: "0 0 12px" }}>
                  Bone stress injuries in endurance athletes are not always just a training load problem. <strong style={{ color: "#fff" }}>Relative Energy Deficiency in Sport (RED-S)</strong> — previously called the Female Athlete Triad — occurs when training demand outstrips caloric intake over time. The body deprioritises bone remodelling when energy availability is low, making bones progressively more vulnerable regardless of training volume.
                </p>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", lineHeight: 1.7, margin: "0 0 14px" }}>
                  Signs that RED-S may be contributing include: history of multiple bone stress injuries, low body weight relative to training load, irregular menstrual cycle (in female athletes), persistent fatigue despite adequate sleep, or a feeling of training hard but not improving.
                </p>
                <div style={{
                  background: "rgba(220,38,38,0.1)", border: "1px solid rgba(220,38,38,0.25)",
                  borderRadius: 8, padding: "12px 16px",
                }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#ef4444", margin: "0 0 6px" }}>
                    Before progressing training load:
                  </p>
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.7)", lineHeight: 1.65, margin: 0 }}>
                    See a <strong style={{ color: "#fff" }}>sports dietitian</strong> with experience in endurance athletes to assess energy availability. See a <strong style={{ color: "#fff" }}>sports medicine doctor</strong> for bone density assessment if you have had more than one bone stress injury. Training through RED-S without addressing the nutritional driver will not resolve the injury pattern — it will perpetuate it.
                  </p>
                </div>
              </div>
            )}

            {injuryProfile.insights.map((insight) => (
              <div key={insight.injuryName} style={{
                background: "#0e0e0e", border: "1px solid rgba(255,138,26,0.2)",
                borderRadius: 14, overflow: "hidden",
              }}>
                {/* Card header */}
                <div style={{
                  background: `${ORANGE}10`, borderBottom: "1px solid rgba(255,138,26,0.15)",
                  padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between",
                }}>
                  <p style={{ fontSize: 16, fontWeight: 600, color: ORANGE, margin: 0 }}>
                    {insight.injuryName}
                  </p>
                  <span style={{
                    fontSize: 9, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" as const,
                    color: ORANGE, background: `${ORANGE}18`, borderRadius: 4, padding: "3px 8px",
                  }}>
                    Why this matters for your goal
                  </span>
                </div>

                <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 14 }}>
                  {/* Why it happens */}
                  <p style={{ fontSize: 13, color: "rgba(255,255,255,0.5)", margin: 0, lineHeight: 1.7 }}>
                    {insight.whyItHappens}
                  </p>

                  {/* Why strength fixes it */}
                  <p style={{
                    fontSize: 13, color: "rgba(255,255,255,0.7)", margin: 0, lineHeight: 1.7,
                    borderLeft: "2px solid rgba(255,138,26,0.4)", paddingLeft: 12,
                  }}>
                    {insight.whyStrengthFixes}
                  </p>

                  {/* Exercise list */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {insight.keyExercises.map((ex) => (
                      <div key={ex.name} style={{
                        background: "#141414", border: "1px solid rgba(255,255,255,0.07)",
                        borderRadius: 10, padding: "12px 16px",
                      }}>
                        <p style={{ fontSize: 13, fontWeight: 500, color: WHITE, margin: "0 0 4px" }}>{ex.name}</p>
                        <p style={{ fontSize: 11, color: ORANGE, margin: "0 0 4px" }}>{ex.prescription}</p>
                        <p style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", margin: 0, fontStyle: "italic", lineHeight: 1.5 }}>{ex.why}</p>
                      </div>
                    ))}
                  </div>

                  {/* Warning sign */}
                  <div style={{
                    background: "rgba(239,68,68,0.05)", border: "1px solid rgba(239,68,68,0.2)",
                    borderRadius: 8, padding: "12px 16px",
                    display: "flex", gap: 10, alignItems: "flex-start",
                  }}>
                    <span style={{ fontSize: 14, flexShrink: 0 }}>⚠</span>
                    <p style={{ fontSize: 12, color: "rgba(239,68,68,0.8)", margin: 0, lineHeight: 1.6 }}>
                      {insight.warningSign}
                    </p>
                  </div>

                  {/* Timeline note */}
                  <div style={{
                    background: "rgba(125,179,245,0.05)", border: "1px solid rgba(125,179,245,0.2)",
                    borderRadius: 8, padding: "12px 16px",
                    display: "flex", gap: 10, alignItems: "flex-start",
                  }}>
                    <span style={{ fontSize: 14, flexShrink: 0 }}>⏱</span>
                    <p style={{ fontSize: 12, color: "rgba(125,179,245,0.8)", margin: 0, lineHeight: 1.6 }}>
                      {insight.timelineNote}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <Divider />

        {/* ── SECTION 6: Zone cards ── */}
        <SectionLabel>Talk Test — Intensity Guide</SectionLabel>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {ZONES.map((z) => {
            const isActive = activeZone === z.id;
            return (
              <button
                key={z.id}
                onClick={() => setActiveZone(isActive ? null : z.id)}
                style={{
                  background: isActive ? CARD : "transparent",
                  border: `1px solid ${isActive ? z.color + "60" : BORDER}`,
                  borderLeft: `3px solid ${z.color}`,
                  borderRadius: 10, padding: "14px 18px",
                  cursor: "pointer", textAlign: "left", width: "100%",
                  transition: "all 0.2s ease",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: z.color, letterSpacing: "0.1em", textTransform: "uppercase", minWidth: 40 }}>
                      {z.label}
                    </span>
                    <span style={{ fontSize: 13, color: isActive ? WHITE : BODY, fontWeight: isActive ? 600 : 400, transition: "color 0.2s" }}>
                      {z.feel.split(".")[0]}.
                    </span>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: MUTED, marginLeft: 12, flexShrink: 0 }}>
                    {z.pct}
                  </span>
                </div>

                {isActive && (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${RULE}` }}>
                    <p style={{ fontSize: 13, color: BODY, margin: "0 0 10px", lineHeight: 1.65 }}>{z.feel}</p>
                    <p style={{ fontSize: 12, color: MUTED, margin: "0 0 10px" }}>
                      <span style={{ color: z.color, fontWeight: 700 }}>Used for: </span>{z.session}
                    </p>
                    <div style={{ background: "#130a00", border: `1px solid ${ORANGE}22`, borderRadius: 8, padding: "10px 14px" }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: ORANGE, letterSpacing: "0.1em", textTransform: "uppercase", margin: "0 0 4px" }}>
                        Common mistake
                      </p>
                      <p style={{ fontSize: 12, color: BODY, margin: 0, lineHeight: 1.6 }}>{z.mistake}</p>
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <Divider />

        {/* ── SECTION 6: Blueprint summary ── */}
        <SectionLabel>Blueprint Summary</SectionLabel>

        <div style={{
          border: `1px solid ${ORANGE}40`, borderRadius: 12,
          overflow: "hidden", marginBottom: 32,
        }}>
          <div style={{ background: `${ORANGE}10`, padding: "14px 20px", borderBottom: `1px solid ${ORANGE}20` }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: ORANGE, margin: 0, letterSpacing: "0.08em" }}>
              {isHyrox ? "HYROX" : intake.eventType} · {intake.level} · {phases.length}-phase programme
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
            {summaryStats.map((s, i) => (
              <div
                key={s.label}
                style={{
                  padding: "16px 20px",
                  borderBottom: i < summaryStats.length - 2 ? `1px solid ${RULE}` : "none",
                  borderRight: i % 2 === 0 ? `1px solid ${RULE}` : "none",
                }}
              >
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: MUTED, margin: "0 0 4px" }}>
                  {s.label}
                </p>
                <p style={{ fontSize: 14, fontWeight: 600, color: WHITE, margin: 0 }}>{s.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Closing note ── */}
        <div style={{
          background: `${ORANGE}08`, border: `1px solid ${ORANGE}25`,
          borderRadius: 12, padding: "20px 24px", textAlign: "center",
        }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: ORANGE, margin: "0 0 6px", letterSpacing: "0.06em", textTransform: "uppercase" }}>
            Your blueprint is ready
          </p>
          <p style={{ fontSize: 13, color: BODY, margin: 0, lineHeight: 1.65 }}>
            Check your inbox — your full plan details have been sent. Follow the phase order, protect the deload weeks, and execute the intensity zones as described.
          </p>
        </div>
          </>
        )}

      </div>
    </div>
  );
}
