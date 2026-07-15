import Link from "next/link";
import type { ReactNode } from "react";

import { ATTRIBUTION } from "@/lib/config";

/**
 * Shared chrome for the treatment-flow beats (2–5). Sets the per-beat theme via
 * `data-theme`, so every clinic-* token below re-moods and the animated
 * `[data-theme]` transition bleeds the new palette across the UI as the patient
 * moves through the clinic. The header/footer copy is deliberately
 * mechanism-free — nothing here names what the treatment actually does.
 */
export function BeatShell({
  theme,
  phase,
  children,
}: {
  theme: "assessment" | "denial" | "diagnosis" | "recovery";
  /** Small phase label shown in the header (e.g. "Assessment"). */
  phase: string;
  children: ReactNode;
}) {
  return (
    <div
      data-theme={theme}
      className="gct-settle flex min-h-dvh flex-col bg-clinic-bg text-clinic-fg"
    >
      <header className="sticky top-0 z-10 border-b border-clinic-line bg-clinic-bg/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-4">
          <Link
            href="/"
            className="readout text-sm font-semibold uppercase tracking-[0.2em]"
          >
            Green Candle Therapy
          </Link>
          <span className="readout flex items-center gap-2 text-[0.7rem] uppercase tracking-[0.18em] text-clinic-muted">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-clinic-accent opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-clinic-accent" />
            </span>
            {phase}
          </span>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 py-10 sm:py-14">
        {children}
      </main>

      <footer className="border-t border-clinic-line">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-2 px-6 py-6 text-xs text-clinic-muted sm:flex-row sm:items-center sm:justify-between">
          <span className="readout uppercase tracking-[0.18em]">
            {ATTRIBUTION.disclaimer}
          </span>
          <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span>{ATTRIBUTION.data}</span>
            <span aria-hidden className="hidden sm:inline">
              ·
            </span>
            <span>{ATTRIBUTION.operator}</span>
          </span>
        </div>
      </footer>
    </div>
  );
}
