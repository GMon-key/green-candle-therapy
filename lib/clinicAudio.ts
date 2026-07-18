/**
 * Clinic Audio — the app-wide synthesized sound layer (Tone.js).
 *
 * A single defensive singleton engine that every text reveal, metric settle and
 * the beat-6 heartbeat share. Wiring it here ONCE means the typing blip attaches
 * to the shared TypeLine primitive and covers the whole app (assessment, denial,
 * recovery, …) from one place — no per-beat hooks.
 *
 * Principles baked in:
 *  • AUTOPLAY-SAFE — nothing touches the AudioContext until the first user
 *    gesture calls `initAudioOnGesture()`. Tone (heavy) is dynamically imported
 *    there too, so it never ships in a page's initial bundle.
 *  • UNIFIED MUTE — one muted flag, persisted (localStorage, the Jungle-Passport
 *    local-only pattern), governs blips, the measuring tone AND the heartbeat
 *    (beat 6 subscribes). Pub/sub so toggles stay in sync.
 *  • REDUCED-SOUND — prefers-reduced-motion (our reduced-sound signal) defaults
 *    audio OFF/silent until the visitor opts in.
 *  • NEVER THROWS — every Tone call is try/caught, so a blocked context or an
 *    iOS silent switch degrades to silence and never blocks the UI.
 *
 * All framework-free; safe to import from any client component.
 */

/* ============================================================================
 * TUNING CONSTANTS  (walk-and-tune volume / character)
 * ========================================================================== */
export const AUDIO_TUNING = {
  masterDb: -13, // overall headroom under 0 dBFS

  // —— Typing blip (per character in TypeLine) — a soft clinical terminal tick ——
  blip: {
    db: -25, // VERY soft — present, never fatiguing across many reveals
    baseHz: 1240, // clinical monitor tick pitch
    jitterHz: 110, // ± random pitch per character (kills the monotone machine-gun)
    decay: 0.05, // very short tail
    minIntervalMs: 42, // throttle: no audio spam on rapid/fast-typed text
  },

  // —— Measuring tone (once when a CopeStat count-up settles) — warmer confirm ——
  measure: {
    db: -17,
    hz: 523.25, // C5 — a warm, settled confirmation
    decay: 0.34,
    minIntervalMs: 130, // stops two gauges settling together from stacking harshly
  },
} as const;

/** Default when the visitor has expressed no preference (and no reduced-motion). */
const DEFAULT_MUTED = false; // audio ON by default (autoplay-gated + visible mute)

/**
 * iOS silent switch. Web Audio is muted by the hardware silent/ringer switch by
 * default (the 'ambient' audio session). Leave FALSE to RESPECT the switch —
 * audio plays only with the ringer on, which is arguably the correct, least
 * surprising behaviour. Set TRUE to request the 'playback' session so the clinic
 * is audible even in silent mode (Web Audio Session API, iOS 16.4+; the call is
 * try/caught and a harmless no-op everywhere else).
 */
export const AUDIO_SESSION_PLAYBACK = false;

const MUTE_KEY = "gct.audio.muted";

/* ============================================================================
 * Module state (singleton)
 * ========================================================================== */

type ToneModule = typeof import("tone");

let Tone: ToneModule | null = null;
let tonePromise: Promise<void> | null = null;
let primerCtx: AudioContext | null = null; // created + resumed inside the first gesture
let started = false;

let muted = resolveInitialMuted();
let suppressed = false; // RELAPSE silence cut — blips/measure go quiet while set

let lastBlipRt = 0; // real-time throttle stamps (ms)
let lastMeasureRt = 0;
let lastToneTime = 0; // strictly-increasing schedule time in the Tone clock

// Tone nodes (built on first gesture)
let master: InstanceType<ToneModule["Volume"]> | null = null;
let blipSynth: InstanceType<ToneModule["Synth"]> | null = null;
let measureSynth: InstanceType<ToneModule["Synth"]> | null = null;

const listeners = new Set<() => void>();

/* ============================================================================
 * Helpers
 * ========================================================================== */

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

/** Stored preference wins; otherwise reduced-motion → muted, else the default. */
function resolveInitialMuted(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const raw = window.localStorage.getItem(MUTE_KEY);
    if (raw === "true") return true;
    if (raw === "false") return false;
  } catch {
    /* storage blocked — fall through to the signal-based default */
  }
  return prefersReducedMotion() ? true : DEFAULT_MUTED;
}

function nowMs(): number {
  // performance.now avoids Date (and is monotonic); guarded for exotic envs.
  try {
    return performance.now();
  } catch {
    return 0;
  }
}

function notify(): void {
  for (const fn of listeners) {
    try {
      fn();
    } catch {
      /* a listener must never break the engine */
    }
  }
}

/** Next strictly-increasing time on the Tone clock (avoids same-tick errors). */
function nextToneTime(): number {
  const t = Math.max(Tone ? Tone.now() : 0, lastToneTime + 0.001);
  lastToneTime = t;
  return t;
}

/* ============================================================================
 * Public API
 * ========================================================================== */

/** Build the audio graph on the current Tone context. Safe to call repeatedly. */
function buildGraph(): void {
  if (master || !Tone) return;
  master = new Tone.Volume(AUDIO_TUNING.masterDb).toDestination();
  master.mute = muted;

  blipSynth = new Tone.Synth({
    oscillator: { type: "triangle" },
    envelope: { attack: 0.001, decay: AUDIO_TUNING.blip.decay, sustain: 0, release: 0.03 },
  }).connect(master);
  blipSynth.volume.value = AUDIO_TUNING.blip.db;

  measureSynth = new Tone.Synth({
    oscillator: { type: "sine" },
    envelope: { attack: 0.006, decay: AUDIO_TUNING.measure.decay, sustain: 0, release: 0.12 },
  }).connect(master);
  measureSynth.volume.value = AUDIO_TUNING.measure.db;
}

/**
 * Load Tone (once), adopt the gesture-unlocked native context, and build the
 * graph. Runs AFTER the gesture — the context is already running, so nothing
 * here needs the gesture. Never throws.
 */
function loadTone(): Promise<void> {
  if (tonePromise) return tonePromise;
  tonePromise = import("tone")
    .then((m) => {
      Tone = m;
      try {
        // Hand Tone the context we created + resumed inside the gesture, so all
        // its nodes run on an already-unlocked context (the mobile-safe path).
        if (primerCtx) Tone.setContext(primerCtx);
      } catch {
        /* setContext unsupported shape — Tone falls back to its own context */
      }
      try {
        void Tone.start();
      } catch {
        /* no-op */
      }
      buildGraph();
    })
    .catch(() => {
      /* import failed — the engine stays a silent no-op */
    });
  return tonePromise;
}

/**
 * Start the engine FROM WITHIN a user-gesture handler.
 *
 * The critical mobile fix: we create + resume a native AudioContext SYNCHRONOUSLY
 * inside the gesture (the standard iOS unlock — a context created during a real
 * touch is allowed to run), BEFORE any await. Tone is then imported async and
 * adopts that already-running context. The previous code awaited the dynamic
 * import before resuming, which pushed the resume out of the gesture — desktop
 * leniently resumed anyway, but mobile Safari left the context suspended (silent).
 *
 * Autoplay-safe: NO context exists until this runs inside a gesture. Never throws.
 * Returns true once the unlock has run (the graph finishes building a beat later).
 */
export function startAudioFromGesture(): boolean {
  if (started) return true;
  try {
    const AC: typeof AudioContext | undefined =
      typeof window !== "undefined"
        ? window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext
        : undefined;
    if (AC && !primerCtx) primerCtx = new AC(); // created IN the gesture → unlockable
    try {
      void primerCtx?.resume?.(); // resume IN the gesture (iOS)
    } catch {
      /* no-op */
    }
    // Optionally escape the iOS silent switch (off by default — respect it).
    if (AUDIO_SESSION_PLAYBACK) {
      try {
        (navigator as unknown as { audioSession?: { type: string } }).audioSession!.type =
          "playback";
      } catch {
        /* Web Audio Session API absent — ignore */
      }
    }
    started = true;
    void loadTone(); // async: adopt primerCtx + build the graph
    return true;
  } catch {
    return false;
  }
}

/** Resolves once Tone has loaded and the graph is built (for tests/awaiting). */
export function whenAudioReady(): Promise<void> {
  return tonePromise ?? Promise.resolve();
}

/** True if audio has been muted (by the visitor, storage, or reduced-motion). */
export function isMuted(): boolean {
  return muted;
}

/** Set + persist the unified mute, apply it to the master, and notify subscribers. */
export function setMuted(next: boolean): void {
  muted = next;
  try {
    window.localStorage.setItem(MUTE_KEY, next ? "true" : "false");
  } catch {
    /* storage blocked — the flag still governs in-memory for this session */
  }
  try {
    if (master) master.mute = next;
  } catch {
    /* no-op */
  }
  notify();
}

/** Subscribe to mute changes (for toggles + the heartbeat). Returns unsubscribe. */
export function subscribeMuted(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/**
 * RELAPSE silence cut. While suppressed, the typing blip and measuring tone go
 * quiet — the ending lands in silence — without touching the persisted mute.
 */
export function setAudioSuppressed(on: boolean): void {
  suppressed = on;
}

/** A soft clinical blip for one typed character. No-op unless audible. */
export function playBlip(): void {
  if (!started || muted || suppressed || !blipSynth || !Tone) return;
  const t = nowMs();
  if (t - lastBlipRt < AUDIO_TUNING.blip.minIntervalMs) return; // throttle
  lastBlipRt = t;
  try {
    const jitter = (Math.random() * 2 - 1) * AUDIO_TUNING.blip.jitterHz;
    const hz = Math.max(120, AUDIO_TUNING.blip.baseHz + jitter);
    blipSynth.triggerAttackRelease(hz, "64n", nextToneTime(), 0.9);
  } catch {
    /* no-op */
  }
}

/** A warm confirmation tone when a metric settles. No-op unless audible. */
export function playMeasure(): void {
  if (!started || muted || suppressed || !measureSynth) return;
  const t = nowMs();
  if (t - lastMeasureRt < AUDIO_TUNING.measure.minIntervalMs) return; // throttle
  lastMeasureRt = t;
  try {
    measureSynth.triggerAttackRelease(AUDIO_TUNING.measure.hz, "16n", nextToneTime(), 0.8);
  } catch {
    /* no-op */
  }
}
