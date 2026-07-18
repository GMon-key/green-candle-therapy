"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Animate a number from 0 up to `target` with an ease-out cubic. Living-interface
 * requirement: numbers count, they never snap. Honours prefers-reduced-motion by
 * settling on the value immediately (deferred one frame so we never setState
 * synchronously inside an effect). Returns 0 while `target` is null (loading).
 *
 * `onComplete` (opt-in) fires ONCE when the count settles on a non-zero target —
 * used by CopeStat to sound the measuring tone as a gauge locks in. Consumers
 * that don't pass it (the on-chain counter, Processing, RecoveryCounter) stay
 * silent by construction.
 */
export function useCountUp(
  target: number | null,
  durationMs = 800,
  onComplete?: () => void,
): number {
  const [value, setValue] = useState(0);
  const raf = useRef<number | null>(null);
  // Kept in a ref so a fresh closure each render never re-triggers the effect.
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (target === null) return;
    const settle = () => {
      if (target > 0) onCompleteRef.current?.();
    };

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || target === 0) {
      const id = requestAnimationFrame(() => {
        setValue(target);
        settle();
      });
      return () => cancelAnimationFrame(id);
    }

    let startTs: number | null = null;
    let settled = false;
    const tick = (ts: number) => {
      if (startTs === null) startTs = ts;
      const p = Math.min((ts - startTs) / durationMs, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(target * eased));
      if (p < 1) {
        raf.current = requestAnimationFrame(tick);
      } else if (!settled) {
        settled = true;
        settle();
      }
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [target, durationMs]);

  return value;
}
