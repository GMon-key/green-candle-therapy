"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Animate a number from 0 up to `target` with an ease-out cubic. Living-interface
 * requirement: numbers count, they never snap. Honours prefers-reduced-motion by
 * settling on the value immediately (deferred one frame so we never setState
 * synchronously inside an effect). Returns 0 while `target` is null (loading).
 */
export function useCountUp(target: number | null, durationMs = 800): number {
  const [value, setValue] = useState(0);
  const raf = useRef<number | null>(null);

  useEffect(() => {
    if (target === null) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || target === 0) {
      const id = requestAnimationFrame(() => setValue(target));
      return () => cancelAnimationFrame(id);
    }

    let startTs: number | null = null;
    const tick = (ts: number) => {
      if (startTs === null) startTs = ts;
      const p = Math.min((ts - startTs) / durationMs, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setValue(Math.round(target * eased));
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [target, durationMs]);

  return value;
}
