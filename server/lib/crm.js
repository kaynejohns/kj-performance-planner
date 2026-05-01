import { getDb } from "./firebase.js";

export async function syncLeadToCRM(leadData) {
  try {
    await getDb().collection("leads").add({
      firstName:           leadData.firstName  || null,
      email:               leadData.email      || null,
      sport:               leadData.sport      || null,
      eventType:           leadData.eventType  || null,
      level:               leadData.level      || null,
      source:              leadData.source     || null,
      consentToMarketing:  leadData.consentToMarketing ?? null,
      createdAt:           new Date().toISOString(),
    });
  } catch (err) {
    // Non-fatal — log but don't break the response
    console.error("[crm] Firestore lead write failed:", err.message);
  }
  return { ok: true };
}
