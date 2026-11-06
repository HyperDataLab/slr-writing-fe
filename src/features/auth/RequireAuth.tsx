import { Navigate, Outlet, useLocation } from "react-router";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/features/auth/auth-context";
import { RouteLoading } from "@/shared/ui/RouteLoading";

/** Keeps every workflow route behind a signed-in session. The backend still checks the token on every call. */
export function RequireAuth() {
  const { status } = useAuth();
  const location = useLocation();
  const { t } = useTranslation();

  if (status === "loading") return <RouteLoading />;

  if (status === "unconfigured") {
    return (
      <div role="alert" className="mx-auto mt-24 max-w-md rounded-xl border border-destructive/30 bg-destructive/5 p-6 text-sm">
        <h1 className="text-base font-semibold text-destructive">{t("auth.unconfiguredTitle")}</h1>
        <p className="mt-2 text-muted-foreground">{t("auth.unconfiguredBody")}</p>
      </div>
    );
  }

  if (status === "signedOut") {
    const next = location.pathname + location.search;
    return <Navigate to={next === "/" ? "/login" : `/login?next=${encodeURIComponent(next)}`} replace />;
  }

  return <Outlet />;
}
