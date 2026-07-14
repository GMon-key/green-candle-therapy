/**
 * Derivation math + clinical classification. All pure functions — no I/O, no
 * framework. These turn a real OHLC array into the numbers the diagnosis and
 * (later) the treatment are scaled from.
 */

export interface Candle {
  /** timestamp, ms */
  t: number;
  o: number;
  h: number;
  l: number;
  c: number;
}

export interface MarketMetrics {
  candles: number;
  firstClose: number;
  lastClose: number;
  periodHigh: number;
  periodLow: number;
  /** % change, first close -> last close */
  pctChange: number;
  /** worst peak-to-trough on the close series, as a percentage (<= 0) */
  maxDrawdown: number;
  redCandles: number;
  /** 0..1 */
  redCandleRatio: number;
  /** longest run of consecutive red (close < open) candles */
  longestRedStreak: number;
  /** % of last close below the period high (<= 0 unless last is the high) */
  distanceFromHigh: number;
  /** (high - low) / firstClose, as a percentage — a coarse volatility read */
  rangePct: number;
}

/**
 * Compute the clinical vitals from an OHLC array.
 * @throws if given an empty array — the caller must surface an honest error.
 */
export function deriveMetrics(candles: Candle[]): MarketMetrics {
  if (candles.length === 0) {
    throw new Error("deriveMetrics: empty candle set");
  }

  const first = candles[0];
  const last = candles[candles.length - 1];

  let periodHigh = -Infinity;
  let periodLow = Infinity;
  let redCandles = 0;
  let longestRedStreak = 0;
  let streak = 0;
  let peak = first.c;
  let maxDrawdown = 0;

  for (const k of candles) {
    if (k.h > periodHigh) periodHigh = k.h;
    if (k.l < periodLow) periodLow = k.l;

    if (k.c < k.o) {
      redCandles += 1;
      streak += 1;
      if (streak > longestRedStreak) longestRedStreak = streak;
    } else {
      streak = 0;
    }

    if (k.c > peak) peak = k.c;
    const drawdown = (k.c - peak) / peak;
    if (drawdown < maxDrawdown) maxDrawdown = drawdown;
  }

  return {
    candles: candles.length,
    firstClose: first.c,
    lastClose: last.c,
    periodHigh,
    periodLow,
    pctChange: ((last.c - first.c) / first.c) * 100,
    maxDrawdown: maxDrawdown * 100,
    redCandles,
    redCandleRatio: redCandles / candles.length,
    longestRedStreak,
    distanceFromHigh: ((last.c - periodHigh) / periodHigh) * 100,
    rangePct: ((periodHigh - periodLow) / first.c) * 100,
  };
}

export type Regime = "coma" | "euphoria" | "drawdown" | "chop";

export interface Diagnosis {
  regime: Regime;
  /** the deadpan condition name shown to the patient */
  label: string;
  /** one clinical sentence of context */
  note: string;
}

/**
 * Map vitals to a condition. Every market state gets a prognosis — there are no
 * error states here, only diagnoses. (Treatment magnitude is scaled elsewhere.)
 */
export function classifyRegime(m: MarketMetrics): Diagnosis {
  // Flat / dead: almost no movement across the whole window.
  if (m.rangePct < 8) {
    return {
      regime: "coma",
      label: "The patient is in a coma",
      note: "Near-zero volatility. Vital signs flat. We will need the defibrillator.",
    };
  }

  // Already up: denial. The most dangerous time to arrive.
  if (m.pctChange >= 15) {
    return {
      regime: "euphoria",
      label: "Denial detected. You are not immune.",
      note: "The position is up. Statistically, this is the most dangerous moment to arrive at the clinic.",
    };
  }

  // Deep drawdown: acute exposure to red candles.
  if (m.maxDrawdown <= -20 || m.distanceFromHigh <= -15) {
    return {
      regime: "drawdown",
      label: "Acute exposure to red candles",
      note: "Sustained drawdown. The patient has been holding through significant unrealized pain.",
    };
  }

  // Sideways chop: prolonged emotional damage misclassified as consolidation.
  return {
    regime: "chop",
    label: "Prolonged emotional damage misclassified as consolidation",
    note: "Sideways chop. The patient calls it accumulation. The chart calls it nothing at all.",
  };
}
