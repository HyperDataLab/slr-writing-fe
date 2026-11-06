import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  type User,
} from "firebase/auth";
import { getAuthMode, getDevAuthUid, getFirebaseConfig, type AuthMode } from "@/features/auth/auth.config";
import { getFirebaseAuth } from "@/features/auth/firebase-client";
import { setApiTokenProvider, setUnauthorizedHandler } from "@/shared/lib/api-client";

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

/**
 * - `loading`: the session is being restored.
 * - `signedOut`: sign-in is required.
 * - `signedIn`: a user (or, in development mode, the dev-auth shortcut) is active.
 * - `unconfigured`: Firebase sign-in is needed but this build has no Firebase web config.
 */
export type AuthStatus = "loading" | "signedOut" | "signedIn" | "unconfigured";

interface AuthContextValue {
  mode: AuthMode;
  status: AuthStatus;
  user: AuthUser | null;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/** Per-user choices kept in the browser must not carry over to the next person who signs in on this machine. */
const USER_SCOPED_STORAGE_KEYS = ["slrw_selected_project_id", "slrw_selected_snapshot_id"];

function clearUserScopedStorage() {
  for (const key of USER_SCOPED_STORAGE_KEYS) localStorage.removeItem(key);
}

function toAuthUser(user: User): AuthUser {
  return { uid: user.uid, email: user.email, displayName: user.displayName };
}

export function AuthProvider({ children }: PropsWithChildren) {
  const mode = getAuthMode();
  const auth = mode === "firebase" ? getFirebaseAuth() : null;
  const [status, setStatus] = useState<AuthStatus>(() => {
    if (mode === "dev") return "signedIn";
    return getFirebaseConfig() ? "loading" : "unconfigured";
  });
  const [user, setUser] = useState<AuthUser | null>(() =>
    mode === "dev" ? { uid: getDevAuthUid() ?? "dev_user", email: null, displayName: null } : null,
  );

  const lastUid = useRef<string | null>(null);

  useEffect(() => {
    if (!auth) return undefined;
    // `getIdToken()` returns the cached token and refreshes it shortly before it expires.
    const removeTokenProvider = setApiTokenProvider(async () => (auth.currentUser ? auth.currentUser.getIdToken() : null));
    const unsubscribe = onAuthStateChanged(auth, (next) => {
      // However the session ended or changed (sign-out here, the SDK, another tab), nothing of the previous user stays.
      if (lastUid.current !== null && lastUid.current !== (next?.uid ?? null)) clearUserScopedStorage();
      lastUid.current = next?.uid ?? null;
      setUser(next ? toAuthUser(next) : null);
      setStatus(next ? "signedIn" : "signedOut");
    });
    return () => {
      unsubscribe();
      removeTokenProvider();
    };
  }, [auth]);

  const signOut = useCallback(async () => {
    clearUserScopedStorage();
    if (auth) await firebaseSignOut(auth);
  }, [auth]);

  // The backend rejected the token (revoked or the account was disabled): end the session instead of failing every call.
  useEffect(() => {
    if (!auth) return undefined;
    return setUnauthorizedHandler((rejectedToken) => {
      // A late 401 for an earlier session must not sign out whoever is signed in now.
      void (async () => {
        const current = auth.currentUser ? await auth.currentUser.getIdToken().catch(() => null) : null;
        if (current === rejectedToken) await signOut();
      })();
    });
  }, [auth, signOut]);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    if (!auth) throw new Error("Firebase is not configured");
    await signInWithEmailAndPassword(auth, email.trim(), password);
  }, [auth]);

  const signInWithGoogle = useCallback(async () => {
    if (!auth) throw new Error("Firebase is not configured");
    await signInWithPopup(auth, new GoogleAuthProvider());
  }, [auth]);

  const value = useMemo<AuthContextValue>(
    () => ({ mode, status, user, signInWithEmail, signInWithGoogle, signOut }),
    [mode, status, user, signInWithEmail, signInWithGoogle, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
