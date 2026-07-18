import { describe, expect, it } from "vitest";

import type { Candle } from "./diagnosis";
import type { FlowState } from "./flow";
import {
  classifyRecordError,
  computeRecordArgs,
  presentingComplaintOf,
} from "./record";

const WALLET_A = "0x1111111111111111111111111111111111111111" as const;
const WALLET_B = "0x2222222222222222222222222222222222222222" as const;
const ZERO_HASH =
  "0x0000000000000000000000000000000000000000000000000000000000000000";

/** A clearly-euphoric series: +30% first→last close. classifyRegime => euphoria (1). */
function euphoriaCandles(): Candle[] {
  return Array.from({ length: 30 }, (_, i) => {
    const c = 100 + i; // 100 -> 129
    return { t: i * 3_600_000, o: c - 0.5, h: c + 1, l: c - 1, c };
  });
}

function bullFlow(): FlowState {
  return {
    market: "bull",
    answers: {
      market: "bull",
      bull_drop: "consolidation",
      bull_early: "last_cycle",
    },
    asset: { id: "shiba-inu", name: "Shiba Inu", symbol: "shib" },
    candles: euphoriaCandles(),
    realityAcceptance: 40,
  };
}

describe("presentingComplaintOf", () => {
  it("formats the asset as SYMBOL/USD", () => {
    expect(presentingComplaintOf(bullFlow())).toBe("SHIB/USD");
  });
  it("is null without an asset", () => {
    expect(presentingComplaintOf({})).toBeNull();
  });
});

describe("computeRecordArgs", () => {
  const nonce = "1720000000000";

  it("returns null when the session is incomplete", () => {
    expect(computeRecordArgs({}, WALLET_A, nonce)).toBeNull();
    const noCandles = { ...bullFlow(), candles: undefined };
    expect(computeRecordArgs(noCandles, WALLET_A, nonce)).toBeNull();
  });

  it("produces a NON-ZERO sessionHash (avoids EmptySessionHash revert)", () => {
    const args = computeRecordArgs(bullFlow(), WALLET_A, nonce)!;
    expect(args.sessionHash).not.toBe(ZERO_HASH);
    expect(args.sessionHash).toMatch(/^0x[0-9a-f]{64}$/);
    expect(args.assetHash).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it("keeps diagnosisCode in [0,3] and recoveryLevel in [1,100]", () => {
    const args = computeRecordArgs(bullFlow(), WALLET_A, nonce)!;
    expect(args.diagnosisCode).toBe(1); // euphoria
    expect(args.diagnosisCode).toBeGreaterThanOrEqual(0);
    expect(args.diagnosisCode).toBeLessThanOrEqual(3);
    expect(args.recoveryLevel).toBe(87); // recoveryIndexCU(40)
    expect(args.recoveryLevel).toBeGreaterThanOrEqual(1);
    expect(args.recoveryLevel).toBeLessThanOrEqual(100);
  });

  it("is deterministic — same inputs give the same hashes (retry-safe)", () => {
    const a = computeRecordArgs(bullFlow(), WALLET_A, nonce)!;
    const b = computeRecordArgs(bullFlow(), WALLET_A, nonce)!;
    expect(a).toEqual(b);
  });

  it("is answer-order independent (canonicalised)", () => {
    const f1 = bullFlow();
    const f2: FlowState = {
      ...f1,
      answers: {
        bull_early: "last_cycle",
        bull_drop: "consolidation",
        market: "bull",
      },
    };
    expect(computeRecordArgs(f1, WALLET_A, nonce)!.sessionHash).toBe(
      computeRecordArgs(f2, WALLET_A, nonce)!.sessionHash,
    );
  });

  it("differs by wallet (different users can record the same session)", () => {
    const a = computeRecordArgs(bullFlow(), WALLET_A, nonce)!;
    const b = computeRecordArgs(bullFlow(), WALLET_B, nonce)!;
    expect(a.sessionHash).not.toBe(b.sessionHash);
    expect(a.assetHash).toBe(b.assetHash); // same asset -> same assetHash
  });

  it("differs by nonce (a fresh session re-records)", () => {
    const a = computeRecordArgs(bullFlow(), WALLET_A, "1720000000000")!;
    const b = computeRecordArgs(bullFlow(), WALLET_A, "1720000009999")!;
    expect(a.sessionHash).not.toBe(b.sessionHash);
  });
});

describe("classifyRecordError", () => {
  it("detects a user rejection", () => {
    expect(classifyRecordError({ message: "User rejected the request" }).kind).toBe(
      "rejected",
    );
    expect(classifyRecordError({ name: "UserRejectedRequestError" }).kind).toBe(
      "rejected",
    );
  });
  it("detects an already-recorded revert as its own (non-error) kind", () => {
    expect(
      classifyRecordError({ shortMessage: "SessionAlreadyRecorded(bytes32)" }).kind,
    ).toBe("already");
  });
  it("detects insufficient gas funds", () => {
    expect(
      classifyRecordError({ details: "insufficient funds for gas * price" }).kind,
    ).toBe("gas");
  });
  it("detects a chain mismatch", () => {
    expect(classifyRecordError({ message: "chain mismatch" }).kind).toBe("chain");
  });
  it("falls back to generic with a calm message", () => {
    const e = classifyRecordError({ message: "boom" });
    expect(e.kind).toBe("generic");
    expect(e.message).toMatch(/failed/i);
  });
});
