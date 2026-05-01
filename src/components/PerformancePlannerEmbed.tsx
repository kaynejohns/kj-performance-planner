import { useMemo, useState } from "react";
import DiagnosisReveal from "./DiagnosisReveal";
import BlueprintScreen from "./BlueprintScreen";
import IntakeForm from "./IntakeForm";
import LoadingState from "./LoadingState";
import ResultDashboard from "./ResultDashboard";
import { DarkCard, PrimaryButton, SectionLabel } from "./uiPrimitives";
import { generateProgram, refineDetailedPlan, submitPlanner } from "../lib/api";
import type {
  DetailedPlanOutput,
  DetailedPlanWeek,
  IntakeInput,
  LeadInput,
  MonetizationLinks,
  PlannerOutput,
} from "../lib/types";
import { buildPerformancePlan } from "../lib/plannerLogicEngine";
import { buildRealitySummary } from "../lib/plannerGapAnalysis";
import { generate4WeekPlanBase } from "../lib/plannerBlockBuilder";
import { validateIntake, validateLead } from "../lib/validation";

// ─── Flow ────────────────────────────────────────────────────────────────────
// Step 1–3  → intake (no email asked yet)
// submit    → generates plan server-side, returns full JSON
// "preview" → shows headline + gap summary freely
//             email gate blocks the rest
// unlock    → athlete submits email, full dashboard reveals
// "success" → 4-week plan builder available
// ─────────────────────────────────────────────────────────────────────────────

type UiStatus =
  | "idle"
  | "incomplete"
  | "validating"
  | "submitting"
  | "generating"
  | "preview"    // free teaser visible, gate shown
  | "unlocking"  // email being submitted
  | "success"    // full results unlocked
  | "error";

const initialIntake: IntakeInput = {
  sport: "Running",
  eventType: "5k",
  level: "Intermediate",
  goal: "Improve 5k / 10k",
  currentBenchmark: "",
  goalBenchmark: "",
  sessionsPerWeek: 4,
  hoursPerWeek: 5,
  weeklyKm: 0,
  longestRun: 0,
  qualitySessionsPerWeek: 1,
  timelineWeeks: undefined,
  weakness: "Aerobic base",
  injuryStatus: undefined,
  injuryAreas: [],
  trainingConsistency: undefined,
  fatigueLevel: undefined,
  injuryHistory: "",
  equipmentAccess: [],
  priority: "",
};

const initialLead: LeadInput = { firstName: "", email: "", consentToMarketing: false };

const ACTIVE_SUBHEADING = "The missing link between training hard and actually improving.";
const TOTAL_STEPS = 3;

export default function PerformancePlannerEmbed({
  brandName = "KJ Performance",
  accentColor = "#ff8a1a",
  apiBaseUrl = "/api/performance-planner",
  sourceTag = "embed",
  monetizationLinks,
}: {
  brandName?: string;
  accentColor?: string;
  apiBaseUrl?: string;
  sourceTag?: string;
  monetizationLinks?: MonetizationLinks;
}) {
  const [step, setStep] = useState(1);
  const [intake, setIntake] = useState<IntakeInput>(initialIntake);
  const [lead, setLead] = useState<LeadInput>(initialLead);
  const [status, setStatus] = useState<UiStatus>("idle");
  const [errors, setErrors] = useState<string[]>([]);
  const [unlockErrors, setUnlockErrors] = useState<string[]>([]);
  const [plan, setPlan] = useState<PlannerOutput | null>(null);
  const [detailedPlan, setDetailedPlan] = useState<DetailedPlanOutput | null>(null);
  const [detailedPlanLoading, setDetailedPlanLoading] = useState(false);
  const [fullProgramOpen, setFullProgramOpen] = useState(false);
  const [twelveWeekPlan, setTwelveWeekPlan] = useState<DetailedPlanWeek[] | null>(null);
  const [twentyFourWeekPlan, setTwentyFourWeekPlan] = useState<DetailedPlanWeek[] | null>(null);
  const [showDiagnosis, setShowDiagnosis] = useState(false);
  const [showBlueprint, setShowBlueprint] = useState(false);
  const [programGenerating, setProgramGenerating] = useState<null | 12 | 24>(null);
  const [programGeneratingMessage, setProgramGeneratingMessage] = useState("");
  const [programQueued, setProgramQueued] = useState<null | 12 | 24>(null);

  // Same-origin `/api/...` so Vite dev `server.proxy` forwards to the Express API (port 8787).
  // Do not hard-code :8787 — that bypasses the proxy and breaks if only `npm run dev` is running.
  const resolvedApiBaseUrl = apiBaseUrl;

  const logicDebug = useMemo(
    () => (plan ? buildPerformancePlan(intake) : null),
    [intake, plan],
  );

  const programmeLength: 4 | 12 | 24 = useMemo(() => {
    if (twentyFourWeekPlan && twentyFourWeekPlan.length > 4) return 24;
    if (twelveWeekPlan && twelveWeekPlan.length > 4) return 12;
    return 4;
  }, [twelveWeekPlan, twentyFourWeekPlan]);

  const displayWeeks = useMemo(() => {
    if (!detailedPlan) return [];
    if (twentyFourWeekPlan?.length) return twentyFourWeekPlan;
    if (twelveWeekPlan?.length) return twelveWeekPlan;
    return [...detailedPlan.weeklyBreakdown];
  }, [detailedPlan, twelveWeekPlan, twentyFourWeekPlan]);

  // ── 1. Generate plan (email NOT required yet) ──────────────────────────────
  async function handleSubmit() {
    setErrors([]);
    setStatus("validating");

    const intakeErrors = validateIntake(intake);
    if (intakeErrors.length) {
      setErrors(intakeErrors);
      setStatus("incomplete");
      return;
    }

    let delayId: ReturnType<typeof setTimeout> | null = null;

    try {
      setStatus("submitting");
      delayId = setTimeout(() => setStatus("generating"), 150);

      const data = await Promise.race([
        // Pass lead as null — we don't have it yet
        submitPlanner({ lead: null, intake, sourceTag }, resolvedApiBaseUrl, 90000),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("timed out")), 90000),
        ),
      ]);

      if (delayId) clearTimeout(delayId);
      if (!data.plan) {
        throw new Error("invalid-response");
      }

      setPlan({
        ...data.plan,
        gapSummary: data.plan.gapSummary || buildRealitySummary(intake),
      });
      setDetailedPlan(null);
      setTwelveWeekPlan(null);
      setTwentyFourWeekPlan(null);
      setFullProgramOpen(false);
      setShowBlueprint(false);
      setStatus("preview"); // ← teaser state, not full unlock
      setShowDiagnosis(true);
    } catch (e) {
      if (delayId) clearTimeout(delayId);
      const msg = e instanceof Error ? e.message : String(e);
      const lower = msg.toLowerCase();
      if (lower.includes("timed out") || lower.includes("timeout")) {
        setErrors(["Generation timed out — please try again."]);
      } else if (
        lower.includes("network error") ||
        lower.includes("failed to fetch") ||
        lower.includes("load failed") ||
        lower.includes("not reachable")
      ) {
        setErrors([
          "Can't reach the planner API. From the kj-app folder run: npm run dev:server (API on port 8787), and npm run dev for the UI — or use: npm run dev:full",
        ]);
      } else if (msg.length > 0 && msg.length < 220) {
        setErrors([msg]);
      } else {
        setErrors(["Something went wrong — please try again."]);
      }
      setStatus("error");
    }
  }

  // ── 2. Unlock full results with email ─────────────────────────────────────
  async function handleUnlock() {
    setUnlockErrors([]);

    const leadErrors = validateLead(lead);
    if (leadErrors.length) {
      setUnlockErrors(leadErrors);
      return;
    }

    setStatus("unlocking");

    try {
      // Now submit the lead alongside the plan they already generated
      await Promise.race([
        submitPlanner(
          { lead, intake, sourceTag, planAlreadyGenerated: true, planId: plan?._id },
          resolvedApiBaseUrl,
          8000,
        ),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("timed out")), 8000),
        ),
      ]);
    } catch {
      // Lead submission failed — unlock anyway, don't punish the athlete
      // for a server hiccup. Log it server-side if possible.
      console.warn("[KJPlanner] lead capture failed silently — unlocking results");
    } finally {
      setStatus("success");
    }
  }

  // ── 3. 4-week detailed plan ────────────────────────────────────────────────
  async function handleGenerateDetailedPlan() {
    if (!plan) return;
    setDetailedPlanLoading(true);
    setErrors([]);

    try {
      const { basePlan, logicPlan, refinementPrompt } = generate4WeekPlanBase(
        intake,
        plan.drivers,
      );
      const refined = await refineDetailedPlan(
        { input: intake, logicPlan, basePlan, refinementPrompt },
        resolvedApiBaseUrl,
        18000,
      );
      setDetailedPlan(refined);
      setFullProgramOpen(true);
    } catch {
      const { basePlan } = generate4WeekPlanBase(intake, plan.drivers);
      setDetailedPlan(basePlan);
      setErrors(["Live refinement unavailable — showing structured base plan."]);
      setFullProgramOpen(true);
    } finally {
      setDetailedPlanLoading(false);
    }
  }

  async function handleGenerate12Week() {
    if (!detailedPlan) return;
    setProgramGenerating(12);
    setProgramQueued(null);
    setProgramGeneratingMessage("");
    setErrors([]);
    const slowWarningId = setTimeout(() => {
      setProgramGeneratingMessage("Still generating... large programmes can take up to 60 seconds. Please wait.");
    }, 15000);
    try {
      const result = await generateProgram(
        { intake, existingPlan: detailedPlan, programLength: 12, sourceTag, email: lead.email || undefined, firstName: lead.firstName || undefined },
        resolvedApiBaseUrl,
        150000,
      );
      if (result.queued) {
        setProgramQueued(12);
      } else {
        setTwelveWeekPlan(result.weeks ?? []);
        setTwentyFourWeekPlan(null);
        setFullProgramOpen(true);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "12-week programme could not be generated.";
      setErrors([msg]);
    } finally {
      clearTimeout(slowWarningId);
      setProgramGenerating(null);
      setProgramGeneratingMessage("");
    }
  }

  async function handleGenerate24Week() {
    if (!detailedPlan) return;
    setProgramGenerating(24);
    setProgramQueued(null);
    setProgramGeneratingMessage("");
    setErrors([]);
    const slowWarningId = setTimeout(() => {
      setProgramGeneratingMessage("Still generating... large programmes can take up to 60 seconds. Please wait.");
    }, 15000);
    try {
      const result = await generateProgram(
        { intake, existingPlan: detailedPlan, programLength: 24, sourceTag, email: lead.email || undefined, firstName: lead.firstName || undefined },
        resolvedApiBaseUrl,
        120000,
      );
      if (result.queued) {
        setProgramQueued(24);
      } else {
        setTwentyFourWeekPlan(result.weeks ?? []);
        setTwelveWeekPlan(null);
        setFullProgramOpen(true);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "24-week programme could not be generated.";
      setErrors([msg]);
    } finally {
      clearTimeout(slowWarningId);
      setProgramGenerating(null);
      setProgramGeneratingMessage("");
    }
  }

  const isGenerating = status === "submitting" || status === "generating";
  const isPreview = status === "preview";
  const isUnlocking = status === "unlocking";
  const isUnlocked = status === "success";
  const hasResult = isPreview || isUnlocking || isUnlocked;

  return (
    <section
      data-kj-performance-planner
      className="[&_*,_&_*::before,_&_*::after]:box-border isolate w-full overflow-x-hidden rounded-3xl border border-white/10 bg-[radial-gradient(120%_100%_at_50%_0%,rgba(255,138,26,0.08),transparent_38%),linear-gradient(180deg,#090909_0%,#060606_100%)] px-4 py-8 font-sans text-white shadow-[0_20px_60px_rgba(0,0,0,0.55)] sm:px-6 lg:px-10"
    >
      <div className="mx-auto max-w-7xl">
        <div className="mb-5 flex items-center justify-center gap-3">
          <div className="flex items-center gap-2">
            {Array.from({ length: TOTAL_STEPS }).map((_, idx) => {
              const index = idx + 1;
              const stateClass = step > index
                ? "bg-[#ff8a1a]/40 w-7"
                : step === index
                  ? "bg-[#ff8a1a] w-11"
                  : "bg-white/12 w-7";
              return <span key={index} className={`h-[3px] rounded-full transition-all duration-300 ${stateClass}`} />;
            })}
          </div>
          <span className="text-xs text-white/35">Step {step} of {TOTAL_STEPS}</span>
        </div>

        <div className="mb-6">
          <SectionLabel>{brandName}</SectionLabel>
          <h2 className="mt-2 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
            KJ Performance Planner
          </h2>
          <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-[#b7b7b7]">
            {ACTIVE_SUBHEADING}
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[0.86fr_1.14fr]">
          {/* ── Left: intake form ── */}
          <DarkCard
            className={`space-y-4 p-5 transition-all duration-500 ${
              hasResult
                ? "opacity-50 pointer-events-none lg:opacity-100 lg:pointer-events-auto"
                : ""
            }`}
          >
            <IntakeForm step={step} intake={intake} setIntake={setIntake} />

            {errors.length > 0 && (
              <div className="rounded-xl border border-[#ff8a1a]/40 bg-[#25160d] p-3 text-sm">
                <p className="mb-1.5 font-semibold text-[#ffd6b0]">
                  {status === "error" ? "Something went wrong" : "Please fix:"}
                </p>
                <ul className="space-y-1 text-xs text-[#f0c9a0]">
                  {errors.slice(0, 3).map((e) => (
                    <li key={e}>— {e}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex items-center justify-between border-t border-white/10 pt-3">
              <button
                type="button"
                onClick={() => setStep((s) => Math.max(1, s - 1))}
                disabled={isGenerating || step === 1}
                className="py-2 text-sm text-white/30 transition-colors hover:text-white/60 disabled:pointer-events-none disabled:opacity-0"
              >
                ← Back
              </button>

              {step < TOTAL_STEPS ? (
                <button
                  type="button"
                  onClick={() => {
                    setStep((s) => Math.min(TOTAL_STEPS, s + 1));
                    setErrors([]);
                  }}
                  className="rounded-xl border border-white/20 bg-[#111111] px-4 py-2.5 text-sm text-[#dddddd] transition hover:border-[#ff8a1a]/50 hover:text-white"
                >
                  Next
                </button>
              ) : (
                <PrimaryButton
                  type="button"
                  onClick={handleSubmit}
                  disabled={isGenerating}
                  style={{ backgroundColor: accentColor }}
                >
                  {isGenerating
                    ? "Analysing..."
                    : status === "error"
                    ? "Try Again"
                    : "Analyse My Performance"}
                </PrimaryButton>
              )}
            </div>
          </DarkCard>

          {/* ── Right: results panel ── */}
          <DarkCard className="p-5 lg:sticky lg:top-4 lg:p-6">
            {isGenerating ? (
              <LoadingState
                phase={
                  status === "submitting"
                    ? "Saving your profile..."
                    : "Analysing your performance data..."
                }
              />
            ) : (
              <ResultDashboard
                plan={plan}
                intake={intake}
                step={step}
                monetizationLinks={monetizationLinks}
                detailedPlan={detailedPlan}
                detailedPlanLoading={detailedPlanLoading}
                onGenerateDetailedPlan={handleGenerateDetailedPlan}
                isPreview={isPreview}
                isUnlocked={isUnlocked}
                isUnlocking={isUnlocking}
                lead={lead}
                setLead={setLead}
                onUnlock={handleUnlock}
                unlockErrors={unlockErrors}
                fullProgramOpen={fullProgramOpen}
                onOpenFullProgram={() => setFullProgramOpen(true)}
                onCloseFullProgram={() => setFullProgramOpen(false)}
                programmeLength={programmeLength}
                displayWeeks={displayWeeks}
                onGenerate12Week={handleGenerate12Week}
                onGenerate24Week={handleGenerate24Week}
                programGenerating={programGenerating}
                programGeneratingMessage={programGeneratingMessage}
                programQueued={programQueued}
                brandName={brandName}
              />
            )}

            {import.meta.env.DEV && logicDebug && (
              <div className="mt-4 rounded-xl border border-[#ff8a1a]/35 bg-[#130f0c] p-3 text-xs text-[#f0d2af]">
                <p className="mb-2 font-semibold uppercase tracking-[0.12em]">Dev Logic Inspector</p>
                <p><span className="text-[#ffb974]">Primary:</span> {logicDebug.primaryDriver}</p>
                <p><span className="text-[#ffb974]">Secondary:</span> {logicDebug.secondaryDriver}</p>
                <p>
                  <span className="text-[#ffb974]">Profile:</span>{" "}
                  {logicDebug.profile.sportProfile} / {logicDebug.profile.timeProfile} / risk:
                  {logicDebug.profile.risk}
                </p>
                <p className="mt-2 text-[#d5b38a]">Strategy: {logicDebug.strategy.join(" | ")}</p>
                <p className="mt-1 text-[#d5b38a]">Metrics: {logicDebug.metrics.join(" | ")}</p>
                <p className="mt-1 text-[#d5b38a]">
                  Risks: {logicDebug.risks.join(" | ") || "None"}
                </p>
              </div>
            )}
          </DarkCard>
        </div>
      </div>

      {showDiagnosis && plan && (
        <DiagnosisReveal
          plan={plan}
          intake={intake}
          apiBaseUrl={resolvedApiBaseUrl}
          onContinue={(email) => {
            if (email) setLead((l) => ({ ...l, email }));
            setShowDiagnosis(false);
            setShowBlueprint(true);
          }}
        />
      )}

      {showBlueprint && plan && (
        <BlueprintScreen
          plan={plan}
          intake={intake}
          onContinue={() => setShowBlueprint(false)}
        />
      )}
    </section>
  );
}
