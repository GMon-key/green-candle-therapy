"use client";

import * as Tone from "tone";
import { useEffect, useRef, useState } from "react";

import type { Candle } from "@/lib/diagnosis";

/**
 * Beat 6 — the treatment. This is a REBUILD around real-chart continuity: the
 * canvas opens on the patient's ACTUAL beat-5 record (same red/green candle
 * language), holds on that painful "before", then cures it — real red candles
 * convert red → purple-pulse → green left to right, new green candles APPEND and
 * climb into an absurd exponential "banana" curve, and a final god candle punches
 * off the top of the frame into a full-screen celebration.
 *
 * Colour doctrine (load-bearing):
 *   GREEN  = recovery / healing / reward. Appears only when improvement happens.
 *   PURPLE = authority / protocol / infrastructure / computation (Monad). The
 *            mechanism doing the WORK — scanlines, waveforms, processing — which
 *            recedes as the green RESULT dominates. Faint purple survives beneath
 *            the climax. Never named as blockchain.
 *
 * Duration is FIXED 30s; only INTENSITY scales with denial (100 − Reality
 * Acceptance). The spectacle + sound BUILD CONTINUOUSLY from ~10s to the 30s
 * climax (one deliberate dip at the 27–28s flatline). Functional pass for live
 * feel-tuning: every parameter is a named constant in the TUNING block below.
 */

/* ============================================================================
 * TUNING CONSTANTS
 * ========================================================================== */

// —— Timeline (seconds) ————————————————————————————————————————————————————
const TOTAL_DURATION = 30;
const PHASES = {
  realityHold: { start: 0, end: 2.5 }, // the REAL chart, held — the "before"
  purplePrep: { start: 2.5, end: 5 }, // clinical dark + purple calibrate
  onset: { start: 5, end: 10 }, // first real candles cured, L→R
  escalation: { start: 10, end: 20 }, // rest cured + banana appends + ramp
  peak: { start: 20, end: 27 }, // banana steepens, purple fades, storm builds
  flatline: { start: 27, end: 28 }, // freeze + monitor tone (the one dip)
  godCandle: { start: 28, end: 30 }, // god candle off-top + climax explosion
} as const;

// —— Denial → magnitude. denial 0..100 → intensity multiplier. ————————————————
const DENIAL_MAGNITUDE_MIN = 0.7; // at denial = 0
const DENIAL_MAGNITUDE_MAX = 1.9; // at denial = 100
const DENIAL_SCALING = 1.0;

// —— Continuous escalation envelope (10s → 30s). The master build curve. ———————
const ESCALATION_START = 10; // s — where the ramp begins
const ESCALATION_POWER = 1.7; // >1 = builds slow then accelerates
const ESCALATION_DENIAL_STEEPEN = 0.5; // higher denial → ramps up sooner
const ESCALATION_AMP_MIN = 0.85; // env amplitude at denial 0
const ESCALATION_AMP_MAX = 1.5; // env amplitude at denial 100
const FLATLINE_DUCK = 0.06; // env floor during the flatline dip

// —— Chart continuity (match beat-5 Lightweight Charts styling). ———————————————
const REAL_UP = "#2f9e6a"; // beat-5 up candle
const REAL_DOWN = "#d83a3f"; // beat-5 down candle (diagnosis --clinic-alert)
const CANDLE_WINDOW = 56; // how many real candles carry into treatment
const CANDLE_GAP_RATIO = 0.26; // gap as a fraction of a candle slot
const CANDLE_MIN_BODY_PX = 2;
const GRID_LINES = 5; // faint horizontal grid (continuity), fades out
const REALITY_BG = "#100c0c"; // warm dark echoing the diagnosis mood ("before")
const TREATMENT_BG = "#0b100e"; // clinical dark the treatment settles into
const CLINICAL_FADE = { start: 2.5, dur: 2.5 }; // s: reality bg → treatment bg

// —— Treatment sweep (real candles cured L→R) —————————————————————————————————
const TREAT_FADE = 0.14; // how far behind the front a candle fully heals
const ONSET_FRONT_END = 0.34; // fraction of real candles healed by end of onset
const PULSE_WIDTH = 0.05; // width (x-fraction) of the purple pulse at the front
const HEAL_LIFT = 0.06; // modest lift of a cured real candle (× base range)
const BODY_GROW = 0.5; // cured bodies grow by up to this fraction × magnitude

// —— The banana curve (appended green candles climbing off the real series) ————
const APPEND_COUNT_BASE = 26; // appended candles before the god candle
const APPEND_MIN_FACTOR = 0.7; // × count at denial 0
const APPEND_MAX_FACTOR = 1.6; // × count at denial 100
const APPEND_REVEAL_POWER = 1.6; // >1 = accelerating reveal (banana feel)
const BANANA_K_MIN = 2.2; // exponential curvature at denial 0 (gentler)
const BANANA_K_MAX = 4.6; // curvature at denial 100 (near-vertical, absurd)
const BANANA_RISE_MIN = 0.9; // total climb (× base range) at denial 0
const BANANA_RISE_MAX = 2.6; // total climb (× base range) at denial 100

// —— Domain rescale + god candle ——————————————————————————————————————————————
const DOMAIN_HEADROOM = 0.14; // headroom above the tallest visible candle
const DOMAIN_EASE = 0.07; // how fast the price domain chases the climb
const GOD_CANDLE_MULT = 5.0; // final high as a multiple of the peak domain × mag
const GOD_FREEZE_AT = 0.5; // stretch progress where the domain STOPS rescaling
const GOD_STRETCH_POWER = 2.4; // easing exponent on the god-candle stretch

// —— Purple infrastructure ————————————————————————————————————————————————————
const SCANLINE_SPEED = 0.6; // passes per second
const SCANLINE_WIDTH_PX = 3;
const SCANLINE_GLOW_PX = 30;
const WAVEFORM_AMPLITUDE = 16;
const WAVEFORM_COUNT_PEAK = 3; // parallel processing waves during escalation
const PURPLE_FADE_START = 20; // s — purple begins receding as green takes over

// —— Continuous particle storm (emission ramps with the escalation env) ————————
const PARTICLE_MAX = 2600; // hard cap (perf guard)
const EMIT_RATE_BASE = 4.0; // green particles/frame at env=1, mag=1
const EMIT_SIZE_MIN = 2;
const EMIT_SIZE_MAX = 6;
const EMIT_SPEED = 46; // gentle so they LINGER (visibility fix)
const EMIT_DECAY = 0.4; // life/sec → ~2.5s lifespan
const PARTICLE_GRAVITY = -12; // px/s² (negative = drift up)

// —— Fireworks (start sparse ~15s, grow into the finale) ——————————————————————
const FIREWORK_START = 15; // s
const FIREWORK_INTERVAL_MAX = 2.2; // s between bursts when the ramp is low
const FIREWORK_INTERVAL_MIN = 0.28; // s between bursts near the climax
const FIREWORK_BURST = 46; // sparks per burst × env × mag
const FIREWORK_SPEED = 260;
const FIREWORK_DECAY = 0.5;

// —— Climax explosion (god candle). Curated but ABUNDANT + HELD to screenshot. —
const EXPLOSION_RINGS = 6; // radial firework rings across the viewport
const EXPLOSION_GREEN = 520; // × magnitude
const EXPLOSION_CONFETTI = 220; // × magnitude
const EXPLOSION_CHECKMARKS = 16; // floating clinical checkmarks × magnitude
const EXPLOSION_CASEFILES = 14; // raining discharge case-files × magnitude
const EXPLOSION_PURPLE = 70; // faint infrastructure beneath × magnitude
const EXPLOSION_SPEED = 340;
const EXPLOSION_DECAY = 0.16; // SLOW → ~6s hold (visibility + screenshot fix)
const EXPLOSION_GREEN_SIZE: [number, number] = [3, 9];
const EXPLOSION_CONFETTI_SIZE: [number, number] = [4, 10];
const CASEFILE_FALL = 150; // px/s² gravity for raining case-files
const GREEN_FLASH_INTENSITY = 0.85; // peak green screen-fill alpha at climax
const GREEN_FLASH_FADE = 1.9; // s the flash takes to fade
const GREEN_SATURATION_MAX = 0.15; // progressive green wash alpha at peak env

// —— Heartbeat (bpm at each phase edge; the loop interpolates) —————————————————
const HEARTBEAT_BPM = {
  realityHold: 60,
  purplePrepStart: 64,
  purplePrepEnd: 72,
  onsetEnd: 80,
  escalationEnd: 112,
  peakEnd: 132,
  flatline: 150,
  climax: 150,
} as const;
const HEARTBEAT_DUB_DELAY = 0.14; // s between "lub" and "dub"

// —— Audio (kept: heartbeat + purple blips + flatline; REWORKED: warm bed + bloom) —
const AUDIO = {
  masterDb: -6,
  heartbeatDb: -8,
  blipDb: -22,
  bedMax: 0.5, // warm drone bed gain at full escalation
  subMax: 0.62, // sub-bass bloom gain at full escalation
  filterMin: 200, // Hz — bed lowpass at low escalation (dark/warm)
  filterMax: 2600, // Hz — bed lowpass at full escalation (open/euphoric)
  flatlineDb: -13,
  flatlineHz: 660, // monitor tone (softer than a literal 1kHz)
  climaxDb: -5,
  reverbDecay: 4.2, // warmth
  reverbWet: 0.36,
} as const;

// —— Colours ———————————————————————————————————————————————————————————————
const COLORS = {
  green: "#22c063",
  greenBright: "#2ce56b",
  greenParticle: "#8affc0",
  greenGlow: "#3dff86",
  purple: "#836ef9", // Monad — processing/authority only
  purpleStrong: "#6e54f0",
  purpleSoft: "#a996ff",
  gridLine: "rgba(150,170,160,0.05)",
  checkmark: "#8affc0",
  casefile: "#eef6f0",
  confetti: ["#2ce56b", "#8affc0", "#a996ff", "#eef6f0", "#22c063"],
} as const;

// —— Deadpan clinical captions (no exclamation, ever) ——————————————————————————
const CAPTIONS = {
  realityHold: "Preparing Visual Rehabilitation Protocol…",
  purplePrep: "Calibrating baseline exposure…",
  onset: "Administering corrective candles…",
  escalation: "Treatment responding.",
  peak: "Patient responding favourably.",
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
  cx: number; // normalised position across the REAL series, 0..1
}

interface AppendCandle {
  o: number;
  h: number;
  l: number;
  c: number;
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
const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
const easeOut = (t: number) => 1 - (1 - t) ** 3;
const rand = (a: number, b: number) => a + Math.random() * (b - a);

function phaseAt(t: number): PhaseName {
  const names = Object.keys(PHASES) as PhaseName[];
  for (const name of names) {
    if (t >= PHASES[name].start && t < PHASES[name].end) return name;
  }
  return "godCandle";
}

/** How far the treatment front has swept the REAL candles at time t (0..1). */
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
  if (t < PHASES.purplePrep.start) return H.realityHold;
  if (t < PHASES.purplePrep.end)
    return lerp(H.purplePrepStart, H.purplePrepEnd, (t - 2.5) / 2.5);
  if (t < PHASES.onset.end)
    return lerp(H.purplePrepEnd, H.onsetEnd, (t - 5) / 5);
  if (t < PHASES.escalation.end)
    return lerp(H.onsetEnd, H.escalationEnd, (t - 10) / 10);
  if (t < PHASES.peak.end)
    return lerp(H.escalationEnd, H.peakEnd, (t - 20) / 7);
  if (t < PHASES.flatline.end) return H.flatline;
  return H.climax;
}

/* ============================================================================
 * Audio — heartbeat + purple processing (KEPT), warm bed + euphoric bloom
 * (REWORKED for warmth). Defensive: a suspended context degrades to silence.
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
      this.reverb = new Tone.Reverb({
        decay: AUDIO.reverbDecay,
        wet: AUDIO.reverbWet,
      }).connect(this.master);

      // Heartbeat — KEPT.
      this.heart = new Tone.MembraneSynth({
        pitchDecay: 0.02,
        octaves: 3,
        envelope: { attack: 0.001, decay: 0.28, sustain: 0, release: 0.1 },
      }).connect(this.master);
      this.heart.volume.value = AUDIO.heartbeatDb;

      // Purple processing blips — KEPT.
      this.blipSynth = new Tone.Synth({
        oscillator: { type: "triangle" },
        envelope: { attack: 0.002, decay: 0.08, sustain: 0, release: 0.05 },
      }).connect(this.master);
      this.blipSynth.volume.value = AUDIO.blipDb;

      // Warm drone bed — REWORKED. Detuned oscillators → lowpass → reverb.
      this.droneGain = new Tone.Gain(0);
      this.droneFilter = new Tone.Filter(AUDIO.filterMin, "lowpass").connect(
        this.reverb,
      );
      this.droneGain.connect(this.droneFilter);
      const droneNotes = [65.41, 98.0, 130.81, 164.81]; // C2 G2 C3 E3 — warm major
      for (const f of droneNotes) {
        const o = new Tone.Oscillator(f, "sawtooth");
        o.detune.value = rand(-8, 8);
        o.volume.value = -12;
        o.connect(this.droneGain);
        o.start();
        this.droneOscs.push(o);
      }

      // Sub-bass bloom.
      this.subGain = new Tone.Gain(0).connect(this.master);
      this.subOsc = new Tone.Oscillator(32.7, "sine").connect(this.subGain);
      this.subOsc.start();

      // Flatline monitor tone — KEPT.
      this.flatGain = new Tone.Gain(0).connect(this.master);
      this.flatOsc = new Tone.Oscillator(AUDIO.flatlineHz, "sine").connect(
        this.flatGain,
      );
      this.flatOsc.start();

      // Euphoric climax bloom — REWORKED: warm, slow-attack, big reverb tail.
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
      const note = 520 + Math.floor(Math.random() * 320);
      this.blipSynth.triggerAttackRelease(note, "32n", Tone.now(), 0.5);
    } catch {
      /* no-op */
    }
  }

  /** Continuous bed intensity 0..1 — swells volume, opens the filter, blooms sub. */
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
        // Duck the bed to near-silence for the deliberate dip.
        this.droneGain?.gain.rampTo(AUDIO.bedMax * 0.08, 0.08);
        this.subGain?.gain.rampTo(0, 0.08);
      }
    } catch {
      /* no-op */
    }
  }

  /** Euphoric bloom out of the flatline — warm major chord + sub swell. */
  bloom() {
    if (!this.ready) return;
    try {
      this.bloomSynth?.triggerAttackRelease(
        ["C3", "G3", "C4", "E4", "G4", "D5"],
        "1n",
        Tone.now(),
        0.9,
      );
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
  const magnitude =
    lerp(DENIAL_MAGNITUDE_MIN, DENIAL_MAGNITUDE_MAX, denialNorm) * DENIAL_SCALING;

  useEffect(() => {
    muteRef.current = muted;
  }, [muted]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // —— Real data → working set (matches beat 5's series). ————————————————————
    const src = candles.slice(-CANDLE_WINDOW);
    const n = Math.max(src.length, 1);
    const priceVals = src.flatMap((c) => [c.h, c.l]);
    const baseMin = priceVals.length ? Math.min(...priceVals) : 0;
    const baseMax = priceVals.length ? Math.max(...priceVals) : 1;
    const baseRange = Math.max(baseMax - baseMin, 1e-9);
    const real: RealCandle[] = src.map((c, i) => ({
      o: c.o,
      h: c.h,
      l: c.l,
      c: c.c,
      cx: n > 1 ? i / (n - 1) : 0.5,
    }));
    const lastRealClose = real[real.length - 1]?.c ?? baseMax;

    // —— Precompute the banana (appended green candles). ——————————————————————
    const A = Math.max(
      1,
      Math.round(
        APPEND_COUNT_BASE * lerp(APPEND_MIN_FACTOR, APPEND_MAX_FACTOR, denialNorm),
      ),
    );
    const bananaK = lerp(BANANA_K_MIN, BANANA_K_MAX, denialNorm);
    const bananaRise = lerp(BANANA_RISE_MIN, BANANA_RISE_MAX, denialNorm) * baseRange;
    const bananaShape = (u: number) =>
      (Math.exp(bananaK * u) - 1) / (Math.exp(bananaK) - 1);
    const appended: AppendCandle[] = [];
    let prevClose = lastRealClose;
    for (let j = 1; j <= A; j++) {
      const close = lastRealClose + bananaShape(j / A) * bananaRise;
      const open = prevClose;
      const wick = Math.max((close - open) * 0.3, baseRange * 0.004);
      appended.push({ o: open, c: close, h: close + wick, l: open - baseRange * 0.004 });
      prevClose = close;
    }
    const godOpen = prevClose;

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
    const particles: Particle[] = [];
    const domainMin = baseMin - baseRange * 0.06;
    let domainMax = baseMax + baseRange * DOMAIN_HEADROOM;
    let nextBeat = 0;
    let nextBlip = 0;
    let nextFirework = FIREWORK_START;
    let explosionFired = false;
    let lastPhase: PhaseName | "" = "";
    let ecg: number[] = [];

    const audio = new TreatmentAudio();
    if (!reduce) void audio.init().then((ok) => ok && audio.setMute(muteRef.current));
    const unlock = () => {
      if (!reduce) void audio.init().then((ok) => ok && audio.setMute(muteRef.current));
    };
    window.addEventListener("pointerdown", unlock, { once: true });

    const pad = () => ({
      left: 36,
      right: 36,
      top: Math.max(H * 0.12, 72),
      bottom: Math.max(H * 0.18, 110),
    });
    const priceToY = (p: number) => {
      const pd = pad();
      const chartH = H - pd.top - pd.bottom;
      const r = Math.max(domainMax - domainMin, 1e-9);
      return pd.top + (1 - (p - domainMin) / r) * chartH;
    };

    // —— Escalation envelope (continuous build 10s → 30s, with flatline dip). ——
    const escalationEnv = (t: number): number => {
      if (t < ESCALATION_START) return 0;
      const raw = clamp((t - ESCALATION_START) / (TOTAL_DURATION - ESCALATION_START), 0, 1);
      const power = ESCALATION_POWER * (1 - ESCALATION_DENIAL_STEEPEN * denialNorm);
      const amp = lerp(ESCALATION_AMP_MIN, ESCALATION_AMP_MAX, denialNorm);
      let env = raw ** power * amp;
      if (t >= PHASES.flatline.start && t < PHASES.flatline.end) env *= FLATLINE_DUCK;
      return env;
    };

    // —— Particle helpers ————————————————————————————————————————————————————
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
        gravity: PARTICLE_GRAVITY,
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
            Math.random() > 0.82
              ? COLORS.purpleSoft
              : Math.random() > 0.5
                ? COLORS.greenBright
                : COLORS.greenParticle;
          spawn({
            x,
            y,
            type: "green",
            vx: Math.cos(a) * sp,
            vy: Math.sin(a) * sp,
            size: rand(2, 5),
            decay,
            color: col,
            gravity: 30,
          });
        }
      }
    };

    const fireExplosion = () => {
      const m = magnitude;
      const cx = W * 0.5;
      const cy = H * 0.42;
      // Multiple radial rings across the viewport.
      for (let r = 0; r < EXPLOSION_RINGS; r++) {
        firework(
          rand(W * 0.2, W * 0.8),
          rand(H * 0.2, H * 0.6),
          Math.round(40 * m),
          EXPLOSION_SPEED * rand(0.7, 1.2),
          EXPLOSION_DECAY,
        );
      }
      // Dense green core burst.
      for (let i = 0; i < EXPLOSION_GREEN * m; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = rand(40, EXPLOSION_SPEED) * (0.5 + Math.random());
        spawn({
          x: cx,
          y: cy,
          type: "green",
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp - 60,
          size: rand(EXPLOSION_GREEN_SIZE[0], EXPLOSION_GREEN_SIZE[1]),
          decay: EXPLOSION_DECAY * rand(0.8, 1.4),
          color: Math.random() > 0.5 ? COLORS.greenBright : COLORS.green,
          gravity: 20,
        });
      }
      // Confetti.
      for (let i = 0; i < EXPLOSION_CONFETTI * m; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = rand(60, EXPLOSION_SPEED);
        spawn({
          x: cx,
          y: cy,
          type: "confetti",
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp - 80,
          size: rand(EXPLOSION_CONFETTI_SIZE[0], EXPLOSION_CONFETTI_SIZE[1]),
          decay: EXPLOSION_DECAY * rand(1, 1.6),
          color: COLORS.confetti[i % COLORS.confetti.length],
          rot: Math.random() * Math.PI,
          vrot: rand(-2, 2),
          gravity: 90,
        });
      }
      // Floating clinical checkmarks.
      for (let i = 0; i < EXPLOSION_CHECKMARKS * m; i++) {
        spawn({
          x: rand(W * 0.1, W * 0.9),
          y: rand(H * 0.2, H * 0.7),
          type: "checkmark",
          vx: rand(-30, 30),
          vy: rand(-70, -20),
          size: rand(20, 40),
          decay: EXPLOSION_DECAY * 0.8,
          color: COLORS.checkmark,
          rot: rand(-0.3, 0.3),
          vrot: rand(-0.5, 0.5),
          gravity: -8,
        });
      }
      // Raining discharge case-files.
      for (let i = 0; i < EXPLOSION_CASEFILES * m; i++) {
        spawn({
          x: rand(0, W),
          y: rand(-260, -20),
          type: "casefile",
          vx: rand(-20, 20),
          vy: rand(30, 90),
          size: rand(30, 50),
          decay: 0.1,
          color: COLORS.casefile,
          rot: rand(-0.5, 0.5),
          vrot: rand(-0.7, 0.7),
          gravity: CASEFILE_FALL,
        });
      }
      // Faint purple beneath — infrastructure persists, not celebration.
      for (let i = 0; i < EXPLOSION_PURPLE * m; i++) {
        const a = Math.random() * Math.PI * 2;
        const sp = rand(30, 200);
        spawn({
          x: cx,
          y: cy,
          type: "purple",
          vx: Math.cos(a) * sp,
          vy: Math.sin(a) * sp,
          size: rand(1.5, 3.5),
          decay: EXPLOSION_DECAY * 1.2,
          color: COLORS.purpleSoft,
          gravity: 10,
        });
      }
    };

    // —— Drawing —————————————————————————————————————————————————————————————
    const drawCandleBody = (
      x: number,
      bodyW: number,
      yO: number,
      yC: number,
      yH: number,
      yL: number,
      fill: string,
      wickCol: string,
      glow: number,
    ) => {
      ctx.strokeStyle = wickCol;
      ctx.lineWidth = Math.max(bodyW * 0.14, 1);
      ctx.beginPath();
      ctx.moveTo(x, yH);
      ctx.lineTo(x, yL);
      ctx.stroke();
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

    const drawGrid = (fade: number) => {
      if (fade <= 0.01) return;
      const pd = pad();
      ctx.globalAlpha = fade;
      ctx.strokeStyle = COLORS.gridLine;
      ctx.lineWidth = 1;
      for (let i = 0; i <= GRID_LINES; i++) {
        const y = pd.top + (i / GRID_LINES) * (H - pd.top - pd.bottom);
        ctx.beginPath();
        ctx.moveTo(pd.left, y);
        ctx.lineTo(W - pd.right, y);
        ctx.stroke();
      }
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

    const drawPurpleField = (t: number, envFade: number) => {
      const pd = pad();
      const chartW = W - pd.left - pd.right;
      const passes: number[] = [];
      if (t >= PHASES.purplePrep.start && t < PHASES.onset.start)
        passes.push(((t - PHASES.purplePrep.start) * SCANLINE_SPEED) % 1);
      if (t >= PHASES.onset.start && t < PHASES.escalation.start)
        passes.push(((t - PHASES.onset.start) * SCANLINE_SPEED) % 1);
      for (const sp of passes) {
        const sx = pd.left + sp * chartW;
        const g = ctx.createLinearGradient(sx - SCANLINE_GLOW_PX, 0, sx + SCANLINE_GLOW_PX, 0);
        g.addColorStop(0, "rgba(131,110,249,0)");
        g.addColorStop(0.5, "rgba(131,110,249,0.5)");
        g.addColorStop(1, "rgba(131,110,249,0)");
        ctx.fillStyle = g;
        ctx.fillRect(sx - SCANLINE_GLOW_PX, 0, SCANLINE_GLOW_PX * 2, H);
        ctx.fillStyle = COLORS.purple;
        ctx.fillRect(sx - SCANLINE_WIDTH_PX / 2, 0, SCANLINE_WIDTH_PX, H);
      }
      // Processing waveform(s) — several run in parallel during escalation.
      const phase = phaseAt(t);
      const waveCount = phase === "escalation" || phase === "peak" ? WAVEFORM_COUNT_PEAK : 1;
      if (envFade > 0.01) {
        ctx.globalAlpha = 0.16 * envFade;
        ctx.strokeStyle = COLORS.purpleSoft;
        ctx.lineWidth = 1.5;
        for (let w = 0; w < waveCount; w++) {
          const yBase = pd.top + ((w + 1) / (waveCount + 1)) * (H - pd.top - pd.bottom);
          const speed = 2 + w * 0.7;
          ctx.beginPath();
          for (let px = pd.left; px <= W - pd.right; px += 6) {
            const k = (px - pd.left) / chartW;
            const y =
              yBase +
              Math.sin(k * 22 + t * speed + w * 1.7) * WAVEFORM_AMPLITUDE +
              Math.sin(k * 7 - t * 1.5) * WAVEFORM_AMPLITUDE * 0.4;
            if (px === pd.left) ctx.moveTo(px, y);
            else ctx.lineTo(px, y);
          }
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
    };

    const drawEcg = (t: number) => {
      const stripY = H - Math.max(H * 0.08, 48);
      const stripH = 34;
      const maxSamples = Math.floor(W);
      ecg.push(phaseAt(t) === "flatline" ? 0 : beatEnv);
      if (ecg.length > maxSamples) ecg = ecg.slice(ecg.length - maxSamples);
      ctx.strokeStyle = phaseAt(t) === "flatline" ? COLORS.purpleSoft : COLORS.greenBright;
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

    const frame = (nowMs: number) => {
      if (!startMs) {
        startMs = nowMs;
        prevMs = nowMs;
      }
      const t = (nowMs - startMs) / 1000;
      const dt = Math.min((nowMs - prevMs) / 1000, 0.05);
      prevMs = nowMs;
      const phase = phaseAt(t);
      const env = escalationEnv(t);

      // —— Background: reality mood → clinical dark. ——————————————————————————
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = REALITY_BG;
      ctx.fillRect(0, 0, W, H);
      const clinicalMix = clamp((t - CLINICAL_FADE.start) / CLINICAL_FADE.dur, 0, 1);
      if (clinicalMix > 0) {
        ctx.globalAlpha = clinicalMix;
        ctx.fillStyle = TREATMENT_BG;
        ctx.fillRect(0, 0, W, H);
        ctx.globalAlpha = 1;
      }

      // Grid (continuity) fades as treatment takes over.
      drawGrid(clamp(1 - frontProgress(t) * 1.4, 0, 1) * 0.9);

      // Purple infrastructure. Recedes after PURPLE_FADE_START.
      const purpleFade =
        t < PHASES.purplePrep.start
          ? 0
          : t < PURPLE_FADE_START
            ? 1
            : clamp(1 - (t - PURPLE_FADE_START) / 6, 0.1, 1);
      drawPurpleField(t, purpleFade);

      // —— Chart geometry: real candles + revealed banana + god candle. ————————
      const front = frontProgress(t);
      const revealF =
        t < PHASES.escalation.start
          ? 0
          : (clamp(
              (t - PHASES.escalation.start) / (PHASES.peak.end - PHASES.escalation.start),
              0,
              1,
            ) **
              (1 / APPEND_REVEAL_POWER)) *
            A;
      const godActive = phase === "godCandle";
      const visibleSlots = n + revealF + (godActive ? 1 : 0);
      const pd = pad();
      const chartW = W - pd.left - pd.right;
      const slotW = chartW / Math.max(visibleSlots, 1);
      const bodyW = Math.max(slotW * (1 - CANDLE_GAP_RATIO), 1);

      // Domain target from every visible candle's (possibly lifted) high.
      let targetHigh = baseMax;
      for (const c of real) {
        const heal = c.cx <= front ? clamp((front - c.cx) / TREAT_FADE, 0, 1) : 0;
        targetHigh = Math.max(targetHigh, c.h + HEAL_LIFT * magnitude * heal * baseRange);
      }
      const revealedCount = Math.floor(revealF);
      for (let j = 0; j < revealedCount && j < appended.length; j++) {
        targetHigh = Math.max(targetHigh, appended[j].h);
      }

      // Rescale toward target — frozen during flatline and once the god candle
      // passes its freeze point (so it punches off the top).
      let godFreeze = false;
      let godProgress = 0;
      if (godActive) {
        godProgress =
          (t - PHASES.godCandle.start) / (PHASES.godCandle.end - PHASES.godCandle.start);
        godFreeze = godProgress >= GOD_FREEZE_AT;
      }
      if (phase !== "flatline" && !godFreeze) {
        domainMax = lerp(domainMax, targetHigh + baseRange * DOMAIN_HEADROOM, DOMAIN_EASE);
      }

      // Draw REAL candles (cured L→R).
      for (let i = 0; i < real.length; i++) {
        const c = real[i];
        const x = pd.left + (i + 0.5) * slotW;
        const treated = c.cx <= front;
        const heal = treated ? clamp((front - c.cx) / TREAT_FADE, 0, 1) : 0;
        const atFront = Math.abs(c.cx - front) < PULSE_WIDTH && phase !== "peak" && !godActive;
        const lift = HEAL_LIFT * magnitude * heal * baseRange;
        const grow = 1 + BODY_GROW * magnitude * heal;
        const bodyHalf = (Math.max(Math.abs(c.c - c.o), baseRange * 0.008) * grow) / 2;
        const mid = (c.o + c.c) / 2 + lift;
        const oP = treated ? mid - bodyHalf : c.o;
        const cP = treated ? mid + bodyHalf : c.c;
        const hP = treated ? Math.max(cP, c.h + lift) : c.h;
        const lP = treated ? Math.min(oP, c.l + lift) : c.l;

        let fill: string = c.c >= c.o ? REAL_UP : REAL_DOWN;
        let wickCol = fill;
        if (atFront) {
          fill = COLORS.purpleStrong;
          wickCol = COLORS.purple;
        } else if (treated) {
          fill = heal > 0.5 ? COLORS.greenBright : COLORS.green;
          wickCol = COLORS.green;
        }
        drawCandleBody(
          x,
          bodyW,
          priceToY(oP),
          priceToY(cP),
          priceToY(hP),
          priceToY(lP),
          fill,
          wickCol,
          treated ? 8 * heal * magnitude : 0,
        );

        // Continuous green emission from cured candles (ramps with env).
        if (!reduce && treated && heal > 0.7 && env > 0 && phase !== "flatline") {
          const rate = EMIT_RATE_BASE * env * magnitude * 0.05;
          if (Math.random() < rate) {
            spawn({
              x: x + rand(-bodyW / 2, bodyW / 2),
              y: priceToY(cP),
              type: "green",
              vx: rand(-16, 16),
              vy: -EMIT_SPEED * rand(0.5, 1.2),
              size: lerp(EMIT_SIZE_MIN, EMIT_SIZE_MAX, clamp(env, 0, 1)) * rand(0.7, 1.2),
              decay: EMIT_DECAY,
              color: COLORS.greenParticle,
            });
          }
        }
      }

      // Draw the revealed banana candles.
      for (let j = 0; j < appended.length; j++) {
        if (j >= revealF) break;
        const a = appended[j];
        const x = pd.left + (n + j + 0.5) * slotW;
        const grow = clamp(revealF - j, 0, 1); // frontier candle grows in
        const mid = (a.o + a.c) / 2;
        const half = ((a.c - a.o) / 2) * grow;
        drawCandleBody(
          x,
          bodyW,
          priceToY(mid - half),
          priceToY(mid + half),
          priceToY(a.h),
          priceToY(a.l),
          COLORS.greenBright,
          COLORS.green,
          10 * magnitude,
        );
        if (!reduce && env > 0 && Math.random() < EMIT_RATE_BASE * env * magnitude * 0.04) {
          spawn({
            x,
            y: priceToY(a.c),
            type: "green",
            vx: rand(-16, 16),
            vy: -EMIT_SPEED * rand(0.6, 1.4),
            size: lerp(EMIT_SIZE_MIN, EMIT_SIZE_MAX, clamp(env, 0, 1)),
            decay: EMIT_DECAY,
            color: COLORS.greenParticle,
          });
        }
      }

      // God candle — punches off the top.
      if (godActive) {
        const stretch = easeOut(clamp(godProgress, 0, 1) ** GOD_STRETCH_POWER);
        const x = pd.left + (n + A + 0.5) * slotW;
        const godHigh = domainMax + (domainMax - domainMin) * GOD_CANDLE_MULT * magnitude * stretch;
        const yTop = priceToY(godHigh); // goes < 0 once the domain freezes
        const yBase = priceToY(godOpen);
        const w = bodyW * 1.5;
        const grad = ctx.createLinearGradient(0, Math.min(yTop, 0), 0, yBase);
        grad.addColorStop(0, COLORS.greenBright);
        grad.addColorStop(1, COLORS.green);
        ctx.shadowColor = COLORS.greenGlow;
        ctx.shadowBlur = 34;
        ctx.fillStyle = grad;
        ctx.fillRect(x - w / 2, yTop, w, yBase - yTop);
        ctx.shadowBlur = 0;

        if (!explosionFired && !reduce && godProgress >= GOD_FREEZE_AT + 0.05) {
          explosionFired = true;
          fireExplosion();
          audio.bloom();
        }
      }

      // Progressive green wash — screen saturates as the cure builds.
      const wash = clamp(env, 0, 1) * GREEN_SATURATION_MAX;
      if (wash > 0.005) {
        ctx.fillStyle = `rgba(34,192,99,${wash})`;
        ctx.fillRect(0, 0, W, H);
      }

      // —— Continuous fireworks (start sparse ~15s, grow toward the god candle,
      //    which then takes over with the climax explosion). ————————————————————
      if (!reduce && t >= FIREWORK_START && t < PHASES.flatline.start) {
        if (t >= nextFirework + 2) nextFirework = t; // resync after a tab stall
        while (t >= nextFirework) {
          const e = clamp(env, 0.05, 1.4);
          firework(
            rand(W * 0.15, W * 0.85),
            rand(H * 0.15, H * 0.6),
            Math.round(FIREWORK_BURST * clamp(e, 0.2, 1.4) * magnitude * 0.5),
            FIREWORK_SPEED * rand(0.7, 1.1),
            FIREWORK_DECAY,
          );
          nextFirework += lerp(FIREWORK_INTERVAL_MAX, FIREWORK_INTERVAL_MIN, clamp(e, 0, 1));
        }
      }

      // Green screen-flash at the climax (holds, then fades).
      if (godActive && explosionFired) {
        const since = t - (PHASES.godCandle.start + (GOD_FREEZE_AT + 0.05) * 2);
        const flash = clamp(1 - since / GREEN_FLASH_FADE, 0, 1) * GREEN_FLASH_INTENSITY;
        if (flash > 0.01) {
          ctx.fillStyle = `rgba(61,255,134,${flash})`;
          ctx.fillRect(0, 0, W, H);
        }
      }

      // —— Particles (drawn LAST, on top of everything). ————————————————————————
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

      // —— Audio scheduling. ————————————————————————————————————————————————————
      beatEnv *= 0.86;
      const bpm = bpmAt(t);
      if (bpmRef.current) bpmRef.current.textContent = `${Math.round(bpm)}`;
      if (!reduce) {
        if (phase === "flatline") {
          audio.flatline(true);
        } else {
          audio.flatline(false);
          if (t >= nextBeat) {
            audio.beat(phase === "realityHold");
            beatEnv = 1;
            nextBeat = t + 60 / bpm;
          }
          if ((phase === "purplePrep" || phase === "onset") && t >= nextBlip) {
            audio.blip();
            nextBlip = t + 0.32 + Math.random() * 0.25;
          }
          audio.setEscalation(clamp(env, 0, 1));
        }
      } else if (t >= nextBeat && phase !== "flatline") {
        beatEnv = 1;
        nextBeat = t + 60 / bpm;
      }

      drawEcg(t);

      if (phase !== lastPhase) {
        lastPhase = phase;
        setCaption(CAPTIONS[phase]);
      }

      if (t >= TOTAL_DURATION) {
        if (!doneFired) {
          doneFired = true;
          setDone(true);
        }
        if (particles.length === 0) return; // hold the final frame; stop the loop
      }
      raf = requestAnimationFrame(frame);
    };

    // —— Reduced-motion: resolve gently to the green end-state. ————————————————
    const renderCalmEndState = () => {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = TREATMENT_BG;
      ctx.fillRect(0, 0, W, H);
      const pd = pad();
      const chartW = W - pd.left - pd.right;
      const total = n + A;
      const slotW = chartW / total;
      const bodyW = Math.max(slotW * (1 - CANDLE_GAP_RATIO), 1);
      const calmMax = Math.max(baseMax, lastRealClose + bananaRise) + baseRange * DOMAIN_HEADROOM;
      const calmMin = baseMin - baseRange * 0.06;
      const yOf = (p: number) =>
        pd.top + (1 - (p - calmMin) / Math.max(calmMax - calmMin, 1e-9)) * (H - pd.top - pd.bottom);
      const drawOne = (idx: number, o: number, c: number, h: number, l: number) => {
        const x = pd.left + (idx + 0.5) * slotW;
        ctx.strokeStyle = COLORS.green;
        ctx.lineWidth = Math.max(bodyW * 0.14, 1);
        ctx.beginPath();
        ctx.moveTo(x, yOf(h));
        ctx.lineTo(x, yOf(l));
        ctx.stroke();
        ctx.fillStyle = COLORS.greenBright;
        const top = yOf(Math.max(o, c));
        ctx.fillRect(x - bodyW / 2, top, bodyW, Math.max(yOf(Math.min(o, c)) - top, CANDLE_MIN_BODY_PX));
      };
      for (let i = 0; i < real.length; i++) {
        const c = real[i];
        const half = Math.max(Math.abs(c.c - c.o), baseRange * 0.02) / 2;
        const mid = (c.o + c.c) / 2 + HEAL_LIFT * baseRange;
        drawOne(i, mid - half, mid + half, mid + half + baseRange * 0.02, mid - half - baseRange * 0.02);
      }
      for (let j = 0; j < appended.length; j++) {
        drawOne(n + j, appended[j].o, appended[j].c, appended[j].h, appended[j].l);
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

    setCaption(CAPTIONS.realityHold);
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
        <span
          ref={bpmRef}
          className="readout text-sm font-semibold tabular-nums text-[#e6f1ea]"
        >
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
        <p
          ref={captionRef}
          className="readout text-center text-sm font-medium tracking-wide text-[#e6f1ea] sm:text-base"
        >
          {CAPTIONS.realityHold}
        </p>
      </div>

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
