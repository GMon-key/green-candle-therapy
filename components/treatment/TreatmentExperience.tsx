"use client";

import * as Tone from "tone";
import { useEffect, useRef, useState } from "react";

import type { Candle } from "@/lib/diagnosis";

/**
 * Beat 6 — the treatment. A custom-canvas, 60fps, fixed 30-second arc that
 * starts from the patient's REAL chart and escalates into obvious fiction, then
 * ruptures into a curated clinical explosion and holds on a triumphant, absurd,
 * all-green record. Colour doctrine is load-bearing:
 *
 *   GREEN  = emotional recovery / healing / reward. The payoff. Green appears
 *            ONLY when improvement actually happens.
 *   PURPLE = authority / protocol / infrastructure / computation (Monad). NOT
 *            recovery, NOT celebration. Purple is the mechanism RUNNING the
 *            treatment; it does the WORK (prep + processing) and recedes as the
 *            green RESULT dominates. Faint purple survives beneath the climax.
 *
 * Duration is FIXED 30s for everyone; only INTENSITY scales with denial
 * (denial = 100 − realityAcceptance). This is a functional first pass built for
 * live feel-tuning: every timing / magnitude / colour / audio parameter is a
 * named constant in the TUNING block below.
 */

/* ============================================================================
 * TUNING CONSTANTS — everything you'd want to feel-tune lives here.
 * ========================================================================== */

// —— Timeline (seconds). Phase boundaries of the fixed 30s arc. ——————————————
const TOTAL_DURATION = 30;
const PHASES = {
  diagnosisComplete: { start: 0, end: 2 }, // freeze, stillness, dim
  purplePrep: { start: 2, end: 5 }, // purple scanline calibrates
  onset: { start: 5, end: 10 }, // first earned green candles
  escalation: { start: 10, end: 20 }, // parallel waves, climb, particles
  peak: { start: 20, end: 27 }, // impossible perfection, purple fades
  flatline: { start: 27, end: 28 }, // everything freezes + monitor tone
  godCandle: { start: 28, end: 30 }, // stretch off-top + explosion
} as const;

// —— Denial → magnitude. denial 0..100 maps to an intensity multiplier. ———————
const DENIAL_MAGNITUDE_MIN = 0.7; // at denial = 0 (accepting patient)
const DENIAL_MAGNITUDE_MAX = 1.9; // at denial = 100 (deep denial)
const DENIAL_SCALING = 1.0; // global scalar on the mapped magnitude

// —— Screen dim (phase 0 lowers ambient brightness, never black). —————————————
const SCREEN_DIM_AMOUNT = 0.16; // 0..1 overlay alpha at fullest dim
const SCREEN_DIM_RECOVER = 0.04; // residual dim once treatment is running

// —— Candles ———————————————————————————————————————————————————————————————
const CANDLE_WINDOW = 56; // how many real candles to carry into treatment
const CANDLE_GAP_RATIO = 0.24; // gap as a fraction of a candle slot
const CANDLE_MIN_BODY_PX = 2; // never draw a body thinner than this
const TREAT_FADE = 0.16; // how far behind the front a candle fully heals
const ONSET_FRONT_END = 0.34; // fraction of candles healed by end of onset
const CLIMB_HEIGHT = 0.55; // uptrend lift as a fraction of base price range
const BODY_GROW = 0.9; // treated bodies grow by up to this fraction × mag
const PULSE_WIDTH = 0.05; // width (in x-fraction) of the purple pulse at front
const DOMAIN_HEADROOM = 0.12; // extra headroom above the tallest candle
const DOMAIN_EASE = 0.08; // how fast the price domain rescales toward target

// —— Purple prep / processing ————————————————————————————————————————————————
const SCANLINE_SPEED = 0.65; // viewport-widths per second on a pass
const SCANLINE_WIDTH_PX = 3;
const SCANLINE_GLOW_PX = 26;
const WAVEFORM_AMPLITUDE = 16; // px of the faint purple waveform behind chart
const WAVEFORM_COUNT_PEAK = 3; // parallel processing waves during escalation

// —— Particles ——————————————————————————————————————————————————————————————
const PARTICLE_ESCAPE_RATE = 0.5; // green particles/frame/candle at full climb
const PARTICLE_GRAVITY = -14; // px/s² (negative = they drift upward)
const PARTICLE_MAX = 900; // hard cap on live particles (perf guard)
const EXPLOSION_GREEN = 220; // green particle count in the rupture × mag
const EXPLOSION_PURPLE = 40; // faint purple particles beneath (infrastructure)
const EXPLOSION_CHECKMARKS = 10; // floating clinical checkmarks × mag
const EXPLOSION_CASEFILES = 8; // discharge case-files raining × mag
const EXPLOSION_CONFETTI = 90; // clinical confetti × mag
// Curated to the 3–4 funniest absurd elements — not a chaotic dump.
const EXPLOSION_ELEMENTS = ["green", "checkmark", "casefile", "confetti"] as const;

// —— God candle ————————————————————————————————————————————————————————————
const GOD_CANDLE_MULT = 6.0; // final high as a multiple of the peak domain × mag
const GOD_FREEZE_AT = 0.55; // stretch progress at which the domain STOPS
//                              rescaling, so the candle punches off the top.
const GOD_STRETCH_POWER = 2.2; // easing exponent on the stretch (slow → violent)
const GREEN_FLASH_INTENSITY = 0.82; // peak alpha of the green screen fill

// —— Heartbeat (bpm at each phase edge; the loop interpolates between). ———————
const HEARTBEAT_BPM = {
  diagnosisComplete: 60,
  purplePrepStart: 65,
  purplePrepEnd: 72,
  onsetEnd: 80,
  escalationEnd: 110,
  peakEnd: 130,
  flatline: 150, // races just before the monitor flatlines
  climax: 150, // euphoric burst out of the flatline
} as const;
const HEARTBEAT_DUB_DELAY = 0.14; // s between "lub" and "dub"

// —— Audio levels (dB-ish gains, kept conservative for a first pass). ————————
const AUDIO = {
  masterDb: -6,
  heartbeatDb: -8,
  blipDb: -20,
  subBassMax: 0.5, // linear gain the escalation sub-bass swells toward
  flatlineDb: -14,
  flatlineHz: 660, // monitor tone (softer than a literal 1kHz)
  climaxDb: -7,
} as const;

// —— Colours (canvas needs concrete values; defaults mirror the palette). ————
const COLORS = {
  bg: "#0b100e", // treatment dark chrome
  gridLine: "rgba(120,140,130,0.06)",
  candleGrey: "#42514a", // untreated / real candle (desaturated)
  wickGrey: "#354139",
  green: "#22c063",
  greenBright: "#2ce56b",
  greenParticle: "#8affc0",
  purple: "#836ef9", // Monad — processing/authority only
  purpleStrong: "#6e54f0",
  purpleSoft: "#a996ff",
  checkmark: "#8affc0",
  casefile: "#e6f1ea",
  confetti: ["#2ce56b", "#8affc0", "#a996ff", "#e6f1ea"],
} as const;

// —— Deadpan clinical captions (no exclamation, ever). ————————————————————————
const CAPTIONS = {
  diagnosisComplete: "Preparing Visual Rehabilitation Protocol…",
  purplePrep: "Calibrating baseline exposure…",
  onset: "Administering corrective candles…",
  escalation: "Treatment responding.",
  peak: "Patient responding favourably.",
  flatline: "", // held stillness — the "did we lose them" beat
  godCandle: "Visual rehabilitation completed successfully.",
} as const;

/* ============================================================================
 * Types + small helpers
 * ========================================================================== */

type PhaseName = keyof typeof PHASES;

interface WorkCandle {
  o: number;
  h: number;
  l: number;
  c: number;
  cx: number; // normalised x position 0..1
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number; // 1 → 0
  decay: number;
  size: number;
  type: "green" | "purple" | "checkmark" | "casefile" | "confetti";
  color: string;
  rot: number;
  vrot: number;
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(n, hi));
const lerp = (a: number, b: number, t: number) => a + (b - a) * clamp(t, 0, 1);
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
const easeOut = (t: number) => 1 - (1 - t) ** 3;

function phaseAt(t: number): PhaseName {
  const names = Object.keys(PHASES) as PhaseName[];
  for (const name of names) {
    if (t >= PHASES[name].start && t < PHASES[name].end) return name;
  }
  return "godCandle";
}

/** How far the treatment front has swept across the candles at time t (0..1). */
function frontProgress(t: number): number {
  if (t < PHASES.onset.start) return 0;
  if (t < PHASES.onset.end) {
    const p = (t - PHASES.onset.start) / (PHASES.onset.end - PHASES.onset.start);
    return easeInOut(p) * ONSET_FRONT_END;
  }
  if (t < PHASES.escalation.end) {
    const p =
      (t - PHASES.escalation.start) /
      (PHASES.escalation.end - PHASES.escalation.start);
    return lerp(ONSET_FRONT_END, 1, easeInOut(p));
  }
  return 1;
}

/** Interpolated heartbeat bpm at time t. */
function bpmAt(t: number): number {
  const H = HEARTBEAT_BPM;
  if (t < PHASES.purplePrep.start) return H.diagnosisComplete;
  if (t < PHASES.purplePrep.end) {
    const p = (t - PHASES.purplePrep.start) / (PHASES.purplePrep.end - PHASES.purplePrep.start);
    return lerp(H.purplePrepStart, H.purplePrepEnd, p);
  }
  if (t < PHASES.onset.end) {
    const p = (t - PHASES.onset.start) / (PHASES.onset.end - PHASES.onset.start);
    return lerp(H.purplePrepEnd, H.onsetEnd, p);
  }
  if (t < PHASES.escalation.end) {
    const p = (t - PHASES.escalation.start) / (PHASES.escalation.end - PHASES.escalation.start);
    return lerp(H.onsetEnd, H.escalationEnd, p);
  }
  if (t < PHASES.peak.end) {
    const p = (t - PHASES.peak.start) / (PHASES.peak.end - PHASES.peak.start);
    return lerp(H.escalationEnd, H.peakEnd, p);
  }
  if (t < PHASES.flatline.end) return H.flatline;
  return H.climax;
}

/* ============================================================================
 * Audio — synthesized heartbeat/processing/flatline/climax. Defensive: every
 * call is wrapped so a suspended context (autoplay block / mobile silent-switch)
 * degrades to silence and NEVER throws.
 * ========================================================================== */

class TreatmentAudio {
  private ready = false;
  private master?: Tone.Volume;
  private heart?: Tone.MembraneSynth;
  private blipSynth?: Tone.Synth;
  private subOsc?: Tone.Oscillator;
  private subGain?: Tone.Gain;
  private flatOsc?: Tone.Oscillator;
  private flatGain?: Tone.Gain;
  private chord?: Tone.PolySynth;
  private flatlineActive = false;

  async init(): Promise<boolean> {
    try {
      await Tone.start();
      this.master = new Tone.Volume(AUDIO.masterDb).toDestination();

      this.heart = new Tone.MembraneSynth({
        pitchDecay: 0.02,
        octaves: 3,
        envelope: { attack: 0.001, decay: 0.28, sustain: 0, release: 0.1 },
      }).connect(this.master);
      this.heart.volume.value = AUDIO.heartbeatDb;

      this.blipSynth = new Tone.Synth({
        oscillator: { type: "triangle" },
        envelope: { attack: 0.002, decay: 0.08, sustain: 0, release: 0.05 },
      }).connect(this.master);
      this.blipSynth.volume.value = AUDIO.blipDb;

      this.subGain = new Tone.Gain(0).connect(this.master);
      this.subOsc = new Tone.Oscillator(42, "sine").connect(this.subGain);
      this.subOsc.start();

      this.flatGain = new Tone.Gain(0).connect(this.master);
      this.flatOsc = new Tone.Oscillator(AUDIO.flatlineHz, "sine").connect(this.flatGain);
      this.flatOsc.start();

      this.chord = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: "sawtooth" },
        envelope: { attack: 0.02, decay: 0.4, sustain: 0.3, release: 1.6 },
      }).connect(this.master);
      this.chord.volume.value = AUDIO.climaxDb;

      this.ready = true;
      return true;
    } catch {
      return false;
    }
  }

  setMute(muted: boolean) {
    try {
      if (this.master) this.master.mute = muted;
    } catch {
      /* no-op */
    }
  }

  beat(soft = false) {
    if (!this.ready || !this.heart) return;
    try {
      const now = Tone.now();
      this.heart.triggerAttackRelease("C1", "16n", now, soft ? 0.5 : 1);
      this.heart.triggerAttackRelease("G0", "16n", now + HEARTBEAT_DUB_DELAY, soft ? 0.3 : 0.6);
    } catch {
      /* no-op */
    }
  }

  blip() {
    if (!this.ready || !this.blipSynth) return;
    try {
      const note = 520 + Math.floor(easeOut(Math.abs(Math.sin(Tone.now()))) * 340);
      this.blipSynth.triggerAttackRelease(note, "32n", Tone.now(), 0.5);
    } catch {
      /* no-op */
    }
  }

  setSwell(level: number) {
    if (!this.ready || !this.subGain) return;
    try {
      this.subGain.gain.rampTo(clamp(level, 0, 1) * AUDIO.subBassMax, 0.12);
    } catch {
      /* no-op */
    }
  }

  flatline(on: boolean) {
    if (!this.ready || !this.flatGain) return;
    if (on === this.flatlineActive) return;
    this.flatlineActive = on;
    try {
      this.flatGain.gain.rampTo(on ? 0.5 : 0, on ? 0.03 : 0.25);
    } catch {
      /* no-op */
    }
  }

  climax() {
    if (!this.ready || !this.chord) return;
    try {
      this.chord.triggerAttackRelease(["C4", "E4", "G4", "C5"], "2n", Tone.now(), 0.9);
    } catch {
      /* no-op */
    }
  }

  dispose() {
    this.ready = false;
    for (const node of [
      this.heart,
      this.blipSynth,
      this.subOsc,
      this.subGain,
      this.flatOsc,
      this.flatGain,
      this.chord,
      this.master,
    ]) {
      try {
        node?.dispose();
      } catch {
        /* no-op */
      }
    }
  }
}

/* ============================================================================
 * Component
 * ========================================================================== */

export function TreatmentExperience({
  candles,
  denial,
}: {
  candles: Candle[];
  denial: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const captionRef = useRef<HTMLParagraphElement>(null);
  const bpmRef = useRef<HTMLSpanElement>(null);

  const [muted, setMuted] = useState(false);
  const [done, setDone] = useState(false);
  const muteRef = useRef(false);

  // Magnitude from denial (0..100). Higher denial → bigger, faster, more absurd.
  const magnitude =
    lerp(DENIAL_MAGNITUDE_MIN, DENIAL_MAGNITUDE_MAX, clamp(denial, 0, 100) / 100) *
    DENIAL_SCALING;

  useEffect(() => {
    muteRef.current = muted;
  }, [muted]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // —— Prepare the working candle set from the REAL data. ——————————————————
    const src = candles.slice(-CANDLE_WINDOW);
    const n = Math.max(src.length, 1);
    const prices = src.flatMap((c) => [c.h, c.l]);
    const baseMin = prices.length ? Math.min(...prices) : 0;
    const baseMax = prices.length ? Math.max(...prices) : 1;
    const baseRange = Math.max(baseMax - baseMin, 1e-9);
    const work: WorkCandle[] = src.map((c, i) => ({
      o: c.o,
      h: c.h,
      l: c.l,
      c: c.c,
      cx: n > 1 ? i / (n - 1) : 0.5,
    }));

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

    // —— Runtime state ————————————————————————————————————————————————————————
    const particles: Particle[] = [];
    const domainMin = baseMin - baseRange * 0.05;
    let domainMax = baseMax + baseRange * DOMAIN_HEADROOM;
    let nextBeat = 0;
    let nextBlip = 0;
    let explosionFired = false;
    let lastPhase: PhaseName | "" = "";
    let ecg: number[] = [];
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // —— Audio (skipped entirely under reduced motion). ——————————————————————
    const audio = new TreatmentAudio();
    if (!reduce) {
      void audio.init().then((ok) => {
        if (ok) audio.setMute(muteRef.current);
      });
    }
    // Fallback unlock: if autoplay was blocked, the first interaction starts it.
    const unlock = () => {
      if (!reduce) void audio.init().then((ok) => ok && audio.setMute(muteRef.current));
    };
    window.addEventListener("pointerdown", unlock, { once: true });

    // —— Chart geometry ——————————————————————————————————————————————————————
    const chartPad = () => ({
      left: 40,
      right: 40,
      top: Math.max(H * 0.14, 80),
      bottom: Math.max(H * 0.2, 120),
    });
    const priceToY = (p: number) => {
      const pad = chartPad();
      const chartH = H - pad.top - pad.bottom;
      const r = Math.max(domainMax - domainMin, 1e-9);
      return pad.top + (1 - (p - domainMin) / r) * chartH;
    };

    // —— Particle helpers ————————————————————————————————————————————————————
    const spawn = (p: Partial<Particle> & Pick<Particle, "x" | "y" | "type">) => {
      if (particles.length >= PARTICLE_MAX) return;
      particles.push({
        vx: 0,
        vy: 0,
        life: 1,
        decay: 0.6,
        size: 3,
        color: COLORS.greenParticle,
        rot: 0,
        vrot: 0,
        ...p,
      });
    };

    const fireExplosion = (cx: number, cy: number) => {
      const m = magnitude;
      if (EXPLOSION_ELEMENTS.includes("green")) {
        for (let i = 0; i < EXPLOSION_GREEN * m; i++) {
          const a = Math.random() * Math.PI * 2;
          const sp = 120 + Math.random() * 520 * m;
          spawn({
            x: cx,
            y: cy,
            type: "green",
            vx: Math.cos(a) * sp,
            vy: Math.sin(a) * sp - 120,
            size: 2 + Math.random() * 4,
            decay: 0.35 + Math.random() * 0.3,
            color: Math.random() > 0.5 ? COLORS.green : COLORS.greenBright,
          });
        }
      }
      // Faint purple beneath — infrastructure, not celebration.
      for (let i = 0; i < EXPLOSION_PURPLE * m; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = 60 + Math.random() * 240 * m;
        spawn({
          x: cx,
          y: cy,
          type: "purple",
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp,
          size: 1.5 + Math.random() * 2,
          decay: 0.4,
          color: COLORS.purpleSoft,
        });
      }
      if (EXPLOSION_ELEMENTS.includes("checkmark")) {
        for (let i = 0; i < EXPLOSION_CHECKMARKS * m; i++) {
          spawn({
            x: cx + (Math.random() - 0.5) * W * 0.5,
            y: cy - Math.random() * 40,
            type: "checkmark",
            vx: (Math.random() - 0.5) * 60,
            vy: -40 - Math.random() * 120,
            size: 16 + Math.random() * 18,
            decay: 0.28,
            color: COLORS.checkmark,
            rot: (Math.random() - 0.5) * 0.4,
            vrot: (Math.random() - 0.5) * 0.6,
          });
        }
      }
      if (EXPLOSION_ELEMENTS.includes("casefile")) {
        for (let i = 0; i < EXPLOSION_CASEFILES * m; i++) {
          spawn({
            x: Math.random() * W,
            y: -40 - Math.random() * 200,
            type: "casefile",
            vx: (Math.random() - 0.5) * 30,
            vy: 40 + Math.random() * 80,
            size: 26 + Math.random() * 14,
            decay: 0.14,
            color: COLORS.casefile,
            rot: (Math.random() - 0.5) * 0.5,
            vrot: (Math.random() - 0.5) * 0.8,
          });
        }
      }
      if (EXPLOSION_ELEMENTS.includes("confetti")) {
        for (let i = 0; i < EXPLOSION_CONFETTI * m; i++) {
          const a = Math.random() * Math.PI * 2;
          const sp = 100 + Math.random() * 400 * m;
          spawn({
            x: cx,
            y: cy,
            type: "confetti",
            vx: Math.cos(a) * sp,
            vy: Math.sin(a) * sp - 80,
            size: 3 + Math.random() * 5,
            decay: 0.3,
            color: COLORS.confetti[i % COLORS.confetti.length],
            rot: Math.random() * Math.PI,
            vrot: (Math.random() - 0.5) * 1.4,
          });
        }
      }
    };

    // —— Drawing ——————————————————————————————————————————————————————————————
    const drawCandles = (t: number) => {
      const pad = chartPad();
      const chartW = W - pad.left - pad.right;
      const front = frontProgress(t);
      const slotW = chartW / n;
      const bodyW = Math.max(slotW * (1 - CANDLE_GAP_RATIO), 1);
      const m = magnitude;

      // Target domain from currently-treated highs (drives the rescale/climb).
      let targetHigh = baseMax;
      for (const c of work) {
        const treated = c.cx <= front;
        if (!treated) continue;
        const heal = clamp((front - c.cx) / TREAT_FADE, 0, 1);
        const lift = CLIMB_HEIGHT * m * c.cx * heal * baseRange;
        targetHigh = Math.max(targetHigh, c.h + lift);
      }

      for (let i = 0; i < work.length; i++) {
        const c = work[i];
        const x = pad.left + i * slotW + slotW / 2;
        const treated = c.cx <= front;
        const heal = treated ? clamp((front - c.cx) / TREAT_FADE, 0, 1) : 0;
        const atFront = Math.abs(c.cx - front) < PULSE_WIDTH && t < PHASES.peak.end;

        // Healed candle lifts (climb) and grows a green bullish body.
        const lift = CLIMB_HEIGHT * m * c.cx * heal * baseRange;
        const grow = 1 + BODY_GROW * m * heal;
        const baseBody = Math.abs(c.c - c.o);
        const mid = (c.o + c.c) / 2 + lift;
        const half = (Math.max(baseBody, baseRange * 0.01) * grow) / 2;
        const openP = treated ? mid - half : c.o;
        const closeP = treated ? mid + half : c.c; // treated = bullish (green up)
        const highP = treated ? Math.max(closeP, c.h + lift) : c.h;
        const lowP = treated ? Math.min(openP, c.l + lift) : c.l;

        const yO = priceToY(openP);
        const yC = priceToY(closeP);
        const yH = priceToY(highP);
        const yL = priceToY(lowP);

        // Colour: grey → (purple pulse at front) → green.
        let fill: string = COLORS.candleGrey;
        let wick: string = COLORS.wickGrey;
        if (atFront) {
          fill = COLORS.purpleStrong;
          wick = COLORS.purple;
        } else if (treated) {
          fill = heal > 0.5 ? COLORS.greenBright : COLORS.green;
          wick = COLORS.green;
        }

        // Wick
        ctx.strokeStyle = wick;
        ctx.lineWidth = Math.max(bodyW * 0.14, 1);
        ctx.beginPath();
        ctx.moveTo(x, yH);
        ctx.lineTo(x, yL);
        ctx.stroke();

        // Body
        const top = Math.min(yO, yC);
        const bh = Math.max(Math.abs(yC - yO), CANDLE_MIN_BODY_PX);
        if (treated && heal > 0.3) {
          ctx.shadowColor = COLORS.green;
          ctx.shadowBlur = 10 * heal * m;
        }
        ctx.fillStyle = fill;
        ctx.fillRect(x - bodyW / 2, top, bodyW, bh);
        ctx.shadowBlur = 0;

        // Green particles escape completed candles during the climb.
        if (
          !reduce &&
          treated &&
          heal > 0.8 &&
          t >= PHASES.escalation.start &&
          t < PHASES.godCandle.start &&
          Math.random() < PARTICLE_ESCAPE_RATE * m * 0.12
        ) {
          spawn({
            x: x + (Math.random() - 0.5) * bodyW,
            y: top,
            type: "green",
            vx: (Math.random() - 0.5) * 20,
            vy: -20 - Math.random() * 40,
            size: 1.5 + Math.random() * 2,
            decay: 0.5,
            color: COLORS.greenParticle,
          });
        }
      }

      return { targetHigh, pad, chartW, slotW, bodyW };
    };

    const drawGodCandle = (
      t: number,
      geom: { pad: ReturnType<typeof chartPad>; slotW: number; bodyW: number },
    ) => {
      const gp =
        (t - PHASES.godCandle.start) /
        (PHASES.godCandle.end - PHASES.godCandle.start);
      const stretch = easeOut(clamp(gp, 0, 1) ** GOD_STRETCH_POWER);
      const x = W - geom.pad.right - geom.slotW * 0.5;
      const baseTop = domainMax; // launches from the current top of the record
      const godHigh =
        baseTop + (domainMax - domainMin) * GOD_CANDLE_MULT * magnitude * stretch;

      const yBase = priceToY(baseMin + baseRange * 0.2);
      const yTop = priceToY(godHigh); // once the domain freezes, this goes < 0

      const w = geom.bodyW * 1.4;
      const grad = ctx.createLinearGradient(0, yTop, 0, yBase);
      grad.addColorStop(0, COLORS.greenBright);
      grad.addColorStop(1, COLORS.green);
      ctx.shadowColor = COLORS.greenBright;
      ctx.shadowBlur = 30;
      ctx.fillStyle = grad;
      ctx.fillRect(x - w / 2, yTop, w, yBase - yTop);
      ctx.shadowBlur = 0;

      // Explosion at the apex of the stretch.
      if (!explosionFired && gp >= GOD_FREEZE_AT + 0.06) {
        explosionFired = true;
        fireExplosion(x, Math.max(yTop, 40));
        audio.climax();
      }
      return { gp };
    };

    const drawParticles = (dt: number) => {
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        // casefiles rain DOWN; green/confetti/purple drift up (negative gravity).
        p.vy += (p.type === "casefile" ? 140 : PARTICLE_GRAVITY) * dt;
        p.vx *= 0.99;
        p.rot += p.vrot * dt;
        p.life -= p.decay * dt;
        if (p.life <= 0 || p.y > H + 60) {
          particles.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = clamp(p.life, 0, 1);
        if (p.type === "checkmark") {
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 2.5;
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.beginPath();
          ctx.moveTo(-p.size * 0.4, 0);
          ctx.lineTo(-p.size * 0.1, p.size * 0.35);
          ctx.lineTo(p.size * 0.45, -p.size * 0.4);
          ctx.stroke();
          ctx.restore();
        } else if (p.type === "casefile") {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size * 0.7, -p.size * 0.5, p.size * 1.4, p.size);
          ctx.fillStyle = "rgba(20,40,30,0.5)";
          ctx.fillRect(-p.size * 0.5, -p.size * 0.28, p.size * 1.0, p.size * 0.12);
          ctx.fillRect(-p.size * 0.5, -p.size * 0.02, p.size * 0.7, p.size * 0.12);
          ctx.restore();
        } else if (p.type === "confetti") {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
          ctx.restore();
        } else {
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      }
    };

    const drawPurpleField = (t: number) => {
      const phase = phaseAt(t);
      const pad = chartPad();
      const chartW = W - pad.left - pad.right;

      // Scanline passes: one in prep, a second in onset.
      const passes: number[] = [];
      if (t >= PHASES.purplePrep.start && t < PHASES.onset.start) {
        passes.push(((t - PHASES.purplePrep.start) * SCANLINE_SPEED) % 1);
      }
      if (t >= PHASES.onset.start && t < PHASES.escalation.start) {
        passes.push(((t - PHASES.onset.start) * SCANLINE_SPEED) % 1);
      }
      for (const sp of passes) {
        const sx = pad.left + sp * chartW;
        const g = ctx.createLinearGradient(sx - SCANLINE_GLOW_PX, 0, sx + SCANLINE_GLOW_PX, 0);
        g.addColorStop(0, "rgba(131,110,249,0)");
        g.addColorStop(0.5, "rgba(131,110,249,0.5)");
        g.addColorStop(1, "rgba(131,110,249,0)");
        ctx.fillStyle = g;
        ctx.fillRect(sx - SCANLINE_GLOW_PX, 0, SCANLINE_GLOW_PX * 2, H);
        ctx.fillStyle = COLORS.purple;
        ctx.fillRect(sx - SCANLINE_WIDTH_PX / 2, 0, SCANLINE_WIDTH_PX, H);
      }

      // Faint purple processing waveform(s) behind the chart. During escalation,
      // several run in parallel across different sections — purple FLOWS.
      const waveCount =
        phase === "escalation" || phase === "peak" ? WAVEFORM_COUNT_PEAK : 1;
      const purpleFade =
        phase === "peak"
          ? 1 - (t - PHASES.peak.start) / (PHASES.peak.end - PHASES.peak.start)
          : phase === "godCandle" || phase === "flatline"
            ? 0.12
            : t >= PHASES.purplePrep.start
              ? 1
              : 0;
      if (purpleFade > 0.01) {
        ctx.globalAlpha = 0.16 * purpleFade;
        ctx.strokeStyle = COLORS.purpleSoft;
        ctx.lineWidth = 1.5;
        for (let w = 0; w < waveCount; w++) {
          const yBase = pad.top + ((w + 1) / (waveCount + 1)) * (H - pad.top - pad.bottom);
          const speed = 2 + w * 0.7;
          const phaseOff = w * 1.7;
          ctx.beginPath();
          for (let px = pad.left; px <= W - pad.right; px += 6) {
            const k = (px - pad.left) / chartW;
            const y =
              yBase +
              Math.sin(k * 22 + t * speed + phaseOff) * WAVEFORM_AMPLITUDE +
              Math.sin(k * 7 - t * 1.5) * WAVEFORM_AMPLITUDE * 0.4;
            if (px === pad.left) ctx.moveTo(px, y);
            else ctx.lineTo(px, y);
          }
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
    };

    const drawEcg = (t: number, beatEnv: number) => {
      const stripY = H - Math.max(H * 0.09, 56);
      const stripH = 36;
      // scroll buffer
      const maxSamples = Math.floor(W);
      ecg.push(phaseAt(t) === "flatline" ? 0 : beatEnv);
      if (ecg.length > maxSamples) ecg = ecg.slice(ecg.length - maxSamples);
      ctx.strokeStyle =
        phaseAt(t) === "flatline" ? COLORS.purpleSoft : COLORS.greenBright;
      ctx.globalAlpha = 0.7;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i < ecg.length; i++) {
        const x = W - ecg.length + i;
        const y = stripY - ecg[i] * stripH;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
    };

    // —— Main loop ————————————————————————————————————————————————————————————
    let raf = 0;
    let startMs = 0;
    let prevMs = 0;
    let beatEnv = 0;
    let doneFired = false;

    const setCaption = (text: string) => {
      if (captionRef.current) captionRef.current.textContent = text;
    };

    const frame = (nowMs: number) => {
      if (!startMs) {
        startMs = nowMs;
        prevMs = nowMs;
      }
      const t = (nowMs - startMs) / 1000;
      const dt = Math.min((nowMs - prevMs) / 1000, 0.05);
      prevMs = nowMs;
      const phase = phaseAt(t);

      // Background + ambient dim.
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = COLORS.bg;
      ctx.fillRect(0, 0, W, H);

      const dim =
        phase === "diagnosisComplete"
          ? SCREEN_DIM_AMOUNT
          : lerp(SCREEN_DIM_AMOUNT, SCREEN_DIM_RECOVER, clamp((t - 2) / 3, 0, 1));
      if (dim > 0.001) {
        ctx.fillStyle = `rgba(0,0,0,${dim})`;
        ctx.fillRect(0, 0, W, H);
      }

      // Purple field behind the chart.
      drawPurpleField(t);

      // Candles + domain rescale (skip lift-freeze during flatline).
      const frozen = phase === "flatline";
      const geom = drawCandles(t);

      // God candle.
      let godFreeze = false;
      if (phase === "godCandle") {
        const { gp } = drawGodCandle(t, geom);
        godFreeze = gp >= GOD_FREEZE_AT;
      }

      // Rescale the domain toward the target — but FREEZE once the god candle
      // passes the freeze point, so it punches off the top (the joke).
      if (!frozen && !godFreeze) {
        const targetMax = geom.targetHigh + baseRange * DOMAIN_HEADROOM;
        domainMax = lerp(domainMax, targetMax, DOMAIN_EASE);
      }

      // Green screen flash at the climax.
      if (phase === "godCandle" && explosionFired) {
        const since = t - (PHASES.godCandle.start + (GOD_FREEZE_AT + 0.06) * 2);
        const flash = clamp(1 - since / 1.4, 0, 1) * GREEN_FLASH_INTENSITY;
        if (flash > 0.01) {
          ctx.fillStyle = `rgba(44,229,107,${flash})`;
          ctx.fillRect(0, 0, W, H);
        }
      }

      // Particles.
      drawParticles(dt);

      // Heartbeat envelope for the ECG (decays every frame, spikes on a beat).
      beatEnv *= 0.86;

      // —— Audio scheduling (heartbeat / blips / swell / flatline). ————————————
      const bpm = bpmAt(t);
      if (bpmRef.current) bpmRef.current.textContent = `${Math.round(bpm)}`;
      if (!reduce) {
        if (phase === "flatline") {
          audio.flatline(true);
          audio.setSwell(0);
        } else {
          audio.flatline(false);
          if (t >= nextBeat) {
            audio.beat(phase === "diagnosisComplete");
            beatEnv = 1;
            nextBeat = t + 60 / bpm;
          }
          // Processing blips during the purple phases.
          if (
            (phase === "purplePrep" || phase === "onset") &&
            t >= nextBlip
          ) {
            audio.blip();
            nextBlip = t + 0.32 + Math.random() * 0.25;
          }
          // Sub-bass swell builds through escalation → peak.
          const swell =
            phase === "escalation" || phase === "peak"
              ? clamp((t - PHASES.escalation.start) / 12, 0, 1)
              : phase === "godCandle"
                ? 1
                : 0;
          audio.setSwell(swell);
        }
      } else if (t >= nextBeat && phase !== "flatline") {
        // reduced-motion never plays audio, but we still keep the ECG alive.
        beatEnv = 1;
        nextBeat = t + 60 / bpm;
      }

      // ECG monitor strip.
      drawEcg(t, beatEnv);

      // Caption + phase transitions.
      if (phase !== lastPhase) {
        lastPhase = phase;
        setCaption(CAPTIONS[phase]);
      }

      if (t >= TOTAL_DURATION) {
        // Hold the triumphant final frame; let particles settle, then idle.
        if (!doneFired) {
          doneFired = true;
          setDone(true);
        }
        if (particles.length === 0) return; // final frame held; stop the loop
      }
      raf = requestAnimationFrame(frame);
    };

    // —— Reduced-motion calm path: resolve gently to the green end-state. ———————
    const renderCalmEndState = () => {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = COLORS.bg;
      ctx.fillRect(0, 0, W, H);
      const pad = chartPad();
      const chartW = W - pad.left - pad.right;
      const slotW = chartW / n;
      const bodyW = Math.max(slotW * (1 - CANDLE_GAP_RATIO), 1);
      // A calm, fully-treated green record — no motion, no flash, no audio.
      const calmMax = baseMax + baseRange * (CLIMB_HEIGHT + DOMAIN_HEADROOM);
      const calmMin = baseMin - baseRange * 0.05;
      const yOf = (p: number) =>
        pad.top +
        (1 - (p - calmMin) / Math.max(calmMax - calmMin, 1e-9)) *
          (H - pad.top - pad.bottom);
      for (let i = 0; i < work.length; i++) {
        const c = work[i];
        const x = pad.left + i * slotW + slotW / 2;
        const lift = CLIMB_HEIGHT * c.cx * baseRange;
        const half = Math.max(Math.abs(c.c - c.o), baseRange * 0.02) / 2;
        const mid = (c.o + c.c) / 2 + lift;
        ctx.strokeStyle = COLORS.green;
        ctx.lineWidth = Math.max(bodyW * 0.14, 1);
        ctx.beginPath();
        ctx.moveTo(x, yOf(mid + half + baseRange * 0.03));
        ctx.lineTo(x, yOf(mid - half - baseRange * 0.03));
        ctx.stroke();
        ctx.fillStyle = COLORS.greenBright;
        const top = yOf(mid + half);
        ctx.fillRect(x - bodyW / 2, top, bodyW, Math.max(yOf(mid - half) - top, CANDLE_MIN_BODY_PX));
      }
      setCaption(CAPTIONS.godCandle);
      if (bpmRef.current) bpmRef.current.textContent = "—";
      setDone(true);
    };

    if (reduce) {
      // Defer past the effect body so we never setState synchronously on mount.
      const rafCalm = requestAnimationFrame(renderCalmEndState);
      window.addEventListener("resize", renderCalmEndState);
      return () => {
        cancelAnimationFrame(rafCalm);
        window.removeEventListener("resize", resize);
        window.removeEventListener("resize", renderCalmEndState);
        window.removeEventListener("pointerdown", unlock);
        audio.dispose();
      };
    }

    setCaption(CAPTIONS.diagnosisComplete);
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointerdown", unlock);
      audio.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candles, denial]);

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#0b100e] text-[#e6f1ea]">
      <canvas ref={canvasRef} className="absolute inset-0" />

      {/* TREATED VIEW — the real-vs-fiction invariant, always present. */}
      <div className="pointer-events-none absolute left-5 top-5 flex items-center gap-2">
        <span className="readout rounded-md border border-[#2ce56b]/40 bg-[#0b100e]/70 px-2.5 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-[#2ce56b]">
          Treated View
        </span>
      </div>

      {/* Monitor readout — deadpan BPM. */}
      <div className="pointer-events-none absolute right-5 top-5 flex items-center gap-2 text-[#7d8e86]">
        <span className="readout text-[0.62rem] uppercase tracking-[0.22em]">BPM</span>
        <span
          ref={bpmRef}
          className="readout text-sm font-semibold tabular-nums text-[#e6f1ea]"
        >
          60
        </span>
      </div>

      {/* Mute control (visible; first tap also unlocks audio if autoplay blocked). */}
      <button
        type="button"
        onClick={() => setMuted((m) => !m)}
        className="absolute bottom-5 right-5 z-10 rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-xs font-medium text-[#e6f1ea] backdrop-blur transition-colors hover:border-white/30"
      >
        {muted ? "Sound off" : "Sound on"}
      </button>

      {/* Deadpan clinical caption. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-16 flex justify-center px-6">
        <p
          ref={captionRef}
          className="readout text-center text-sm font-medium tracking-wide text-[#e6f1ea] sm:text-base"
        >
          {CAPTIONS.diagnosisComplete}
        </p>
      </div>

      {/* Held end-state affordance appears once treatment completes. */}
      {done && (
        <div className="pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-1/2 justify-center">
          <span className="readout rounded-full border border-[#2ce56b]/30 bg-[#0b100e]/60 px-4 py-1.5 text-[0.62rem] uppercase tracking-[0.24em] text-[#2ce56b]">
            Treatment complete
          </span>
        </div>
      )}
    </div>
  );
}
