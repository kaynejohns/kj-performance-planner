import { useEffect } from "react";
import { createPortal } from "react-dom";
import type { DetailedPlanOutput, DetailedPlanWeek, IntakeInput, PlannerOutput, SessionLayout } from "../lib/types";
import { buildCoachWarnings } from "../lib/coachWarnings";

const ACCENT = "#ff8a1a";
const CARD = "#0e0e0e";
const BORDER = "rgba(255,255,255,0.08)";
const WEEK_HEADER_BG = "#111111";

function sessionBarColor(type: SessionLayout["type"] | string): string {
  switch (type) {
    case "easy":
      return "#3aaf6b";
    case "threshold":
    case "race-specific":
      return "#ff8a1a";
    case "long":
      return "#7db3f5";
    case "strength":
      return "#a78bfa";
    case "recovery":
      return "rgba(255,255,255,0.15)";
    case "rest":
      return "rgba(255,255,255,0.06)";
    default:
      return "rgba(255,255,255,0.15)";
  }
}

function isDeloadWeek(weekNum: number): boolean {
  return weekNum > 0 && weekNum % 4 === 0;
}

function phaseRoadmapRows(length: 4 | 12 | 24) {
  if (length === 24) {
    return [
      { label: "Phase 1", name: "Aerobic Foundation", weeks: "Weeks 1–8" },
      { label: "Phase 2", name: "Threshold Development", weeks: "Weeks 9–16" },
      { label: "Phase 3", name: "Race-Specific Sharpening", weeks: "Weeks 17–20" },
      { label: "Phase 4", name: "Peak and tune", weeks: "Weeks 21–23" },
      { label: "Phase 5", name: "Taper", weeks: "Week 24" },
    ];
  }
  return [
    { label: "Phase 1 (current)", name: "Aerobic Foundation", weeks: "Weeks 1–4" },
    { label: "Phase 2", name: "Threshold Development", weeks: "Weeks 5–8" },
    { label: "Phase 3", name: "Race-Specific Sharpening", weeks: "Weeks 9–12" },
  ];
}

function SectionDivider() {
  return <div className="my-10 h-px w-full bg-white/[0.06]" role="presentation" />;
}

function CoachWarningBox({
  type,
  title,
  body,
}: {
  type: "risk" | "execution" | "reality";
  title: string;
  body: string;
}) {
  const colors = {
    risk: {
      border: "border-red-500/25",
      bg: "bg-red-500/5",
      title: "text-red-300",
      body: "text-red-200/60",
    },
    execution: {
      border: "border-[#ff8a1a]/25",
      bg: "bg-[#ff8a1a]/5",
      title: "text-[#ffd4a0]",
      body: "text-[#f0c898]/60",
    },
    reality: {
      border: "border-blue-500/25",
      bg: "bg-blue-500/5",
      title: "text-blue-300",
      body: "text-blue-200/60",
    },
  }[type];

  return (
    <div className={`rounded-xl border ${colors.border} ${colors.bg} p-4 fp-callout`}>
      <p className={`text-sm font-semibold ${colors.title}`}>{title}</p>
      <p className={`mt-2 text-xs leading-relaxed ${colors.body}`}>{body}</p>
    </div>
  );
}

function SessionCard({ session, weekNum }: { session: SessionLayout; weekNum: number }) {
  const bar = sessionBarColor(session.type);
  const isRest = session.type === "rest";

  if (isRest) {
    return (
      <div
        className="flex items-center gap-3 rounded-lg border fp-session-card"
        style={{ background: CARD, borderColor: BORDER, borderLeftWidth: 3, borderLeftColor: bar }}
      >
        <div className="flex flex-1 items-center px-4 py-3 text-sm text-white/50">
          <span className="font-medium text-white/65">{session.day}</span>
          <span className="ml-3">Rest — active recovery only</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="overflow-hidden rounded-lg border fp-session-card"
      style={{ background: CARD, borderColor: BORDER, borderLeftWidth: 3, borderLeftColor: bar }}
    >
      <div className="flex flex-wrap items-start justify-between gap-2 px-4 pt-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-white/45">{session.day}</span>
            <span
              className="rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
              style={{ background: `${bar}22`, color: bar }}
            >
              {session.type.replace("-", " ")}
            </span>
          </div>
          <h4 className="mt-1 text-lg font-semibold text-white">{session.title}</h4>
        </div>
        <span className="shrink-0 rounded-md border border-white/10 bg-black/30 px-2.5 py-1 text-xs font-medium text-white/70">
          {session.duration}
        </span>
      </div>
      <ol className="mt-3 list-none space-y-2 px-4 pb-3">
        {(session.structure ?? []).map((step, idx) => (
          <li key={`${weekNum}-${session.day}-${idx}`} className="flex gap-3 text-sm leading-relaxed text-white/70">
            <span className="w-6 shrink-0 font-semibold text-white/35">{idx + 1}.</span>
            <span>{step}</span>
          </li>
        ))}
      </ol>
      <div className="space-y-2 border-t border-white/[0.06] px-4 py-3">
        <div className="grid gap-1 text-xs sm:grid-cols-[5rem_1fr] sm:gap-x-3">
          <span className="font-semibold uppercase tracking-wide text-white/35">Feel</span>
          <span className="italic text-white/60">{session.intensityGuide}</span>
        </div>
        <div className="grid gap-1 text-xs sm:grid-cols-[5rem_1fr] sm:gap-x-3">
          <span className="font-semibold uppercase tracking-wide text-white/35">Purpose</span>
          <span className="text-white/65">{session.purpose}</span>
        </div>
        {session.coachNote && (
          <div className="rounded-lg border border-[#ff8a1a]/25 bg-[#ff8a1a]/[0.07] px-3 py-2 text-xs leading-relaxed text-[#ffd4a0]/90">
            <span className="font-semibold text-[#ff8a1a]">Coach note </span>
            {session.coachNote}
          </div>
        )}
      </div>
    </div>
  );
}

function UpgradeButtons(props: {
  onGenerate12Week: () => void;
  onGenerate24Week: () => void;
  programGenerating: null | 12 | 24;
  generatingMessage?: string;
  layout?: "row" | "stack";
}) {
  const { onGenerate12Week, onGenerate24Week, programGenerating, generatingMessage, layout = "row" } = props;
  const busy12 = programGenerating === 12;
  const busy24 = programGenerating === 24;

  return (
    <div className={layout === "row" ? "grid gap-3 sm:grid-cols-2" : "grid gap-3"}>
      <div>
        <button
          type="button"
          onClick={onGenerate12Week}
          disabled={programGenerating !== null}
          className="w-full rounded-xl px-4 py-3 text-left font-bold text-black transition disabled:opacity-50"
          style={{ backgroundColor: ACCENT }}
        >
          {busy12
            ? "Generating your 12-week programme... (this takes ~30 seconds)"
            : "Generate My 12-Week Programme"}
        </button>
        <p className="mt-1.5 text-center text-[11px] text-white/40">Foundation + threshold + sharpening phases</p>
      </div>
      <div>
        <button
          type="button"
          onClick={onGenerate24Week}
          disabled={programGenerating !== null}
          className="w-full rounded-xl border-2 px-4 py-3 text-left font-bold transition disabled:opacity-50"
          style={{ borderColor: ACCENT, color: ACCENT, background: "transparent" }}
        >
          {busy24
            ? "Generating your 24-week programme... (this takes ~60 seconds)"
            : "Generate My 24-Week Programme"}
        </button>
        <p className="mt-1.5 text-center text-[11px] text-white/40">Full periodisation to race day</p>
      </div>
      {generatingMessage && (busy12 || busy24) && (
        <p className="col-span-full text-center text-xs text-[#ff8a1a]/80">{generatingMessage}</p>
      )}
    </div>
  );
}

const printCss = `
@media print {
  .fp-root { background: #fff !important; color: #111 !important; }
  .fp-chrome { display: none !important; }
  .fp-scroll { overflow: visible !important; height: auto !important; }
  .fp-session-card, .fp-week-header, .fp-callout, .fp-card {
    border-color: #ccc !important;
    background: #fafafa !important;
    color: #111 !important;
    box-shadow: none !important;
  }
  .fp-week-header { background: #f0f0f0 !important; }
  .fp-callout { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
}
`;

export default function FullProgramView({
  isOpen,
  onClose,
  detailedPlan,
  intake,
  plan,
  programmeLength,
  displayWeeks,
  onGenerate12Week,
  onGenerate24Week,
  programGenerating,
  generatingMessage,
  programQueued,
  brandName = "KJ Performance",
  logoUrl,
}: {
  isOpen: boolean;
  onClose: () => void;
  detailedPlan: DetailedPlanOutput;
  intake: IntakeInput;
  plan: PlannerOutput;
  programmeLength: 4 | 12 | 24;
  displayWeeks: DetailedPlanWeek[];
  onGenerate12Week: () => void;
  onGenerate24Week: () => void;
  programGenerating: null | 12 | 24;
  generatingMessage?: string;
  programQueued?: null | 12 | 24;
  brandName?: string;
  logoUrl?: string;
}) {
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === "undefined") return null;

  const coachWarnings = buildCoachWarnings(intake);
  const classification = plan.gapSummary?.classification ?? "—";
  const phaseLabel = detailedPlan.blockOverview.phaseLabel ?? "Aerobic foundation";
  const roadmap = phaseRoadmapRows(programmeLength);
  const hyroxEvent = intake.eventType === "HYROX" || intake.sport === "HYROX" || intake.sport === "Hybrid";
  const enduranceEvent = intake.eventType === "Half Marathon" || intake.eventType === "Marathon";

  const planTitle =
    programmeLength === 4
      ? "4-week block"
      : programmeLength === 12
        ? "12-week programme"
        : "24-week programme";

  const node = (
    <>
      <style>{printCss}</style>
      <div
        className="fp-root fixed inset-0 z-[100] flex flex-col font-sans text-white"
        style={{ background: "#080808" }}
        role="dialog"
        aria-modal="true"
        aria-label="Full programme view"
      >
        <header
          className="fp-chrome grid h-14 shrink-0 grid-cols-3 items-center gap-2 border-b px-3 sm:px-4"
          style={{ borderColor: "rgba(255,255,255,0.08)", background: "#080808" }}
        >
          <div className="flex min-w-0 items-center gap-2">
            {logoUrl ? (
              <img src={logoUrl} alt="" className="h-8 w-auto object-contain" />
            ) : (
              <span className="text-sm font-bold tracking-tight" style={{ color: ACCENT }}>
                {brandName}
              </span>
            )}
          </div>
          <h1 className="truncate text-center text-sm font-semibold text-white/90 sm:text-base">{planTitle}</h1>
          <div className="flex min-w-0 justify-end gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="hidden rounded-lg border border-white/15 px-3 py-1.5 text-xs font-medium text-white/80 transition hover:border-[#ff8a1a]/50 sm:inline"
            >
              Print / Save as PDF
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-lg border border-white/15 p-2 text-white/70 sm:hidden"
              aria-label="Print or save as PDF"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" />
                <rect x="6" y="14" width="12" height="8" rx="1" />
              </svg>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-medium text-white/80 transition hover:border-white/30"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </header>

        <div className="fp-scroll min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-3xl px-4 py-8 pb-32 sm:px-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">Section 1</p>
            <h2 className="mt-2 text-2xl font-bold leading-tight sm:text-3xl">
              {intake.sport} Performance Plan — {intake.eventType}
            </h2>
            <p className="mt-2 text-sm text-white/55">
              {intake.currentBenchmark || "—"} → {intake.goalBenchmark || "—"} · {classification}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {[
                { label: "Level", value: intake.level },
                { label: "Sessions/week", value: String(intake.sessionsPerWeek) },
                { label: "Hours/week", value: String(intake.hoursPerWeek) },
              ].map((p) => (
                <span
                  key={p.label}
                  className="rounded-full border px-3 py-1 text-xs font-medium"
                  style={{ borderColor: BORDER, background: CARD }}
                >
                  <span className="text-white/40">{p.label}: </span>
                  <span className="text-white/90">{p.value}</span>
                </span>
              ))}
            </div>
            <p className="mt-5 text-xs font-semibold uppercase tracking-wide" style={{ color: ACCENT }}>
              Phase 1 — {phaseLabel}
            </p>
            {detailedPlan.blockOverview.progressionContext && (
              <p className="mt-2 text-sm leading-relaxed text-white/65">{detailedPlan.blockOverview.progressionContext}</p>
            )}
            <div
              className="fp-card mt-5 rounded-xl border p-4"
              style={{ borderColor: ACCENT, background: "rgba(255,138,26,0.06)" }}
            >
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[#ff8a1a]/90">Primary limiter</p>
              <p className="mt-1 text-sm leading-relaxed text-white/85">{plan.snapshot.mainLimiter}</p>
            </div>

            <SectionDivider />
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">Section 2 — Block overview</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="fp-card rounded-xl border p-4" style={{ background: CARD, borderColor: BORDER }}>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-white/35">Starting point</p>
                <ul className="mt-2 space-y-1.5 text-xs text-white/70">
                  <li className="flex justify-between gap-2">
                    <span className="text-white/40">Weekly volume</span>
                    <span className="font-medium text-[#ff8a1a]">{detailedPlan.blockOverview.startingPoint.weeklyVolume}</span>
                  </li>
                  {detailedPlan.blockOverview.startingPoint.longestRun && (
                    <li className="flex justify-between gap-2">
                      <span className="text-white/40">Longest run</span>
                      <span>{detailedPlan.blockOverview.startingPoint.longestRun}</span>
                    </li>
                  )}
                  {detailedPlan.blockOverview.startingPoint.thresholdSupport && enduranceEvent && (
                    <li className="flex justify-between gap-2">
                      <span className="text-white/40">Threshold support</span>
                      <span>{detailedPlan.blockOverview.startingPoint.thresholdSupport}</span>
                    </li>
                  )}
                  <li className="flex justify-between gap-2">
                    <span className="text-white/40">Quality sessions</span>
                    <span>{detailedPlan.blockOverview.startingPoint.qualitySessions}</span>
                  </li>
                  <li className="flex justify-between gap-2">
                    <span className="text-white/40">Strength</span>
                    <span>{detailedPlan.blockOverview.startingPoint.strengthExposure}</span>
                  </li>
                  {detailedPlan.blockOverview.startingPoint.raceSpecificExposure && hyroxEvent && (
                    <li className="flex justify-between gap-2">
                      <span className="text-white/40">Race-specific</span>
                      <span>{detailedPlan.blockOverview.startingPoint.raceSpecificExposure}</span>
                    </li>
                  )}
                  <li className="flex justify-between gap-2">
                    <span className="text-white/40">Availability</span>
                    <span>{detailedPlan.blockOverview.startingPoint.availability}</span>
                  </li>
                </ul>
              </div>
              <div className="fp-card rounded-xl border p-4" style={{ background: CARD, borderColor: BORDER }}>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-white/35">Block targets</p>
                <ul className="mt-2 space-y-1.5 text-xs text-white/70">
                  <li className="flex justify-between gap-2">
                    <span className="text-white/40">Week 3 peak volume</span>
                    <span className="font-medium text-[#ff8a1a]">{detailedPlan.blockOverview.blockTargets.week3PeakVolume}</span>
                  </li>
                  <li className="flex justify-between gap-2">
                    <span className="text-white/40">Week 4 deload volume</span>
                    <span className="text-[#7db3f5]">{detailedPlan.blockOverview.blockTargets.week4DeloadVolume}</span>
                  </li>
                  {detailedPlan.blockOverview.blockTargets.thresholdSupport && enduranceEvent && (
                    <li className="flex justify-between gap-2">
                      <span className="text-white/40">Threshold support</span>
                      <span>{detailedPlan.blockOverview.blockTargets.thresholdSupport}</span>
                    </li>
                  )}
                  <li className="flex justify-between gap-2">
                    <span className="text-white/40">Quality / week</span>
                    <span>{detailedPlan.blockOverview.blockTargets.qualitySessionsPerWeek}</span>
                  </li>
                  <li className="flex justify-between gap-2">
                    <span className="text-white/40">Strength / week</span>
                    <span>{detailedPlan.blockOverview.blockTargets.strengthSessionsPerWeek}</span>
                  </li>
                  {detailedPlan.blockOverview.blockTargets.raceSpecificExposure && hyroxEvent && (
                    <li className="flex justify-between gap-2">
                      <span className="text-white/40">Race-specific</span>
                      <span>{detailedPlan.blockOverview.blockTargets.raceSpecificExposure}</span>
                    </li>
                  )}
                </ul>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {detailedPlan.blockOverview.focus.map((f) => (
                <span
                  key={f}
                  className="rounded-full border px-2.5 py-1 text-[11px] font-medium text-white/75"
                  style={{ borderColor: BORDER, background: "#141414" }}
                >
                  {f}
                </span>
              ))}
            </div>
            {detailedPlan.blockOverview.foundationNote && (
              <p className="mt-3 rounded-lg border border-[#ff8a1a]/25 bg-[#ff8a1a]/[0.06] p-3 text-xs leading-relaxed text-[#ffd4a0]/85">
                {detailedPlan.blockOverview.foundationNote}
              </p>
            )}

            <SectionDivider />
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">Section 3 — Coach&apos;s warnings</p>
            <div className="mt-4 space-y-3">
              {coachWarnings.length === 0 ? (
                <p className="text-sm text-white/40">No profile-specific warnings for this intake.</p>
              ) : (
                coachWarnings.map((w) => <CoachWarningBox key={w.title} type={w.type} title={w.title} body={w.body} />)
              )}
            </div>

            <SectionDivider />
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">Section 4 — Week by week</p>
            <div className="mt-6 space-y-10">
              {displayWeeks.map((week) => {
                const deload = isDeloadWeek(week.week);
                const markers = week.progressionMarkers ?? [];
                const sessions = week.dailySessions;

                return (
                  <section key={week.week} className="space-y-4">
                    <div
                      className="fp-week-header relative rounded-xl border p-4 sm:p-5"
                      style={{ background: WEEK_HEADER_BG, borderColor: BORDER }}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <h3 className="text-xl font-bold text-white sm:text-2xl">
                          Week {week.week} — {week.theme}
                        </h3>
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <span
                            className="rounded-md border border-white/10 px-2.5 py-1 text-xs font-semibold text-white/75"
                            style={{ background: "#1a1a1a" }}
                          >
                            {week.volumeTarget}
                          </span>
                          {deload && (
                            <span className="rounded-md border border-[#7db3f5]/40 bg-blue-500/10 px-2.5 py-1 text-xs font-bold text-[#7db3f5]">
                              Recovery week
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="mt-3 text-sm leading-relaxed text-white/60">{week.objective}</p>
                      {markers.length > 0 && (
                        <ul className="mt-3 space-y-1.5 text-sm text-white/55">
                          {markers.map((m) => (
                            <li key={m} className="flex gap-2">
                              <span className="text-[#ff8a1a]">•</span>
                              <span>{m}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div className="space-y-3">
                      {!sessions || sessions.length === 0 ? (
                        week.keySessions && week.keySessions.length > 0 ? (
                          <div className="space-y-2">
                            {week.keySessions.map((ks, idx) => (
                              <div key={idx} className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                                <p className="text-xs font-semibold uppercase tracking-wide text-[#ff8a1a]">{ks.type}</p>
                                <p className="mt-1 text-sm text-white/75">{ks.description}</p>
                                {ks.purpose && <p className="mt-1 text-xs text-white/45">{ks.purpose}</p>}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="rounded-lg border border-dashed border-white/15 bg-black/20 px-4 py-6 text-center text-sm text-white/40">
                            Session details generating…
                          </p>
                        )
                      ) : (
                        sessions.map((s, idx) => <SessionCard key={`${week.week}-${s.day}-${idx}`} session={s} weekNum={week.week} />)
                      )}
                    </div>

                    <div className="grid gap-3 border-t border-white/[0.06] pt-4 sm:grid-cols-2">
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-white/35">Adaptation focus</p>
                        <p className="mt-1 text-sm leading-relaxed text-white/70">{week.keyAdaptationGoal}</p>
                      </div>
                      <div className="flex gap-2 rounded-lg border border-[#ff8a1a]/20 bg-[#ff8a1a]/[0.04] p-3">
                        <svg
                          className="mt-0.5 h-4 w-4 shrink-0 text-[#ff8a1a]"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                          <line x1="12" y1="9" x2="12" y2="13" />
                          <line x1="12" y1="17" x2="12.01" y2="17" />
                        </svg>
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-[#ff8a1a]/80">Guardrail</p>
                          <p className="mt-1 text-xs leading-relaxed text-white/65">{week.guardrail}</p>
                        </div>
                      </div>
                    </div>
                  </section>
                );
              })}
            </div>

            <SectionDivider />
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">
              Section 5 — Coaching insights & adjustment rules
            </p>
            <div className="mt-4 grid gap-6 sm:grid-cols-2">
              <div className="fp-card rounded-xl border p-4" style={{ background: CARD, borderColor: BORDER }}>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-white/35">Coaching insights</p>
                <ul className="mt-2 space-y-2 text-sm text-white/65">
                  {detailedPlan.coachingInsights.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="text-[#ff8a1a]">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="fp-card rounded-xl border p-4" style={{ background: CARD, borderColor: BORDER }}>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-white/35">Adjustment rules</p>
                <ul className="mt-2 space-y-2 text-sm text-white/65">
                  {detailedPlan.adjustmentRules.map((item) => (
                    <li key={item} className="flex gap-2">
                      <span className="text-white/35">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <SectionDivider />
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">Section 6 — Programme upgrade</p>
            <h3 className="mt-2 text-lg font-bold text-white">Ready to go further?</h3>
            <p className="mt-2 text-sm leading-relaxed text-white/55">
              This 4-week block is Phase 1 of your full programme. Here is what the next phases look like:
            </p>
            <div className="fp-card mt-5 space-y-3 rounded-xl border p-4" style={{ background: CARD, borderColor: BORDER }}>
              {roadmap.map((row) => (
                <div
                  key={row.weeks}
                  className="flex flex-wrap items-baseline justify-between gap-2 border-b border-white/[0.06] pb-3 last:border-0 last:pb-0"
                >
                  <div>
                    <span className="text-xs font-semibold text-[#ff8a1a]">{row.label}</span>
                    <span className="mx-2 text-white/25">·</span>
                    <span className="text-sm font-medium text-white/85">{row.name}</span>
                  </div>
                  <span className="text-xs text-white/45">{row.weeks}</span>
                </div>
              ))}
            </div>
            <div className="mt-6">
              {programQueued ? (
                <div className="rounded-xl border border-[#ff8a1a]/40 bg-[#1a0f06] px-4 py-3 text-center">
                  <p className="text-sm font-semibold text-[#ff8a1a]">Your {programQueued}-week programme is generating</p>
                  <p className="mt-1 text-xs text-white/55">Check your inbox — the PDF will arrive in ~2 minutes.</p>
                </div>
              ) : (
                <UpgradeButtons
                  onGenerate12Week={onGenerate12Week}
                  onGenerate24Week={onGenerate24Week}
                  programGenerating={programGenerating}
                />
              )}
            </div>
          </div>
        </div>

        <footer
          className="fp-chrome shrink-0 border-t px-4 py-3"
          style={{ borderColor: "rgba(255,255,255,0.08)", background: "#0a0a0a" }}
        >
          <div className="mx-auto max-w-3xl">
            {programQueued ? (
              <div className="rounded-xl border border-[#ff8a1a]/40 bg-[#1a0f06] px-4 py-3 text-center">
                <p className="text-sm font-semibold text-[#ff8a1a]">Your {programQueued}-week programme is generating</p>
                <p className="mt-1 text-xs text-white/55">Check your inbox — the PDF will arrive in ~2 minutes.</p>
              </div>
            ) : (
              <UpgradeButtons
                layout="row"
                onGenerate12Week={onGenerate12Week}
                onGenerate24Week={onGenerate24Week}
                programGenerating={programGenerating}
                generatingMessage={generatingMessage}
              />
            )}
          </div>
        </footer>
      </div>
    </>
  );

  return createPortal(node, document.body);
}
