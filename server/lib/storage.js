import { getDb } from "./firebase.js";

const submissions = () => getDb().collection("submissions");

export async function createLeadSubmission(data) {
  const id = crypto.randomUUID();
  const record = {
    id,
    createdAt: new Date().toISOString(),
    ...data,
    generatedPlan: null,
    status: "pending",
  };
  await submissions().doc(id).set(record);
  return record;
}

export async function saveGeneratedPlan(submissionId, plan) {
  const ref = submissions().doc(submissionId);
  const snap = await ref.get();
  if (!snap.exists) return null;
  const updated = { ...snap.data(), generatedPlan: plan, status: "generated" };
  await ref.set(updated);
  return updated;
}

export async function getSubmissionById(id) {
  const snap = await submissions().doc(id).get();
  return snap.exists ? snap.data() : null;
}

export async function storePendingPlan(planId, intake, plan, source) {
  const record = {
    id: planId,
    createdAt: new Date().toISOString(),
    source: source || null,
    intake,
    lead: null,
    generatedPlan: plan,
    status: "generated_pending_lead",
  };
  await submissions().doc(planId).set(record);
  return record;
}

export async function attachLeadToPlan(planId, lead, source) {
  const ref = submissions().doc(planId);
  const snap = await ref.get();
  if (!snap.exists) return null;
  const updated = {
    ...snap.data(),
    source: source || snap.data().source || null,
    lead,
    status: "generated",
  };
  await ref.set(updated);
  return updated;
}
