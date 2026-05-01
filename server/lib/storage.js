import { getDb } from "./firebase.js";

function isFirebaseReady() {
  return !!(process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY);
}

const submissions = async () => (await getDb()).collection("submissions");

export async function createLeadSubmission(data) {
  if (!isFirebaseReady()) return { id: crypto.randomUUID(), ...data };
  const id = crypto.randomUUID();
  const record = { id, createdAt: new Date().toISOString(), ...data, generatedPlan: null, status: "pending" };
  await (await submissions()).doc(id).set(record);
  return record;
}

export async function saveGeneratedPlan(submissionId, plan) {
  if (!isFirebaseReady()) return null;
  const ref = (await submissions()).doc(submissionId);
  const snap = await ref.get();
  if (!snap.exists) return null;
  const updated = { ...snap.data(), generatedPlan: plan, status: "generated" };
  await ref.set(updated);
  return updated;
}

export async function getSubmissionById(id) {
  if (!isFirebaseReady()) return null;
  const snap = await (await submissions()).doc(id).get();
  return snap.exists ? snap.data() : null;
}

export async function storePendingPlan(planId, intake, plan, source) {
  if (!isFirebaseReady()) return { id: planId, intake, generatedPlan: plan };
  const record = {
    id: planId,
    createdAt: new Date().toISOString(),
    source: source || null,
    intake,
    lead: null,
    generatedPlan: plan,
    status: "generated_pending_lead",
  };
  await (await submissions()).doc(planId).set(record);
  return record;
}

export async function attachLeadToPlan(planId, lead, source) {
  if (!isFirebaseReady()) return { id: planId, lead, generatedPlan: null };
  const ref = (await submissions()).doc(planId);
  const snap = await ref.get();
  if (!snap.exists) return null;
  const updated = { ...snap.data(), source: source || snap.data().source || null, lead, status: "generated" };
  await ref.set(updated);
  return updated;
}
