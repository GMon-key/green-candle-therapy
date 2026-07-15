"use client";

import { useEffect, useState } from "react";

import { useCountUp } from "@/lib/useCountUp";

/**
 * The hero number. Reads the live on-chain total from /api/counter.
 * NEVER shows a substitute value: loading is a skeleton, failure is an honest
 * state with a retry. A number appears only when the chain read succeeds.
 */

type State =
  | { status: "loading" }
  | { status: "ok"; total: number }
  | { status: "error" };

async function fetchCounter(signal: AbortSignal): Promise<number> {
  const res = await fetch("/api/counter", { cache: "no-store", signal });
  if (!res.ok) throw new Error("counter unavailable");
  const data = (await res.json()) as { ok?: boolean; total?: string };
  if (!data.ok || typeof data.total !== "string") {
    throw new Error("counter unavailable");
  }
  return Number(data.total);
}

export function RecoveryCounter() {
  const [state, setState] = useState<State>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    fetchCounter(controller.signal)
      .then((total) => setState({ status: "ok", total }))
      .catch((err) => {
        if (controller.signal.aborted) return;
        void err;
        setState({ status: "error" });
      });
    return () => controller.abort();
  }, [attempt]);

  const shown = useCountUp(state.status === "ok" ? state.total : null);

  return (
    <div className="flex flex-col gap-2">
      <span className="readout text-[0.7rem] font-medium uppercase tracking-[0.22em] text-mute">
        Patients recovered to date
      </span>

      {state.status === "loading" && (
        <div
          className="h-14 w-56 animate-pulse rounded-md bg-line"
          aria-label="Reading the clinic ledger…"
          role="status"
        />
      )}

      {state.status === "ok" && (
        <span className="readout text-6xl font-semibold leading-none text-heal tabular-nums">
          {shown.toLocaleString("en-US")}
        </span>
      )}

      {state.status === "error" && (
        <div className="flex flex-col gap-1">
          <span className="readout text-lg font-medium text-sick">
            Ledger offline
          </span>
          <p className="max-w-xs text-sm text-mute">
            The clinic&rsquo;s on-chain records are temporarily unreachable. No
            number is shown rather than a made-up one.{" "}
            <button
              type="button"
              onClick={() => {
                setState({ status: "loading" });
                setAttempt((a) => a + 1);
              }}
              className="font-medium text-ink underline underline-offset-2 hover:text-heal"
            >
              Retry
            </button>
          </p>
        </div>
      )}

      {/* On-chain layer — the one element that carries Monad purple. */}
      <span className="readout flex items-center gap-1.5 text-[0.7rem] uppercase tracking-[0.18em] text-monad">
        <span
          className="gct-breathe inline-block h-1.5 w-1.5 rounded-full bg-monad"
          aria-hidden
        />
        recorded on-chain · Monad Mainnet
      </span>
    </div>
  );
}
