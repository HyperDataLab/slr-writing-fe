import { useState } from "react";
import { ArrowRightIcon, BeakerIcon, CheckIcon, UserCircleIcon } from "@heroicons/react/24/outline";
import { motion } from "motion/react";
import { quickLogin, developmentRoles, saveSession } from "@/features/auth/auth.api";
import { errorMessage } from "@/shared/api/client";
import type { ApiSession } from "@/shared/api/client";
import { Button } from "@/shared/ui/button";

interface DevLoginScreenProps {
  onLogin: (session: ApiSession) => void;
}

export function DevLoginScreen({ onLogin }: DevLoginScreenProps) {
  const [role, setRole] = useState<string>("reviewer");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setBusy(true);
    setError("");
    try {
      const session = await quickLogin(role);
      saveSession(session);
      onLogin(session);
    } catch (reason) {
      setError(errorMessage(reason));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f4f4f1] px-4 py-10 text-neutral-900">
      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        className="w-full max-w-lg rounded-xl border border-neutral-200 bg-white p-7 shadow-sm sm:p-9"
      >
        <div className="flex size-11 items-center justify-center rounded-lg bg-neutral-100">
          <BeakerIcon className="size-5" aria-hidden="true" />
        </div>
        <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500">SLRW · Local development</p>
        <h1 className="mt-2 font-serif text-3xl tracking-tight">Choose a development role</h1>
        <p className="mt-2 text-sm leading-6 text-neutral-500">
          Sign in through the SLR development endpoint. The selected identity is used for Writing API ownership and SLR permissions.
        </p>

        {import.meta.env.DEV ? (
          <div className="mt-7 space-y-2" role="radiogroup" aria-label="Development role">
            {developmentRoles.map((item) => {
              const selected = role === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setRole(item.key)}
                  className={`flex w-full items-center gap-3 rounded-lg border p-3.5 text-left transition-colors ${selected ? "border-neutral-900 bg-neutral-50" : "border-neutral-200 hover:bg-neutral-50"}`}
                >
                  <UserCircleIcon className="size-5 shrink-0 text-neutral-500" aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{item.label}</span>
                    <span className="mt-0.5 block text-xs leading-5 text-neutral-500">{item.description}</span>
                  </span>
                  {selected && <CheckIcon className="size-4 shrink-0" aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="mt-7 rounded-lg border border-neutral-200 bg-neutral-50 p-4 text-sm leading-6 text-neutral-600">
            The development role selector is available only in the local Vite development build.
          </div>
        )}

        {error && <p role="alert" className="mt-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}

        <Button
          type="button"
          variant="primary"
          className="mt-5 w-full"
          disabled={busy || !import.meta.env.DEV}
          onClick={() => void submit()}
        >
          {busy ? "Signing in…" : "Continue to workspace"}
          {!busy && <ArrowRightIcon className="size-4" aria-hidden="true" />}
        </Button>
        <p className="mt-4 text-center text-[11px] leading-5 text-neutral-400">
          Uses the local SLR quick-login endpoint. Do not expose this development flow in production.
        </p>
      </motion.section>
    </main>
  );
}
