import { getDb } from "./firebase.js";

function isFirebaseReady() {
  return !!(process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY);
}

export async function syncLeadToCRM(leadData) {
  if (!isFirebaseReady()) return { ok: true };
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
