let _db = null;
let _initFailed = false;

export async function getDb() {
  if (_db) return _db;
  if (_initFailed) return null;
  try {
    const { initializeApp, getApps, cert } = await import("firebase-admin/app");
    const { getFirestore } = await import("firebase-admin/firestore");
    if (!getApps().length) {
      initializeApp({
        credential: cert({
          projectId:   process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey:  (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
        }),
      });
    }
    _db = getFirestore();
    return _db;
  } catch (err) {
    console.error("[firebase] init failed — storage disabled:", err?.message);
    _initFailed = true;
    return null;
  }
}
