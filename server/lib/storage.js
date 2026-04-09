// In-memory adapter; replace with DB client (Supabase/Postgres/Firebase/Airtable) as needed.
const db = new Map();

export async function createLeadSubmission(data) {
  const id = crypto.randomUUID();
  const record = {
    id,
    createdAt: new Date().toISOString(),
    ...data,
    generatedPlan: null,
    status: "pending",
  };
  db.set(id, record);
  return record;
}

export async function saveGeneratedPlan(submissionId, plan) {
  const record = db.get(submissionId);
  if (!record) return null;
  const updated = { ...record, generatedPlan: plan, status: "generated" };
  db.set(submissionId, updated);
  return updated;
}

export async function getSubmissionById(id) {
  return db.get(id) || null;
}
