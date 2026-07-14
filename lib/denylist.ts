import { DENYLISTED_SYMBOLS } from "./config";

/**
 * The clinic does not treat MONKEY/MON. These predicates are pure so they can be
 * unit-tested and reused on both the raw search text and the resolved asset.
 * A match yields a deadpan refusal upstream — never an error.
 */

const DENIED_SYMBOLS = DENYLISTED_SYMBOLS.map((s) => s.toLowerCase());
// Names that resolve to the denied assets (e.g. a search for "monad" -> MON).
const DENIED_NAMES = ["mon", "monkey", "monad"];

/** True if the user's free-text query itself is a denied asset. */
export function isDeniedText(query: string): boolean {
  const s = query.trim().toLowerCase();
  return DENIED_SYMBOLS.includes(s) || DENIED_NAMES.includes(s);
}

/** True if a resolved asset (symbol/name) is denied. Matched on symbol AND name. */
export function isDeniedAsset(asset: { symbol?: string; name?: string }): boolean {
  const symbol = (asset.symbol ?? "").trim().toLowerCase();
  const name = (asset.name ?? "").trim().toLowerCase();
  return DENIED_SYMBOLS.includes(symbol) || DENIED_NAMES.includes(name);
}
