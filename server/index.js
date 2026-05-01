// Load .env manually in local dev — dotenvx intercepts `dotenv/config` and corrupts keys.
// On Netlify, env vars are injected directly into process.env — no file reading needed.
// import.meta.url is undefined when esbuild bundles to CJS, so guard it.
try {
  const metaUrl = import.meta?.url;
  if (metaUrl) {
    const { readFileSync } = await import("fs");
    const { fileURLToPath } = await import("url");
    const { dirname, join } = await import("path");
    const __dirname = dirname(fileURLToPath(metaUrl));
    const lines = readFileSync(join(__dirname, ".env"), "utf8").split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      process.env[key] = value;
    }
  }
} catch { /* no .env file or not in local dev */ }
import cors from "cors";
import express from "express";
import { generatePerformancePlan, generateWithModel } from "./lib/coachPlanGenerationService.js";
import { syncLeadToCRM } from "./lib/crm.js";
import { refineDetailedPlan } from "./lib/detailedPlanService.js";
import {
  attachLeadToPlan,
  createLeadSubmission,
  getSubmissionById,
  saveGeneratedPlan,
  storePendingPlan,
} from "./lib/storage.js";
import { sendUnlockConfirmationEmail } from "./lib/sendUnlockEmail.js";
import { intakeSchema, leadSchema } from "./lib/validation.js";
import { buildProgramPrompt } from "./lib/programGenerationService.js";
import { applyPrescriptions } from "./lib/sessionTemplates.js";
import { mockExpandWeeks } from "./lib/generateProgramService.js";
// pdfkit and email are loaded dynamically to avoid crashing the serverless function on startup
const getPdfService = () => import("./lib/pdfService.js");
const getEmailService = () => import("./lib/emailService.js");

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", (_req, res) => res.json({ ok: true }));

app.post("/api/performance-planner/lead", async (req, res) => {
  const payload = req.body || {};
  const leadResult = leadSchema.safeParse(payload.lead);
  const intakeResult = intakeSchema.safeParse(payload.intake);
  if (!leadResult.success || !intakeResult.success) {
    return res.status(400).json({
      ok: false,
      error: "Invalid submission payload.",
      details: {
        lead: leadResult.success ? [] : leadResult.error.issues.map((i) => i.message),
        intake: intakeResult.success ? [] : intakeResult.error.issues.map((i) => i.message),
      },
    });
  }
  const submission = await createLeadSubmission({ ...leadResult.data, ...intakeResult.data, source: payload.sourceTag });
  await syncLeadToCRM({ ...leadResult.data, source: payload.sourceTag });
  return res.json({ ok: true, submissionId: submission.id });
});

app.post("/api/performance-planner/generate", async (req, res) => {
  const submissionId = req.body?.submissionId;
  const submission = await getSubmissionById(submissionId);
  if (!submission) return res.status(404).json({ ok: false, error: "Submission not found." });
  const plan = await generatePerformancePlan(submission);
  await saveGeneratedPlan(submission.id, plan);
  return res.json({ ok: true, submissionId: submission.id, plan });
});

app.post("/api/performance-planner/submit", async (req, res) => {
  const body = req.body || {};
  const { lead, intake, planAlreadyGenerated, planId, submissionId, sourceTag } = body;

  const intakeResult = intakeSchema.safeParse(intake);
  if (!intakeResult.success) {
    return res.status(400).json({
      ok: false,
      error: "Please complete required intake fields with valid values.",
      details: {
        lead: [],
        intake: intakeResult.error.issues.map((i) => i.message),
      },
    });
  }
  try {
    const intakeData = intakeResult.data;

    // First call: generate a plan without requiring lead details.
    // Only skip lead validation when lead is absent (null / undefined). Do not run Zod on null.
    if (lead === null || lead === undefined) {
      const plan = await generatePerformancePlan(intakeData);
      const id = crypto.randomUUID();
      const planWithId = { ...plan, _id: id };
      await storePendingPlan(id, intakeData, planWithId, sourceTag);
      return res.json({ ok: true, submissionId: id, plan: planWithId });
    }

    const leadResult = leadSchema.safeParse(lead);
    if (!leadResult.success) {
      return res.status(400).json({
        ok: false,
        error: "Please complete required lead fields with valid values.",
        details: {
          lead: leadResult.error.issues.map((i) => i.message),
          intake: [],
        },
      });
    }

    // Second call: lead arrives after plan generation.
    if (planAlreadyGenerated) {
      const resolvedPlanId = planId || submissionId;
      if (!resolvedPlanId || typeof resolvedPlanId !== "string") {
        return res.status(400).json({ ok: false, error: "Missing planId for post-generation lead capture." });
      }
      const updated = await attachLeadToPlan(resolvedPlanId, leadResult.data, sourceTag);
      if (!updated) {
        return res.status(404).json({ ok: false, error: "Pending plan not found for provided planId." });
      }
      await syncLeadToCRM({ ...leadResult.data, source: sourceTag });
      const planDoc = updated.generatedPlan;
      sendUnlockConfirmationEmail({
        to: leadResult.data.email,
        firstName: leadResult.data.firstName,
        headline: planDoc?.headline,
        gapSummary: planDoc?.gapSummary,
      }).catch((err) => console.error("[kj-planner] unlock email failed", err));
      return res.json({ ok: true, submissionId: resolvedPlanId });
    }

    // Legacy single-step path: lead + intake together.
    const submission = await createLeadSubmission({ ...leadResult.data, ...intakeData, source: sourceTag });
    await syncLeadToCRM({ ...leadResult.data, source: sourceTag });
    const plan = await generatePerformancePlan({ ...leadResult.data, ...intakeData });
    await saveGeneratedPlan(submission.id, plan);
    return res.json({ ok: true, submissionId: submission.id, plan });
  } catch (error) {
    console.error("[submit] error:", error?.message, error?.code);
    return res.status(500).json({ ok: false, error: "Could not complete your performance plan. Please retry." });
  }
});

app.post("/api/performance-planner/detailed-plan", async (req, res) => {
  const payload = req.body || {};
  if (!payload?.input || !payload?.logicPlan || !payload?.basePlan || !payload?.refinementPrompt) {
    return res.status(400).json({ ok: false, error: "Invalid detailed-plan payload." });
  }
  try {
    const plan = await refineDetailedPlan(payload);
    console.log(
      "[detailed-plan] weekly dailySessions lengths:",
      Array.isArray(plan?.weeklyBreakdown)
        ? plan.weeklyBreakdown.map((w) => (Array.isArray(w?.dailySessions) ? w.dailySessions.length : 0))
        : [],
    );
    return res.json({ ok: true, plan });
  } catch {
    return res.status(500).json({ ok: false, error: "Could not complete the detailed plan build." });
  }
});

app.post("/api/performance-planner/generate-program", async (req, res) => {
  const { intake, existingPlan, programLength, sourceTag, email, firstName } = req.body || {};

  if (!intake || programLength == null || programLength === "") {
    return res.status(400).json({ ok: false, error: "Missing intake or programLength." });
  }

  const intakeResult = intakeSchema.safeParse(intake);
  if (!intakeResult.success) {
    return res.status(400).json({
      ok: false,
      error: "Invalid intake.",
      details: intakeResult.error.issues.map((i) => i.message),
    });
  }

  const pl = Number(programLength);
  if (pl !== 12 && pl !== 24) {
    return res.status(400).json({ ok: false, error: "programLength must be 12 or 24." });
  }

  const prompt = buildProgramPrompt(intakeResult.data, existingPlan ?? null, pl);

  // ── Helper: run the full generation pipeline ────────────────────────────────
  async function runGeneration() {
    if (!process.env.ANTHROPIC_API_KEY?.trim()) {
      if (!existingPlan?.weeklyBreakdown?.length) throw new Error("No AI key and no existing plan.");
      const firstFour = existingPlan.weeklyBreakdown.slice(0, 4).map((w, i) => ({ ...w, week: i + 1 }));
      const mockWeeks = pl === 12
        ? [...firstFour, ...mockExpandWeeks(existingPlan, 5, 8, "Norwegian Method (mock)")].slice(0, 12)
        : [...firstFour, ...mockExpandWeeks(existingPlan, 5, 8, "Norwegian Method (mock)"), ...mockExpandWeeks(existingPlan, 13, 12, "Norwegian Method (mock)")].slice(0, 24);
      return applyPrescriptions(mockWeeks, intakeResult.data);
    }

    const raw = await generateWithModel(prompt);
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
    const weeks = JSON.parse(cleaned);
    const weeksRaw = Array.isArray(weeks) ? weeks : weeks?.weeklyBreakdown || weeks?.weeks || [];
    return applyPrescriptions(weeksRaw, intakeResult.data);
  }

  // ── Fire-and-forget path: respond immediately, email PDF when ready ─────────
  if (email) {
    res.json({
      ok: true,
      queued: true,
      message: `Your ${pl}-week programme is generating — check your inbox in ~2 minutes.`,
    });

    (async () => {
      try {
        console.log(`[generate-program] background generation started for ${email}`);
        const weeksArray = await runGeneration();
        console.log(`[generate-program] parsed ${weeksArray.length} weeks — building PDF`);
        const { buildProgramPdf } = await getPdfService();
        const { sendProgramEmail } = await getEmailService();
        const pdfBuffer = await buildProgramPdf({
          firstName: firstName || "Athlete",
          intake: intakeResult.data,
          weeks: weeksArray,
          programLength: pl,
        });
        const result = await sendProgramEmail({
          to: email,
          firstName: firstName || "Athlete",
          programLength: pl,
          pdfBuffer,
        });
        if (result.sent) {
          console.log(`[generate-program] PDF sent to ${email}`);
        } else {
          console.warn(`[generate-program] email not sent: ${result.reason}`);
        }
      } catch (err) {
        console.error("[generate-program] background generation failed:", err?.message || err);
      }
    })();

    return;
  }

  // ── Synchronous path: return JSON directly (existing behaviour) ─────────────
  try {
    console.log(`[generate-program] starting ${pl}-week generation`);
    console.log(`[generate-program] athlete: ${intakeResult.data.sport} / ${intakeResult.data.eventType} / ${intakeResult.data.level}`);
    if (sourceTag) console.log("[generate-program] sourceTag:", sourceTag);

    const weeksArray = await runGeneration();

    console.log(`[generate-program] parsed ${weeksArray.length} weeks`);
    console.log(`[generate-program] week 1 dailySessions:`, weeksArray[0]?.dailySessions?.length);

    return res.json({ ok: true, program: weeksArray });
  } catch (error) {
    console.error("[generate-program] error:", error?.message);
    return res.status(500).json({
      ok: false,
      error: "Could not generate programme. Please retry.",
      debug: error?.message,
    });
  }
});

app.post("/api/performance-planner/diagnose", async (req, res) => {
  const { intake, plan } = req.body || {};
  if (!intake || !plan) {
    return res.status(400).json({ ok: false, error: "Missing intake or plan." });
  }
  try {
    const prompt = buildDiagnosisPrompt(intake, plan);
    const raw = await generateWithModel(prompt);
    const cleaned = raw
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();
    const diagnosis = JSON.parse(cleaned);
    return res.json({ ok: true, diagnosis });
  } catch (error) {
    console.error("[diagnose] error:", error?.message);
    return res.status(500).json({ ok: false, error: "Could not generate diagnosis." });
  }
});

function isBeginnerPath(intake) {
  let score = 0;
  const km = intake.weeklyKm || 0;
  const sessions = intake.sessionsPerWeek || 0;
  const hours = intake.hoursPerWeek || 0;
  const hasNoPB =
    !intake.currentBenchmark ||
    intake.currentBenchmark.toLowerCase().includes("no") ||
    intake.currentBenchmark.trim() === "";
  const injury = (intake.injuryHistory || "").toLowerCase();
  const hasLowerLimb = ["calf", "achilles", "hamstring", "knee", "plantar"].some((x) =>
    injury.includes(x),
  );
  if (intake.level === "Beginner") score += 3;
  if (intake.level === "Recreational") score += 2;
  if (hasNoPB) score += 3;
  if (km > 0 && km < 15) score += 2;
  if (km === 0 && intake.sport === "Running") score += 3;
  if (sessions <= 2) score += 2;
  if (hours <= 3) score += 1;
  if (hasLowerLimb && km < 20) score += 2;
  if (intake.sport === "HYROX" && km < 15 && sessions <= 2) score += 3;
  return score >= 4;
}

function buildBeginnerDiagnosisPrompt(intake) {
  const hasLowerLimb = ["calf", "achilles", "hamstring", "knee", "plantar"].some((x) =>
    (intake.injuryHistory || "").toLowerCase().includes(x),
  );

  return `You are a senior performance coach delivering an honest first assessment to an athlete who is not yet ready for structured training.

Your job is NOT to motivate them. It is to tell them the truth about where they are and give them absolute clarity on what the next 6–8 weeks should look like.

ATHLETE:
- Sport: ${intake.sport} / ${intake.eventType}
- Level: ${intake.level}
- Sessions/week: ${intake.sessionsPerWeek}
- Hours/week: ${intake.hoursPerWeek}h
- Weekly volume: ${intake.weeklyKm || "not provided"}km
- Current benchmark: ${intake.currentBenchmark || "none"}
- Goal: ${intake.goalBenchmark || "not specified"}
- Injury history: ${intake.injuryHistory || "none"}

RULES:
- openingStatement: Name the real situation directly. They want structured training. They are not ready for it yet. Say this clearly and without apology — it is the most useful thing you can tell them. Reference their specific situation. 2–3 sentences maximum. Example tone: "The goal you're chasing is real and achievable. But the path to it runs through 6–8 weeks of something simpler first — and skipping that step is exactly why most athletes in your position don't make it to race day."

- limiterExplanation: Explain why consistency is the actual limiter right now — not fitness, not threshold, not aerobic base. Use their specific numbers. If they train 2 sessions per week, name that. If they have no PB, name that. The physiology of why you cannot build structured training on an inconsistent foundation. 2–3 sentences.

- timelineReality: Honest framing of the full journey. 6–8 weeks foundation → then structured training becomes possible → then the goal becomes achievable. Give them the real timeline to their goal from where they actually are, not where they want to be. 2–3 sentences.

- commonMistake: The specific thing athletes in their exact position do that makes everything worse. Almost always: jumping straight into an intermediate programme, doing too much too soon, getting injured in week 3, losing motivation, quitting. Name it precisely. 2–3 sentences.

- forwardStatement: What the next 6–8 weeks actually look like. Simple. Achievable. Specific to their sessions per week and sport. This should feel like relief — clarity after confusion. 2 sentences.

${hasLowerLimb ? `- strengthNote: Their injury history makes a specific strength note essential. Name the injury, explain it is a load tolerance problem, explain that eccentric loading is the intervention, and state that this is in every strength session for a reason. 1–2 sentences.\n` : ""}
Return ONLY valid JSON, no markdown:
{
  "openingStatement": "string",
  "limiterExplanation": "string",
  "timelineReality": "string",
  "commonMistake": "string",
  "forwardStatement": "string"${hasLowerLimb ? ',\n  "strengthNote": "string"' : ""}
}`;
}

function buildDiagnosisPrompt(intake, plan) {
  if (isBeginnerPath(intake)) return buildBeginnerDiagnosisPrompt(intake);
  const limiter = plan.snapshot?.mainLimiter || intake.weakness;
  const classification = plan.gapSummary?.classification || "significant challenge";
  const timeline = plan.gapSummary?.timelineEstimate || "several training blocks";
  const isHyrox = intake.sport === "HYROX" || intake.sport === "Hybrid";
  const isMarathon = intake.eventType === "Marathon" || intake.eventType === "Half Marathon";
  const hasLowerLimb = ["calf", "achilles", "hamstring", "lower back", "knee", "hip", "plantar"]
    .some(x => (intake.injuryHistory || "").toLowerCase().includes(x)) ||
    (intake.injuryAreas || []).some(a =>
      ["Calf / Achilles", "Knee", "Hip / Glute", "Lower back / SI", "Foot / Plantar"].includes(a)
    );

  return `You are a senior performance coach delivering the first honest assessment an athlete has ever received about their training.

ATHLETE:
- Sport: ${intake.sport} / ${intake.eventType}
- Level: ${intake.level}
- Current: ${intake.currentBenchmark || "not provided"} → Goal: ${intake.goalBenchmark || "not provided"}
- Sessions/week: ${intake.sessionsPerWeek}
- Hours/week: ${intake.hoursPerWeek}h
- Weekly volume: ${intake.weeklyKm ? intake.weeklyKm + "km" : "not provided"}
- Primary limiter: ${limiter}
- Injury status: ${intake.injuryStatus || intake.injuryHistory || "None"}
- Training consistency: ${intake.trainingConsistency || "Not specified"}
- Fatigue heading in: ${intake.fatigueLevel || "Not specified"}
- Gap classification: ${classification}
- Timeline estimate: ${timeline}
${isHyrox ? "- HYROX athlete: station tolerance and compromised running are the race-specific demands" : ""}
${isMarathon ? "- Marathon/Half athlete: aerobic volume and fuelling are primary variables" : ""}
${hasLowerLimb ? "- Lower limb injury history: load progression is critical" : ""}

YOUR JOB:
Write ${hasLowerLimb ? "5 statements plus a strengthNote" : "5 statements"} that make this athlete feel genuinely seen — specific to their numbers and situation, honest even if uncomfortable, educational about the why.

RULES:
- openingStatement: The one uncomfortable truth they haven't heard named before. Reference their specific situation. Do NOT start with "You've been training hard" or any generic opener. Name the actual problem immediately. 2–3 sentences.
- limiterExplanation: Why THIS specific limiter (${limiter}) controls everything else right now. Use their numbers where possible. Explain why this limiter creates a ceiling on all other development. 2–3 sentences.
- timelineReality: Honest framing of what going from ${intake.currentBenchmark || "current"} to ${intake.goalBenchmark || "goal"} actually requires. Classification: ${classification}. Do not soften it. Just the truth. 2–3 sentences.
- commonMistake: The single most common error athletes with this exact profile make. Be specific — not "training too hard" but the precise error and why it doesn't work. 2–3 sentences.
- forwardStatement: What is different now they have this diagnosis. Not motivational — practical. 2 sentences.
${hasLowerLimb ? `- strengthNote: ONE sentence. Name the specific injury from their history. State clearly that it is a load tolerance problem — not a flexibility problem. State that the eccentric strength work in every strength session is the direct intervention that raises that tolerance. Be specific to their injury type — do not be generic. Example: "Your Achilles history is a load tolerance problem — the tendon hasn't been built to handle your training volume — and the eccentric calf loading in every strength session is the direct intervention that raises that tolerance."` : ""}

Return ONLY valid JSON, no markdown, no wrapper:
{
  "openingStatement": "string",
  "limiterExplanation": "string",
  "timelineReality": "string",
  "commonMistake": "string",
  "forwardStatement": "string"${hasLowerLimb ? `,
  "strengthNote": "string"` : ""}
}`;
}

export { app };

// Only bind a port when running directly (not inside a Netlify Function)
if (process.env.NETLIFY !== "true") {
  const port = Number(process.env.PORT || 8787);
  app.listen(port, () => {
    console.log(`Performance Planner API running on http://localhost:${port}`);
  });
}
