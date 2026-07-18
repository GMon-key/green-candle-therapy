"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ClinicExit } from "@/components/ClinicExit";
import { RelapseExperience } from "@/components/relapse/RelapseExperience";
import { deriveDenial } from "@/lib/assessment";
import type { Candle } from "@/lib/diagnosis";
import { getFlow } from "@/lib/flow";

/**
 * RELAPSE — the ending (the app's conclusion).
 *
 * The reverse of beat 6: the green treatment washes away and the camera zooms
 * back into the patient's REAL, unchanged chart (kept intact all through beat 6
 * for exactly this). Then the clinic delivers its deadpan follow-up and a
 * BRANCHED close: the treatment was cope and the market never moved (the joke —
 * futility), BUT the on-chain record, if made, survives (the sincere turn — the
 * one real recovery). The thesis line lands either way.
 *
 * Inputs come entirely from the persisted flow (the real candles, the denial
 * scalar, and whether a recovery was recorded on-chain). Nothing is invented.
 */

type Ready =
  | { kind: "loading" }
  | {
      kind: "ready";
      candles: Candle[];
      denial: number;
      recorded: boolean;
      recoveryId?: string;
    };

// Backstop so the close ALWAYS appears even if the canvas loop is throttled or
// errors mid-reveal — a touch beyond START_HOLD + REVERT_DURATION + SETTLE_HOLD.
const CLOSE_FALLBACK_MS = 8000;

export default function RelapsePage() {
  const router = useRouter();
  const [state, setState] = useState<Ready>({ kind: "loading" });
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const raf = requestAnimationFrame(() => {
      const flow = getFlow();
      const acceptance =
        flow.realityAcceptance ??
        (flow.market
          ? deriveDenial(flow.market, flow.answers)?.realityAcceptance
          : undefined) ??
        50;
      const denial = 100 - acceptance;
      const recorded = flow.recordedOnChain === true;
      const recoveryId = flow.recoveryId;

      if (flow.candles?.length) {
        setState({ kind: "ready", candles: flow.candles, denial, recorded, recoveryId });
        return;
      }
      // Direct navigation / cleared cache: reopen the record by asset id, else
      // send the patient back to the mandatory step — no chart, no relapse.
      if (flow.asset) {
        fetch(`/api/ohlc?query=${encodeURIComponent(flow.asset.id)}`, {
          cache: "no-store",
          signal: controller.signal,
        })
          .then(async (res) => {
            const data = (await res.json()) as { candles?: Candle[] };
            if (res.ok && data.candles?.length) {
              setState({ kind: "ready", candles: data.candles, denial, recorded, recoveryId });
            } else {
              router.replace("/intake");
            }
          })
          .catch(() => {
            if (!controller.signal.aborted) router.replace("/intake");
          });
        return;
      }
      router.replace(flow.market && flow.answers ? "/intake" : "/assessment");
    });
    return () => {
      cancelAnimationFrame(raf);
      controller.abort();
    };
  }, [router]);

  // Backstop for the close overlay (see CLOSE_FALLBACK_MS).
  useEffect(() => {
    if (state.kind !== "ready") return;
    const id = window.setTimeout(() => setSettled(true), CLOSE_FALLBACK_MS);
    return () => window.clearTimeout(id);
  }, [state.kind]);

  useEffect(() => {
    if (settled) console.info("[relapse] chart restored — close shown");
  }, [settled]);

  if (state.kind === "loading") {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#0b100e] text-[#7d8e86]">
        <p className="readout flex items-center gap-2 text-sm">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-[#7d8e86]" />
          Scheduling follow-up…
        </p>
      </div>
    );
  }

  return (
    <>
      <RelapseExperience
        candles={state.candles}
        denial={state.denial}
        onSettled={() => setSettled(true)}
      />

      {/* The deadpan close, fading in over the calm real chart. Scrim keeps the
          copy legible against the candles beneath. */}
      {settled && (
        <div className="fixed inset-0 z-20 flex items-end justify-center px-4 pb-24 sm:items-center sm:pb-4">
          <div className="gct-settle w-full max-w-lg rounded-2xl border border-white/10 bg-[#0b100e]/85 p-6 text-[#e6f1ea] shadow-2xl backdrop-blur-sm sm:p-8">
            <span className="readout text-[0.62rem] font-semibold uppercase tracking-[0.24em] text-[#7d8e86]">
              Follow-up assessment
            </span>

            <p className="mt-4 text-sm leading-relaxed text-[#c3d2ca] sm:text-base">
              Follow-up assessment completed. Current market conditions remain
              unchanged. Clinical improvement was not observed within the
              underlying asset.
            </p>

            {/* THE BRANCH — recorded (the record survives) vs skipped (nothing kept). */}
            {state.recorded ? (
              <p className="mt-4 text-sm leading-relaxed text-[#e6f1ea] sm:text-base">
                Visual rehabilitation was temporary. Your recovery record is not.{" "}
                {state.recoveryId
                  ? `Recovery #${state.recoveryId} remains permanently on Monad.`
                  : "Your recovery record remains permanently on Monad."}
              </p>
            ) : (
              <p className="mt-4 text-sm leading-relaxed text-[#9fb0a7] sm:text-base">
                Visual rehabilitation was temporary. Nothing was kept.
              </p>
            )}

            {/* The canonical thesis — identical in both branches (the beat-8 callback). */}
            <p className="mt-6 text-lg font-semibold tracking-tight text-[#e6f1ea] sm:text-xl">
              The chart can relapse. This cannot.
            </p>

            <div className="mt-8">
              <ClinicExit label="Return to clinic" />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
