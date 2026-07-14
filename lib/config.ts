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

/** Fictional wellbeing unit. Cope Coins. NOT a token, not earned, not for sale. */
export const COPE_COIN_UNIT = "CC";

/**
 * Attribution + disclaimer strings live here in ONE place (never hardcoded in
 * renderers). The share card and the site footer both read from this.
 */
export const ATTRIBUTION = {
  operator: "powered by @MonkeHQ",
  data: "Data provided by CoinGecko",
  disclaimer: "Visual treatment only. Market unchanged.",
} as const;
