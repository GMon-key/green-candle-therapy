"use client";

import { playMeasure } from "@/lib/clinicAudio";
import { WELLBEING_UNIT } from "@/lib/config";
import { useCountUp } from "@/lib/useCountUp";

/**
 * A single clinical measurement on a fixed 0–100 scale, with a horizontal gauge
 * that fills IN SYNC with the count-up: the number rises and the bar fills
 * together, both driven by the same `useCountUp` value. Because the fill width
 * is the live counted value (no CSS transition), reduced-motion users — for whom
 * useCountUp settles instantly — get the completed bar at once.
 *
 * Reusable across beat 3's intake metrics and any later readouts. Values are
 * expected in [0, 100]; anything larger is clamped so the gauge stays truthful.
 *
 * CU REVEAL IS DEFERRED TO BEAT 7. Beats 2–5 render bare numbers on the 0–100
 * scale — no "CU" suffix, no unit name — because the Cope Unit and its
 * definition are introduced at the certificate (beat 7). `showUnit` defaults to
 * off for that reason; beat 7 reuses this same component with `showUnit` on.
 */
export const CU_SCALE_MAX = 100;

export function CopeStat({
  label,
  value,
  delayMs = 0,
  showUnit = false,
}: {
  label: string;
  /** 0–100 clinical reading */
  value: number;
  delayMs?: number;
  /** Show the "/ 100 CU" unit. Deferred to beat 7 — off through beats 2–5. */
  showUnit?: boolean;
}) {
  const target = Math.max(0, Math.min(value, CU_SCALE_MAX));
  // A warm confirmation tone as the gauge locks in — the "measuring" moment.
  const shown = useCountUp(target, 800, playMeasure);
  const fillPct = (shown / CU_SCALE_MAX) * 100;

  return (
    <div
      className="gct-rise rounded-xl border border-clinic-line bg-clinic-surface px-5 py-4"
      style={{ animationDelay: `${delayMs}ms` }}
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="readout text-[0.7rem] uppercase tracking-[0.18em] text-clinic-muted">
          {label}
        </span>
        <span className="readout flex items-baseline gap-1 tabular-nums">
          <span className="text-xl font-semibold text-clinic-fg">{shown}</span>
          {showUnit && (
            <span className="text-[0.7rem] uppercase tracking-[0.14em] text-clinic-muted">
              / {CU_SCALE_MAX} {WELLBEING_UNIT}
            </span>
          )}
        </span>
      </div>

      {/* Gauge — fills to the live counted value, no CSS transition so it
          tracks the number exactly and settles instantly under reduced-motion. */}
      <div
        className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-clinic-line"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={CU_SCALE_MAX}
        aria-valuenow={target}
        aria-label={
          showUnit
            ? `${label}: ${target} of ${CU_SCALE_MAX} ${WELLBEING_UNIT}`
            : `${label}: ${target} of ${CU_SCALE_MAX}`
        }
      >
        <div
          className="h-full rounded-full bg-clinic-accent"
          style={{ width: `${fillPct}%` }}
        />
      </div>
    </div>
  );
}
