"use client";

import { useEffect, useState } from "react";

/**
 * A visible "the clinic is working" sequence: each step resolves in turn from a
 * pulsing marker to a landed checkmark. This is both the wait indicator and the
 * joke. Under prefers-reduced-motion every step is shown resolved at once and
 * `onDone` fires immediately — no fake delay.
 */
export function Processing({
  steps,
  stepMs = 480,
  onDone,
  className,
}: {
  steps: string[];
  /** ms between each step landing */
  stepMs?: number;
  onDone?: () => void;
  className?: string;
}) {
  const [done, setDone] = useState(0);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let timer = 0;
    // Defer state writes past the effect body (no synchronous setState in an
    // effect) — same pattern as useCountUp.
    const raf = requestAnimationFrame(() => {
      if (reduce) {
        setDone(steps.length);
        onDone?.();
        return;
      }
      setDone(0);
      let n = 0;
      const advance = () => {
        n += 1;
        setDone(n);
        if (n < steps.length) {
          timer = window.setTimeout(advance, stepMs);
        } else {
          onDone?.();
        }
      };
      timer = window.setTimeout(advance, stepMs);
    });
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(timer);
    };
    // onDone intentionally excluded to avoid re-running the sequence.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steps, stepMs]);

  return (
    <ul className={className}>
      {steps.map((step, i) => {
        const complete = i < done;
        return (
          <li
            key={step}
            className={`readout flex items-center gap-2 text-sm transition-colors duration-300 ${
              complete ? "text-clinic-fg" : "text-clinic-muted"
            }`}
          >
            <span
              aria-hidden="true"
              className={`grid h-4 w-4 shrink-0 place-items-center rounded-full text-[0.6rem] ${
                complete
                  ? "bg-clinic-accent/15 text-clinic-accent"
                  : "bg-clinic-line"
              }`}
            >
              {complete ? (
                "✓"
              ) : (
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-clinic-muted" />
              )}
            </span>
            <span>
              {step}
              {complete ? "" : "…"}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
