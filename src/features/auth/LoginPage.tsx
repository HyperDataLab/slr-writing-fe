import { useState, type FormEvent } from "react";
import { Navigate, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/features/auth/auth-context";
import { isGoogleSignInEnabled } from "@/features/auth/auth.config";
import { LanguageSwitcher } from "@/shared/ui/LanguageSwitcher";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";

/**
 * Only same-site paths are followed after sign-in, so a crafted `?next=` cannot send the user elsewhere. Browsers drop
 * tabs and line breaks and read a backslash as a slash, so `/%09/evil.com` would turn into `//evil.com`: reject control
 * characters and backslashes, then confirm by parsing that the result stays on this origin.
 */
function safeNextPath(value: string | null): string {
  // eslint-disable-next-line no-control-regex
  if (!value || !value.startsWith("/") || /[\u0000-\u001f\u007f\\]/.test(value)) return "/";
  try {
    const parsed = new URL(value, window.location.origin);
    if (parsed.origin !== window.location.origin) return "/";
    return parsed.pathname + parsed.search + parsed.hash;
  } catch {
    return "/";
  }
}

function errorKey(error: unknown): string {
  const code = typeof error === "object" && error !== null && "code" in error ? String((error as { code: unknown }).code) : "";
  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
    case "auth/invalid-email":
      return "auth.errors.invalidCredential";
    case "auth/user-disabled":
      return "auth.errors.userDisabled";
    case "auth/too-many-requests":
      return "auth.errors.tooManyRequests";
    case "auth/network-request-failed":
      return "auth.errors.network";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "auth.errors.popupClosed";
    case "auth/popup-blocked":
      return "auth.errors.popupBlocked";
    default:
      return "auth.errors.generic";
  }
}

export function LoginPage() {
  const { t } = useTranslation();
  const { status, signInWithEmail, signInWithGoogle } = useAuth();
  const [searchParams] = useSearchParams();
  const next = safeNextPath(searchParams.get("next"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status === "signedIn") return <Navigate to={next} replace />;

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (err: unknown) {
      setError(t(errorKey(err)));
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void run(() => signInWithEmail(email, password));
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="absolute right-4 top-4">
        <LanguageSwitcher />
      </div>
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-3">
          <img src="/SLRW_logo_vector.svg" alt="SLRW" className="h-auto w-32" />
          <div>
            <CardTitle>{t("auth.title")}</CardTitle>
            <CardDescription className="mt-1">{t("auth.subtitle")}</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === "unconfigured" ? (
            <p role="alert" className="text-sm text-destructive">{t("auth.unconfiguredBody")}</p>
          ) : (
            <>
              <form className="space-y-3" onSubmit={handleSubmit} noValidate>
                <div className="space-y-1.5">
                  <label htmlFor="login-email" className="text-sm font-medium">{t("auth.email")}</label>
                  <input
                    id="login-email"
                    type="email"
                    autoComplete="username"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-foreground/40"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="login-password" className="text-sm font-medium">{t("auth.password")}</label>
                  <input
                    id="login-password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus-visible:border-foreground/40"
                  />
                </div>
                {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
                <Button type="submit" className="w-full" disabled={busy || !email.trim() || !password}>
                  {busy ? t("auth.signingIn") : t("auth.signIn")}
                </Button>
              </form>

              {isGoogleSignInEnabled() && (
                <>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="h-px flex-1 bg-border" />
                    {t("auth.or")}
                    <span className="h-px flex-1 bg-border" />
                  </div>
                  <Button type="button" variant="outline" className="w-full" disabled={busy} onClick={() => void run(signInWithGoogle)}>
                    {t("auth.google")}
                  </Button>
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
