import { lazy, Suspense, useState } from "react";
import { DevLoginScreen } from "@/features/auth/DevLoginScreen";
import { clearSession, readSession } from "@/features/auth/auth.api";
import type { ApiSession } from "@/shared/api/client";

const Workspace = lazy(() => import("@/features/workspace/Workspace").then((module) => ({ default: module.Workspace })));

export default function App() {
  const [session, setSession] = useState<ApiSession | null>(() => import.meta.env.DEV ? readSession() : null);

  if (!session) return <DevLoginScreen onLogin={setSession} />;

  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-[#f5f5f4] text-sm text-neutral-500">Opening workspace…</div>}>
      <Workspace session={session} onSignOut={() => { clearSession(); setSession(null); }} />
    </Suspense>
  );
}
