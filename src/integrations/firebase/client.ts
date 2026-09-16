import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Klientkonfiguration för Firebase Auth (admininloggning).
// Värdena är publika och avsedd att bäddas in i klienten.
function firebaseConfig() {
  const env = (namn: string) =>
    (import.meta.env[`VITE_${namn}`] ||
      (typeof process !== "undefined" ? process.env[namn] : undefined)) as string | undefined;
  return {
    apiKey: env("FIREBASE_API_KEY"),
    authDomain: env("FIREBASE_AUTH_DOMAIN"),
    projectId: env("FIREBASE_PROJECT_ID"),
    appId: env("FIREBASE_APP_ID"),
  };
}

export function firebaseApp() {
  const cfg = firebaseConfig();
  if (!cfg.apiKey || !cfg.projectId) {
    throw new Error(
      "Saknar Firebase-konfiguration (VITE_FIREBASE_API_KEY, VITE_FIREBASE_PROJECT_ID m.fl.). Se .env.example.",
    );
  }
  const options = {
    apiKey: cfg.apiKey,
    projectId: cfg.projectId,
    ...(cfg.authDomain ? { authDomain: cfg.authDomain } : {}),
    ...(cfg.appId ? { appId: cfg.appId } : {}),
  };
  return getApps().length ? getApp() : initializeApp(options);
}

let _auth: ReturnType<typeof getAuth> | undefined;

export function firebaseAuth() {
  if (!_auth) _auth = getAuth(firebaseApp());
  return _auth;
}
