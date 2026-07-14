import { NextResponse } from "next/server";

import { readTotalRecoveries } from "@/lib/monad";

/**
 * GET /api/counter
 * Live read of totalRecoveries() from Monad mainnet, CDN-cached briefly.
 * If the contract is not yet deployed or the read fails, respond honestly with
 * ok:false — the client must show a failure state, never a substitute number.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const OK_CACHE = "public, s-maxage=15, stale-while-revalidate=30";

export async function GET() {
  try {
    const total = await readTotalRecoveries();
    return NextResponse.json(
      { ok: true, total: total.toString() },
      { headers: { "Cache-Control": OK_CACHE } },
    );
  } catch {
    return NextResponse.json(
      { ok: false },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
