import type {
  DetailedPlanOutput,
  DetailedPlanWeek,
  IntakeInput,
  LeadInput,
  MonetizationLinks,
  PlannerOutput,
} from "../lib/types";
import FullProgramView from "./FullProgramView";
import { buildPeriodisationRoadmap } from "../lib/periodisationRoadmap";
import { buildWeeklyCalendarPreview } from "../lib/plannerWeeklyTemplates";
import { AccentPill, SectionLabel, StatCard } from "./uiPrimitives";

// ─── Shared block wrapper ─────────────────────────────────────────────────────
function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-[linear-gradient(180deg,#1a1a1a_0%,#111111_100%)] p-5 shadow-[0_14px_32px_rgba(0,0,0,0.4)] transition duration-200 hover:-translate-y-[1px] hover:border-[#ff8a1a]/30 hover:shadow-[0_16px_36px_rgba(0,0,0,0.48)]">
      <SectionLabel>{title}</SectionLabel>
      <div className="mt-3">{children}</div>
    </section>
  );
}

// ─── Live intake summary (no plan yet) ────────────────────────────────────────
function LiveIntakeSummary({ intake, step }: { intake: IntakeInput; step: number }) {
  const stepRows = [
    { label: "Sport + event + PB", done: step > 1, active: step === 1, idx: 1 },
    { label: "Training load", done: step > 2, active: step === 2, idx: 2 },
    { label: "Limiters + history", done: false, active: step === 3, idx: 3 },
  ];
  return (
    <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-[#0d0d0d] px-6 py-10 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-[#ff8a1a]/30 bg-[#1a0f07] text-[#ff8a1a]">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      </div>
      <p className="text-sm font-semibold text-white">Your analysis is waiting</p>
      <p className="mt-2 max-w-xs text-xs leading-relaxed text-[#6a6a6a]">
        Complete 3 steps. Results appear here in under 15 seconds — no email needed yet.
      </p>
      <div className="mt-6 w-full max-w-xs space-y-2 text-left">
        {stepRows.map((row) => (
          <div key={row.label} className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${row.active ? "border-[#ff8a1a]/40 bg-[#1a120d]" : "border-white/8 bg-[#141414]"}`}>
            <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] ${row.done ? "border-[#ff8a1a]/60 bg-[#ff8a1a]/15 text-[#ffd7b3]" : row.active ? "border-[#ff8a1a]/45 text-[#ffb978]" : "border-white/20 text-[#777]"}`}>
              {row.done ? "✓" : row.idx}
            </span>
            <span className={`${row.active ? "text-[#e8c7a3]" : "text-[#999]"} text-xs`}>{row.label}</span>
          </div>
        ))}
      </div>
      {step > 1 && (
        <div className="mt-4 w-full max-w-xs space-y-1.5 rounded-xl border border-white/8 bg-[#141414] p-3 text-left text-xs">
          <p className="text-white/40">Captured so far</p>
          <p><span className="text-[#ff8a1a]">Sport:</span> <span className="text-white/70">{intake.sport}</span></p>
          <p><span className="text-[#ff8a1a]">Event:</span> <span className="text-white/70">{intake.eventType}</span></p>
          {intake.currentBenchmark?.trim() && (
            <p><span className="text-[#ff8a1a]">Current PB:</span> <span className="text-white/70">{intake.currentBenchmark}</span></p>
          )}
          {intake.goalBenchmark?.trim() && (
            <p><span className="text-[#ff8a1a]">Goal:</span> <span className="text-white/70">{intake.goalBenchmark}</span></p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Email gate ───────────────────────────────────────────────────────────────
// Appears after headline + gap are shown freely.
// The copy is specific to what they're about to unlock — not generic.
function EmailGate({
  intake,
  lead,
  setLead,
  onUnlock,
  isUnlocking,
  errors,
}: {
  intake: IntakeInput;
  lead: LeadInput;
  setLead: (v: LeadInput) => void;
  onUnlock: () => void;
  isUnlocking: boolean;
  errors: string[];
}) {
  const isHyrox = intake.sport === "HYROX" || intake.sport === "Hybrid";
  const isMarathon = intake.eventType === "Marathon" || intake.eventType === "Half Marathon";

  const unlockLine = isHyrox
    ? "Unlock your full HYROX performance breakdown — drivers, big rocks, weekly structure, risk flags, and your 4-week block."
    : isMarathon
    ? "Unlock your full endurance breakdown — what's actually limiting your race time, your weekly structure, and your 4-week progression block."
    : "Unlock your full performance breakdown — primary drivers, strategic priorities, weekly structure, risk flags, and your 4-week plan.";

  return (
    <div className="rounded-2xl border border-[#ff8a1a]/30 bg-gradient-to-br from-[#160d04] to-[#0e0a06] p-5">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[#ff8a1a] text-black">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="10" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-white">Unlock your full breakdown</p>
          <p className="mt-0.5 text-xs text-[#ffb978]/70">{isHyrox ? "HYROX-specific outputs and progression layers" : isMarathon ? "Endurance-specific strategy and progression layers" : "Sport-specific strategy and progression layers"}</p>
        </div>
      </div>

      <p className="mb-4 text-xs leading-relaxed text-[#d4b896]">{unlockLine}</p>

      <div className="space-y-2.5">
        <div className="grid gap-2 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-[0.06em] text-white/30">First name</label>
            <input
              type="text"
              value={lead.firstName}
              onChange={(e) => setLead({ ...lead, firstName: e.target.value })}
              placeholder="Alex"
              className="w-full rounded-xl border border-white/12 bg-[#0e0e0e] px-3 py-2.5 text-sm text-white outline-none placeholder:text-[#555] focus:border-[#ff8a1a] focus:shadow-[0_0_0_3px_rgba(255,138,26,0.15)]"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[10px] font-medium uppercase tracking-[0.06em] text-white/30">Email</label>
            <input
              type="email"
              value={lead.email}
              onChange={(e) => setLead({ ...lead, email: e.target.value })}
              placeholder="you@example.com"
              className="w-full rounded-xl border border-white/12 bg-[#0e0e0e] px-3 py-2.5 text-sm text-white outline-none placeholder:text-[#555] focus:border-[#ff8a1a] focus:shadow-[0_0_0_3px_rgba(255,138,26,0.15)]"
            />
          </div>
        </div>

        <label className="flex cursor-pointer items-start gap-2.5 text-xs text-[#9a9a9a]">
          <input
            type="checkbox"
            checked={lead.consentToMarketing}
            onChange={(e) => setLead({ ...lead, consentToMarketing: e.target.checked })}
            className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 accent-[#ff8a1a]"
          />
          <span>Send me coaching tips and performance insights from KJ. Unsubscribe any time.</span>
        </label>

        {errors.length > 0 && (
          <div className="rounded-lg border border-[#ff8a1a]/30 bg-[#25160d] px-3 py-2 text-xs text-[#f0c9a0]">
            {errors.map((e) => <p key={e}>— {e}</p>)}
          </div>
        )}

        <button
          type="button"
          onClick={onUnlock}
          disabled={isUnlocking}
          className="w-full rounded-xl bg-[#ff8a1a] py-3 text-sm font-bold tracking-wide text-black shadow-[0_8px_20px_rgba(255,138,26,0.30)] transition hover:-translate-y-[1px] hover:bg-[#ff9622] disabled:opacity-60"
        >
          {isUnlocking ? "Unlocking your plan..." : "Unlock My Full Analysis →"}
        </button>

        <p className="mt-2 text-center text-[10px] text-white/20">
          No payment. No spam. Just your plan.
        </p>
      </div>
    </div>
  );
}

// ─── Blurred section placeholder ─────────────────────────────────────────────
// Shown below the gate so athletes can see there's more content waiting
function LockedSection({ label }: { label: string }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/8 bg-[#111111]">
      <div className="select-none p-5 blur-[6px]">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#ff8a1a]">
          {label}
        </p>
        <div className="space-y-2">
          <div className="h-4 w-3/4 rounded bg-[#2a2a2a]" />
          <div className="h-4 w-1/2 rounded bg-[#222222]" />
          <div className="h-4 w-2/3 rounded bg-[#2a2a2a]" />
          <div className="h-4 w-5/6 rounded bg-[#222222]" />
        </div>
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex items-center gap-1.5 rounded-full border border-white/20 bg-[#0d0d0d]/80 px-3 py-1.5 text-xs text-[#888] backdrop-blur-sm">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          Unlock above
        </div>
      </div>
    </div>
  );
}

// ─── Hardcoded CTA copy — never AI-generated ──────────────────────────────────
function buildCtaCopy(intake: IntakeInput) {
  if (intake.sport === "HYROX" || intake.sport === "Hybrid") {
    return {
      title: "Get your full HYROX block",
      description:
        "Station-specific conditioning, hybrid load structure, and weekly targets built around your race date.",
      buttonLabel: "Build My HYROX Plan",
    };
  }
  if (intake.eventType === "Marathon" || intake.eventType === "Half Marathon") {
    return {
      title: "Get your full training block",
      description:
        "Progressive volume targets, long run structure, and the threshold work that actually moves your race time.",
      buttonLabel: "Build My Training Plan",
    };
  }
  return {
    title: "Get your full 4-week plan",
    description:
      "Weekly load targets, session structure, and progression markers built around your specific goal and timeline.",
    buttonLabel: "Build My 4-Week Plan",
  };
}

// ─── Session calendar (unchanged logic, tidied) ───────────────────────────────
function SessionCalendarPreview({
  detailedPlan,
  intake,
  weeksOverride,
}: {
  detailedPlan: DetailedPlanOutput;
  intake: IntakeInput;
  weeksOverride?: DetailedPlanWeek[] | null;
}) {
  const trainingStatus =
    intake.goal === "Return from injury"
      ? "rebuilding"
      : intake.hoursPerWeek <= 4
      ? "inconsistent"
      : intake.hoursPerWeek >= 9
      ? "high training load already"
      : "currently consistent";

  const currentInjuryStatus =
    intake.goal === "Return from injury"
      ? "returning from injury"
      : intake.injuryHistory?.trim()
      ? "managing niggle"
      : "healthy";

  const calendarWeeks =
    weeksOverride && weeksOverride.length > 0 ? weeksOverride : [...detailedPlan.weeklyBreakdown];

  const weeklyPreview = buildWeeklyCalendarPreview({
    sport: intake.sport === "Hybrid" ? "HYROX" : intake.sport,
    eventType: intake.eventType,
    hoursPerWeek: intake.hoursPerWeek,
    sessionsPerWeek: intake.sessionsPerWeek,
    trainingStatus,
    weakness: intake.weakness,
    injuryHistory: intake.injuryHistory,
    currentInjuryStatus,
    currentWeeklyKm: intake.weeklyKm ?? null,
  });

  return (
    <Block title="Session-Level Calendar Preview">
      <div className="space-y-4">
        <div className="rounded-xl border border-[#ff8a1a]/30 bg-[radial-gradient(120%_120%_at_100%_0%,rgba(255,138,26,0.12),transparent_52%),linear-gradient(90deg,#1d130d_0%,#16110d_100%)] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#ffb26a]">
            {weeklyPreview.templateName}
          </p>
          <p className="mt-1 text-sm font-semibold text-white">{weeklyPreview.weekHeadline}</p>
          <p className="mt-1 text-xs leading-relaxed text-[#e2c9ae]">{weeklyPreview.weekPurpose}</p>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#151515] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#ffb26a]">
            Intensity Distribution
          </p>
          <div className="mt-2 grid gap-2 text-xs sm:grid-cols-3">
            {(["low", "moderate", "high"] as const).map((zone) => (
              <div key={zone} className="rounded-lg border border-white/10 bg-[#1a1a1a] p-3">
                <p className="capitalize text-[#ffaf62]">{zone} intensity</p>
                <p className="mt-1 text-sm font-semibold text-white">
                  {weeklyPreview.intensityDistribution[zone]}
                </p>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs leading-relaxed text-[#d4d4d4]">
            {weeklyPreview.intensityDistribution.summary}
          </p>
        </div>

        {calendarWeeks.map((week) => (
          <div key={`cal-${week.week}`} className="rounded-xl border border-white/10 bg-[#141414] p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold text-white">
                Week {week.week}: {week.theme}
              </p>
              <span className="rounded-full border border-[#ff8a1a]/40 bg-[#24170f] px-2.5 py-0.5 text-[11px] text-[#ffc995]">
                Checkpoint Week
              </span>
            </div>
            <p className="mb-3 text-xs text-[#bdbdbd]">{week.objective}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {weeklyPreview.sessionCards.map((slot) => (
                <div key={`${week.week}-${slot.day}`} className="rounded-lg border border-white/8 bg-[#1a1a1a] p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#ff9e45]">
                      {slot.day}
                    </p>
                    <span className="rounded-full border border-[#ff8a1a]/35 bg-[#22160f] px-2 py-0.5 text-[10px] font-medium text-[#ffcf9f]">
                      {slot.systemTag}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-semibold text-white">{slot.title}</p>
                  <p className="mt-1 text-xs leading-relaxed text-[#d8d8d8]">{slot.description}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 rounded-lg border border-white/10 bg-[#171717] p-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#ffb26a]">
                Progression Checkpoint
              </p>
              <p className="mt-1 text-xs text-[#d4d4d4]">{weeklyPreview.progressionCheckpoint}</p>
            </div>
          </div>
        ))}

        <div className="rounded-xl border border-white/10 bg-[#171717] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#ffb26a]">Coaching Note</p>
          <p className="mt-1 text-sm leading-relaxed text-[#e5e5e5]">{weeklyPreview.coachingNote}</p>
        </div>

        <div className="rounded-xl border border-[#ff8a1a]/30 bg-[#21160f] p-4">
          <p className="text-sm font-semibold text-[#ffd5ad]">Auto-adjust rules</p>
          <ul className="mt-2 space-y-1 text-xs text-[#f1d8bb]">
            {detailedPlan.adjustmentRules.map((r) => <li key={r}>— {r}</li>)}
          </ul>
        </div>
      </div>
    </Block>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function ResultDashboard({
  plan,
  intake,
  step,
  monetizationLinks,
  detailedPlan,
  detailedPlanLoading,
  onGenerateDetailedPlan,
  isPreview,
  isUnlocked,
  isUnlocking,
  lead,
  setLead,
  onUnlock,
  unlockErrors,
  fullProgramOpen,
  onOpenFullProgram,
  onCloseFullProgram,
  programmeLength,
  displayWeeks,
  onGenerate12Week,
  onGenerate24Week,
  programGenerating,
  programGeneratingMessage,
  programQueued,
  brandName,
}: {
  plan: PlannerOutput | null;
  intake: IntakeInput;
  step: number;
  monetizationLinks?: MonetizationLinks;
  detailedPlan: DetailedPlanOutput | null;
  detailedPlanLoading: boolean;
  onGenerateDetailedPlan: () => void | Promise<void>;
  isPreview: boolean;
  isUnlocked: boolean;
  isUnlocking: boolean;
  lead: LeadInput;
  setLead: (v: LeadInput) => void;
  onUnlock: () => void;
  unlockErrors: string[];
  fullProgramOpen: boolean;
  onOpenFullProgram: () => void;
  onCloseFullProgram: () => void;
  programmeLength: 4 | 12 | 24;
  displayWeeks: DetailedPlanWeek[];
  onGenerate12Week: () => void;
  onGenerate24Week: () => void;
  programGenerating: null | 12 | 24;
  programGeneratingMessage?: string;
  programQueued?: null | 12 | 24;
  brandName?: string;
}) {
  if (!plan) return <LiveIntakeSummary intake={intake} step={step} />;

  const cta = buildCtaCopy(intake);
  const roadmap = plan.gapSummary
    ? buildPeriodisationRoadmap(intake, plan.gapSummary.classification, plan.gapSummary.timelineEstimate)
    : null;

  return (
    <div className="space-y-4 lg:space-y-5">

      {/* ── FREE: Gap summary ── always visible after submission */}
      {plan.gapSummary && (
        <Block title="Performance Gap Summary">
          <>
            <div className="rounded-xl border border-[#ff8a1a]/35 bg-[radial-gradient(120%_120%_at_100%_0%,rgba(255,138,26,0.16),transparent_52%),linear-gradient(90deg,#1c120c_0%,#14100d_100%)] p-4">
              <div className="grid gap-2 text-xs text-[#ffddb9] sm:grid-cols-2">
                <p><span className="text-[#ffaf62]">Current:</span> {plan.gapSummary.currentBenchmark}</p>
                <p><span className="text-[#ffaf62]">Goal:</span> {plan.gapSummary.goalBenchmark}</p>
                <p><span className="text-[#ffaf62]">Gap:</span> {plan.gapSummary.improvementRequired}</p>
                <p><span className="text-[#ffaf62]">Classification:</span> {plan.gapSummary.classification}</p>
              </div>
              <p className="mt-2 text-xs text-[#ffd1a1]">{plan.gapSummary.timelineEstimate}</p>
              <p className="mt-2 text-sm text-[#fff2e2]">{plan.gapSummary.summary}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {plan.gapSummary.primaryPriorities.map((p) => (
                  <AccentPill key={p}>{p}</AccentPill>
                ))}
              </div>
            </div>

            {roadmap && (
              <div className="mt-5 border-t border-white/8 pt-4">
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/25">
                  Long-term periodisation roadmap
                </p>

                {/* Coach context */}
                <div className="mb-4 flex items-start gap-3 rounded-xl border border-[#ff8a1a]/25 bg-[#ff8a1a]/6 p-3">
                  <div className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[#ff8a1a]">
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3" strokeLinecap="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                  <p className="text-[11px] leading-relaxed text-[#ffd4a0]/75">
                    <strong className="text-[#ff8a1a]">You are here — Phase 1, Week 1.</strong>{" "}
                    {roadmap.summary}
                  </p>
                </div>

                {/* Phase timeline */}
                <div className="flex flex-col gap-0">
                  {roadmap.phases.map((phase, i) => {
                    const isFirst = i === 0;
                    const isLast = i === roadmap.phases.length - 1;
                    const colors = {
                      foundation: {
                        dot: "#ff8a1a",
                        dotRing: "rgba(255,138,26,0.2)",
                        bar: "#ff8a1a",
                        tag: "rgba(255,138,26,0.1)",
                        tagBorder: "rgba(255,138,26,0.3)",
                        tagText: "#ffa84d",
                      },
                      development: {
                        dot: "rgba(255,255,255,0.3)",
                        dotRing: "transparent",
                        bar: "rgba(255,255,255,0.15)",
                        tag: "rgba(255,255,255,0.05)",
                        tagBorder: "rgba(255,255,255,0.12)",
                        tagText: "rgba(255,255,255,0.45)",
                      },
                      specific: {
                        dot: "rgba(255,255,255,0.18)",
                        dotRing: "transparent",
                        bar: "rgba(255,255,255,0.1)",
                        tag: "rgba(255,255,255,0.03)",
                        tagBorder: "rgba(255,255,255,0.08)",
                        tagText: "rgba(255,255,255,0.35)",
                      },
                      taper: {
                        dot: "rgba(125,179,245,0.5)",
                        dotRing: "transparent",
                        bar: "rgba(125,179,245,0.2)",
                        tag: "rgba(125,179,245,0.06)",
                        tagBorder: "rgba(125,179,245,0.2)",
                        tagText: "rgba(125,179,245,0.7)",
                      },
                    }[phase.type];

                    return (
                      <div key={i} className="grid gap-0" style={{ gridTemplateColumns: "72px 1fr" }}>
                        {/* Week labels */}
                        <div className="flex flex-col items-end pr-3 pt-0.5">
                          <span className="whitespace-nowrap text-[10px] font-semibold text-white/25">
                            Wk {phase.weekStart}
                          </span>
                          {!isLast && (
                            <span className="mt-auto whitespace-nowrap pb-1 text-[10px] text-white/15">
                              Wk {phase.weekEnd}
                            </span>
                          )}
                        </div>

                        {/* Content with vertical line */}
                        <div className="relative flex gap-0">
                          {/* Vertical line */}
                          {!isLast && (
                            <div className="absolute bottom-0 left-[3px] top-2 w-px bg-white/8" />
                          )}

                          {/* Dot */}
                          <div
                            className="relative z-10 mt-1.5 h-2 w-2 flex-shrink-0 rounded-full"
                            style={{
                              background: colors.dot,
                              boxShadow: isFirst ? `0 0 0 3px ${colors.dotRing}` : "none",
                            }}
                          />

                          {/* Phase content */}
                          <div className={`flex-1 pl-3 ${!isLast ? "pb-5" : ""}`}>
                            <p className="mb-1 text-[12px] font-semibold text-white">{phase.name}</p>
                            <p className="mb-2 text-[11px] leading-relaxed text-white/40">{phase.goal}</p>

                            {/* Progress bar */}
                            <div className="mb-2.5 h-0.5 overflow-hidden rounded-full" style={{ background: "rgba(255,255,255,0.05)" }}>
                              <div className="h-full rounded-full" style={{ width: "100%", background: colors.bar }} />
                            </div>

                            {/* Focus tags */}
                            <div className="mb-2 flex flex-wrap gap-1.5">
                              {phase.focus.map((f) => (
                                <span
                                  key={f}
                                  className="rounded px-2 py-0.5 text-[10px] font-medium"
                                  style={{
                                    background: colors.tag,
                                    border: `1px solid ${colors.tagBorder}`,
                                    color: colors.tagText,
                                  }}
                                >
                                  {f}
                                </span>
                              ))}
                            </div>

                            {/* KPIs */}
                            <div className="flex flex-wrap gap-3">
                              {phase.kpis.map((k) => (
                                <span key={k} className="flex items-center gap-1 text-[10px] text-white/30">
                                  <span className="h-1 w-1 flex-shrink-0 rounded-full bg-white/20" />
                                  {k}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Footer */}
                <div className="mt-3 flex items-center justify-between rounded-lg border border-[#ff8a1a]/15 bg-[#ff8a1a]/6 px-3 py-2.5">
                  <span className="text-[11px] text-[#ff8a1a]/70">Total timeline for your goal</span>
                  <span className="text-[11px] font-semibold text-[#ff8a1a]">
                    ~{roadmap.totalWeeks} weeks · {roadmap.totalBlocks} training blocks
                  </span>
                </div>
              </div>
            )}
          </>
        </Block>
      )}

      {/* ── FREE: Headline ── always visible */}
      <Block title="Performance Summary">
        <p className="text-2xl font-semibold leading-tight tracking-tight text-white sm:text-[30px]">
          {plan.headline}
        </p>
      </Block>

      {/* ── GATE or LOCKED PREVIEW ── */}
      {isPreview && (
        <>
          {/* Show blurred ghost sections so athletes see what's waiting */}
          <LockedSection label="Primary Performance Drivers" />
          <LockedSection label="Athlete Snapshot" />

          {/* The email gate */}
          <EmailGate
            intake={intake}
            lead={lead}
            setLead={setLead}
            onUnlock={onUnlock}
            isUnlocking={isUnlocking}
            errors={unlockErrors}
          />

          <LockedSection label="Big-Ticket Recommendations" />
          <LockedSection label="Weekly Structure + Risk Flags" />
        </>
      )}

      {/* ── UNLOCKED: full results ── */}
      {isUnlocked && (
        <>
          {/* Snapshot */}
          <Block title="Athlete Snapshot">
            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              <StatCard label="Sport" value={plan.snapshot.sport} />
              <StatCard label="Level" value={plan.snapshot.level} />
              <StatCard label="Goal" value={plan.snapshot.goal} />
              <StatCard label="Availability" value={plan.snapshot.availability} />
              <StatCard label="Main limiter" value={plan.snapshot.mainLimiter} />
            </div>
          </Block>

          {/* Drivers */}
          <Block title="Primary Performance Drivers">
            <ul className="space-y-2 text-[15px] leading-relaxed text-[#ebebeb]">
              {plan.drivers.map((d) => (
                <li key={d} className="rounded-lg border border-white/8 bg-[#171717] p-3.5">{d}</li>
              ))}
            </ul>
          </Block>

          {/* Big rocks */}
          <Block title="Big-Ticket Recommendations">
            <ul className="space-y-2.5 text-[15px] leading-relaxed text-[#ebebeb]">
              {plan.bigRocks.map((r) => (
                <li key={r} className="flex items-start gap-2.5">
                  <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#ff8a1a]" />
                  {r}
                </li>
              ))}
            </ul>
          </Block>

          {/* Weekly structure */}
          <Block title="Suggested Weekly Structure">
            <ul className="grid gap-2 text-sm sm:grid-cols-2">
              {plan.weeklyStructure.map((w) => (
                <li key={w.day} className="rounded-lg border border-white/8 bg-[#171717] p-3.5">
                  <span className="mr-2 text-[#ff9b3d]">{w.day}</span>
                  {w.focus}
                </li>
              ))}
            </ul>
          </Block>

          {/* Risk flags */}
          <Block title="Risk Flags">
            <ul className="space-y-2 text-sm">
              {plan.riskFlags.map((f) => (
                <li key={f} className="rounded-lg border border-[#ff8a1a]/30 bg-[#21170f] p-3 text-[#ffd6b0]">
                  {f}
                </li>
              ))}
            </ul>
          </Block>

          {/* Metrics */}
          <Block title="Metrics to Track">
            <div className="flex flex-wrap gap-2">
              {plan.metrics.map((m) => <AccentPill key={m}>{m}</AccentPill>)}
            </div>
          </Block>

          {/* CTA — one primary action */}
          <Block title={cta.title}>
            <div className="rounded-xl border border-[#ff8a1a]/35 bg-[radial-gradient(120%_120%_at_100%_0%,rgba(255,138,26,0.2),transparent_50%),linear-gradient(90deg,#22140c_0%,#17100b_100%)] p-4">
              <p className="text-sm leading-relaxed text-white">{cta.description}</p>
            </div>

            <button
              type="button"
              onClick={() => {
                if (detailedPlan) onOpenFullProgram();
                else void onGenerateDetailedPlan();
              }}
              disabled={detailedPlanLoading}
              className="mt-3 w-full rounded-xl bg-[#ff8a1a] px-4 py-3 text-sm font-semibold text-black shadow-[0_10px_24px_rgba(255,138,26,0.34)] transition hover:-translate-y-[1px] hover:bg-[#ff9622] disabled:opacity-60"
            >
              {detailedPlanLoading
                ? "Building your 4-week plan..."
                : detailedPlan
                  ? "Open full programme"
                  : cta.buttonLabel}
            </button>

            {(monetizationLinks?.bookingUrl || monetizationLinks?.checkoutUrl) && (
              <div className="mt-3 flex flex-wrap gap-2 border-t border-white/10 pt-3 text-xs">
                {monetizationLinks?.checkoutUrl && (
                  <a href={monetizationLinks.checkoutUrl} target="_blank" rel="noreferrer"
                    className="rounded-full border border-white/20 bg-[#151515] px-3 py-1.5 text-[#dadada] transition hover:border-[#ff8a1a]/50">
                    Unlock full plan →
                  </a>
                )}
                {monetizationLinks?.bookingUrl && (
                  <a href={monetizationLinks.bookingUrl} target="_blank" rel="noreferrer"
                    className="rounded-full border border-white/20 bg-[#151515] px-3 py-1.5 text-[#dadada] transition hover:border-[#ff8a1a]/50">
                    Book a consult →
                  </a>
                )}
              </div>
            )}
          </Block>

          {/* Detailed plan loading */}
          {detailedPlanLoading && (
            <Block title="Building your 4-week block">
              <div className="space-y-2">
                {[5, 14, 14, 14].map((h, i) => (
                  <div key={i} className={`h-${h} animate-pulse rounded bg-[#1f1f1f]`} />
                ))}
              </div>
            </Block>
          )}

          {detailedPlan && (
            <SessionCalendarPreview
              detailedPlan={detailedPlan}
              intake={intake}
              weeksOverride={programmeLength > 4 ? displayWeeks : null}
            />
          )}
          {fullProgramOpen && detailedPlan && (
            <FullProgramView
              isOpen={fullProgramOpen}
              onClose={onCloseFullProgram}
              detailedPlan={detailedPlan}
              intake={intake}
              plan={plan}
              programmeLength={programmeLength}
              displayWeeks={displayWeeks}
              onGenerate12Week={onGenerate12Week}
              onGenerate24Week={onGenerate24Week}
              programGenerating={programGenerating}
              generatingMessage={programGeneratingMessage}
              programQueued={programQueued}
              brandName={brandName}
            />
          )}
        </>
      )}
    </div>
  );
}
