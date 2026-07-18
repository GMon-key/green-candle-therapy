"use client";

import { useRouter } from "next/navigation";

import { resetFlow } from "@/lib/flow";

/**
 * The one exit from the clinic. Every terminal state in the ending owns one of
 * these — the RELAPSE close AND the "keep the treated view" branch — so there is
 * never a dead end. Leaving RESETS the session (clears the flow / Jungle-Passport
 * state in sessionStorage) so the next visit starts a fresh assessment clean.
 *
 * Deadpan and restrained by default; a full-width, comfortably tappable target on
 * mobile. `tone="ghost"` is the quiet variant used where the surrounding copy is
 * the point and the exit should not compete.
 */
export function ClinicExit({
  label = "Return to clinic",
  tone = "solid",
  className = "",
}: {
  label?: string;
  tone?: "solid" | "ghost";
  className?: string;
}) {
  const router = useRouter();

  function leave() {
    resetFlow();
    router.push("/");
  }

  const base =
    "inline-flex min-h-[2.75rem] items-center justify-center rounded-lg px-6 py-3 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clinic-fg";
  const skin =
    tone === "ghost"
      ? "border border-clinic-line bg-transparent text-clinic-muted hover:border-clinic-accent/60 hover:text-clinic-fg"
      : "bg-clinic-accent text-white hover:bg-clinic-accent-strong";

  return (
    <button type="button" onClick={leave} className={`${base} ${skin} ${className}`}>
      {label}
    </button>
  );
}
