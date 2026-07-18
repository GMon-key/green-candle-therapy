import {
  encodeAbiParameters,
  type Address,
  type Hex,
  keccak256,
  stringToHex,
} from "viem";

import { deriveDenial } from "./assessment";
import {
  classifyRegime,
  deriveMetrics,
  DIAGNOSIS_CODE,
  MAX_DIAGNOSIS_CODE,
} from "./diagnosis";
import type { FlowState } from "./flow";
import { recoveryIndexCU } from "./recovery";

/**
 * Beat 8, Stage 2 — the recordRecovery input computation. PURE + deterministic
 * (unit-testable): given the persisted session, the connected wallet, and the
 * stable per-session nonce, it produces the four args the verified contract
 * expects, all satisfying its constraints so a valid session never reverts on
 * InvalidX / EmptySessionHash:
 *   - sessionHash: keccak256(wallet, canonical answers, asset id, nonce) — always
 *     non-zero, unique per wallet+session, stable across retries (same inputs).
 *   - assetHash:   keccak256 of the presenting complaint (e.g. "SHIB/USD").
 *   - diagnosisCode: the DATA-derived regime code (0..3), reusing DIAGNOSIS_CODE.
 *   - recoveryLevel: the recovery index (CU), clamped into [1, 100].
 */

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(n, hi));

export interface RecordArgs {
  sessionHash: Hex;
  assetHash: Hex;
  diagnosisCode: number;
  recoveryLevel: number;
}

/** "SHIB/USD" — the presenting complaint, from the flow's asset. */
export function presentingComplaintOf(flow: FlowState): string | null {
  if (!flow.asset) return null;
  return `${flow.asset.symbol.toUpperCase()}/USD`;
}

/** Canonical, order-independent serialisation of the answers for hashing. */
function canonicalAnswers(answers: Record<string, string>): string {
  return Object.keys(answers)
    .sort()
    .map((k) => `${k}=${answers[k]}`)
    .join("&");
}

/**
 * Compute the four recordRecovery args, or null when the session is incomplete
 * (no market/answers/asset/candles). Requires candles because the on-chain
 * diagnosisCode is the DATA-derived regime (matching beat 5's formal diagnosis),
 * not the route.
 */
export function computeRecordArgs(
  flow: FlowState,
  wallet: Address,
  nonce: string,
): RecordArgs | null {
  const { market, answers, asset, candles } = flow;
  if (!market || !answers || !asset || !candles?.length) return null;

  const regime = classifyRegime(deriveMetrics(candles)).regime;
  const diagnosisCode = clamp(DIAGNOSIS_CODE[regime], 0, MAX_DIAGNOSIS_CODE);

  const ra =
    flow.realityAcceptance ??
    deriveDenial(market, answers)?.realityAcceptance ??
    50;
  const recoveryLevel = clamp(recoveryIndexCU(ra), 1, 100);

  const complaint = `${asset.symbol.toUpperCase()}/USD`;
  const assetHash = keccak256(stringToHex(complaint));

  const sessionHash = keccak256(
    encodeAbiParameters(
      [
        { type: "address" },
        { type: "string" },
        { type: "string" },
        { type: "string" },
      ],
      [wallet, canonicalAnswers(answers), asset.id, nonce],
    ),
  );

  return { sessionHash, assetHash, diagnosisCode, recoveryLevel };
}

/* ============================================================================
 * Error classification — map a viem/wagmi write error to a calm, honest state.
 * ========================================================================== */

export type RecordErrorKind =
  | "rejected" // user cancelled the signature
  | "already" // SessionAlreadyRecorded (race with the pre-check)
  | "gas" // insufficient MON for gas
  | "chain" // wrong network
  | "generic";

export interface RecordError {
  kind: RecordErrorKind;
  message: string;
}

/** Best-effort message extraction across viem's nested error shapes. */
function errorText(error: unknown): string {
  if (!error) return "";
  const e = error as {
    shortMessage?: string;
    details?: string;
    message?: string;
    name?: string;
    cause?: unknown;
  };
  return [e.shortMessage, e.details, e.message, e.name]
    .filter(Boolean)
    .join(" | ")
    .concat(e.cause ? ` | ${errorText(e.cause)}` : "");
}

/** Classify a recordRecovery failure into a calm, retryable state. */
export function classifyRecordError(error: unknown): RecordError {
  const text = errorText(error).toLowerCase();

  if (
    text.includes("user rejected") ||
    text.includes("user denied") ||
    text.includes("userrejected") ||
    text.includes("rejected the request")
  ) {
    return { kind: "rejected", message: "Recording cancelled." };
  }
  if (text.includes("sessionalreadyrecorded") || text.includes("already recorded")) {
    return { kind: "already", message: "This recovery is already on-chain." };
  }
  if (text.includes("insufficient funds") || text.includes("insufficient balance")) {
    return {
      kind: "gas",
      message: "Recording requires MON for gas on Monad.",
    };
  }
  if (
    text.includes("chain mismatch") ||
    text.includes("does not match") ||
    text.includes("wrong network") ||
    text.includes("unsupported chain")
  ) {
    return { kind: "chain", message: "Switch to Monad to record." };
  }
  return { kind: "generic", message: "Recording failed. Please try again." };
}
