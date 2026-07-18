import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Engine gating tests for the app-wide audio layer. Tone is mocked to a fake
 * synth that records triggerAttackRelease calls, and the browser globals the
 * engine touches (window/localStorage/matchMedia/performance) are stubbed — so
 * these assert the pure control logic (autoplay gate, unified mute, RELAPSE
 * suppression, throttle, persistence) without a real AudioContext.
 */

const triggers: unknown[][] = [];
let toneTime = 0;
let nowValue = 0;

class FakeSynth {
  volume = { value: 0 };
  connect() {
    return this;
  }
  triggerAttackRelease(...args: unknown[]) {
    triggers.push(args);
  }
}
class FakeVolume {
  mute = false;
  constructor(public db: number) {}
  toDestination() {
    return this;
  }
}

vi.mock("tone", () => ({
  start: vi.fn().mockResolvedValue(undefined),
  now: () => toneTime,
  Volume: FakeVolume,
  Synth: FakeSynth,
}));

function stubBrowser(opts: { reduce?: boolean; stored?: string | null } = {}) {
  const { reduce = false, stored = null } = opts;
  const store: Record<string, string> = {};
  if (stored !== null) store["gct.audio.muted"] = stored;
  const localStorage = {
    getItem: (k: string) => (k in store ? store[k] : null),
    setItem: (k: string, v: string) => {
      store[k] = v;
    },
  };
  vi.stubGlobal("window", {
    matchMedia: (q: string) => ({ matches: reduce && /reduced-motion/.test(q) }),
    localStorage,
  });
  vi.stubGlobal("performance", { now: () => nowValue });
  return { store };
}

/** Fresh module with the given environment (state is module-level). */
async function loadEngine(opts?: { reduce?: boolean; stored?: string | null }) {
  vi.resetModules();
  const env = stubBrowser(opts);
  triggers.length = 0;
  toneTime = 0;
  nowValue = 1000;
  const mod = await import("./clinicAudio");
  return { ...mod, ...env };
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe("clinicAudio — autoplay gate", () => {
  it("stays silent until a gesture starts the engine", async () => {
    const a = await loadEngine();
    a.playBlip(); // no gesture yet
    a.playMeasure();
    expect(triggers.length).toBe(0);

    await a.initAudioOnGesture();
    a.playBlip();
    expect(triggers.length).toBe(1);
  });
});

describe("clinicAudio — unified mute", () => {
  it("gates blips + measure and persists the flag", async () => {
    const a = await loadEngine({ stored: "false" });
    await a.initAudioOnGesture();
    expect(a.isMuted()).toBe(false);

    a.setMuted(true);
    expect(a.isMuted()).toBe(true);
    a.playBlip();
    a.playMeasure();
    expect(triggers.length).toBe(0); // muted → nothing sounds
    expect(a.store["gct.audio.muted"]).toBe("true"); // persisted

    a.setMuted(false);
    nowValue += 1000;
    a.playBlip();
    expect(triggers.length).toBe(1);
    expect(a.store["gct.audio.muted"]).toBe("false");
  });
});

describe("clinicAudio — RELAPSE suppression", () => {
  it("silences blips + measure while suppressed, then restores", async () => {
    const a = await loadEngine({ stored: "false" });
    await a.initAudioOnGesture();

    a.setAudioSuppressed(true);
    a.playBlip();
    nowValue += 1000;
    a.playMeasure();
    expect(triggers.length).toBe(0); // the ending lands silent

    a.setAudioSuppressed(false);
    a.playBlip();
    expect(triggers.length).toBe(1);
  });
});

describe("clinicAudio — throttle", () => {
  it("drops blips inside the minimum interval (no machine-gun)", async () => {
    const a = await loadEngine({ stored: "false" });
    await a.initAudioOnGesture();

    nowValue = 5000;
    a.playBlip(); // fires
    a.playBlip(); // same instant → throttled
    a.playBlip(); // throttled
    expect(triggers.length).toBe(1);

    nowValue += a.AUDIO_TUNING.blip.minIntervalMs + 1;
    a.playBlip(); // interval elapsed → fires
    expect(triggers.length).toBe(2);
  });
});

describe("clinicAudio — reduced-motion default", () => {
  it("defaults muted under reduced-motion with no stored preference", async () => {
    const a = await loadEngine({ reduce: true, stored: null });
    expect(a.isMuted()).toBe(true);
  });

  it("a stored preference overrides the reduced-motion default", async () => {
    const a = await loadEngine({ reduce: true, stored: "false" });
    expect(a.isMuted()).toBe(false);
  });

  it("defaults ON when nothing is set and motion is allowed", async () => {
    const a = await loadEngine({ reduce: false, stored: null });
    expect(a.isMuted()).toBe(false);
  });
});
