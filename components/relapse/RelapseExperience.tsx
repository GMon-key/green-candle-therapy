"use client";

import { useEffect, useRef, useState } from "react";

import { setAudioSuppressed } from "@/lib/clinicAudio";
import type { Candle } from "@/lib/diagnosis";

/**
 * RELAPSE — the ending. The reverse of beat 6.
 *
 * Beat 6 grew an absurd green banana out of the patient's REAL chart and zoomed
 * out until that honest history was a tiny footnote in the corner. It kept the
 * real candles UNTOUCHED the whole time, specifically for this moment. Here the
 * treatment is undone: we start from that green end-state and, over a few
 * seconds, the green candles DISSOLVE (a peel/fade, like lifting an X-ray
 * overlay) while the camera zooms back IN to the real chart at normal scale —
 * exactly as it was at the start of beat 6. It ends on the real chart, full and
 * unchanged, calm. The chart never moved; only the cope is removed.
 *
 * This is a FORWARD animation that reproduces the reversed outcome (the spec's
 * sanctioned alternative to literally replaying beat 6 backwards): it
 * reconstructs beat 6's green end-state statically, then interpolates the camera
 * and the greens' opacity from that state back to the bare real chart. Every
 * timing / easing / peel parameter is a tuning constant below — this is a
 * walk-and-tune aesthetic pass.
 *
 * NO purple (purple is the record — permanent, and elsewhere). NO particles.
 * NO audio this pass — the RELAPSE silence cut is banked for the later audio
 * pass; the seam is marked below. Reduced-motion resolves directly to the real
 * unchanged chart with no animation, still delivering the reveal.
 */

/* ============================================================================
 * TUNING CONSTANTS  (walk-and-tune)
 * ========================================================================== */

// —— Timeline (seconds) ———————————————————————————————————————————————————————
const START_HOLD = 0.8; // hold the green end-state before it begins to wash away
const REVERT_DURATION = 5.5; // green dissolve + zoom-back to the real chart
const SETTLE_HOLD = 0.5; // calm beat on the restored chart before onSettled fires

// —— Sub-phases, as fractions [0..1] of REVERT_DURATION ———————————————————————
const DISSOLVE = { start: 0.0, end: 0.58 }; // the green candles peel/fade out
const ZOOM = { start: 0.12, end: 1.0 }; // the camera zooms back into the real chart

// —— Green peel ———————————————————————————————————————————————————————————————
// How much the fade is spread across the greens (0 = all fade together;
// →1 = strongly sequential). Newest/tallest (rightmost) peel FIRST — the overlay
// lifts from the top of the banana back down toward the real chart.
const PEEL_STAGGER = 0.55;
// A faint green tint over the whole frame at the start, fading as the greens go —
// the "green washing away" made ambient. Kept subtle.
const GREEN_WASH_MAX = 0.1;

// —— Cameras ——————————————————————————————————————————————————————————————————
const REAL_HEADROOM = 0.12; // vertical headroom above the real chart at the end
const DOMAIN_MIN_PAD = 0.06; // headroom below the real low (matches beat 6)
// The zoom interpolates in LOG space so the perceived rate is even across a huge
// scale change (the banana domain can be tens of × the real one).

// —— Real chart continuity (identical to beat 5 / beat 6) —————————————————————
const REAL_UP = "#2f9e6a";
const REAL_DOWN = "#d83a3f";
const CANDLE_WINDOW = 400;
const CANDLE_GAP_RATIO = 0.26;
const WICK_WIDTH_RATIO = 0.14;
const CANDLE_MIN_BODY_PX = 2;
const BG = "#0b100e";

// —— Green candle reconstruction (must mirror beat 6's end-state build) ————————
const GREEN = "#22c063";
const GREEN_BRIGHT = "#2ce56b";
const DENIAL_MAGNITUDE_MIN = 0.7;
const DENIAL_MAGNITUDE_MAX = 1.9;
const APPEND_INTERVAL_MAX = 0.42;
const APPEND_INTERVAL_MIN = 0.24;
const SIZE_FLAT = 1.0;
const SIZE_MODERATE = 2.6;
const SIZE_HIGH = 7.0;
const SIZE_ABSURD = 26.0;
const WICK_SCALE = 1.0;
const BUILD_END = 27; // greens were appended up to the flatline at 27s in beat 6

/* ============================================================================
 * Helpers (mirrors of beat 6, kept local so the two files tune independently)
 * ========================================================================== */

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(n, hi));
const lerp = (a: number, b: number, t: number) => a + (b - a) * clamp(t, 0, 1);
const easeInOut = (t: number) =>
  t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
const easeOut = (t: number) => 1 - (1 - t) ** 3;
/** Perceptually-even interpolation for a zoom (both endpoints must be > 0). */
const expLerp = (a: number, b: number, t: number) =>
  a * (b / a) ** clamp(t, 0, 1);
/** Map x from [lo,hi] onto [0,1]. */
const span = (x: number, lo: number, hi: number) =>
  clamp((x - lo) / Math.max(hi - lo, 1e-9), 0, 1);

function sizeMultAt(t: number): number {
  if (t <= 5) return SIZE_FLAT;
  if (t <= 10) return lerp(SIZE_FLAT, SIZE_MODERATE, (t - 5) / 5);
  if (t <= 20) return lerp(SIZE_MODERATE, SIZE_HIGH, (t - 10) / 10);
  if (t <= 27) return lerp(SIZE_HIGH, SIZE_ABSURD, (t - 20) / 7);
  return SIZE_ABSURD;
}
const intervalAt = (t: number) =>
  lerp(APPEND_INTERVAL_MAX, APPEND_INTERVAL_MIN, clamp(t / 27, 0, 1));

interface Body {
  o: number;
  h: number;
  l: number;
  c: number;
}

/* ============================================================================
 * Component
 * ========================================================================== */

export function RelapseExperience({
  candles,
  denial,
  onSettled,
}: {
  candles: Candle[];
  denial: number;
  /** Fired once the real chart is fully restored and calm. */
  onSettled?: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const captionRef = useRef<HTMLParagraphElement>(null);
  const onSettledRef = useRef(onSettled);
  useEffect(() => {
    onSettledRef.current = onSettled;
  }, [onSettled]);

  const [, setSettled] = useState(false);

  // RELAPSE SILENCE CUT. As reality returns, the app goes quiet: suppress the
  // typing blip + measuring tone for the whole reveal and the deadpan close, so
  // the ending lands in silence. Released when leaving (back to a fresh session).
  // (Audio proper is banked; this seam is the silence.)
  useEffect(() => {
    setAudioSuppressed(true);
    return () => setAudioSuppressed(false);
  }, []);

  const magnitude =
    lerp(DENIAL_MAGNITUDE_MIN, DENIAL_MAGNITUDE_MAX, clamp(denial, 0, 100) / 100);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // —— Real data — the SAME series beats 5 & 6 rendered, untouched. ——————————
    const src = candles.slice(-CANDLE_WINDOW);
    const n = Math.max(src.length, 1);
    const priceVals = src.flatMap((c) => [c.h, c.l]);
    const baseMin = priceVals.length ? Math.min(...priceVals) : 0;
    const baseMax = priceVals.length ? Math.max(...priceVals) : 1;
    const baseRange = Math.max(baseMax - baseMin, 1e-9);
    const real: Body[] = src.map((c) => ({ o: c.o, h: c.h, l: c.l, c: c.c }));
    const lastRealClose = real[real.length - 1]?.c ?? baseMax;

    const mean = (xs: number[]) =>
      xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
    const realBody = Math.max(mean(real.map((c) => Math.abs(c.c - c.o))), baseRange * 0.02);
    const upWick = Math.max(mean(real.map((c) => c.h - Math.max(c.o, c.c))), baseRange * 0.004);
    const dnWick = Math.max(mean(real.map((c) => Math.min(c.o, c.c) - c.l)), baseRange * 0.004);
    const wickRatioUp = upWick / realBody;
    const wickRatioDn = dnWick / realBody;

    // —— Reconstruct beat 6's green end-state statically (the banana we start on). —
    const greens: Body[] = [];
    let openP = lastRealClose;
    for (let ta = 0; ta < BUILD_END; ta += intervalAt(ta)) {
      const body = realBody * sizeMultAt(ta) * magnitude;
      const close = openP + body;
      greens.push({
        o: openP,
        c: close,
        h: close + body * wickRatioUp * WICK_SCALE,
        l: openP - body * wickRatioDn * WICK_SCALE,
      });
      openP = close;
    }
    const M = greens.length;
    const greensTop = (M ? greens[M - 1].h : baseMax) + baseRange * REAL_HEADROOM;

    // —— Camera endpoints —————————————————————————————————————————————————————
    const domainMin = baseMin - baseRange * DOMAIN_MIN_PAD;
    const startSpan = greensTop - domainMin; // green end-state (real chart tiny)
    const endSpan = baseMax + baseRange * REAL_HEADROOM - domainMin; // real, normal
    const startSlots = n + M; // real + banana across the width
    const endSlots = n; // real fills the width

    // —— Canvas sizing ————————————————————————————————————————————————————————
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let W = 0;
    let H = 0;
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = Math.floor(W * dpr);
      canvas.height = Math.floor(H * dpr);
      canvas.style.width = `${W}px`;
      canvas.style.height = `${H}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const pad = () => ({
      left: 34,
      right: 34,
      top: Math.max(H * 0.1, 64),
      bottom: Math.max(H * 0.16, 96),
    });

    const setCaption = (text: string) => {
      if (captionRef.current) captionRef.current.textContent = text;
    };

    /** Draw one candle in the shared beat-5/6 language at the given camera. */
    const drawCandle = (
      slotIndex: number,
      slotW: number,
      b: Body,
      curSpan: number,
      fill: string,
      wick: string,
      alpha: number,
    ) => {
      if (alpha <= 0.004) return;
      const pd = pad();
      const chartH = H - pd.top - pd.bottom;
      const yOf = (p: number) =>
        pd.top + (1 - (p - domainMin) / Math.max(curSpan, 1e-9)) * chartH;
      const bodyW = Math.max(slotW * (1 - CANDLE_GAP_RATIO), 1);
      const x = pd.left + (slotIndex + 0.5) * slotW;
      if (x < -bodyW || x > W + bodyW) return; // off-frame → skip
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = wick;
      ctx.lineWidth = Math.max(bodyW * WICK_WIDTH_RATIO, 1);
      ctx.beginPath();
      ctx.moveTo(x, yOf(b.h));
      ctx.lineTo(x, yOf(b.l));
      ctx.stroke();
      const top = yOf(Math.max(b.o, b.c));
      const bh = Math.max(yOf(Math.min(b.o, b.c)) - top, CANDLE_MIN_BODY_PX);
      ctx.fillStyle = fill;
      ctx.fillRect(x - bodyW / 2, top, bodyW, bh);
      ctx.globalAlpha = 1;
    };

    /** Opacity of green candle j at eased dissolve progress d (rightmost first). */
    const greenAlphaAt = (d: number, j: number) => {
      if (M <= 1) return 1 - clamp(d, 0, 1);
      const order = (M - 1 - j) / (M - 1); // 0 = newest/tallest, 1 = nearest real
      const startAt = order * PEEL_STAGGER;
      const width = Math.max(1 - PEEL_STAGGER, 0.15);
      return 1 - clamp((d - startAt) / width, 0, 1);
    };

    /** Render one composed frame at progress P (0 = green end-state, 1 = real). */
    const renderAt = (P: number) => {
      const dz = easeInOut(span(P, ZOOM.start, ZOOM.end));
      const dDis = easeOut(span(P, DISSOLVE.start, DISSOLVE.end));

      const curSpan = expLerp(startSpan, endSpan, dz);
      const dispSlots = expLerp(startSlots, endSlots, dz);
      const pd = pad();
      const chartW = W - pd.left - pd.right;
      const slotW = chartW / Math.max(dispSlots, 1);

      ctx.fillStyle = BG;
      ctx.fillRect(0, 0, W, H);

      // Real candles — honest history, always fully opaque, growing to fill.
      for (let i = 0; i < real.length; i++) {
        const c = real[i];
        const up = c.c >= c.o;
        drawCandle(i, slotW, c, curSpan, up ? REAL_UP : REAL_DOWN, up ? REAL_UP : REAL_DOWN, 1);
      }

      // Green candles — dissolve away (peel from the top of the banana down).
      for (let j = 0; j < M; j++) {
        const a = greenAlphaAt(dDis, j);
        if (a <= 0.004) continue;
        drawCandle(n + j, slotW, greens[j], curSpan, GREEN, GREEN_BRIGHT, a);
      }

      // The green wash receding over the whole frame.
      const wash = GREEN_WASH_MAX * (1 - dDis);
      if (wash > 0.004) {
        ctx.fillStyle = `rgba(34,192,99,${wash})`;
        ctx.fillRect(0, 0, W, H);
      }
    };

    // —— Reduced-motion: resolve straight to the real, unchanged chart. ————————
    if (reduce) {
      const rafRM = requestAnimationFrame(() => {
        renderAt(1);
        setCaption(""); // the close panel carries the follow-up statement
        setSettled(true);
        onSettledRef.current?.();
      });
      window.addEventListener("resize", () => renderAt(1));
      return () => {
        cancelAnimationFrame(rafRM);
        window.removeEventListener("resize", resize);
      };
    }

    // —— Animated revert ——————————————————————————————————————————————————————
    // AUDIO: the silence cut is wired at mount (setAudioSuppressed above) — the
    // typing/measuring layer goes quiet for the whole reveal + close. A relapse
    // STING (a one-shot sound as the green peels) is still banked for later.
    let raf = 0;
    let startMs = 0;
    let settledFired = false;
    setCaption("");

    const frame = (nowMs: number) => {
      if (!startMs) startMs = nowMs;
      const E = (nowMs - startMs) / 1000;
      const P = clamp((E - START_HOLD) / REVERT_DURATION, 0, 1);
      renderAt(P);

      // Deadpan caption tracks the reveal, then clears — the close panel speaks.
      if (P <= 0) setCaption("");
      else if (P < 1) setCaption("Comparing with reality…");
      else setCaption("");

      if (P >= 1 && E >= START_HOLD + REVERT_DURATION + SETTLE_HOLD) {
        if (!settledFired) {
          settledFired = true;
          setSettled(true);
          onSettledRef.current?.();
        }
        return; // hold the final calm frame; stop looping
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candles, denial]);

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#0b100e] text-[#e6f1ea]">
      <canvas ref={canvasRef} className="absolute inset-0" />

      {/* The invariant flips: this is the untreated view — actual conditions. */}
      <div className="pointer-events-none absolute left-5 top-5 flex items-center gap-2">
        <span className="readout rounded-md border border-[#7d8e86]/40 bg-[#0b100e]/70 px-2.5 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-[#b9c7bf]">
          Untreated View
        </span>
      </div>

      {/* Deadpan clinical caption (driven imperatively from the loop). */}
      <div className="pointer-events-none absolute inset-x-0 bottom-16 flex justify-center px-6">
        <p
          ref={captionRef}
          className="readout text-center text-sm font-medium tracking-wide text-[#b9c7bf] sm:text-base"
        />
      </div>
    </div>
  );
}
