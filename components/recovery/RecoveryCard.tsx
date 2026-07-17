"use client";

import { useEffect } from "react";

import { ATTENDING_CLINICIAN } from "@/lib/assessment";
import { ATTRIBUTION, WELLBEING_UNIT } from "@/lib/config";
import type { RecoveryData } from "@/lib/recovery";

/**
 * The share card — a composed, deadpan-clinical discharge artifact rendered
 * CLIENT-SIDE into a Canvas and exported as a PNG. Landscape OG ratio (1200×675)
 * so it sits cleanly in a social timeline; the most common share is a
 * screenshot, so it is displayed prominently on the recovery screen too.
 *
 * LOCKED INVARIANTS:
 *  • Nothing leaves the browser — no upload, no server, no image storage.
 *  • NO monkey/banana theming on the card (tone separation: the clinic artifact
 *    stays neutral). MONKEY lives only in the footer credit + the X post text.
 *  • Footer strings come from ATTRIBUTION — never hardcoded here.
 *
 * Every visual is a constant in CARD below — this is a tunable first pass.
 */

/* ============================================================================
 * STYLING CONSTANTS — tune freely.
 * ========================================================================== */
export const CARD = {
  // Canvas is authored at this logical size; drawn at ×dpr for a crisp export.
  width: 1200,
  height: 675,
  pad: 64,
  radius: 20,

  // Soft calm-green clinical palette — self-contained so the export reads the
  // same on any timeline, independent of the viewer's light/dark theme.
  bg: "#f4faf6",
  panel: "#ffffff",
  ink: "#14231b",
  muted: "#5c7167",
  faint: "#8aa093",
  line: "#d5e7dd",
  accent: "#2f9566",
  accentSoft: "#3ba776",

  // Vertical rhythm inside the document body.
  labelGap: 30, // label baseline -> value baseline
  blockGap: 34, // gap after a value block
  bulletLine: 26, // line height for the wrapped micro-diagnoses
  bulletGap: 12, // gap between the two micro-diagnosis bullets
} as const;

/** Fallbacks used if a live web-font family can't be read from the DOM. */
const MONO_FALLBACK = "ui-monospace, monospace";
const SANS_FALLBACK = "system-ui, sans-serif";

/**
 * Read the app's resolved font stacks (IBM Plex Mono/Sans, self-hosted by
 * next/font under hashed family names) off hidden probes so the canvas renders
 * in the same faces as the page. Falls back to generic families.
 */
function resolveFonts(): { mono: string; sans: string } {
  if (typeof document === "undefined") {
    return { mono: MONO_FALLBACK, sans: SANS_FALLBACK };
  }
  const read = (cls: string, fallback: string): string => {
    const probe = document.createElement("span");
    probe.className = cls;
    probe.style.position = "absolute";
    probe.style.visibility = "hidden";
    probe.style.pointerEvents = "none";
    document.body.appendChild(probe);
    const family = getComputedStyle(probe).fontFamily;
    document.body.removeChild(probe);
    return family || fallback;
  };
  return {
    mono: read("font-mono", MONO_FALLBACK),
    sans: read("font-sans", SANS_FALLBACK),
  };
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Word-wrap `text` into `maxW`, drawing each line; returns the next baseline y. */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxW: number,
  lineHeight: number,
): number {
  const words = text.split(" ");
  let line = "";
  let cursorY = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, cursorY);
      line = word;
      cursorY += lineHeight;
    } else {
      line = test;
    }
  }
  if (line) {
    ctx.fillText(line, x, cursorY);
    cursorY += lineHeight;
  }
  return cursorY;
}

/** Draw the full card into `canvas` at the current device pixel ratio. */
function renderCard(canvas: HTMLCanvasElement, data: RecoveryData) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const { width: W, height: H, pad } = CARD;

  canvas.width = Math.floor(W * dpr);
  canvas.height = Math.floor(H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const { mono, sans } = resolveFonts();
  const monoF = (px: number, weight = 500) => `${weight} ${px}px ${mono}`;
  const sansF = (px: number, weight = 400) => `${weight} ${px}px ${sans}`;
  ctx.textBaseline = "alphabetic";

  // —— Background + accent frame ————————————————————————————————————————————
  ctx.fillStyle = CARD.bg;
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = CARD.accent;
  ctx.fillRect(0, 0, W, 8); // letterhead rule across the top

  const label = (text: string, x: number, y: number, color: string = CARD.faint) => {
    ctx.font = monoF(14, 600);
    ctx.fillStyle = color;
    ctx.save();
    // Letter-spacing via manual advance keeps the clinical, tracked-out look.
    let cx = x;
    for (const ch of text.toUpperCase()) {
      ctx.fillText(ch, cx, y);
      cx += ctx.measureText(ch).width + 2.4;
    }
    ctx.restore();
  };

  // —— Header ————————————————————————————————————————————————————————————————
  const headY = pad + 30;
  // green dot + wordmark
  ctx.fillStyle = CARD.accent;
  ctx.beginPath();
  ctx.arc(pad + 5, headY - 5, 5, 0, Math.PI * 2);
  ctx.fill();
  label("Green Candle Therapy", pad + 22, headY, CARD.ink);
  // right-aligned document kind
  ctx.font = monoF(14, 600);
  ctx.fillStyle = CARD.muted;
  ctx.textAlign = "right";
  {
    // manual tracking, right-anchored
    const text = "DISCHARGE SUMMARY";
    let total = 0;
    for (const ch of text) total += ctx.measureText(ch).width + 2.4;
    ctx.textAlign = "left";
    let cx = W - pad - total;
    for (const ch of text) {
      ctx.fillText(ch, cx, headY);
      cx += ctx.measureText(ch).width + 2.4;
    }
  }
  ctx.textAlign = "left";
  // hairline under header
  ctx.strokeStyle = CARD.line;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(pad, pad + 52);
  ctx.lineTo(W - pad, pad + 52);
  ctx.stroke();

  // —— Two columns ————————————————————————————————————————————————————————————
  const colTop = pad + 96;
  const leftX = pad;
  const leftW = 620;
  const rightX = pad + 700;
  const rightW = W - rightX - pad;

  // LEFT: patient, diagnosis, treated-for
  let y = colTop;

  label("Patient", leftX, y);
  y += CARD.labelGap;
  ctx.font = sansF(30, 600);
  ctx.fillStyle = CARD.ink;
  ctx.fillText(data.patientLabel, leftX, y);
  y += CARD.blockGap + 14;

  label("Diagnosis", leftX, y);
  y += CARD.labelGap;
  ctx.font = sansF(24, 600);
  ctx.fillStyle = CARD.accentSoft;
  ctx.fillText(data.presentationTag, leftX, y);
  y += 26;
  ctx.font = monoF(14, 500);
  ctx.fillStyle = CARD.muted;
  ctx.fillText(`${data.code} · ${data.secondaryReference}`, leftX, y);
  y += CARD.blockGap + 10;

  label("Treated for", leftX, y);
  y += CARD.labelGap - 4;
  ctx.font = sansF(16.5);
  for (const symptom of data.microDiagnoses) {
    ctx.fillStyle = CARD.accent;
    ctx.fillText("·", leftX, y);
    ctx.fillStyle = CARD.ink;
    y = wrapText(ctx, symptom, leftX + 18, y, leftW - 18, CARD.bulletLine);
    y += CARD.bulletGap;
  }

  // RIGHT: the two headline metrics, stacked in bordered panels
  const stat = (
    top: number,
    height: number,
    labelText: string,
    value: string,
    unit: string | null,
    footnote: string | null,
  ) => {
    ctx.fillStyle = CARD.panel;
    roundRect(ctx, rightX, top, rightW, height, 16);
    ctx.fill();
    ctx.strokeStyle = CARD.line;
    ctx.lineWidth = 1;
    roundRect(ctx, rightX, top, rightW, height, 16);
    ctx.stroke();

    const px = rightX + 26;
    label(labelText, px, top + 34);
    // value
    ctx.font = sansF(52, 700);
    ctx.fillStyle = CARD.ink;
    ctx.fillText(value, px, top + 92);
    if (unit) {
      const vw = ctx.measureText(value).width;
      ctx.font = monoF(18, 600);
      ctx.fillStyle = CARD.muted;
      ctx.fillText(unit, px + vw + 10, top + 92);
    }
    if (footnote) {
      ctx.font = monoF(12, 500);
      ctx.fillStyle = CARD.faint;
      ctx.fillText(footnote, px, top + height - 22);
    }
  };

  const statH = 130;
  stat(colTop, statH, "Reality Acceptance", `${data.realityAcceptance}%`, null, null);
  stat(
    colTop + statH + 24,
    statH,
    "Recovery index",
    `${data.recoveryCU}`,
    WELLBEING_UNIT,
    `${WELLBEING_UNIT} — Cope Units`,
  );

  // —— Attending clinician (above the footer) ————————————————————————————————
  const footTop = H - pad - 40;
  ctx.font = monoF(13, 500);
  ctx.fillStyle = CARD.muted;
  ctx.fillText(`Attending clinician: ${ATTENDING_CLINICIAN}`, leftX, footTop - 8);

  // —— Footer (locked strings, from ATTRIBUTION) ——————————————————————————————
  ctx.strokeStyle = CARD.line;
  ctx.beginPath();
  ctx.moveTo(pad, footTop + 8);
  ctx.lineTo(W - pad, footTop + 8);
  ctx.stroke();

  ctx.font = monoF(13, 500);
  ctx.fillStyle = CARD.faint;
  ctx.fillText(ATTRIBUTION.disclaimer, leftX, H - pad + 4);

  ctx.fillStyle = CARD.muted;
  const op = ATTRIBUTION.operator;
  const opW = ctx.measureText(op).width;
  ctx.fillText(op, W - pad - opW, H - pad + 4);
}

/**
 * Renders the share card into the provided canvas whenever the data changes.
 * The parent owns the canvas ref so the download action can read the same
 * element (canvas.toDataURL) without re-plumbing the drawing.
 */
export function RecoveryCard({
  data,
  canvasRef,
  onReady,
}: {
  data: RecoveryData;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  onReady?: () => void;
}) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let cancelled = false;
    const draw = () => {
      if (cancelled) return;
      renderCard(canvas, data);
      onReady?.();
    };
    // Draw once fonts are ready so the export uses the real Plex faces; draw
    // immediately as a fallback if the Font Loading API is unavailable.
    const fonts = document.fonts;
    if (fonts?.ready) {
      fonts.ready.then(draw).catch(draw);
    } else {
      draw();
    }
    return () => {
      cancelled = true;
    };
  }, [data, canvasRef, onReady]);

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label={`Discharge summary card for ${data.patientLabel}. Diagnosis ${data.presentationTag}, ${data.code}. Reality Acceptance ${data.realityAcceptance} percent. Recovery index ${data.recoveryCU} ${WELLBEING_UNIT}.`}
      className="h-auto w-full rounded-xl border border-clinic-line shadow-sm"
      style={{ aspectRatio: `${CARD.width} / ${CARD.height}` }}
    />
  );
}
