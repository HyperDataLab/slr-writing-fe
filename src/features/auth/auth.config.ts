export type AuthMode = "firebase" | "dev";

export interface FirebaseWebConfig {
  apiKey: string;
  authDomain?: string;
  projectId: string;
  appId?: string;
  /** Local Firebase Auth emulator, for development only (for example http://localhost:9099). */
  authEmulatorUrl?: string;
}

/** Reads the Firebase web config from the Vite env. Returns null when the minimum (API key and project id) is missing. */
export function getFirebaseConfig(): FirebaseWebConfig | null {
  const env = import.meta.env;
  const apiKey = env.VITE_FIREBASE_API_KEY?.trim();
  const projectId = env.VITE_FIREBASE_PROJECT_ID?.trim();
  if (!apiKey || !projectId) return null;
  return {
    apiKey,
    projectId,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN?.trim() || undefined,
    appId: env.VITE_FIREBASE_APP_ID?.trim() || undefined,
    // The emulator accepts anyone, so it is never honoured in a production build.
    authEmulatorUrl: env.DEV ? env.VITE_FIREBASE_AUTH_EMULATOR_URL?.trim() || undefined : undefined,
  };
}

/**
 * Production builds always sign in with Firebase. In development, `VITE_AUTH_MODE=dev` (or no Firebase config at all)
 * keeps the old shortcut: no sign-in screen, and the writing backend's dev auth identifies `VITE_DEV_AUTH_UID`.
 * That shortcut only works against a backend started with DEV_AUTH_ENABLED=true.
 */
export function getAuthMode(): AuthMode {
  const env = import.meta.env;
  if (!env.DEV) return "firebase";
  if (env.VITE_AUTH_MODE === "firebase") return "firebase";
  if (env.VITE_AUTH_MODE === "dev") return "dev";
  return getFirebaseConfig() ? "firebase" : "dev";
}

export function isGoogleSignInEnabled(): boolean {
  return import.meta.env.VITE_FIREBASE_GOOGLE_SIGN_IN !== "false";
}
