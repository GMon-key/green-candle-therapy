"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { ClinicExit } from "@/components/ClinicExit";

/**
 * The reluctant two-step into the ending, shown on the recovery screen once the
 * on-chain step is resolved (recorded, skipped, or failed). The clinic gently
 * discourages looking: staying in the treated view is offered as the easy,
 * supported choice; comparing with reality is a deliberate act taken against
 * advice — the RELAPSE reveal (/relapse).
 *
 * Neither branch is a dead end. "Keep the treated view" is a valid ending and
 * carries its own exit; "Compare with reality" proceeds to the reveal, which
 * carries the exit at its terminal.
 */
export function RelapseGate() {
  const router = useRouter();
  const [declined, setDeclined] = useState(false);

  if (declined) {
    return (
      <section className="gct-rise mt-10 rounded-2xl border border-clinic-line bg-clinic-surface p-6 sm:p-8">
        <span className="readout text-xs font-medium uppercase tracking-[0.24em] text-clinic-muted">
          Treated view retained
        </span>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-clinic-fg">
          You have elected to remain in the treated view. The clinic supports
          this decision. Current market conditions will not be shown.
        </p>
        <div className="mt-6">
          <ClinicExit label="Return to clinic" />
        </div>
      </section>
    );
  }

  return (
    <section className="gct-rise mt-10 rounded-2xl border border-clinic-line bg-clinic-surface p-6 sm:p-8">
      <span className="readout text-xs font-medium uppercase tracking-[0.24em] text-clinic-muted">
        Follow-up
      </span>
      <h2 className="mt-3 text-xl font-semibold tracking-tight text-clinic-fg sm:text-2xl">
        Compare with reality?
      </h2>
      <p className="mt-3 max-w-xl text-sm leading-relaxed text-clinic-muted">
        Treatment is complete and your recovery is on record. The clinic advises
        against reviewing untreated market data at this stage of recovery. You
        may compare the treated view with current reality — or keep the view as
        treated.
      </p>

      <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* The clinic's recommendation — the easy, reassuring default. */}
        <button
          type="button"
          onClick={() => setDeclined(true)}
          className="inline-flex min-h-[2.75rem] items-center justify-center rounded-lg bg-clinic-accent px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-clinic-accent-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clinic-fg"
        >
          No — keep the treated view
        </button>
        {/* Proceeding is deliberate: quieter, clearly against advice. */}
        <button
          type="button"
          onClick={() => router.push("/relapse")}
          className="inline-flex min-h-[2.75rem] flex-col items-center justify-center rounded-lg border border-clinic-line bg-transparent px-6 py-2 text-sm font-semibold text-clinic-muted transition-colors hover:border-clinic-accent/60 hover:text-clinic-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clinic-fg"
        >
          <span>Compare with reality</span>
          <span className="readout text-[0.6rem] font-medium uppercase tracking-[0.16em] text-clinic-muted">
            against clinical advice
          </span>
        </button>
      </div>
    </section>
  );
}
