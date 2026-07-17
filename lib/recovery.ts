import {
  deriveDenial,
  ROUTES,
  SECONDARY_REFERENCE,
} from "./assessment";
import type { FlowState, Market } from "./flow";

/**
 * Beat 7 derivations — the discharge summary, the share card, and the X post.
 * All PURE and framework-free. Nothing here recomputes the clinical figures
 * from scratch: the presentation tag, GCT code, micro-diagnoses and Reality
 * Acceptance are the SAME values the patient was shown at beats 3/5, read back
 * from the persisted flow. The one new figure is the recovery index (CU), the
 * deferred Cope Units reveal — a deadpan derivation, deterministic per session.
 */

/** The canonical public URL, embedded verbatim in the shareable X post. */
export const RECOVERY_SHARE_URL = "https://green-candle-therapy.vercel.app";

/* ============================================================================
 * Recovery index (CU) — the deferred Cope Units reveal.
 *
 * The clinic always reports a successful discharge, so the index sits high by
 * construction and never reaches a clean 100 (clinical, not triumphal). It
 * scales with DENIAL (100 − Reality Acceptance): the deeper the denial, the more
 * Cope Units the treatment had to administer to reach discharge. Deterministic —
 * same session, same number.
 * ========================================================================== */
export const RECOVERY_CU_FLOOR = 72; // CU at zero denial (least cope required)
export const RECOVERY_CU_DENIAL_GAIN = 0.25; // extra CU per point of denial
export const RECOVERY_CU_MAX = 99; // discharge ceiling — never a clean 100

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(n, hi));

/** Recovery index in Cope Units, derived from the persisted Reality Acceptance. */
export function recoveryIndexCU(realityAcceptance: number): number {
  const denial = clamp(100 - realityAcceptance, 0, 100);
  return clamp(
    Math.round(RECOVERY_CU_FLOOR + denial * RECOVERY_CU_DENIAL_GAIN),
    0,
    RECOVERY_CU_MAX,
  );
}

/**
 * The route's presentation tag as one inline clinical phrase, e.g.
 * "Denial, classic presentation". A reformat of the beat-3 finding headline
 * ("Denial. Classic presentation.") — the single source of that copy — into a
 * comma-joined tag suitable for the diagnosis line. Not new copy.
 */
export function presentationTag(market: Market): string {
  return ROUTES[market].finding.headline
    .replace(/\.\s+/, ", ") // "Denial. Classic…" -> "Denial, Classic…"
    .replace(/\.$/, "") // drop the trailing period
    .replace(/, (.)/, (_, c: string) => `, ${c.toLowerCase()}`); // -> ", classic…"
}

/** Everything the discharge summary, share card, and X post render. */
export interface RecoveryData {
  /** Asset name, upper — e.g. "BITCOIN". */
  patientName: string;
  /** Asset symbol, upper — e.g. "BTC". */
  symbol: string;
  /** Patient line, e.g. "BITCOIN (BTC/USD)". */
  patientLabel: string;
  /** Route presentation tag, e.g. "Denial, classic presentation". */
  presentationTag: string;
  /** GCT display code, e.g. "GCT-343". */
  code: string;
  /** Constant secondary reference — "ICD-GC-143". */
  secondaryReference: string;
  /** The two individualised micro-diagnoses (Q2, Q3 clauses), verbatim. */
  microDiagnoses: [string, string];
  /** Persisted Reality Acceptance (%). */
  realityAcceptance: number;
  /** Recovery index in CU (the Cope Units reveal). */
  recoveryCU: number;
}

/**
 * Assemble the recovery data from the persisted flow. Returns null when the
 * session is incomplete (no market/answers, or no named asset) so the caller can
 * route the patient back to the mandatory step — the summary can never invent a
 * patient it was never given.
 */
export function deriveRecovery(flow: FlowState): RecoveryData | null {
  const { market, answers, asset, realityAcceptance } = flow;
  if (!market || !asset) return null;

  const denial = deriveDenial(market, answers);
  if (!denial) return null;

  // Beat 3 persists the estimate; recompute from the same answers only if it is
  // somehow absent, so the three beats never disagree.
  const ra = realityAcceptance ?? denial.realityAcceptance;

  const patientName = asset.name.toUpperCase();
  const symbol = asset.symbol.toUpperCase();

  return {
    patientName,
    symbol,
    patientLabel: `${patientName} (${symbol}/USD)`,
    presentationTag: presentationTag(market),
    code: denial.code,
    secondaryReference: SECONDARY_REFERENCE,
    // sentences = [stem, Q2 clause, Q3 clause, closer]; the Q2/Q3 clauses are
    // the two micro-diagnoses shown on the denial screen, carried verbatim.
    microDiagnoses: [denial.sentences[1], denial.sentences[2]],
    realityAcceptance: ra,
    recoveryCU: recoveryIndexCU(ra),
  };
}

/* ============================================================================
 * Share on X — built from scratch (twitter.com/intent/tweet + encodeURIComponent).
 *
 * Anti-spam compliant: exactly 2 emoji (🩺 🍌), 1 mention (@MonkeHQ), 1 link.
 * No hashtags. The template is fixed; only the slots vary.
 * ========================================================================== */

/** The exact pre-filled X post text (pre-encoding). Newlines are literal "\n". */
export function buildShareText(data: RecoveryData): string {
  return [
    "🩺 Green Candle Therapy — Discharge Summary",
    "",
    "Treated for:",
    `· ${data.microDiagnoses[0]}`,
    `· ${data.microDiagnoses[1]}`,
    "",
    `Reality Acceptance: ${data.realityAcceptance}%.`,
    "The chart has been treated. The market remains unchanged.",
    "",
    "Thanks @MonkeHQ, I now feel better 🍌",
    "",
    RECOVERY_SHARE_URL,
  ].join("\n");
}

/** The X compose URL with the post text URL-encoded into the `text` param. */
export function buildShareIntentUrl(data: RecoveryData): string {
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(buildShareText(data))}`;
}
