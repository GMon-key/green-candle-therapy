"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { TreatmentExperience } from "@/components/treatment/TreatmentExperience";
import { deriveDenial } from "@/lib/assessment";
import type { Candle } from "@/lib/diagnosis";
import { getFlow } from "@/lib/flow";

/**
 * Beat 6 — Treatment. The patient's REAL 30-day record (carried from beat 5) is
 * handed to a custom-canvas experience that starts from that honest chart and
 * escalates into obvious fiction over a fixed 30 seconds. Intensity scales with
 * denial (denial = 100 − the Reality Acceptance persisted at beat 3); duration
 * does not. Entry is authorised by the "Admit Patient" gesture on beat 5.
 *
 * No treatment data is invented from thin air here — the animation transforms
 * the real candles; nothing writes back to the market data or the API.
 */

type Ready =
  | { kind: "loading" }
  | { kind: "ready"; candles: Candle[]; denial: number };

export default function TreatmentPage() {
  const router = useRouter();
  const [state, setState] = useState<Ready>({ kind: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    const raf = requestAnimationFrame(() => {
      const flow = getFlow();
      // Reality Acceptance is persisted at beat 3; recompute from the same
      // answers if absent so the intensity matches what the patient was shown.
      const acceptance =
        flow.realityAcceptance ??
        (flow.market
          ? deriveDenial(flow.market, flow.answers)?.realityAcceptance
          : undefined) ??
        50;
      const denial = 100 - acceptance;

      if (flow.candles?.length) {
        setState({ kind: "ready", candles: flow.candles, denial });
        return;
      }
      // Direct navigation / cleared cache: try to reopen the record by asset id,
      // else send the patient back to intake (no record, no treatment).
      if (flow.asset) {
        fetch(`/api/ohlc?query=${encodeURIComponent(flow.asset.id)}`, {
          cache: "no-store",
          signal: controller.signal,
        })
          .then(async (res) => {
            const data = (await res.json()) as { candles?: Candle[] };
            if (res.ok && data.candles?.length) {
              setState({ kind: "ready", candles: data.candles, denial });
            } else {
              router.replace("/intake");
            }
          })
          .catch(() => {
            if (!controller.signal.aborted) router.replace("/intake");
          });
        return;
      }
      router.replace("/intake");
    });
    return () => {
      cancelAnimationFrame(raf);
      controller.abort();
    };
  }, [router]);

  if (state.kind === "loading") {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-[#0b100e] text-[#7d8e86]">
        <p className="readout flex items-center gap-2 text-sm">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-[#2ce56b]" />
          Preparing the treatment room…
        </p>
      </div>
    );
  }

  return <TreatmentExperience candles={state.candles} denial={state.denial} />;
}
