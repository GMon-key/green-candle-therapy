"use client";

import { WELLBEING_UNIT } from "@/lib/config";
import { useCountUp } from "@/lib/useCountUp";

/**
 * A single clinical measurement, denominated in CU (Cope Units). The value
 * counts up from zero — a measured reading, not a coin. Never a $-ticker.
 */
export function CopeStat({
  label,
  value,
  delayMs = 0,
}: {
  label: string;
  value: number;
  delayMs?: number;
}) {
  const shown = useCountUp(value);
  return (
    <div
      className="gct-rise rounded-xl border border-clinic-line bg-clinic-surface px-5 py-4"
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <div className="readout text-[0.7rem] uppercase tracking-[0.18em] text-clinic-muted">
        {label}
      </div>
      <div className="readout mt-1 flex items-baseline gap-1.5">
        <span className="text-2xl font-semibold tabular-nums text-clinic-fg">
          {shown}
        </span>
        <span className="text-xs uppercase tracking-[0.2em] text-clinic-accent">
          {WELLBEING_UNIT}
        </span>
      </div>
    </div>
  );
}
