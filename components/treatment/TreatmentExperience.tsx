"use client";

import Link from "next/link";
import * as Tone from "tone";
import { useEffect, useRef, useState } from "react";

import type { Candle } from "@/lib/diagnosis";

/**
 * Beat 6 — the treatment. Definitive continuity model:
 *
 *  • PRE-ROLL: the patient's EXACT beat-5 record, full-screen, same candle
 *    language (real red/green), held ~2s so it reads as "my chart, now full".
 *  • The real candles are HONEST HISTORY — never recoloured, never altered, for
 *    the whole sequence (kept intact/visible for a later RELAPSE).
 *  • TREATMENT (30s): green candles APPEND to the right end in a continuous
 *    succession. What escalates is CANDLE SIZE — flat (0-5s, same size as the
 *    real ones) → moderate (5-10s) → much bigger (10-20s) → enormous (20-27s)
 *    into an absurd banana, then a 27-28s flatline dip and a 28-30s god candle
 *    that punches off-frame with a full explosion. Appended candles materialise
 *    ONE AT A TIME, live — nothing about the climb is visible before it happens.
 *  • Appended candles are drawn in the EXACT same visual language as the real
 *    ones (same width/proportions/spacing), differing only in colour (green) and
 *    height — one seamless chart healing, not "chart + animation".
 *  • PURPLE runs as AMBIENT INFRASTRUCTURE beneath the entire 30s (waveform,
 *    processing glow at the print head, slow scan) — the mechanism producing the
 *    green. Never named as blockchain.
 *  • ZOOM-OUT: the view continuously rescales so real history + green banana stay
 *    fully visible; the banana climbs so high the real chart ends up a tiny
 *    footnote in the bottom-left (deliberate gag). The god candle is the one
 *    thing allowed to break the frame.
 *
 * Magnitude scales with denial (100 − Reality Acceptance): higher denial = bigger
 * candles, steeper banana, tinier resulting real chart. Duration is fixed 30s.
 * Functional pass for live tuning — every parameter is a constant below.
 */

/* ============================================================================
 * TUNING CONSTANTS
 * ========================================================================== */

// —— Timing (seconds) ——————————————————————————————————————————————————————
const PREROLL_DURATION = 2.0; // hold on the real chart before the clock starts
const TOTAL_DURATION = 30; // treatment clock
const PHASES = {
  flat: { start: 0, end: 5 }, // greens append at real-candle size (sneaks in)
  moderate: { start: 5, end: 10 }, // larger
  high: { start: 10, end: 20 }, // much bigger; storm begins ramping
  absurd: { start: 20, end: 27 }, // enormous → banana
  flatline: { start: 27, end: 28 }, // freeze + monitor tone (the one dip)
  godCandle: { start: 28, end: 30 }, // god candle off-frame + climax explosion
} as const;

// —— Denial → magnitude —————————————————————————————————————————————————————
const DENIAL_MAGNITUDE_MIN = 0.7; // at denial 0
const DENIAL_MAGNITUDE_MAX = 1.9; // at denial 100
const DENIAL_SCALING = 1.0;

// —— Real chart continuity (match beat-5 Lightweight Charts styling) ———————————
const REAL_UP = "#2f9e6a"; // beat-5 up candle
const REAL_DOWN = "#d83a3f"; // beat-5 down candle (diagnosis --clinic-alert)
const CANDLE_WINDOW = 400; // effectively "all of it" — same series as beat 5
const CANDLE_GAP_RATIO = 0.26; // gap as a fraction of a slot (body = 74% of slot)
const WICK_WIDTH_RATIO = 0.14; // wick thickness relative to body width
const CANDLE_MIN_BODY_PX = 2;
const BG = "#0b100e"; // full-screen clinical dark (candles carry continuity)

// —— Append cadence + per-candle grow-in ——————————————————————————————————————
const APPEND_INTERVAL_MAX = 0.42; // s between prints early
const APPEND_INTERVAL_MIN = 0.24; // s between prints late (rapid succession)
const APPEND_GROW_DUR = 0.14; // s each new candle takes to print in

// —— Size escalation (multiplier on the average real candle body, × magnitude) ——
// Anchored per phase; the loop lerps between anchors for a continuous slow boil.
const SIZE_FLAT = 1.0; // 0–5s: identical size to the real candles
const SIZE_MODERATE = 2.6; // 5–10s
const SIZE_HIGH = 7.0; // 10–20s
const SIZE_ABSURD = 26.0; // 20–27s: enormous
const WICK_SCALE = 1.0; // scale the (proportional) green wick vs. the real ratio

// —— Zoom-out (keep the whole chart visible; god candle is the exception) ———————
const DOMAIN_HEADROOM = 0.12; // headroom above the tallest visible candle
const DOMAIN_EASE = 0.16; // vertical rescale smoothing (never allowed to clip)
const SLOT_EASE = 0.18; // horizontal rescale smoothing as candles are added

// —— God candle ————————————————————————————————————————————————————————————
const GOD_EXTRA_MULT = 4.5; // final high, as multiples of the frozen domain × mag
const GOD_FREEZE_AT = 0.5; // stretch progress where the domain STOPS (punch-off)
const GOD_STRETCH_POWER = 2.4;

// —— Purple ambient infrastructure (beneath the whole 30s) ————————————————————
const PURPLE_WAVES = 3; // stacked processing waveforms behind the chart
const PURPLE_WAVE_AMP = 15;
const PURPLE_WAVE_ALPHA = 0.15;
const PURPLE_SCAN_SPEED = 0.12; // slow continuous scan (viewport-widths/sec)
const PURPLE_HEAD_GLOW = 60; // px radius of the processing glow at the print head
const PURPLE_CLIMAX_FADE = 0.25; // purple dims to this (stays faint) at the climax

// —— Continuous storm envelope (particles/fireworks/wash/audio bed, 10s → 30s) ——
const STORM_START = 10;
const STORM_POWER = 1.7; // >1 = builds slow then accelerates
const STORM_DENIAL_STEEPEN = 0.5;
const STORM_AMP_MIN = 0.85;
const STORM_AMP_MAX = 1.5;
const STORM_FLATLINE_DUCK = 0.06;

// —— Particles ——————————————————————————————————————————————————————————————
const PARTICLE_MAX = 2600;
const EMIT_RATE_BASE = 5.0; // green particles/frame at env=1, mag=1 (from print head)
const EMIT_SIZE_MIN = 2;
const EMIT_SIZE_MAX = 6;
const EMIT_SPEED = 46;
const EMIT_DECAY = 0.4;

// —— Fireworks (sparse ~15s → dense into the finale) ——————————————————————————
const FIREWORK_START = 15;
const FIREWORK_INTERVAL_MAX = 2.2;
const FIREWORK_INTERVAL_MIN = 0.28;
const FIREWORK_BURST = 46;
const FIREWORK_SPEED = 260;
const FIREWORK_DECAY = 0.5;

// —— Climax explosion (abundant + HELD to screenshot) —————————————————————————
const EXPLOSION_RINGS = 6;
const EXPLOSION_GREEN = 520; // × magnitude
const EXPLOSION_CONFETTI = 220;
const EXPLOSION_CHECKMARKS = 16;
const EXPLOSION_CASEFILES = 14;
const EXPLOSION_PURPLE = 70;
const EXPLOSION_SPEED = 340;
const EXPLOSION_DECAY = 0.16; // slow → ~6s hold
const EXPLOSION_GREEN_SIZE: [number, number] = [3, 9];
const EXPLOSION_CONFETTI_SIZE: [number, number] = [4, 10];
const CASEFILE_FALL = 150;
const GREEN_FLASH_INTENSITY = 0.85;
const GREEN_FLASH_FADE = 1.9;
const GREEN_SATURATION_MAX = 0.15;

// —— Heartbeat (bpm anchors on the treatment clock; loop interpolates) —————————
const HEARTBEAT_BPM = {
  preRoll: 60,
  flatEnd: 66,
  moderateEnd: 80,
  highEnd: 112,
  absurdEnd: 138,
  flatline: 150,
  climax: 150,
} as const;
const HEARTBEAT_DUB_DELAY = 0.14;

// —— Audio ——————————————————————————————————————————————————————————————————
const AUDIO = {
  masterDb: -6,
  heartbeatDb: -8,
  blipDb: -24,
  bedMax: 0.5,
  subMax: 0.62,
  filterMin: 200,
  filterMax: 2600,
  flatlineDb: -13,
  flatlineHz: 660,
  climaxDb: -5,
  reverbDecay: 4.2,
  reverbWet: 0.36,
} as const;

// —— Colours ———————————————————————————————————————————————————————————————
const COLORS = {
  green: "#22c063",
  greenBright: "#2ce56b",
  greenParticle: "#8affc0",
  greenGlow: "#3dff86",
  purple: "#836ef9",
  purpleSoft: "#a996ff",
  gridLine: "rgba(150,170,160,0.05)",
  checkmark: "#8affc0",
  casefile: "#eef6f0",
  confetti: ["#2ce56b", "#8affc0", "#a996ff", "#eef6f0", "#22c063"],
} as const;

// —— Deadpan clinical captions (no exclamation, ever) ——————————————————————————
const CAPTIONS = {
  preRoll: "Preparing Visual Rehabilitation Protocol…",
  flat: "Administering corrective candles…",
  moderate: "Treatment responding.",
  high: "Patient responding favourably.",
  absurd: "Recovery accelerating.",
  flatline: "",
  godCandle: "Visual rehabilitation completed successfully.",
} as const;

/* ============================================================================
 * Types + helpers
 * ========================================================================== */

type PhaseName = keyof typeof PHASES;

interface RealCandle {
  o: number;
  h: number;
  l: number;
  c: number;
}
interface AppendCandle {
  o: number;
  h: number;
  l: number;
  c: number;
  birth: number; // treatment-clock time it printed
}
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  decay: number;
  size: number;
  type: "green" | "purple" | "checkmark" | "casefile" | "confetti";
  color: string;
  rot: number;
  vrot: number;
  gravity: number;
}

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(n, hi));
const lerp = (a: number, b: number, t: number) => a + (b - a) * clamp(t, 0, 1);
const easeOut = (t: number) => 1 - (1 - t) ** 3;
const rand = (a: number, b: number) => a + Math.random() * (b - a);

function phaseAt(t: number): PhaseName {
  const names = Object.keys(PHASES) as PhaseName[];
  for (const name of names) {
    if (t >= PHASES[name].start && t < PHASES[name].end) return name;
  }
  return "godCandle";
}

/** Size multiplier (× average real body) at treatment time t — continuous. */
function sizeMultAt(t: number): number {
  if (t <= PHASES.flat.end) return SIZE_FLAT;
  if (t <= PHASES.moderate.end)
    return lerp(SIZE_FLAT, SIZE_MODERATE, (t - 5) / 5);
  if (t <= PHASES.high.end)
    return lerp(SIZE_MODERATE, SIZE_HIGH, (t - 10) / 10);
  if (t <= PHASES.absurd.end)
    return lerp(SIZE_HIGH, SIZE_ABSURD, (t - 20) / 7);
  return SIZE_ABSURD;
}

/** Append cadence — shortens over time so the finale is a rapid succession. */
function intervalAt(t: number): number {
  return lerp(APPEND_INTERVAL_MAX, APPEND_INTERVAL_MIN, clamp(t / 27, 0, 1));
}

function bpmAt(t: number): number {
  const H = HEARTBEAT_BPM;
  if (t < 0) return H.preRoll;
  if (t < PHASES.flat.end) return lerp(H.preRoll, H.flatEnd, t / 5);
  if (t < PHASES.moderate.end) return lerp(H.flatEnd, H.moderateEnd, (t - 5) / 5);
  if (t < PHASES.high.end) return lerp(H.moderateEnd, H.highEnd, (t - 10) / 10);
  if (t < PHASES.absurd.end) return lerp(H.highEnd, H.absurdEnd, (t - 20) / 7);
  if (t < PHASES.flatline.end) return H.flatline;
  return H.climax;
}

/* ============================================================================
 * Audio — heartbeat + ambient processing blips + warm bed + euphoric bloom.
 * Defensive: a suspended context degrades to silence and never throws.
 * ========================================================================== */

class TreatmentAudio {
  private ready = false;
  private master?: Tone.Volume;
  private reverb?: Tone.Reverb;
  private heart?: Tone.MembraneSynth;
  private blipSynth?: Tone.Synth;
  private droneOscs: Tone.Oscillator[] = [];
  private droneGain?: Tone.Gain;
  private droneFilter?: Tone.Filter;
  private subOsc?: Tone.Oscillator;
  private subGain?: Tone.Gain;
  private flatOsc?: Tone.Oscillator;
  private flatGain?: Tone.Gain;
  private bloomSynth?: Tone.PolySynth;
  private flatlineActive = false;

  async init(): Promise<boolean> {
    try {
      await Tone.start();
      this.master = new Tone.Volume(AUDIO.masterDb).toDestination();
      this.reverb = new Tone.Reverb({ decay: AUDIO.reverbDecay, wet: AUDIO.reverbWet }).connect(
        this.master,
      );

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

      this.droneGain = new Tone.Gain(0);
      this.droneFilter = new Tone.Filter(AUDIO.filterMin, "lowpass").connect(this.reverb);
      this.droneGain.connect(this.droneFilter);
      for (const f of [65.41, 98.0, 130.81, 164.81]) {
        const o = new Tone.Oscillator(f, "sawtooth");
        o.detune.value = rand(-8, 8);
        o.volume.value = -12;
        o.connect(this.droneGain);
        o.start();
        this.droneOscs.push(o);
      }

      this.subGain = new Tone.Gain(0).connect(this.master);
      this.subOsc = new Tone.Oscillator(32.7, "sine").connect(this.subGain);
      this.subOsc.start();

      this.flatGain = new Tone.Gain(0).connect(this.master);
      this.flatOsc = new Tone.Oscillator(AUDIO.flatlineHz, "sine").connect(this.flatGain);
      this.flatOsc.start();

      this.bloomSynth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: "fattriangle", spread: 30, count: 3 },
        envelope: { attack: 0.35, decay: 1.2, sustain: 0.6, release: 3.6 },
      }).connect(this.reverb);
      this.bloomSynth.volume.value = AUDIO.climaxDb;

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
      this.blipSynth.triggerAttackRelease(520 + Math.floor(Math.random() * 320), "32n", Tone.now(), 0.5);
    } catch {
      /* no-op */
    }
  }

  setEscalation(level: number) {
    if (!this.ready) return;
    const l = clamp(level, 0, 1);
    try {
      this.droneGain?.gain.rampTo(l * AUDIO.bedMax, 0.2);
      this.droneFilter?.frequency.rampTo(lerp(AUDIO.filterMin, AUDIO.filterMax, l), 0.3);
      this.subGain?.gain.rampTo(l * AUDIO.subMax, 0.2);
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
      if (on) {
        this.droneGain?.gain.rampTo(AUDIO.bedMax * 0.08, 0.08);
        this.subGain?.gain.rampTo(0, 0.08);
      }
    } catch {
      /* no-op */
    }
  }

  bloom() {
    if (!this.ready) return;
    try {
      this.bloomSynth?.triggerAttackRelease(["C3", "G3", "C4", "E4", "G4", "D5"], "1n", Tone.now(), 0.9);
      this.droneGain?.gain.rampTo(AUDIO.bedMax, 0.15);
      this.subGain?.gain.rampTo(AUDIO.subMax, 0.15);
      this.droneFilter?.frequency.rampTo(AUDIO.filterMax, 0.2);
    } catch {
      /* no-op */
    }
  }

  dispose() {
    this.ready = false;
    const nodes: Array<{ dispose: () => void } | undefined> = [
      this.heart,
      this.blipSynth,
      this.droneGain,
      this.droneFilter,
      this.subOsc,
      this.subGain,
      this.flatOsc,
      this.flatGain,
      this.bloomSynth,
      this.reverb,
      this.master,
      ...this.droneOscs,
    ];
    for (const node of nodes) {
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

  const denialNorm = clamp(denial, 0, 100) / 100;
  const magnitude = lerp(DENIAL_MAGNITUDE_MIN, DENIAL_MAGNITUDE_MAX, denialNorm) * DENIAL_SCALING;

  useEffect(() => {
    muteRef.current = muted;
  }, [muted]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // —— Real data (the SAME series beat 5 rendered). ————————————————————————
    const src = candles.slice(-CANDLE_WINDOW);
    const n = Math.max(src.length, 1);
    const priceVals = src.flatMap((c) => [c.h, c.l]);
    const baseMin = priceVals.length ? Math.min(...priceVals) : 0;
    const baseMax = priceVals.length ? Math.max(...priceVals) : 1;
    const baseRange = Math.max(baseMax - baseMin, 1e-9);
    const real: RealCandle[] = src.map((c) => ({ o: c.o, h: c.h, l: c.l, c: c.c }));
    const lastRealClose = real[real.length - 1]?.c ?? baseMax;

    // Average real candle geometry — the appended greens copy these proportions.
    const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
    const realBody = Math.max(mean(real.map((c) => Math.abs(c.c - c.o))), baseRange * 0.02);
    const upWick = Math.max(mean(real.map((c) => c.h - Math.max(c.o, c.c))), baseRange * 0.004);
    const dnWick = Math.max(mean(real.map((c) => Math.min(c.o, c.c) - c.l)), baseRange * 0.004);
    const wickRatioUp = upWick / realBody;
    const wickRatioDn = dnWick / realBody;

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

    // —— Runtime state ————————————————————————————————————————————————————————
    const appended: AppendCandle[] = [];
    const particles: Particle[] = [];
    let nextAppend = 0;
    const domainMin = baseMin - baseRange * 0.06;
    let domainMax = baseMax + baseRange * DOMAIN_HEADROOM;
    let dispSlots = n; // eased visible-slot count (horizontal zoom-out)
    let frozenDomainMax = 0; // captured when the god candle takes over
    let nextBeat = 0;
    let nextBlip = 0;
    let nextFirework = FIREWORK_START;
    let explosionFired = false;
    let lastPhaseKey = "";
    let ecg: number[] = [];

    const audio = new TreatmentAudio();
    if (!reduce) void audio.init().then((ok) => ok && audio.setMute(muteRef.current));
    const unlock = () => {
      if (!reduce) void audio.init().then((ok) => ok && audio.setMute(muteRef.current));
    };
    window.addEventListener("pointerdown", unlock, { once: true });

    const pad = () => ({
      left: 34,
      right: 34,
      top: Math.max(H * 0.1, 64),
      bottom: Math.max(H * 0.16, 96),
    });
    const priceToY = (p: number) => {
      const pd = pad();
      const chartH = H - pd.top - pd.bottom;
      return pd.top + (1 - (p - domainMin) / Math.max(domainMax - domainMin, 1e-9)) * chartH;
    };

    const stormEnv = (t: number): number => {
      if (t < STORM_START) return 0;
      const raw = clamp((t - STORM_START) / (TOTAL_DURATION - STORM_START), 0, 1);
      const power = STORM_POWER * (1 - STORM_DENIAL_STEEPEN * denialNorm);
      const amp = lerp(STORM_AMP_MIN, STORM_AMP_MAX, denialNorm);
      let env = raw ** power * amp;
      if (t >= PHASES.flatline.start && t < PHASES.flatline.end) env *= STORM_FLATLINE_DUCK;
      return env;
    };

    // —— Particles ————————————————————————————————————————————————————————————
    const spawn = (p: Partial<Particle> & Pick<Particle, "x" | "y" | "type">) => {
      if (particles.length >= PARTICLE_MAX) return;
      particles.push({
        vx: 0,
        vy: 0,
        life: 1,
        decay: 0.5,
        size: 3,
        color: COLORS.greenParticle,
        rot: 0,
        vrot: 0,
        gravity: 30,
        ...p,
      });
    };
    const firework = (x: number, y: number, count: number, speed: number, decay: number) => {
      const rings = 1 + Math.floor(Math.random() * 2);
      for (let r = 0; r < rings; r++) {
        const sp = speed * (0.6 + r * 0.35);
        for (let i = 0; i < count; i++) {
          const a = (i / count) * Math.PI * 2 + Math.random() * 0.2;
          const col =
            Math.random() > 0.82 ? COLORS.purpleSoft : Math.random() > 0.5 ? COLORS.greenBright : COLORS.greenParticle;
          spawn({ x, y, type: "green", vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, size: rand(2, 5), decay, color: col, gravity: 30 });
        }
      }
    };
    const fireExplosion = () => {
      const m = magnitude;
      const cx = W * 0.5;
      const cy = H * 0.42;
      for (let r = 0; r < EXPLOSION_RINGS; r++) {
        firework(rand(W * 0.2, W * 0.8), rand(H * 0.2, H * 0.6), Math.round(40 * m), EXPLOSION_SPEED * rand(0.7, 1.2), EXPLOSION_DECAY);
      }
      for (let i = 0; i < EXPLOSION_GREEN * m; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = rand(40, EXPLOSION_SPEED) * (0.5 + Math.random());
        spawn({ x: cx, y: cy, type: "green", vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 60, size: rand(EXPLOSION_GREEN_SIZE[0], EXPLOSION_GREEN_SIZE[1]), decay: EXPLOSION_DECAY * rand(0.8, 1.4), color: Math.random() > 0.5 ? COLORS.greenBright : COLORS.green, gravity: 20 });
      }
      for (let i = 0; i < EXPLOSION_CONFETTI * m; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = rand(60, EXPLOSION_SPEED);
        spawn({ x: cx, y: cy, type: "confetti", vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 80, size: rand(EXPLOSION_CONFETTI_SIZE[0], EXPLOSION_CONFETTI_SIZE[1]), decay: EXPLOSION_DECAY * rand(1, 1.6), color: COLORS.confetti[i % COLORS.confetti.length], rot: Math.random() * Math.PI, vrot: rand(-2, 2), gravity: 90 });
      }
      for (let i = 0; i < EXPLOSION_CHECKMARKS * m; i++) {
        spawn({ x: rand(W * 0.1, W * 0.9), y: rand(H * 0.2, H * 0.7), type: "checkmark", vx: rand(-30, 30), vy: rand(-70, -20), size: rand(20, 40), decay: EXPLOSION_DECAY * 0.8, color: COLORS.checkmark, rot: rand(-0.3, 0.3), vrot: rand(-0.5, 0.5), gravity: -8 });
      }
      for (let i = 0; i < EXPLOSION_CASEFILES * m; i++) {
        spawn({ x: rand(0, W), y: rand(-260, -20), type: "casefile", vx: rand(-20, 20), vy: rand(30, 90), size: rand(30, 50), decay: 0.1, color: COLORS.casefile, rot: rand(-0.5, 0.5), vrot: rand(-0.7, 0.7), gravity: CASEFILE_FALL });
      }
      for (let i = 0; i < EXPLOSION_PURPLE * m; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = rand(30, 200);
        spawn({ x: cx, y: cy, type: "purple", vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, size: rand(1.5, 3.5), decay: EXPLOSION_DECAY * 1.2, color: COLORS.purpleSoft, gravity: 10 });
      }
    };

    // —— Candle drawing (SHARED by real + appended → identical language). ————————
    const drawCandle = (
      slotIndex: number,
      slotW: number,
      o: number,
      c: number,
      h: number,
      l: number,
      fill: string,
      wickCol: string,
      glow: number,
    ) => {
      const bodyW = Math.max(slotW * (1 - CANDLE_GAP_RATIO), 1);
      const x = pad().left + (slotIndex + 0.5) * slotW;
      ctx.strokeStyle = wickCol;
      ctx.lineWidth = Math.max(bodyW * WICK_WIDTH_RATIO, 1);
      ctx.beginPath();
      ctx.moveTo(x, priceToY(h));
      ctx.lineTo(x, priceToY(l));
      ctx.stroke();
      const yO = priceToY(o);
      const yC = priceToY(c);
      const top = Math.min(yO, yC);
      const bh = Math.max(Math.abs(yC - yO), CANDLE_MIN_BODY_PX);
      if (glow > 0) {
        ctx.shadowColor = COLORS.greenGlow;
        ctx.shadowBlur = glow;
      }
      ctx.fillStyle = fill;
      ctx.fillRect(x - bodyW / 2, top, bodyW, bh);
      ctx.shadowBlur = 0;
    };

    const drawPurpleAmbient = (t: number, headX: number, fade: number) => {
      const pd = pad();
      const chartW = W - pd.left - pd.right;
      // Slow continuous scan.
      const sx = pd.left + ((t * PURPLE_SCAN_SPEED) % 1) * chartW;
      const g = ctx.createLinearGradient(sx - 30, 0, sx + 30, 0);
      g.addColorStop(0, "rgba(131,110,249,0)");
      g.addColorStop(0.5, `rgba(131,110,249,${0.2 * fade})`);
      g.addColorStop(1, "rgba(131,110,249,0)");
      ctx.fillStyle = g;
      ctx.fillRect(sx - 30, 0, 60, H);
      // Processing waveforms behind the chart.
      ctx.globalAlpha = PURPLE_WAVE_ALPHA * fade;
      ctx.strokeStyle = COLORS.purpleSoft;
      ctx.lineWidth = 1.5;
      for (let w = 0; w < PURPLE_WAVES; w++) {
        const yBase = pd.top + ((w + 1) / (PURPLE_WAVES + 1)) * (H - pd.top - pd.bottom);
        const speed = 2 + w * 0.7;
        ctx.beginPath();
        for (let px = pd.left; px <= W - pd.right; px += 6) {
          const k = (px - pd.left) / chartW;
          const y = yBase + Math.sin(k * 22 + t * speed + w * 1.7) * PURPLE_WAVE_AMP + Math.sin(k * 7 - t * 1.5) * PURPLE_WAVE_AMP * 0.4;
          if (px === pd.left) ctx.moveTo(px, y);
          else ctx.lineTo(px, y);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      // Processing glow at the print head (where the newest candle emerges).
      if (headX > 0) {
        const rg = ctx.createRadialGradient(headX, H * 0.5, 0, headX, H * 0.5, PURPLE_HEAD_GLOW);
        rg.addColorStop(0, `rgba(131,110,249,${0.22 * fade})`);
        rg.addColorStop(1, "rgba(131,110,249,0)");
        ctx.fillStyle = rg;
        ctx.fillRect(headX - PURPLE_HEAD_GLOW, 0, PURPLE_HEAD_GLOW * 2, H);
      }
    };

    const drawEcg = (t: number, beatEnv: number, flat: boolean) => {
      const stripY = H - Math.max(H * 0.07, 42);
      const stripH = 32;
      const maxSamples = Math.floor(W);
      ecg.push(flat ? 0 : beatEnv);
      if (ecg.length > maxSamples) ecg = ecg.slice(ecg.length - maxSamples);
      ctx.strokeStyle = flat ? COLORS.purpleSoft : COLORS.greenBright;
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
      const E = (nowMs - startMs) / 1000;
      const t = E - PREROLL_DURATION; // treatment clock (negative during pre-roll)
      const dt = Math.min((nowMs - prevMs) / 1000, 0.05);
      prevMs = nowMs;
      const inTreatment = t >= 0;
      const phase = inTreatment ? phaseAt(t) : "flat";
      const flat = inTreatment && phase === "flatline";
      const godActive = inTreatment && phase === "godCandle";
      const env = inTreatment ? stormEnv(t) : 0;

      // Background.
      ctx.fillStyle = BG;
      ctx.fillRect(0, 0, W, H);

      // —— Append new green candles LIVE (nothing pre-drawn). ————————————————————
      if (inTreatment) {
        while (t < PHASES.flatline.start && t >= nextAppend) {
          const mult = sizeMultAt(nextAppend);
          const body = realBody * mult * magnitude;
          const open = appended.length ? appended[appended.length - 1].c : lastRealClose;
          const close = open + body;
          appended.push({
            o: open,
            c: close,
            h: close + body * wickRatioUp * WICK_SCALE,
            l: open - body * wickRatioDn * WICK_SCALE,
            birth: nextAppend,
          });
          nextAppend += intervalAt(nextAppend);
        }
      }

      // —— Horizontal zoom-out (eased slot count). ———————————————————————————————
      const targetSlots = n + appended.length + (godActive ? 1 : 0);
      dispSlots = lerp(dispSlots, targetSlots, SLOT_EASE);
      const pd = pad();
      const chartW = W - pd.left - pd.right;
      const slotW = chartW / Math.max(dispSlots, 1);

      // —— Vertical zoom-out: keep everything visible (never clip), except the
      //    god candle, which is allowed to break the frame. —————————————————————
      let visibleMaxHigh = baseMax;
      for (const a of appended) visibleMaxHigh = Math.max(visibleMaxHigh, a.h);
      if (godActive) {
        if (frozenDomainMax === 0) frozenDomainMax = domainMax;
      } else {
        const target = visibleMaxHigh + baseRange * DOMAIN_HEADROOM;
        domainMax = lerp(domainMax, target, DOMAIN_EASE);
        if (domainMax < visibleMaxHigh + baseRange * DOMAIN_HEADROOM * 0.3) {
          domainMax = visibleMaxHigh + baseRange * DOMAIN_HEADROOM * 0.3; // no clip
        }
      }

      // Purple ambient beneath the chart — ONLY during treatment (the pre-roll is
      // just the honest chart). Fades but never vanishes at the climax.
      if (inTreatment) {
        const headX = pd.left + (n + appended.length - 0.5) * slotW;
        drawPurpleAmbient(t, Math.min(headX, W), godActive ? PURPLE_CLIMAX_FADE : 1);
      }

      // —— Real candles — UNTOUCHED honest history. ——————————————————————————————
      for (let i = 0; i < real.length; i++) {
        const c = real[i];
        const up = c.c >= c.o;
        drawCandle(i, slotW, c.o, c.c, c.h, c.l, up ? REAL_UP : REAL_DOWN, up ? REAL_UP : REAL_DOWN, 0);
      }

      // —— Appended greens — identical language, only colour + height differ. ——————
      for (let j = 0; j < appended.length; j++) {
        const a = appended[j];
        const growF = clamp((t - a.birth) / APPEND_GROW_DUR, 0, 1); // prints in live
        const mid = (a.o + a.c) / 2;
        const half = ((a.c - a.o) / 2) * growF;
        drawCandle(
          n + j,
          slotW,
          mid - half,
          mid + half,
          a.h,
          a.l,
          growF < 1 ? COLORS.greenBright : COLORS.green,
          COLORS.green,
          6 * magnitude * growF,
        );
        // Green particles stream from the print head as the storm builds.
        if (!reduce && j >= appended.length - 2 && env > 0 && !flat && Math.random() < EMIT_RATE_BASE * env * magnitude * 0.05) {
          spawn({
            x: pd.left + (n + j + 0.5) * slotW,
            y: priceToY(a.c),
            type: "green",
            vx: rand(-16, 16),
            vy: -EMIT_SPEED * rand(0.6, 1.3),
            size: lerp(EMIT_SIZE_MIN, EMIT_SIZE_MAX, clamp(env, 0, 1)),
            decay: EMIT_DECAY,
            color: COLORS.greenParticle,
            gravity: -12,
          });
        }
      }

      // —— God candle — the one thing that breaks the frame. ————————————————————
      if (godActive) {
        const gp = (t - PHASES.godCandle.start) / (PHASES.godCandle.end - PHASES.godCandle.start);
        const stretch = easeOut(clamp(gp, 0, 1) ** GOD_STRETCH_POWER);
        const open = appended.length ? appended[appended.length - 1].c : lastRealClose;
        const godHigh = frozenDomainMax + (frozenDomainMax - domainMin) * GOD_EXTRA_MULT * magnitude * stretch;
        const idx = n + appended.length;
        const x = pd.left + (idx + 0.5) * slotW;
        const bodyW = Math.max(slotW * (1 - CANDLE_GAP_RATIO), 1) * 1.4;
        const yTop = priceToY(godHigh);
        const yBase = priceToY(open);
        const grad = ctx.createLinearGradient(0, Math.min(yTop, 0), 0, yBase);
        grad.addColorStop(0, COLORS.greenBright);
        grad.addColorStop(1, COLORS.green);
        ctx.shadowColor = COLORS.greenGlow;
        ctx.shadowBlur = 34;
        ctx.fillStyle = grad;
        ctx.fillRect(x - bodyW / 2, yTop, bodyW, yBase - yTop);
        ctx.shadowBlur = 0;
        if (!explosionFired && !reduce && gp >= GOD_FREEZE_AT + 0.05) {
          explosionFired = true;
          fireExplosion();
          audio.bloom();
        }
      }

      // Progressive green wash.
      const wash = clamp(env, 0, 1) * GREEN_SATURATION_MAX;
      if (wash > 0.005) {
        ctx.fillStyle = `rgba(34,192,99,${wash})`;
        ctx.fillRect(0, 0, W, H);
      }

      // Continuous fireworks (15s → flatline), then the god candle takes over.
      if (!reduce && inTreatment && t >= FIREWORK_START && t < PHASES.flatline.start) {
        if (t >= nextFirework + 2) nextFirework = t; // resync after a tab stall
        while (t >= nextFirework) {
          const e = clamp(env, 0.05, 1.4);
          firework(rand(W * 0.15, W * 0.85), rand(H * 0.15, H * 0.6), Math.round(FIREWORK_BURST * clamp(e, 0.2, 1.4) * magnitude * 0.5), FIREWORK_SPEED * rand(0.7, 1.1), FIREWORK_DECAY);
          nextFirework += lerp(FIREWORK_INTERVAL_MAX, FIREWORK_INTERVAL_MIN, clamp(e, 0, 1));
        }
      }

      // Green screen-flash at the climax.
      if (godActive && explosionFired) {
        const since = t - (PHASES.godCandle.start + (GOD_FREEZE_AT + 0.05) * 2);
        const flash = clamp(1 - since / GREEN_FLASH_FADE, 0, 1) * GREEN_FLASH_INTENSITY;
        if (flash > 0.01) {
          ctx.fillStyle = `rgba(61,255,134,${flash})`;
          ctx.fillRect(0, 0, W, H);
        }
      }

      // —— Particles (drawn last, on top). ——————————————————————————————————————
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += p.gravity * dt;
        p.vx *= 0.992;
        p.rot += p.vrot * dt;
        p.life -= p.decay * dt;
        if (p.life <= 0 || p.y > H + 80 || p.x < -80 || p.x > W + 80) {
          particles.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = clamp(p.life, 0, 1);
        if (p.type === "checkmark") {
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 3;
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

      // —— Audio. ————————————————————————————————————————————————————————————————
      beatEnv *= 0.86;
      const bpm = bpmAt(t);
      if (bpmRef.current) bpmRef.current.textContent = `${Math.round(bpm)}`;
      if (!reduce) {
        if (flat) {
          audio.flatline(true);
        } else {
          audio.flatline(false);
          if (E >= nextBeat) {
            audio.beat(!inTreatment);
            beatEnv = 1;
            nextBeat = E + 60 / bpm;
          }
          if (inTreatment && E >= nextBlip) {
            audio.blip();
            nextBlip = E + (t < 10 ? 0.5 : 0.9) + Math.random() * 0.4; // ambient processing
          }
          audio.setEscalation(clamp(env, 0, 1));
        }
      } else if (E >= nextBeat && !flat) {
        beatEnv = 1;
        nextBeat = E + 60 / bpm;
      }

      drawEcg(t, beatEnv, flat);

      // Caption.
      const capKey = inTreatment ? phase : "preRoll";
      if (capKey !== lastPhaseKey) {
        lastPhaseKey = capKey;
        setCaption(CAPTIONS[capKey as keyof typeof CAPTIONS]);
      }

      if (t >= TOTAL_DURATION) {
        if (!doneFired) {
          doneFired = true;
          setDone(true);
        }
        if (particles.length === 0) return; // hold the final frame; stop looping
      }
      raf = requestAnimationFrame(frame);
    };

    // —— Reduced-motion: resolve gently to the static green end-state. ————————————
    const renderCalmEndState = () => {
      ctx.fillStyle = BG;
      ctx.fillRect(0, 0, W, H);
      // Build the full banana statically (same as a completed run, no motion).
      const built: AppendCandle[] = [];
      let openP = lastRealClose;
      for (let ta = 0; ta < PHASES.flatline.start; ta += intervalAt(ta)) {
        const body = realBody * sizeMultAt(ta) * magnitude;
        const close = openP + body;
        built.push({ o: openP, c: close, h: close + body * wickRatioUp * WICK_SCALE, l: openP - body * wickRatioDn * WICK_SCALE, birth: ta });
        openP = close;
      }
      const total = n + built.length;
      const pd = pad();
      const chartW = W - pd.left - pd.right;
      const slotW = chartW / total;
      const calmMax = (built.length ? built[built.length - 1].h : baseMax) + baseRange * DOMAIN_HEADROOM;
      const yOf = (p: number) => pd.top + (1 - (p - domainMin) / Math.max(calmMax - domainMin, 1e-9)) * (H - pd.top - pd.bottom);
      const draw = (idx: number, o: number, c: number, h: number, l: number, up: string) => {
        const bodyW = Math.max(slotW * (1 - CANDLE_GAP_RATIO), 1);
        const x = pd.left + (idx + 0.5) * slotW;
        ctx.strokeStyle = up;
        ctx.lineWidth = Math.max(bodyW * WICK_WIDTH_RATIO, 1);
        ctx.beginPath();
        ctx.moveTo(x, yOf(h));
        ctx.lineTo(x, yOf(l));
        ctx.stroke();
        ctx.fillStyle = up;
        const top = yOf(Math.max(o, c));
        ctx.fillRect(x - bodyW / 2, top, bodyW, Math.max(yOf(Math.min(o, c)) - top, CANDLE_MIN_BODY_PX));
      };
      for (let i = 0; i < real.length; i++) {
        const c = real[i];
        draw(i, c.o, c.c, c.h, c.l, c.c >= c.o ? REAL_UP : REAL_DOWN);
      }
      for (let j = 0; j < built.length; j++) {
        const a = built[j];
        draw(n + j, a.o, a.c, a.h, a.l, COLORS.greenBright);
      }
      setCaption(CAPTIONS.godCandle);
      if (bpmRef.current) bpmRef.current.textContent = "—";
      setDone(true);
    };

    if (reduce) {
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

    setCaption(CAPTIONS.preRoll);
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

      {/* TREATED VIEW — real-vs-fiction invariant, always present. */}
      <div className="pointer-events-none absolute left-5 top-5 flex items-center gap-2">
        <span className="readout rounded-md border border-[#2ce56b]/40 bg-[#0b100e]/70 px-2.5 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.22em] text-[#2ce56b]">
          Treated View
        </span>
      </div>

      {/* Monitor readout — deadpan BPM. */}
      <div className="pointer-events-none absolute right-5 top-5 flex items-center gap-2 text-[#7d8e86]">
        <span className="readout text-[0.62rem] uppercase tracking-[0.22em]">BPM</span>
        <span ref={bpmRef} className="readout text-sm font-semibold tabular-nums text-[#e6f1ea]">
          60
        </span>
      </div>

      {/* Mute control (first tap also unlocks audio if autoplay was blocked). */}
      <button
        type="button"
        onClick={() => setMuted((m) => !m)}
        className="absolute bottom-5 right-5 z-10 rounded-lg border border-white/15 bg-black/40 px-3 py-2 text-xs font-medium text-[#e6f1ea] backdrop-blur transition-colors hover:border-white/30"
      >
        {muted ? "Sound off" : "Sound on"}
      </button>

      {/* Deadpan clinical caption. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-16 flex justify-center px-6">
        <p ref={captionRef} className="readout text-center text-sm font-medium tracking-wide text-[#e6f1ea] sm:text-base">
          {CAPTIONS.preRoll}
        </p>
      </div>

      {/* End-state: hold on the euphoric high, then offer discharge (beat 7).
          The badge is inert; the CTA is the one interactive element. Present in
          both the animated run and the reduced-motion end-state (both set done). */}
      {done && (
        <div className="pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-1/2 flex-col items-center gap-5 px-6">
          <span className="readout rounded-full border border-[#2ce56b]/30 bg-[#0b100e]/60 px-4 py-1.5 text-[0.62rem] uppercase tracking-[0.24em] text-[#2ce56b]">
            Treatment complete
          </span>
          <Link
            href="/recovery"
            className="gct-rise pointer-events-auto inline-flex items-center gap-2 rounded-lg bg-[#22c063] px-6 py-3 text-sm font-semibold text-[#06120c] shadow-lg shadow-[#22c063]/25 transition-colors hover:bg-[#2ce56b] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2ce56b]"
          >
            View discharge summary →
          </Link>
        </div>
      )}
    </div>
  );
}
