import type { DetailedPlanOutput, IntakeInput, MonetizationLinks, PlannerOutput } from "../lib/types";
import { buildWeeklyCalendarPreview } from "../lib/plannerWeeklyTemplates";
import { AccentPill, SectionLabel, StatCard } from "./uiPrimitives";

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-white/10 bg-[linear-gradient(180deg,#1a1a1a_0%,#111111_100%)] p-5 shadow-[0_14px_32px_rgba(0,0,0,0.4)] transition duration-200 hover:-translate-y-[1px] hover:border-[#ff8a1a]/30 hover:shadow-[0_16px_36px_rgba(0,0,0,0.48)]">
      <SectionLabel>{title}</SectionLabel>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function SessionCalendarPreview({ detailedPlan, intake }: { detailedPlan: DetailedPlanOutput; intake: IntakeInput }) {
  const trainingStatus =
    intake.goal === "Return from injury"
      ? "rebuilding"
      : intake.hoursPerWeek <= 4
        ? "inconsistent"
        : intake.hoursPerWeek >= 9
          ? "high training load already"
          : "currently consistent";
  const currentInjuryStatus = intake.goal === "Return from injury"
    ? "returning from injury"
    : intake.injuryHistory?.trim()
      ? "managing niggle"
      : "healthy";
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
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#ffb26a]">{weeklyPreview.templateName}</p>
          <p className="mt-1 text-sm font-semibold text-white">{weeklyPreview.weekHeadline}</p>
          <p className="mt-1 text-xs leading-relaxed text-[#e2c9ae]">{weeklyPreview.weekPurpose}</p>
        </div>

        <div className="rounded-xl border border-white/10 bg-[#151515] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#ffb26a]">Intensity Distribution</p>
          <div className="mt-2 grid gap-2 text-xs sm:grid-cols-3">
            <div className="rounded-lg border border-white/10 bg-[#1a1a1a] p-3">
              <p className="text-[#ffaf62]">Low intensity</p>
              <p className="mt-1 text-sm font-semibold text-white">{weeklyPreview.intensityDistribution.low}</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-[#1a1a1a] p-3">
              <p className="text-[#ffaf62]">Moderate intensity</p>
              <p className="mt-1 text-sm font-semibold text-white">{weeklyPreview.intensityDistribution.moderate}</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-[#1a1a1a] p-3">
              <p className="text-[#ffaf62]">High intensity</p>
              <p className="mt-1 text-sm font-semibold text-white">{weeklyPreview.intensityDistribution.high}</p>
            </div>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-[#d4d4d4]">{weeklyPreview.intensityDistribution.summary}</p>
        </div>

        {detailedPlan.weeklyBreakdown.map((week) => (
          <div key={`calendar-${week.week}`} className="rounded-xl border border-white/10 bg-[#141414] p-4">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold text-white">Week {week.week}: {week.theme}</p>
              <span className="rounded-full border border-[#ff8a1a]/40 bg-[#24170f] px-2.5 py-0.5 text-[11px] text-[#ffc995]">
                Checkpoint Week
              </span>
            </div>
            <p className="mb-3 text-xs text-[#bdbdbd]">{week.objective}</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {weeklyPreview.sessionCards.map((slot) => (
                <div key={`${week.week}-${slot.day}`} className="rounded-lg border border-white/8 bg-[#1a1a1a] p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#ff9e45]">{slot.day}</p>
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
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#ffb26a]">Progression Checkpoint</p>
              <p className="mt-1 text-xs text-[#d4d4d4]">{weeklyPreview.progressionCheckpoint}</p>
            </div>
          </div>
        ))}

        <div className="rounded-xl border border-white/10 bg-[#171717] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#ffb26a]">Coaching Note</p>
          <p className="mt-1 text-sm leading-relaxed text-[#e5e5e5]">{weeklyPreview.coachingNote}</p>
        </div>

        <div className="rounded-xl border border-[#ff8a1a]/30 bg-[#21160f] p-4">
          <p className="text-sm font-semibold text-[#ffd5ad]">Auto-adjust rules (coach-applied)</p>
          <ul className="mt-2 space-y-1 text-xs text-[#f1d8bb]">
            {detailedPlan.adjustmentRules.map((rule) => (
              <li key={rule}>- {rule}</li>
            ))}
          </ul>
        </div>
      </div>
    </Block>
  );
}

export default function ResultDashboard({
  plan,
  intake,
  ctaUrl,
  monetizationLinks,
  detailedPlan,
  detailedPlanLoading,
  onGenerateDetailedPlan,
}: {
  plan: PlannerOutput | null;
  intake: IntakeInput;
  ctaUrl?: string;
  monetizationLinks?: MonetizationLinks;
  detailedPlan: DetailedPlanOutput | null;
  detailedPlanLoading: boolean;
  onGenerateDetailedPlan: () => void;
}) {
  if (!plan) {
    return (
      <div className="rounded-2xl border border-dashed border-white/20 bg-[#121212] p-6 text-sm text-[#bdbdbd]">
        Complete your intake and submit to receive your personalized performance summary.
      </div>
    );
  }

  const primaryUrl = ctaUrl || plan.cta.url || monetizationLinks?.detailedPlanUrl || "#";
  const hyroxEvent = intake.eventType === "HYROX" || intake.sport === "HYROX" || intake.sport === "Hybrid";
  const enduranceEvent = intake.eventType === "Half Marathon" || intake.eventType === "Marathon";

  return (
    <div className="space-y-4 lg:space-y-5">
      {plan.gapSummary && (
        <Block title="Performance Gap Summary">
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
              {plan.gapSummary.primaryPriorities.map((p) => <AccentPill key={p}>{p}</AccentPill>)}
            </div>
          </div>
        </Block>
      )}
      <Block title="Performance Summary">
        <p className="text-2xl font-semibold leading-tight tracking-tight text-white sm:text-[30px]">{plan.headline}</p>
      </Block>
      <Block title="Athlete Snapshot">
        <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
          <StatCard label="Sport" value={plan.snapshot.sport} />
          <StatCard label="Level" value={plan.snapshot.level} />
          <StatCard label="Goal" value={plan.snapshot.goal} />
          <StatCard label="Availability" value={plan.snapshot.availability} />
          <StatCard label="Main limiter" value={plan.snapshot.mainLimiter} />
        </div>
      </Block>
      <Block title="Primary Performance Drivers">
        <ul className="space-y-2 text-[15px] leading-relaxed text-[#ebebeb]">{plan.drivers.map((d) => <li key={d} className="rounded-lg border border-white/8 bg-[#171717] p-3.5">{d}</li>)}</ul>
      </Block>
      <Block title="Big-Ticket Recommendations">
        <ul className="space-y-2.5 text-[15px] leading-relaxed text-[#ebebeb]">
          {plan.bigRocks.map((r) => <li key={r} className="flex items-start gap-2.5"><span className="mt-2 h-1.5 w-1.5 rounded-full bg-[#ff8a1a]" />{r}</li>)}
        </ul>
      </Block>
      <Block title="Suggested Weekly Structure">
        <ul className="grid gap-2 text-sm sm:grid-cols-2">
          {plan.weeklyStructure.map((w) => <li key={w.day} className="rounded-lg border border-white/8 bg-[#171717] p-3.5"><span className="mr-2 text-[#ff9b3d]">{w.day}</span>{w.focus}</li>)}
        </ul>
      </Block>
      <Block title="Risk Flags">
        <ul className="space-y-2 text-sm">{plan.riskFlags.map((f) => <li key={f} className="rounded-lg border border-[#ff8a1a]/30 bg-[#21170f] p-3 text-[#ffd6b0]">{f}</li>)}</ul>
      </Block>
      <Block title="Metrics to Track">
        <div className="flex flex-wrap gap-2">
          {plan.metrics.map((m) => <AccentPill key={m}>{m}</AccentPill>)}
        </div>
      </Block>
      <Block title={plan.cta.title}>
        <div className="rounded-xl border border-[#ff8a1a]/35 bg-[radial-gradient(120%_120%_at_100%_0%,rgba(255,138,26,0.2),transparent_50%),linear-gradient(90deg,#22140c_0%,#17100b_100%)] p-4">
          <p className="text-sm leading-relaxed text-white">{plan.cta.description}</p>
          <p className="mt-2 text-xs leading-relaxed text-[#ffc995]">
            Unlock structured progression options designed for conversion into paid coaching outcomes.
          </p>
        </div>
        <button
          type="button"
          onClick={onGenerateDetailedPlan}
          disabled={detailedPlanLoading}
          className="mt-3 inline-block rounded-xl bg-[#ff8a1a] px-4 py-2.5 text-sm font-semibold text-black shadow-[0_10px_24px_rgba(255,138,26,0.34)] transition hover:-translate-y-[1px] hover:bg-[#ff9622] disabled:opacity-60"
        >
          {detailedPlanLoading ? "Building 4-week performance plan..." : "Build 4-Week Performance Plan"}
        </button>
        <a
          href={primaryUrl}
          target={primaryUrl.startsWith("http") ? "_blank" : undefined}
          rel={primaryUrl.startsWith("http") ? "noreferrer" : undefined}
          className="ml-2 mt-3 inline-block rounded-xl border border-white/20 bg-[#151515] px-4 py-2.5 text-sm font-semibold text-[#e9e9e9] transition hover:border-[#ff8a1a]/50"
        >
          {plan.cta.buttonLabel}
        </a>
        <div className="mt-3 flex flex-wrap gap-2 text-xs">
          {monetizationLinks?.bookingUrl && (
            <a
              href={monetizationLinks.bookingUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-white/20 bg-[#151515] px-3 py-1 text-[#dadada] transition hover:border-[#ff8a1a]/50"
            >
              Book Performance Consult
            </a>
          )}
          {monetizationLinks?.checkoutUrl && (
            <a
              href={monetizationLinks.checkoutUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-white/20 bg-[#151515] px-3 py-1 text-[#dadada] transition hover:border-[#ff8a1a]/50"
            >
              Unlock 4-Week Build
            </a>
          )}
        </div>
      </Block>

      {detailedPlanLoading && (
        <Block title="Building your 4-week block">
          <div className="space-y-2">
            <div className="h-5 animate-pulse rounded bg-[#1f1f1f]" />
            <div className="h-14 animate-pulse rounded bg-[#1f1f1f]" />
            <div className="h-14 animate-pulse rounded bg-[#1f1f1f]" />
          </div>
        </Block>
      )}

      {detailedPlan && (
        <Block title="Detailed 4-Week Plan">
          <div className="space-y-4">
            <div className="rounded-xl border border-white/10 bg-[#151515] p-4">
              <p className="text-sm font-semibold text-white">{detailedPlan.blockOverview.title}</p>
              {detailedPlan.blockOverview.phaseLabel && (
                <p className="mt-1 text-xs font-medium uppercase tracking-[0.12em] text-[#ff9e45]">{detailedPlan.blockOverview.phaseLabel}</p>
              )}
              <p className="mt-1 text-sm text-[#bdbdbd]">{detailedPlan.blockOverview.goal} - {detailedPlan.blockOverview.duration}</p>
              <p className="mt-1 text-xs text-[#9f9f9f]">
                Built for {intake.sessionsPerWeek} sessions / {intake.hoursPerWeek}h weekly availability.
              </p>
              {detailedPlan.blockOverview.progressionContext && (
                <p className="mt-2 text-xs leading-relaxed text-[#c4c4c4]">{detailedPlan.blockOverview.progressionContext}</p>
              )}
              <div className="mt-2 flex flex-wrap gap-2">
                {detailedPlan.blockOverview.focus.map((item) => <AccentPill key={item}>{item}</AccentPill>)}
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-white/10 bg-[#141414] p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#ff9e45]">Starting point</p>
                  <ul className="mt-2 space-y-1.5 text-xs text-[#d6d6d6]">
                    <li>
                      <span className="text-[#ffaf62]">{hyroxEvent ? "Aerobic support:" : "Weekly volume:"}</span>{" "}
                      {detailedPlan.blockOverview.startingPoint.weeklyVolume}
                    </li>
                    {detailedPlan.blockOverview.startingPoint.longestRun && !hyroxEvent && (
                      <li><span className="text-[#ffaf62]">Long run anchor:</span> {detailedPlan.blockOverview.startingPoint.longestRun}</li>
                    )}
                    {detailedPlan.blockOverview.startingPoint.thresholdSupport && enduranceEvent && (
                      <li><span className="text-[#ffaf62]">Threshold support:</span> {detailedPlan.blockOverview.startingPoint.thresholdSupport}</li>
                    )}
                    <li>
                      <span className="text-[#ffaf62]">{hyroxEvent ? "Quality exposures:" : "Quality sessions:"}</span>{" "}
                      {detailedPlan.blockOverview.startingPoint.qualitySessions}
                    </li>
                    <li>
                      <span className="text-[#ffaf62]">{hyroxEvent ? "Strength support:" : "Strength:"}</span>{" "}
                      {detailedPlan.blockOverview.startingPoint.strengthExposure}
                    </li>
                    {detailedPlan.blockOverview.startingPoint.raceSpecificExposure && hyroxEvent && (
                      <li><span className="text-[#ffaf62]">Race-specific work:</span> {detailedPlan.blockOverview.startingPoint.raceSpecificExposure}</li>
                    )}
                    <li><span className="text-[#ffaf62]">Availability:</span> {detailedPlan.blockOverview.startingPoint.availability}</li>
                    {detailedPlan.blockOverview.startingPoint.baselineNote && (
                      <li className="pt-1 text-[#e0e0e0]">{detailedPlan.blockOverview.startingPoint.baselineNote}</li>
                    )}
                  </ul>
                </div>
                <div className="rounded-lg border border-white/10 bg-[#141414] p-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#ff9e45]">Block targets</p>
                  <ul className="mt-2 space-y-1.5 text-xs text-[#d6d6d6]">
                    <li>
                      <span className="text-[#ffaf62]">{hyroxEvent ? "Aerobic support (W3):" : "Peak week (W3):"}</span>{" "}
                      {detailedPlan.blockOverview.blockTargets.week3PeakVolume}
                    </li>
                    <li>
                      <span className="text-[#ffaf62]">{hyroxEvent ? "Recovery bandwidth (W4):" : "Deload week (W4):"}</span>{" "}
                      {detailedPlan.blockOverview.blockTargets.week4DeloadVolume}
                    </li>
                    {detailedPlan.blockOverview.blockTargets.thresholdSupport && enduranceEvent && (
                      <li><span className="text-[#ffaf62]">Threshold support (W3):</span> {detailedPlan.blockOverview.blockTargets.thresholdSupport}</li>
                    )}
                    <li>
                      <span className="text-[#ffaf62]">{hyroxEvent ? "Key quality exposures:" : "Quality (peak):"}</span>{" "}
                      {detailedPlan.blockOverview.blockTargets.qualitySessionsPerWeek}
                    </li>
                    <li>
                      <span className="text-[#ffaf62]">{hyroxEvent ? "Strength support (peak):" : "Strength (peak):"}</span>{" "}
                      {detailedPlan.blockOverview.blockTargets.strengthSessionsPerWeek}
                    </li>
                    {detailedPlan.blockOverview.blockTargets.raceSpecificExposure && hyroxEvent && (
                      <li><span className="text-[#ffaf62]">Race-specific exposures:</span> {detailedPlan.blockOverview.blockTargets.raceSpecificExposure}</li>
                    )}
                  </ul>
                </div>
              </div>
              {detailedPlan.blockOverview.foundationNote && (
                <p className="mt-3 rounded-lg border border-[#ff8a1a]/30 bg-[#24170f] p-3 text-xs leading-relaxed text-[#ffd6b0]">
                  {detailedPlan.blockOverview.foundationNote}
                </p>
              )}
            </div>

            {detailedPlan.weeklyBreakdown.map((week) => {
              const hyroxUi = intake.sport === "HYROX" || intake.sport === "Hybrid";
              return (
              <div key={week.week} className="rounded-xl border border-white/10 bg-[#141414] p-4">
                <p className="text-sm font-semibold text-white">Week {week.week}: {week.theme}</p>
                <p className="mt-1 text-sm text-[#c8c8c8]">{week.objective}</p>
                {week.progressionMarkers && week.progressionMarkers.length > 0 && (
                  <div className="mt-3 rounded-lg border border-[#ff8a1a]/35 bg-[#1c1410] p-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#ffb26a]">Measurable progression</p>
                    <ul className="mt-2 space-y-1.5 text-xs text-[#f2e6dc]">
                      {week.progressionMarkers.map((m) => (
                        <li key={m} className="flex gap-2"><span className="text-[#ff8a1a]">▸</span><span>{m}</span></li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <div className="rounded-lg border border-[#ff8a1a]/25 bg-[#181818] p-3">
                    <p className="text-[#ffaf62] text-[10px] font-semibold uppercase tracking-[0.12em]">{hyroxUi ? "Aerobic duration" : "Weekly volume"}</p>
                    <p className="mt-1 text-sm text-white">{week.volumeTarget}</p>
                  </div>
                  <div className="rounded-lg border border-[#ff8a1a]/25 bg-[#181818] p-3">
                    <p className="text-[#ffaf62] text-[10px] font-semibold uppercase tracking-[0.12em]">{hyroxUi ? "Race-specific running" : "Long run / continuous"}</p>
                    <p className="mt-1 text-sm text-white">{week.longRunTarget}</p>
                  </div>
                  {week.hyroxStationDensityTarget && (
                    <div className="rounded-lg border border-[#ff8a1a]/25 bg-[#181818] p-3 sm:col-span-2">
                      <p className="text-[#ffaf62] text-[10px] font-semibold uppercase tracking-[0.12em]">Station density</p>
                      <p className="mt-1 text-sm text-white">{week.hyroxStationDensityTarget}</p>
                    </div>
                  )}
                  {week.thresholdSupportTarget && (
                    <div className="rounded-lg border border-[#ff8a1a]/25 bg-[#181818] p-3 sm:col-span-2">
                      <p className="text-[#ffaf62] text-[10px] font-semibold uppercase tracking-[0.12em]">Threshold support (endurance)</p>
                      <p className="mt-1 text-sm text-white">{week.thresholdSupportTarget}</p>
                    </div>
                  )}
                  <div className="rounded-lg border border-[#ff8a1a]/25 bg-[#181818] p-3">
                    <p className="text-[#ffaf62] text-[10px] font-semibold uppercase tracking-[0.12em]">Quality</p>
                    <p className="mt-1 text-sm text-white">{week.qualityTarget}</p>
                  </div>
                  <div className="rounded-lg border border-[#ff8a1a]/25 bg-[#181818] p-3">
                    <p className="text-[#ffaf62] text-[10px] font-semibold uppercase tracking-[0.12em]">Strength</p>
                    <p className="mt-1 text-sm text-white">{week.strengthTarget}</p>
                  </div>
                </div>
                <div className="mt-3 rounded-lg border border-white/10 bg-[#171717] p-3">
                  <p className="text-xs font-semibold text-[#c8c8c8]">Adaptation focus</p>
                  <p className="mt-1 text-sm text-[#f0f0f0]">{week.keyAdaptationGoal}</p>
                  <p className="mt-2 text-xs font-semibold uppercase tracking-[0.1em] text-[#ff9b3d]">Guardrail</p>
                  <p className="mt-1 text-sm text-[#ffd5b8]">{week.guardrail}</p>
                </div>
                <ul className="mt-3 space-y-1 text-sm text-[#dfdfdf]">
                  {week.structure.map((item) => <li key={item}>- {item}</li>)}
                </ul>
                <div className="mt-3 space-y-2">
                  {week.keySessions.map((session) => (
                    <div key={`${week.week}-${session.type}`} className="rounded-lg border border-white/8 bg-[#1a1a1a] p-3">
                      <p className="text-sm font-medium text-white">{session.type}</p>
                      <p className="text-xs text-[#cfcfcf]">{session.description}</p>
                      <p className="mt-1 text-xs text-[#ffcd99]">Purpose: {session.purpose}</p>
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-xs text-[#b3b3b3]">{week.progressionNote}</p>
              </div>
            );
            })}

            <div className="rounded-xl border border-white/10 bg-[#151515] p-4">
              <p className="text-sm font-semibold text-white">Coaching insights</p>
              <ul className="mt-2 space-y-1 text-sm text-[#dfdfdf]">
                {detailedPlan.coachingInsights.map((item) => <li key={item}>- {item}</li>)}
              </ul>
              <p className="mt-3 text-sm font-semibold text-white">Adjustment rules</p>
              <ul className="mt-2 space-y-1 text-sm text-[#dfdfdf]">
                {detailedPlan.adjustmentRules.map((item) => <li key={item}>- {item}</li>)}
              </ul>
              <div className="mt-3 rounded-lg border border-[#ff8a1a]/30 bg-[#24170f] p-3">
                <p className="text-sm font-semibold text-[#ffd4ac]">{detailedPlan.cta.title}</p>
                <p className="text-xs text-[#f0c79f]">{detailedPlan.cta.description}</p>
              </div>
            </div>
          </div>
        </Block>
      )}

      {detailedPlan && <SessionCalendarPreview detailedPlan={detailedPlan} intake={intake} />}
    </div>
  );
}
