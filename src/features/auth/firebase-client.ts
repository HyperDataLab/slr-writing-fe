import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { connectAuthEmulator, getAuth, type Auth } from "firebase/auth";
import { getFirebaseConfig } from "@/features/auth/auth.config";

let cachedAuth: Auth | null = null;

/** The Firebase Auth instance, created on first use. Returns null when the web config is missing. */
export function getFirebaseAuth(): Auth | null {
  if (cachedAuth) return cachedAuth;
  const config = getFirebaseConfig();
  if (!config) return null;

  const app: FirebaseApp = getApps().length > 0
    ? getApp()
    : initializeApp({
        apiKey: config.apiKey,
        authDomain: config.authDomain,
        projectId: config.projectId,
        appId: config.appId,
      });
  const auth = getAuth(app);
  if (config.authEmulatorUrl) connectAuthEmulator(auth, config.authEmulatorUrl, { disableWarnings: true });
  cachedAuth = auth;
  return auth;
}
