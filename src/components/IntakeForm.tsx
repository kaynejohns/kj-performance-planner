import { useState } from "react";
import { equipmentOptions } from "../lib/validation";
import type { IntakeInput, Weakness } from "../lib/types";
import { AccentPill } from "./uiPrimitives";

// ── Derivation helpers ────────────────────────────────────────────────────────
function deriveGoalFromEvent(eventType: string): string {
  const map: Record<string, string> = {
    "5k":           "Improve 5k / 10k",
    "10k":          "Improve 5k / 10k",
    "Half Marathon":"Improve Half Marathon time",
    "Marathon":     "Improve Marathon time",
    "HYROX":        "Improve HYROX performance",
    "Football":     "Improve race readiness",
    "Rugby":        "Improve race readiness",
    "AFL":          "Improve race readiness",
    "Other":        "Improve race readiness",
  };
  return map[eventType] || "Improve race readiness";
}

function deriveLevelFromDescription(text: string): IntakeInput["level"] {
  const map: Record<string, IntakeInput["level"]> = {
    "I run when I can — no real structure":   "Beginner",
    "I train regularly but follow no plan":   "Recreational",
    "I follow a plan most of the time":       "Intermediate",
    "I train seriously with structure":       "Advanced",
  };
  return map[text] ?? "Intermediate";
}

// ── Option constants ──────────────────────────────────────────────────────────
const SESSION_OPTIONS = [
  { label: "2–3", value: 2 },
  { label: "4–5", value: 4 },
  { label: "6–7", value: 6 },
  { label: "8+",  value: 8 },
] as const;

const HOURS_OPTIONS = [
  { label: "Under 4h", value: 3 },
  { label: "5–7h",     value: 6 },
  { label: "8–10h",    value: 9 },
  { label: "10h+",     value: 12 },
] as const;

const QUALITY_OPTIONS = [
  { label: "0",  value: 0 },
  { label: "1",  value: 1 },
  { label: "2",  value: 2 },
  { label: "3+", value: 3 },
] as const;

const TRAINING_DESCRIPTIONS: { text: string; level: IntakeInput["level"] }[] = [
  { text: "I run when I can — no real structure", level: "Beginner"      },
  { text: "I train regularly but follow no plan", level: "Recreational"  },
  { text: "I follow a plan most of the time",     level: "Intermediate"  },
  { text: "I train seriously with structure",     level: "Advanced"      },
];

const WEAKNESS_CARDS: { label: string; subtitle: string; value: Weakness }[] = [
  {
    label:    "My engine — I run out of breath before my legs give out",
    subtitle: "Aerobic base is limiting you",
    value:    "Aerobic base",
  },
  {
    label:    "My legs — I fade badly in the second half of races",
    subtitle: "Threshold capacity is your ceiling",
    value:    "Threshold fitness",
  },
  {
    label:    "My recovery — I feel tired all the time no matter what I do",
    subtitle: "Fatigue resistance or load management",
    value:    "Fatigue resistance",
  },
  {
    label:    "My body — niggles and injuries keep disrupting my training",
    subtitle: "Durability and structural resilience",
    value:    "Durability / injury resilience",
  },
  {
    label:    "My strength — I feel weak or inefficient in my movement",
    subtitle: "Running-specific strength is the gap",
    value:    "Strength",
  },
  {
    label:    "My speed — I have the fitness but can't convert it to fast racing",
    subtitle: "Top-end speed and race-pace conversion",
    value:    "Speed",
  },
  {
    label:    "My race execution — I train well but fall apart on race day",
    subtitle: "Race-specific conditioning and pacing",
    value:    "Race-specific conditioning",
  },
  {
    label:    "Honestly not sure — something just isn't clicking",
    subtitle: "The analysis will identify it",
    value:    "Aerobic base",
  },
];

const RUNNING_EVENTS = ["5k", "10k", "Half Marathon", "Marathon"] as const;
const TEAM_EVENTS    = ["Football", "Rugby", "AFL", "Other"]       as const;

// ── Shared style helpers ──────────────────────────────────────────────────────
const inputClass =
  "w-full rounded-xl border border-white/12 bg-[#141414] px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-[#6f6f6f] focus:border-[#ff8a1a] focus:shadow-[0_0_0_3px_rgba(255,138,26,0.18)]";

const seg = (active: boolean) =>
  `rounded-lg border px-3 py-2 text-sm transition-all ${
    active
      ? "border-[#ff8a1a]/70 bg-[#ff8a1a]/12 text-white"
      : "border-white/10 bg-white/[0.03] text-white/55 hover:border-[#ff8a1a]/40 hover:text-white/80"
  }`;

// ── Q: question wrapper ───────────────────────────────────────────────────────
function Q({
  label,
  subtitle,
  children,
}: {
  label: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p style={{ fontSize: 15, fontWeight: 600, color: "#fff", margin: subtitle ? "0 0 3px" : "0 0 12px" }}>
        {label}
      </p>
      {subtitle && (
        <p style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", margin: "0 0 12px", lineHeight: 1.5 }}>
          {subtitle}
        </p>
      )}
      {children}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function IntakeForm({
  step,
  intake,
  setIntake,
}: {
  step: number;
  intake: IntakeInput;
  setIntake: (v: IntakeInput) => void;
}) {
  // track weakness card selection separately so two cards mapping to same
  // weakness value can each have distinct visual selected state
  const [selectedWeaknessLabel, setSelectedWeaknessLabel] = useState<string>(() => {
    const match = WEAKNESS_CARDS.find((c) => c.value === intake.weakness);
    return match?.label ?? "";
  });

  // track selected team sub-sport visually without touching eventType enum
  const [selectedTeamSport, setSelectedTeamSport] = useState<string>("");

  const set = <K extends keyof IntakeInput>(k: K, v: IntakeInput[K]) =>
    setIntake({ ...intake, [k]: v });

  const isRunningEvent = ["5k", "10k", "Half Marathon", "Marathon"].includes(intake.eventType);

  const toggleEquipment = (item: string) => {
    const current = intake.equipmentAccess || [];
    set(
      "equipmentAccess",
      current.includes(item) ? current.filter((x) => x !== item) : [...current, item],
    );
  };

  // ── Step meta ──────────────────────────────────────────────────────────────
  const stepMeta =
    step === 1
      ? {
          label:    "Your event",
          title:    "Tell us about your event",
          subtitle: "Your sport, your goal, and where you're starting from",
        }
      : step === 2
        ? {
            label:    "Training load",
            title:    "How much do you train?",
            subtitle: "Be honest — overestimating is one of the most common limiters",
          }
        : {
            label:    "Your limiters",
            title:    "What's holding you back?",
            subtitle: "This is where the diagnosis gets specific to you",
          };

  return (
    <div className="space-y-5">
      {/* Step header */}
      <div>
        <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#ff8a1a]">
          {stepMeta.label}
        </p>
        <h3 className="mb-1 text-xl font-semibold leading-snug text-white">{stepMeta.title}</h3>
        <p className="mb-2 text-[13px] leading-relaxed text-white/35">{stepMeta.subtitle}</p>
      </div>

      {/* ═══════════════════════════════ STEP 1 ═══════════════════════════════ */}
      {step === 1 && (
        <>
          {/* Q1: Sport */}
          <Q label="What are you training for?">
            <div className="flex gap-2">
              {(["Running", "HYROX", "Team Sport"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    if (s === "HYROX") {
                      setIntake({
                        ...intake,
                        sport: "HYROX",
                        eventType: "HYROX",
                        goal: "Improve HYROX performance",
                      });
                    } else if (s === "Running") {
                      setIntake({
                        ...intake,
                        sport: "Running",
                        eventType: "5k",
                        goal: "Improve 5k / 10k",
                      });
                    } else {
                      setIntake({
                        ...intake,
                        sport: "Team Sport",
                        eventType: "Team sport conditioning",
                        goal: "Improve race readiness",
                      });
                    }
                  }}
                  className={`flex-1 ${seg(intake.sport === s)}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </Q>

          {/* Q2: Event type */}
          {intake.sport === "HYROX" ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{
                fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase",
                color: "#ff8a1a", background: "rgba(255,138,26,0.1)",
                border: "1px solid rgba(255,138,26,0.3)", borderRadius: 20,
                padding: "5px 16px",
              }}>
                HYROX — 60 min race
              </span>
              <span style={{ fontSize: 12, color: "rgba(255,255,255,0.25)" }}>Auto-selected</span>
            </div>
          ) : (
            <Q
              label="Which distance?"
              subtitle="Pick the one you're focused on right now"
            >
              <div className="flex flex-wrap gap-2">
                {(intake.sport === "Team Sport" ? TEAM_EVENTS : RUNNING_EVENTS).map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => {
                      if (intake.sport === "Team Sport") {
                        setSelectedTeamSport(e);
                        // Write sport into priority so the AI knows which game — preserve any existing notes
                        const existingNotes = (intake.priority || "").replace(/^Sport: \w+\n?/, "").trim();
                        setIntake({
                          ...intake,
                          goal: deriveGoalFromEvent(e),
                          priority: `Sport: ${e}${existingNotes ? `\n${existingNotes}` : ""}`,
                        });
                      } else {
                        setIntake({
                          ...intake,
                          eventType: e as IntakeInput["eventType"],
                          goal: deriveGoalFromEvent(e),
                        });
                      }
                    }}
                    className={seg(
                      intake.sport === "Team Sport"
                        ? selectedTeamSport === e
                        : intake.eventType === e
                    )}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </Q>
          )}

          {/* Q3: Current PB */}
          <Q
            label="What's your current PB for this event?"
            subtitle="Your honest best — not a goal, not a hope. Leave blank if you haven't raced this distance yet."
          >
            <input
              className={inputClass}
              value={intake.currentBenchmark}
              onChange={(e) => set("currentBenchmark", e.target.value)}
              placeholder="e.g. 22:00 — or leave blank"
            />
          </Q>

          {/* Q4: Goal time */}
          <Q
            label="What time are you chasing?"
            subtitle="The number you'd be genuinely thrilled with on race day"
          >
            <input
              className={inputClass}
              value={intake.goalBenchmark}
              onChange={(e) => set("goalBenchmark", e.target.value)}
              placeholder="e.g. 20:00"
            />
          </Q>

          {/* Q5: Training description → level */}
          <Q
            label="How would you describe your current training?"
            subtitle="Be honest — this changes your entire plan"
          >
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {TRAINING_DESCRIPTIONS.map((opt) => {
                const active = intake.level === opt.level;
                return (
                  <button
                    key={opt.text}
                    type="button"
                    onClick={() => set("level", deriveLevelFromDescription(opt.text))}
                    className={`border transition-all ${active
                      ? "border-[#ff8a1a]/70 bg-[#ff8a1a]/12 text-white"
                      : "border-white/10 bg-white/[0.03] text-white/55 hover:border-[#ff8a1a]/40 hover:text-white/80"
                    }`}
                    style={{
                      minHeight: 56,
                      padding: "10px 8px",
                      textAlign: "center",
                      fontSize: 12,
                      lineHeight: 1.4,
                      borderRadius: 8,
                      cursor: "pointer",
                    }}
                  >
                    {opt.text}
                  </button>
                );
              })}
            </div>
          </Q>
        </>
      )}

      {/* ═══════════════════════════════ STEP 2 ═══════════════════════════════ */}
      {step === 2 && (
        <>
          {/* Q1: Sessions per week */}
          <Q
            label="How many times a week do you actually train?"
            subtitle="Not what you aim for — what you actually do most weeks"
          >
            <div className="flex gap-2">
              {SESSION_OPTIONS.map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => set("sessionsPerWeek", opt.value)}
                  className={`flex-1 ${seg(intake.sessionsPerWeek === opt.value)}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </Q>

          {/* Q2: Hours per week */}
          <Q
            label="How many hours is that in total?"
            subtitle="Rough total across all sessions"
          >
            <div className="flex gap-2">
              {HOURS_OPTIONS.map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => set("hoursPerWeek", opt.value)}
                  className={`flex-1 ${seg(intake.hoursPerWeek === opt.value)}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </Q>

          {/* Q3 + Q4: Running volume (running events only) */}
          {isRunningEvent && (
            <>
              <Q
                label="How many kilometres are you running each week?"
                subtitle="Approximate is fine — think about your last normal week"
              >
                <input
                  className={inputClass}
                  type="number"
                  min={0}
                  value={intake.weeklyKm || ""}
                  onChange={(e) => set("weeklyKm", Number(e.target.value) || undefined)}
                  placeholder="e.g. 40"
                />
              </Q>

              <Q
                label="What's your current longest run?"
                subtitle="The longest you've done in the last 4 weeks"
              >
                <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
                  <input
                    className={inputClass}
                    type="number"
                    min={0}
                    value={intake.longestRun || ""}
                    onChange={(e) => set("longestRun", Number(e.target.value) || undefined)}
                    placeholder="e.g. 18"
                    style={{ borderRadius: "10px 0 0 10px", borderRight: "none" }}
                  />
                  <span style={{
                    padding: "0 14px", background: "#1a1a1a",
                    border: "1px solid rgba(255,255,255,0.12)", borderRadius: "0 10px 10px 0",
                    color: "rgba(255,255,255,0.3)", fontSize: 13,
                    height: 42, display: "flex", alignItems: "center",
                  }}>
                    km
                  </span>
                </div>
              </Q>
            </>
          )}

          {/* Q5: Quality sessions */}
          <Q
            label="How many of those sessions involve real effort?"
            subtitle="Intervals, tempo runs, hard training — not easy jogging"
          >
            <div className="flex gap-2">
              {QUALITY_OPTIONS.map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => set("qualitySessionsPerWeek", opt.value)}
                  className={`flex-1 ${seg(intake.qualitySessionsPerWeek === opt.value)}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </Q>

          {/* Q6: Timeline */}
          <Q
            label="Do you have a race or event date in mind?"
            subtitle="Optional — helps us frame your timeline honestly"
          >
            <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
              {/* "In ___ weeks" input */}
              <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 0 }}>
                <span style={{
                  padding: "0 12px", background: "#1a1a1a",
                  border: "1px solid rgba(255,255,255,0.12)", borderRadius: "10px 0 0 10px",
                  color: "rgba(255,255,255,0.3)", fontSize: 12,
                  height: 42, display: "flex", alignItems: "center", whiteSpace: "nowrap",
                }}>
                  In
                </span>
                <input
                  type="number"
                  min={1}
                  value={intake.timelineWeeks || ""}
                  onChange={(e) => set("timelineWeeks", Number(e.target.value) || undefined)}
                  placeholder="—"
                  style={{
                    flex: 1, background: "#141414",
                    border: "1px solid rgba(255,255,255,0.12)", borderLeft: "none", borderRight: "none",
                    padding: "0 10px", height: 42,
                    fontSize: 14, color: "#fff", outline: "none",
                    textAlign: "center",
                  }}
                />
                <span style={{
                  padding: "0 12px", background: "#1a1a1a",
                  border: "1px solid rgba(255,255,255,0.12)", borderRadius: "0 10px 10px 0",
                  color: "rgba(255,255,255,0.3)", fontSize: 12,
                  height: 42, display: "flex", alignItems: "center", whiteSpace: "nowrap",
                }}>
                  weeks
                </span>
              </div>
              {/* No fixed date button */}
              <button
                type="button"
                onClick={() => set("timelineWeeks", undefined)}
                className={seg(!intake.timelineWeeks)}
                style={{ whiteSpace: "nowrap", padding: "0 14px" }}
              >
                No fixed date
              </button>
            </div>
          </Q>

          {/* Q7: Equipment */}
          <Q
            label="What do you have access to?"
            subtitle="Select everything available to you"
          >
            <div className="flex flex-wrap gap-2">
              {equipmentOptions.map((x) => (
                <button
                  key={x}
                  type="button"
                  onClick={() => toggleEquipment(x)}
                  className={`rounded-full border px-3 py-1 text-xs transition ${
                    intake.equipmentAccess?.includes(x)
                      ? "border-[#ff8a1a]/60 bg-[#ff8a1a]/15 text-[#ffd9b5]"
                      : "border-white/15 bg-[#121212] text-[#b8b8b8] hover:border-[#ff8a1a]/40"
                  }`}
                >
                  {x}
                </button>
              ))}
            </div>
            <div className="mt-2">
              <AccentPill>Select all that apply</AccentPill>
            </div>
          </Q>
        </>
      )}

      {/* ═══════════════════════════════ STEP 3 ═══════════════════════════════ */}
      {step === 3 && (
        <>
          {/* Q1: Weakness — vertical option cards */}
          <Q
            label="If your training had one weak link, what would it be?"
            subtitle="Pick the one that feels most true — your gut answer"
          >
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {WEAKNESS_CARDS.map((card) => {
                const isActive = selectedWeaknessLabel === card.label;
                return (
                  <button
                    key={card.label}
                    type="button"
                    onClick={() => {
                      setSelectedWeaknessLabel(card.label);
                      set("weakness", card.value);
                    }}
                    style={{
                      background: isActive ? "rgba(255,138,26,0.08)" : "rgba(255,255,255,0.03)",
                      border: isActive
                        ? "1px solid rgba(255,138,26,0.6)"
                        : "1px solid rgba(255,255,255,0.08)",
                      borderLeft: isActive ? "3px solid #ff8a1a" : "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 10,
                      padding: "12px 14px",
                      cursor: "pointer",
                      textAlign: "left",
                      display: "flex",
                      flexDirection: "column",
                      gap: 3,
                      transition: "all 0.15s",
                      width: "100%",
                    }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#fff", lineHeight: 1.4 }}>
                      {card.label}
                    </span>
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
                      {card.subtitle}
                    </span>
                  </button>
                );
              })}
            </div>
          </Q>

          {/* Q2: Injury history — free text */}
          <Q
            label="Any injuries or niggles worth knowing about?"
            subtitle="Even old ones matter — they change how we structure your load"
          >
            <textarea
              className={inputClass}
              rows={3}
              value={intake.injuryHistory || ""}
              onChange={(e) => set("injuryHistory", e.target.value)}
              placeholder="e.g. ongoing calf tightness, previous Achilles issue, right knee pain on longer runs — or 'none' if all clear"
              style={{ resize: "vertical", minHeight: 80 }}
            />
          </Q>

          {/* Q3: Priority note — optional */}
          <Q
            label="Anything else we should know?"
            subtitle="Optional — upcoming race, specific concern, or context"
          >
            <textarea
              className={inputClass}
              rows={2}
              value={(intake.priority || "").replace(/^Sport: \w+\n?/, "")}
              onChange={(e) => {
                const sportPrefix = (intake.priority || "").match(/^(Sport: \w+)\n?/)?.[1];
                set("priority", sportPrefix ? `${sportPrefix}\n${e.target.value}` : e.target.value);
              }}
              placeholder="e.g. I have a race in 8 weeks, or I can only train Tuesday/Thursday/weekends"
              style={{ resize: "vertical", minHeight: 64 }}
            />
          </Q>
        </>
      )}
    </div>
  );
}
