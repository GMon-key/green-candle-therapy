/**
 * Shared, framework-agnostic constants. Pure — safe to import anywhere.
 */

/** CoinGecko OHLC window. 30 days => 180 x 4h candles (see recon). */
export const OHLC_DAYS = 30;

/**
 * Assets the clinic refuses to treat. MONKEY/MON never appear inside the app.
 * A search for these returns a deadpan refusal, never an error.
 */
export const DENYLISTED_SYMBOLS = ["MON", "MONKEY"] as const;

/**
 * The clinic's wellbeing unit. Referenced everywhere, never hardcoded.
 * A clinical measure (like mg or bpm), not a token — collision-proof by design.
 */
export const WELLBEING_UNIT = "CU";

/**
 * The one deadpan definition of CU. Stated once, never repeated or hedged.
 */
export const WELLBEING_UNIT_DEFINITION =
  "CU — Cope Units. The clinic's standard measure of emotional wellbeing. Not a token. Not tradeable. Recognised by no financial institution.";

/**
 * Attribution + disclaimer strings live here in ONE place (never hardcoded in
 * renderers). The share card and the site footer both read from this.
 *
 * `disclaimer` is a compliance floor, not a comedy line: the app has a wallet
 * button and a real on-chain tx, so this must be visible so nothing reads as a
 * financial-recovery promise. It names no mechanism, so it spoils nothing.
 */
export const ATTRIBUTION = {
  operator: "powered by @MonkeHQ",
  data: "Data provided by CoinGecko",
  disclaimer: "Visual treatment only.",
} as const;
