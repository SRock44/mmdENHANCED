import admin from "firebase-admin";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

let initialized = false;

export function initFirebaseAdmin(): void {
  if (initialized) return;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId) {
    throw new Error("FIREBASE_PROJECT_ID is required");
  }

  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKeyRaw = process.env.FIREBASE_PRIVATE_KEY;
  if (clientEmail && privateKeyRaw) {
    const privateKey = privateKeyRaw.replace(/\\n/g, "\n");
    admin.initializeApp({
      credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
    });
  } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    admin.initializeApp({
      credential: admin.credential.applicationDefault(),
      projectId,
    });
  } else {
    throw new Error(
      "Firebase Admin credentials missing: set FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY, or GOOGLE_APPLICATION_CREDENTIALS to a service-account JSON path",
    );
  }

  initialized = true;
}

export function db(): Firestore {
  initFirebaseAdmin();
  return getFirestore();
}

export function authAdmin(): admin.auth.Auth {
  initFirebaseAdmin();
  return admin.auth();
}
