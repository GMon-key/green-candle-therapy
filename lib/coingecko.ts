import "server-only";

import { OHLC_DAYS } from "./config";
import type { Candle } from "./diagnosis";

/**
 * Server-only CoinGecko client. The Demo API key is read from the environment
 * here and never leaves the server. Errors are typed so the route can respond
 * honestly (rate limit vs. timeout vs. upstream) instead of inventing data.
 */

const BASE = "https://api.coingecko.com/api/v3";
const TIMEOUT_MS = 8000;

export interface Asset {
  id: string;
  name: string;
  symbol: string;
}

export class RateLimitError extends Error {}
export class TimeoutError extends Error {}
export class UpstreamError extends Error {}

function cgHeaders(): HeadersInit {
  const key = process.env.COINGECKO_API_KEY;
  return key ? { "x-cg-demo-api-key": key } : {};
}

async function cgFetch(path: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: cgHeaders(),
      signal: controller.signal,
    });
    if (res.status === 429) throw new RateLimitError("coingecko rate limit");
    if (!res.ok) throw new UpstreamError(`coingecko ${res.status}`);
    return res;
  } catch (err) {
    if (
      err instanceof RateLimitError ||
      err instanceof UpstreamError ||
      err instanceof TimeoutError
    ) {
      throw err;
    }
    if ((err as Error)?.name === "AbortError") {
      throw new TimeoutError("coingecko timeout");
    }
    throw new UpstreamError((err as Error)?.message ?? "coingecko fetch failed");
  } finally {
    clearTimeout(timer);
  }
}

/** Resolve free-text (name/symbol) to the top matching asset, or null. */
export async function searchAsset(query: string): Promise<Asset | null> {
  const res = await cgFetch(`/search?query=${encodeURIComponent(query)}`);
  const data = (await res.json()) as {
    coins?: Array<{ id: string; name: string; symbol: string }>;
  };
  const coin = data.coins?.[0];
  if (!coin) return null;
  return { id: coin.id, name: coin.name, symbol: coin.symbol };
}

/** Fetch the 30-day OHLC (4h candles) for a resolved asset id. */
export async function fetchOhlc(id: string): Promise<Candle[]> {
  const res = await cgFetch(
    `/coins/${encodeURIComponent(id)}/ohlc?vs_currency=usd&days=${OHLC_DAYS}`,
  );
  const rows = (await res.json()) as Array<
    [number, number, number, number, number]
  >;
  if (!Array.isArray(rows)) return [];
  return rows.map(([t, o, h, l, c]) => ({ t, o, h, l, c }));
}
