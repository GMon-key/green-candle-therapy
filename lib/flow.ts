import type { Candle } from "./diagnosis";

/**
 * Client-only flow state for beats 2–5. Persisted in sessionStorage so answers
 * (especially the self-reported market) and the chosen asset carry across the
 * route transitions. Nothing is ever sent to or stored on a server — this is
 * the whole persistence layer for the assessment → reality journey.
 */

export type Market = "bull" | "bear" | "chop";

/** Human-facing label for a self-reported market. */
export const MARKET_LABEL: Record<Market, string> = {
  bull: "bull market",
  bear: "bear market",
  chop: "chop",
};

export interface FlowState {
  /** Q1 — the patient's self-reported market. Carried to beat 5 for contrast. */
  market?: Market;
  /** All assessment answers, keyed by question id. */
  answers?: Record<string, string>;
  /** The asset chosen at intake (beat 4). */
  asset?: { id: string; name: string; symbol: string };
  /** Cached OHLC so reality can render instantly without a second fetch. */
  candles?: Candle[];
}

const KEY = "gct.flow";

export function getFlow(): FlowState {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as FlowState) : {};
  } catch {
    return {};
  }
}

/** Merge a partial update into the stored flow state and return the result. */
export function patchFlow(patch: Partial<FlowState>): FlowState {
  const next = { ...getFlow(), ...patch };
  if (typeof window !== "undefined") {
    try {
      window.sessionStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* storage unavailable (private mode / quota) — the flow still works in-memory for this page */
    }
  }
  return next;
}

export function resetFlow(): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
