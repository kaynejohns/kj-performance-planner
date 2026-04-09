import { useMemo, useState } from "react";
import IntakeForm from "./IntakeForm";
import LeadCaptureStep from "./LeadCaptureStep";
import LoadingState from "./LoadingState";
import ProgressIndicator from "./ProgressIndicator";
import ResultDashboard from "./ResultDashboard";
import { DarkCard, PrimaryButton, SectionLabel } from "./uiPrimitives";
import { refineDetailedPlan, submitPlanner } from "../lib/api";
import type { DetailedPlanOutput, IntakeInput, LeadInput, MonetizationLinks, PlannerOutput } from "../lib/types";
import { buildMockPlanner } from "../lib/mockPlanner";
import { buildPerformancePlan } from "../lib/plannerLogicEngine";
import { buildRealitySummary } from "../lib/plannerGapAnalysis";
import { generate4WeekPlanBase } from "../lib/plannerBlockBuilder";
import { validateIntake, validateLead } from "../lib/validation";

type UiStatus = "idle" | "incomplete" | "validating" | "submitting" | "generating" | "success" | "error";
type GenerationMode = "live" | "fallback" | null;

const initialIntake: IntakeInput = {
  sport: "Running",
  eventType: "5k",
  level: "Intermediate",
  goal: "Improve 5k / 10k",
  currentBenchmark: "22:00",
  goalBenchmark: "20:30",
  sessionsPerWeek: 5,
  hoursPerWeek: 7,
  weeklyKm: 38,
  longestRun: 14,
  qualitySessionsPerWeek: 2,
  timelineWeeks: 12,
  weakness: "Aerobic base",
  injuryHistory: "Prior calf tightness with abrupt load jumps.",
  equipmentAccess: ["Gym", "Track"],
  priority: "",
};

const initialLead: LeadInput = { firstName: "", email: "", consentToMarketing: false };

// Swap this index (0-5) to change hero subheading copy.
const HERO_SUBHEADING_OPTIONS = [
  "The missing link between training hard and actually improving.",
  "Train with intent, not guesswork - turn effort into measurable progress.",
  "For athletes doing the work but missing the structure that drives results.",
  "Where high effort becomes high performance through clear coaching structure.",
  "Built for committed athletes who need clarity, progression, and execution.",
  "Stop spinning wheels - train with a performance system that moves you forward.",
] as const;

const ACTIVE_HERO_SUBHEADING = HERO_SUBHEADING_OPTIONS[0];

export default function PerformancePlannerEmbed({
  brandName = "KJ Performance",
  accentColor = "#ff8a1a",
  apiBaseUrl = "/api/performance-planner",
  ctaUrl = "#",
  sourceTag = "embed",
  monetizationLinks,
}: {
  brandName?: string;
  accentColor?: string;
  apiBaseUrl?: string;
  ctaUrl?: string;
  sourceTag?: string;
  monetizationLinks?: MonetizationLinks;
}) {
  const [step, setStep] = useState(1);
  const total = 4;
  const [intake, setIntake] = useState<IntakeInput>(initialIntake);
  const [lead, setLead] = useState<LeadInput>(initialLead);
  const [status, setStatus] = useState<UiStatus>("idle");
  const [errors, setErrors] = useState<string[]>([]);
  const [plan, setPlan] = useState<PlannerOutput | null>(null);
  const [detailedPlan, setDetailedPlan] = useState<DetailedPlanOutput | null>(null);
  const [detailedPlanLoading, setDetailedPlanLoading] = useState(false);
  const [generationMode, setGenerationMode] = useState<GenerationMode>(null);
  const resolvedApiBaseUrl =
    apiBaseUrl.startsWith("/api") && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")
      ? `http://localhost:8787${apiBaseUrl}`
      : apiBaseUrl;
  const requestTimeoutMs = 12000;
  const logicDebug = useMemo(() => (plan ? buildPerformancePlan(intake) : null), [intake, plan]);

  async function submitWithTimeout() {
    return Promise.race([
      submitPlanner({ lead, intake, sourceTag }, resolvedApiBaseUrl, requestTimeoutMs),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Request timed out. Using offline performance summary.")), requestTimeoutMs),
      ),
    ]);
  }

  async function handleSubmit() {
    console.info("[PerformancePlanner] submit started");
    setErrors([]);
    setStatus("validating");
    const nextErrors = [...validateIntake(intake), ...validateLead(lead)];
    if (nextErrors.length) {
      console.warn("[PerformancePlanner] validation failed", nextErrors);
      setErrors(nextErrors);
      setStatus("incomplete");
      return;
    }
    console.info("[PerformancePlanner] validation passed");

    let generatingDelayId: ReturnType<typeof setTimeout> | null = null;
    try {
      setStatus("submitting");
      generatingDelayId = setTimeout(() => setStatus("generating"), 150);
      console.info("[PerformancePlanner] sending request", { apiBaseUrl: resolvedApiBaseUrl });
      const data = await submitWithTimeout();
      console.info("[PerformancePlanner] response received");
      console.info("[PerformancePlanner] parsed response", data);
      if (generatingDelayId) {
        clearTimeout(generatingDelayId);
      }
      setPlan({
        ...data.plan,
        gapSummary: data.plan.gapSummary || buildRealitySummary(intake),
      });
      setDetailedPlan(null);
      setGenerationMode("live");
      console.info("[PerformancePlanner] rendering result");
      setStatus("success");
    } catch (e) {
      console.error("[PerformancePlanner] generation failed", e);
      if (generatingDelayId) {
        clearTimeout(generatingDelayId);
      }
      const fallbackPlan = buildMockPlanner(intake);
      setPlan({
        ...fallbackPlan,
        gapSummary: fallbackPlan.gapSummary || buildRealitySummary(intake),
      });
      setDetailedPlan(null);
      setGenerationMode("fallback");
      setErrors(["Server unavailable. Showing offline performance summary."]);
      setStatus("success");
    }
  }

  async function handleGenerateDetailedPlan() {
    if (!plan) return;
    setDetailedPlanLoading(true);
    try {
      const { basePlan, logicPlan, refinementPrompt } = generate4WeekPlanBase(intake, plan.drivers);
      const refined = await refineDetailedPlan(
        { input: intake, logicPlan, basePlan, refinementPrompt },
        resolvedApiBaseUrl,
        15000,
      );
      setDetailedPlan(refined);
    } catch (error) {
      // If remote refinement is unavailable, still render the structured base plan.
      const { basePlan } = generate4WeekPlanBase(intake, plan.drivers);
      setDetailedPlan(basePlan);
      setErrors([
        error instanceof Error
          ? `${error.message} Showing structured 4-week base plan.`
          : "Detailed plan refinement unavailable. Showing structured 4-week base plan.",
      ]);
    } finally {
      setDetailedPlanLoading(false);
    }
  }

  return (
    <section
      data-kj-performance-planner
      className="[&_*,_&_*::before,_&_*::after]:box-border isolate w-full overflow-x-hidden rounded-3xl border border-white/10 bg-[radial-gradient(120%_100%_at_50%_0%,rgba(255,138,26,0.08),transparent_38%),linear-gradient(180deg,#090909_0%,#060606_100%)] px-4 py-8 font-sans text-white shadow-[0_20px_60px_rgba(0,0,0,0.55)] sm:px-6 lg:px-10"
    >
      <div className="mx-auto max-w-7xl">
        <ProgressIndicator step={step} total={total} />
        <div className="mb-6">
          <SectionLabel>{brandName}</SectionLabel>
          <h2 className="mt-2 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
            KJ Performance Planner
          </h2>
          <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-[#b7b7b7]">
            {ACTIVE_HERO_SUBHEADING}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full border border-white/15 bg-[#111111] px-3 py-1 text-[#cfcfcf]">
              Ruleset v3
            </span>
            {generationMode && (
              <span
                className={`rounded-full border px-3 py-1 ${
                  generationMode === "live"
                    ? "border-[#2d8f53]/45 bg-[#123020] text-[#bce8cc]"
                    : "border-[#ff8a1a]/40 bg-[#25170d] text-[#ffd8b5]"
                }`}
              >
                {generationMode === "live" ? "Connected" : "Offline build"}
              </span>
            )}
          </div>
        </div>
        <div className="grid gap-6 lg:grid-cols-[0.86fr_1.14fr]">
          <DarkCard className="space-y-4 p-5">
            {step <= 3 ? (
              <IntakeForm step={step} intake={intake} setIntake={setIntake} />
            ) : (
              <LeadCaptureStep lead={lead} setLead={setLead} />
            )}
            {errors.length > 0 && (
              <div className="rounded-xl border border-[#ff8a1a]/40 bg-[#25160d] p-3 text-sm">
                <p className="mb-1 font-semibold">Please fix the following:</p>
                <ul className="space-y-1 text-xs">
                  {errors.slice(0, 3).map((item) => (
                    <li key={item}>- {item}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex items-center justify-between border-t border-white/10 pt-3">
              <button
                type="button"
                onClick={() => setStep((s) => Math.max(1, s - 1))}
                className="rounded-xl border border-white/20 bg-[#111111] px-4 py-2.5 text-sm text-[#dddddd] transition hover:border-[#ff8a1a]/50 hover:text-white"
              >
                Back
              </button>
              {step < total ? (
                <button
                  type="button"
                  onClick={() => {
                    setStep((s) => Math.min(total, s + 1));
                    setStatus("idle");
                    setErrors([]);
                  }}
                  className="rounded-xl border border-white/20 bg-[#111111] px-4 py-2.5 text-sm text-[#dddddd] transition hover:border-[#ff8a1a]/50 hover:text-white"
                >
                  Next
                </button>
              ) : (
                <PrimaryButton type="button" onClick={handleSubmit} style={{ backgroundColor: accentColor }}>
                  Generate Performance Plan
                </PrimaryButton>
              )}
            </div>
          </DarkCard>
          <DarkCard className="p-5 lg:sticky lg:top-4 lg:p-6">
            {status === "submitting" || status === "generating" ? (
              <LoadingState
                phase={status === "submitting" ? "Saving your submission..." : "Building your performance plan..."}
              />
            ) : (
              <ResultDashboard
                plan={plan}
                intake={intake}
                ctaUrl={ctaUrl}
                monetizationLinks={monetizationLinks}
                detailedPlan={detailedPlan}
                detailedPlanLoading={detailedPlanLoading}
                onGenerateDetailedPlan={handleGenerateDetailedPlan}
              />
            )}
            {import.meta.env.DEV && logicDebug && (
              <div className="mt-4 rounded-xl border border-[#ff8a1a]/35 bg-[#130f0c] p-3 text-xs text-[#f0d2af]">
                <p className="mb-2 font-semibold uppercase tracking-[0.12em]">Dev Logic Inspector</p>
                <p><span className="text-[#ffb974]">Primary:</span> {logicDebug.primaryDriver}</p>
                <p><span className="text-[#ffb974]">Secondary:</span> {logicDebug.secondaryDriver}</p>
                <p><span className="text-[#ffb974]">Profile:</span> {logicDebug.profile.sportProfile} / {logicDebug.profile.timeProfile} / risk:{logicDebug.profile.risk}</p>
                <p className="mt-2 text-[#d5b38a]">Strategy: {logicDebug.strategy.join(" | ")}</p>
                <p className="mt-1 text-[#d5b38a]">Metrics: {logicDebug.metrics.join(" | ")}</p>
                <p className="mt-1 text-[#d5b38a]">Risks: {logicDebug.risks.join(" | ") || "None"}</p>
              </div>
            )}
            {status === "error" && (
              <button
                type="button"
                onClick={handleSubmit}
                className="mt-4 rounded-xl border border-[#ff8a1a]/50 bg-[#141414] px-4 py-2.5 text-sm text-[#f2f2f2] transition hover:border-[#ff8a1a]"
              >
                Retry
              </button>
            )}
          </DarkCard>
        </div>
      </div>
    </section>
  );
}
