"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";

import { BeatShell } from "@/components/BeatShell";
import type { Candle } from "@/lib/diagnosis";
import { type FlowState, patchFlow } from "@/lib/flow";

/**
 * Beat 4 — Intake. The patient names the asset that put them here. Free text is
 * resolved through the existing cached /api/ohlc route (CoinGecko search + OHLC
 * in one call). MONKEY/MON are refused deadpan; a miss is a prognosis, not an
 * error. Copy stays mechanism-free — "which asset", never "which chart".
 */

type Asset = NonNullable<FlowState["asset"]>;

interface OhlcResponse {
  asset?: Asset;
  candles?: Candle[];
  refused?: boolean;
  message?: string;
  error?: string;
}

// Quick picks — majors only. Deliberately NOT Monad-native assets.
const QUICK_PICKS: Array<{ label: string; query: string }> = [
  { label: "BTC", query: "bitcoin" },
  { label: "ETH", query: "ethereum" },
  { label: "SOL", query: "solana" },
  { label: "DOGE", query: "dogecoin" },
  { label: "PEPE", query: "pepe" },
];

export default function IntakePage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function resolve(raw: string) {
    const q = raw.trim();
    if (!q || pending) return;
    setPending(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/ohlc?query=${encodeURIComponent(q)}`, {
        cache: "no-store",
      });
      const data = (await res.json()) as OhlcResponse;

      // Denylist refusal comes back 200 with { refused: true }.
      if (data.refused) {
        setMessage(data.message ?? "This patient is not accepting treatment.");
        return;
      }
      if (!res.ok || !data.asset || !data.candles?.length) {
        setMessage(data.error ?? "Records temporarily unavailable.");
        return;
      }

      // Carry the resolved asset + its history into beat 5.
      patchFlow({ asset: data.asset, candles: data.candles });
      router.push("/reality");
    } catch {
      setMessage("The records room is unreachable. Try again.");
    } finally {
      setPending(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void resolve(query);
  }

  return (
    <BeatShell theme="assessment" phase="Intake">
      <div className="flex flex-1 flex-col">
        <span className="readout text-xs font-medium uppercase tracking-[0.24em] text-clinic-muted">
          Intake
        </span>

        <h1 className="mt-6 max-w-xl text-2xl font-semibold leading-snug tracking-tight sm:text-3xl">
          Which asset put you here?
        </h1>
        <p className="mt-4 max-w-md leading-relaxed text-clinic-muted">
          Name it. We&rsquo;ll pull the record and read it back to you — exactly
          as it happened.
        </p>

        <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={pending}
            placeholder="e.g. Bitcoin, SOL, that one you don't talk about"
            aria-label="Asset name or symbol"
            className="flex-1 rounded-lg border border-clinic-line bg-clinic-surface px-4 py-3 text-sm text-clinic-fg outline-none transition-colors placeholder:text-clinic-muted focus:border-clinic-accent"
          />
          <button
            type="submit"
            disabled={pending || !query.trim()}
            className="inline-flex items-center justify-center rounded-lg bg-clinic-accent px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-clinic-accent-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clinic-fg disabled:cursor-not-allowed disabled:opacity-40"
          >
            {pending ? "Consulting records…" : "Pull record →"}
          </button>
        </form>

        {/* Quick picks — majors. */}
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <span className="readout text-[0.7rem] uppercase tracking-[0.18em] text-clinic-muted">
            Common cases
          </span>
          {QUICK_PICKS.map((pick, i) => (
            <button
              key={pick.query}
              type="button"
              disabled={pending}
              onClick={() => {
                setQuery(pick.label);
                void resolve(pick.query);
              }}
              className="gct-rise rounded-full border border-clinic-line bg-clinic-surface px-3 py-1.5 text-xs font-medium text-clinic-fg transition-colors hover:border-clinic-accent/60 disabled:opacity-40"
              style={{ animationDelay: `${120 + i * 60}ms` }}
            >
              {pick.label}
            </button>
          ))}
        </div>

        {/* Pending pulse + honest messages (refusal / prognosis / errors). */}
        <div className="mt-8 min-h-[3rem]">
          {pending && (
            <span className="readout flex items-center gap-2 text-sm text-clinic-muted">
              <span className="gct-breathe inline-block h-2 w-2 rounded-full bg-clinic-accent" />
              Consulting the records…
            </span>
          )}
          {!pending && message && (
            <p
              role="status"
              className="max-w-xl rounded-xl border border-clinic-line bg-clinic-surface px-5 py-4 text-sm leading-relaxed text-clinic-fg"
            >
              {message}
            </p>
          )}
        </div>
      </div>
    </BeatShell>
  );
}
