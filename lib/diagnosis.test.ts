import { describe, expect, it } from "vitest";

import {
  type Candle,
  classifyRegime,
  deriveMetrics,
  DIAGNOSIS_CODE,
  diagnosisCodeFor,
  MAX_DIAGNOSIS_CODE,
} from "./diagnosis";

function mk(o: number, h: number, l: number, c: number, t = 0): Candle {
  return { t, o, h, l, c };
}

describe("deriveMetrics", () => {
  it("throws on an empty candle set (caller must surface an honest error)", () => {
    expect(() => deriveMetrics([])).toThrow();
  });

  it("computes vitals from a known series", () => {
    const candles = [
      mk(10, 12, 9, 11), // green
      mk(11, 11, 8, 9), // red, drawdown begins
      mk(9, 10, 8, 8), // red, streak = 2
      mk(8, 14, 8, 13), // green, new period high (14)
    ];
    const m = deriveMetrics(candles);

    expect(m.candles).toBe(4);
    expect(m.firstClose).toBe(11);
    expect(m.lastClose).toBe(13);
    expect(m.periodHigh).toBe(14);
    expect(m.periodLow).toBe(8);
    expect(m.redCandles).toBe(2);
    expect(m.longestRedStreak).toBe(2);
    expect(m.pctChange).toBeCloseTo(18.1818, 3);
    expect(m.maxDrawdown).toBeCloseTo(-27.2727, 3); // 11 -> 8
    expect(m.distanceFromHigh).toBeCloseTo(-7.1429, 3); // 13 vs 14
    expect(m.redCandleRatio).toBeCloseTo(0.5, 5);
  });

  it("counts the longest red streak, not just the total", () => {
    const candles = [
      mk(10, 10, 9, 9), // red (1)
      mk(9, 10, 8, 10), // green -> resets
      mk(10, 10, 8, 9), // red (1)
      mk(9, 9, 7, 8), // red (2)
      mk(8, 9, 7, 7), // red (3)
    ];
    const m = deriveMetrics(candles);
    expect(m.redCandles).toBe(4);
    expect(m.longestRedStreak).toBe(3);
  });
});

describe("classifyRegime", () => {
  it("flags a coma when the whole window barely moves", () => {
    const m = deriveMetrics([
      mk(100, 100.5, 99.6, 100.1),
      mk(100.1, 100.4, 99.8, 100.0),
      mk(100.0, 100.3, 99.7, 100.2),
    ]);
    expect(classifyRegime(m).regime).toBe("coma");
  });

  it("flags euphoria / denial when strongly up", () => {
    const m = deriveMetrics([
      mk(100, 110, 99, 105),
      mk(105, 125, 104, 120),
      mk(120, 135, 119, 130),
    ]);
    expect(classifyRegime(m).regime).toBe("euphoria");
  });

  it("flags a drawdown on deep peak-to-trough pain", () => {
    const m = deriveMetrics([
      mk(100, 102, 99, 100),
      mk(100, 101, 80, 82), // red, sharp drop
      mk(82, 85, 78, 80), // red
      mk(80, 88, 79, 85), // partial recovery
    ]);
    expect(classifyRegime(m).regime).toBe("drawdown");
  });

  it("flags chop for wide-but-directionless action", () => {
    const m = deriveMetrics([
      mk(100, 106, 95, 101),
      mk(101, 104, 97, 99),
      mk(99, 105, 96, 103),
      mk(103, 106, 98, 100),
    ]);
    expect(classifyRegime(m).regime).toBe("chop");
  });
});

describe("DIAGNOSIS_CODE (must stay in lockstep with RecoveryLog 0..3)", () => {
  it("maps every regime to a distinct code in [0, MAX_DIAGNOSIS_CODE]", () => {
    const codes = Object.values(DIAGNOSIS_CODE);
    expect(codes).toEqual([0, 1, 2, 3]); // order matches classifyRegime branches
    expect(new Set(codes).size).toBe(codes.length); // no collisions
    expect(Math.min(...codes)).toBe(0);
    expect(Math.max(...codes)).toBe(MAX_DIAGNOSIS_CODE);
    expect(MAX_DIAGNOSIS_CODE).toBe(3); // === contract MAX_DIAGNOSIS_CODE
  });

  it("returns the on-chain code for a diagnosed regime", () => {
    expect(diagnosisCodeFor("coma")).toBe(0);
    expect(diagnosisCodeFor("euphoria")).toBe(1);
    expect(diagnosisCodeFor("drawdown")).toBe(2);
    expect(diagnosisCodeFor("chop")).toBe(3);
  });
});
