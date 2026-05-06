import { initializeApp, type FirebaseApp, type FirebaseOptions } from "firebase/app";
import { connectAuthEmulator, getAuth, GoogleAuthProvider } from "firebase/auth";
import { getAnalytics, isSupported, type Analytics } from "firebase/analytics";

function buildConfig(): FirebaseOptions {
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  const authDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
  const storageBucket = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET;
  const messagingSenderId = import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID;
  const appId = import.meta.env.VITE_FIREBASE_APP_ID;
  const measurementId = import.meta.env.VITE_FIREBASE_MEASUREMENT_ID;

  if (!apiKey || !authDomain || !projectId || !storageBucket || !messagingSenderId || !appId) {
    throw new Error(
      "Missing Firebase web config. Copy frontend/.env.example → frontend/.env and set VITE_FIREBASE_* variables.",
    );
  }

  const options: FirebaseOptions = {
    apiKey,
    authDomain,
    projectId,
    storageBucket,
    messagingSenderId,
    appId,
  };
  if (measurementId) {
    options.measurementId = measurementId;
  }
  return options;
}

let app: FirebaseApp | null = null;
let analyticsInstance: Analytics | null = null;
let authEmulatorWired = false;

export function getFirebaseApp(): FirebaseApp {
  if (!app) {
    app = initializeApp(buildConfig());
  }
  return app;
}

export function getFirebaseAuth() {
  const auth = getAuth(getFirebaseApp());
  const emu = import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_HOST;
  if (import.meta.env.DEV && emu && !authEmulatorWired) {
    connectAuthEmulator(auth, `http://${emu}`, { disableWarnings: true });
    authEmulatorWired = true;
  }
  return auth;
}

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

/** Call once after app shell loads; no-ops if Analytics unsupported or no measurementId. */
export async function initFirebaseAnalytics(): Promise<void> {
  if (analyticsInstance) return;
  if (!import.meta.env.VITE_FIREBASE_MEASUREMENT_ID) return;
  try {
    const ok = await isSupported();
    if (!ok) return;
    analyticsInstance = getAnalytics(getFirebaseApp());
  } catch {
    /* ignore */
  }
}
