export type AuthMode = "firebase" | "dev";

export interface FirebaseWebConfig {
  apiKey: string;
  authDomain?: string;
  projectId: string;
  appId?: string;
  /** Local Firebase Auth emulator, for development only (for example http://localhost:9099). */
  authEmulatorUrl?: string;
}

// `import.meta.env.X` is written out in full on purpose: Vite replaces those expressions at build time, which also removes
// the development-only values (emulator URL, dev uid) from production bundles. Copying `import.meta.env` into a variable
// would inline the whole object instead.

/** Reads the Firebase web config from the Vite env. Returns null when the minimum (API key and project id) is missing. */
export function getFirebaseConfig(): FirebaseWebConfig | null {
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY?.trim();
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID?.trim();
  if (!apiKey || !projectId) return null;
  return {
    apiKey,
    projectId,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN?.trim() || undefined,
    appId: import.meta.env.VITE_FIREBASE_APP_ID?.trim() || undefined,
    // The emulator accepts anyone, so it is never honoured in a production build.
    authEmulatorUrl: import.meta.env.DEV ? import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_URL?.trim() || undefined : undefined,
  };
}

/** The dev-auth user id of the no-login shortcut. Development only; null in a production build. */
export function getDevAuthUid(): string | null {
  return import.meta.env.DEV ? import.meta.env.VITE_DEV_AUTH_UID?.trim() || "dev_user" : null;
}

/**
 * Production builds always sign in with Firebase. In development, `VITE_AUTH_MODE=dev` (or no Firebase config at all)
 * keeps the old shortcut: no sign-in screen, and the writing backend's dev auth identifies `VITE_DEV_AUTH_UID`.
 * That shortcut only works against a backend started with DEV_AUTH_ENABLED=true.
 */
export function getAuthMode(): AuthMode {
  if (!import.meta.env.DEV) return "firebase";
  if (import.meta.env.VITE_AUTH_MODE === "firebase") return "firebase";
  if (import.meta.env.VITE_AUTH_MODE === "dev") return "dev";
  return getFirebaseConfig() ? "firebase" : "dev";
}

export function isGoogleSignInEnabled(): boolean {
  return import.meta.env.VITE_FIREBASE_GOOGLE_SIGN_IN !== "false";
}
