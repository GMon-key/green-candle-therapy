import { NextResponse } from "next/server";

import {
  fetchOhlc,
  RateLimitError,
  searchAsset,
  TimeoutError,
} from "@/lib/coingecko";
import { isDeniedAsset, isDeniedText } from "@/lib/denylist";

/**
 * GET /api/ohlc?query=<name|symbol>
 * Resolves the query to an asset, then returns its 30-day OHLC. Cached at the
 * CDN. Refuses MONKEY/MON deadpan; every genuine failure is honest, never faked.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const STABLE_CACHE = "public, s-maxage=300, stale-while-revalidate=600";
const NO_STORE = "no-store";
const REFUSAL = {
  refused: true,
  message: "This patient is not accepting treatment.",
};

export async function GET(req: Request) {
  const query = new URL(req.url).searchParams.get("query")?.trim() ?? "";

  if (!query) {
    return NextResponse.json(
      { error: "Tell us which asset hurt you." },
      { status: 400, headers: { "Cache-Control": NO_STORE } },
    );
  }

  if (isDeniedText(query)) {
    return NextResponse.json(REFUSAL, {
      headers: { "Cache-Control": STABLE_CACHE },
    });
  }

  try {
    const asset = await searchAsset(query);
    if (!asset) {
      // Nothing resolved: the asset itself was never found.
      return NextResponse.json(
        {
          error:
            "No records found for this asset. Either it doesn't exist, or you've repressed it so thoroughly the market has too.",
          reason: "not_found",
        },
        { status: 404, headers: { "Cache-Control": STABLE_CACHE } },
      );
    }
    if (isDeniedAsset(asset)) {
      return NextResponse.json(REFUSAL, {
        headers: { "Cache-Control": STABLE_CACHE },
      });
    }

    const candles = await fetchOhlc(asset.id);
    if (candles.length === 0) {
      // The asset resolved, but has no price history to pull.
      return NextResponse.json(
        { error: "No records exist for this patient.", reason: "no_ohlc" },
        { status: 404, headers: { "Cache-Control": STABLE_CACHE } },
      );
    }

    return NextResponse.json(
      { asset, days: 30, candles },
      { headers: { "Cache-Control": STABLE_CACHE } },
    );
  } catch (err) {
    if (err instanceof RateLimitError) {
      return NextResponse.json(
        { error: "The clinic is at capacity. Please try again shortly." },
        { status: 429, headers: { "Cache-Control": NO_STORE } },
      );
    }
    if (err instanceof TimeoutError) {
      return NextResponse.json(
        { error: "The records room is slow to respond. Try again." },
        { status: 504, headers: { "Cache-Control": NO_STORE } },
      );
    }
    return NextResponse.json(
      { error: "Records temporarily unavailable." },
      { status: 502, headers: { "Cache-Control": NO_STORE } },
    );
  }
}
