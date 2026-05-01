import { getDb } from "./firebase.js";

async function col() {
  const db = await getDb();
  return db ? db.collection("submissions") : null;
}

export async function createLeadSubmission(data) {
  const c = await col();
  const id = crypto.randomUUID();
  const record = { id, createdAt: new Date().toISOString(), ...data, generatedPlan: null, status: "pending" };
  if (c) await c.doc(id).set(record);
  return record;
}

export async function saveGeneratedPlan(submissionId, plan) {
  const c = await col();
  if (!c) return null;
  const ref = c.doc(submissionId);
  const snap = await ref.get();
  if (!snap.exists) return null;
  const updated = { ...snap.data(), generatedPlan: plan, status: "generated" };
  await ref.set(updated);
  return updated;
}

export async function getSubmissionById(id) {
  const c = await col();
  if (!c) return null;
  const snap = await c.doc(id).get();
  return snap.exists ? snap.data() : null;
}

export async function storePendingPlan(planId, intake, plan, source) {
  const c = await col();
  const record = {
    id: planId,
    createdAt: new Date().toISOString(),
    source: source || null,
    intake,
    lead: null,
    generatedPlan: plan,
    status: "generated_pending_lead",
  };
  if (c) await c.doc(planId).set(record);
  return record;
}

export async function attachLeadToPlan(planId, lead, source) {
  const c = await col();
  if (!c) return { id: planId, lead, generatedPlan: null };
  const ref = c.doc(planId);
  const snap = await ref.get();
  if (!snap.exists) return null;
  const updated = { ...snap.data(), source: source || snap.data().source || null, lead, status: "generated" };
  await ref.set(updated);
  return updated;
}
