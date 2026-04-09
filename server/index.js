import "dotenv/config";
import cors from "cors";
import express from "express";
import { generatePerformancePlan } from "./lib/coachPlanGenerationService.js";
import { syncLeadToCRM } from "./lib/crm.js";
import { refineDetailedPlan } from "./lib/detailedPlanService.js";
import { createLeadSubmission, getSubmissionById, saveGeneratedPlan } from "./lib/storage.js";
import { intakeSchema, leadSchema } from "./lib/validation.js";

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
  const payload = req.body || {};
  const leadResult = leadSchema.safeParse(payload.lead);
  const intakeResult = intakeSchema.safeParse(payload.intake);
  if (!leadResult.success || !intakeResult.success) {
    return res.status(400).json({
      ok: false,
      error: "Please complete required fields with valid values.",
      details: {
        lead: leadResult.success ? [] : leadResult.error.issues.map((i) => i.message),
        intake: intakeResult.success ? [] : intakeResult.error.issues.map((i) => i.message),
      },
    });
  }
  try {
    const submission = await createLeadSubmission({ ...leadResult.data, ...intakeResult.data, source: payload.sourceTag });
    await syncLeadToCRM({ ...leadResult.data, source: payload.sourceTag });
    const plan = await generatePerformancePlan({ ...leadResult.data, ...intakeResult.data });
    await saveGeneratedPlan(submission.id, plan);
    return res.json({ ok: true, submissionId: submission.id, plan });
  } catch (error) {
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
    return res.json({ ok: true, plan });
  } catch {
    return res.status(500).json({ ok: false, error: "Could not complete the detailed plan build." });
  }
});

const port = Number(process.env.PORT || 8787);
app.listen(port, () => {
  console.log(`Performance Planner API running on http://localhost:${port}`);
});
