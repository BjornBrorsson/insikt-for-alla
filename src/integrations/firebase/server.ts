// Server-only: Firebase Admin SDK (Firestore + Auth-verifiering).
// På Cloud Run används tjänstens servicekonto (ADC) automatiskt.
// Lokalt: kör `gcloud auth application-default login` eller sätt
// GOOGLE_APPLICATION_CREDENTIALS till en servicekonto-nyckel.
// Importera alltid dynamiskt inuti handlers så att modulen inte hamnar i klientbundeln.
import { getApps, initializeApp, applicationDefault } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

const PROJEKT = process.env["FIREBASE_PROJECT_ID"] || "insikt-riksdag";

function app() {
  return (
    getApps()[0] ??
    initializeApp({
      credential: applicationDefault(),
      projectId: PROJEKT,
    })
  );
}

export function db() {
  return getFirestore(app());
}

export function adminAuth() {
  return getAuth(app());
}
