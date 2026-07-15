"use client";

import { useEffect, useState } from "react";

/**
 * Types `text` in character-by-character with a blinking caret — a clinical
 * readout that ARRIVES rather than just exists. Under prefers-reduced-motion the
 * full line is present instantly with no caret. The full text is always exposed
 * to assistive tech via aria-label; the animated portion is aria-hidden.
 */
export function TypeLine({
  text,
  className,
  speed = 22,
  startDelay = 0,
  onDone,
}: {
  text: string;
  className?: string;
  /** ms per character */
  speed?: number;
  /** ms before typing begins */
  startDelay?: number;
  onDone?: () => void;
}) {
  const [shown, setShown] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let startTimer = 0;
    let stepTimer = 0;
    // Defer all state writes past the effect body (never setState synchronously
    // inside an effect) — same pattern as useCountUp.
    const raf = requestAnimationFrame(() => {
      if (reduce) {
        setShown(text.length);
        setDone(true);
        onDone?.();
        return;
      }
      setShown(0);
      setDone(false);
      let i = 0;
      const step = () => {
        i += 1;
        setShown(i);
        if (i < text.length) {
          stepTimer = window.setTimeout(step, speed);
        } else {
          setDone(true);
          onDone?.();
        }
      };
      startTimer = window.setTimeout(step, startDelay);
    });
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(startTimer);
      window.clearTimeout(stepTimer);
    };
    // onDone intentionally excluded so a new closure doesn't restart the typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, speed, startDelay]);

  return (
    <span className={className} aria-label={text}>
      <span aria-hidden="true">{text.slice(0, shown)}</span>
      {!done && (
        <span
          aria-hidden="true"
          className="gct-caret ml-0.5 inline-block h-[1em] w-[0.5ch] translate-y-[0.12em] bg-clinic-accent"
        />
      )}
    </span>
  );
}
