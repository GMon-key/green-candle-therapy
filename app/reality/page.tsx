"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { BeatShell } from "@/components/BeatShell";
import { Processing } from "@/components/motion/Processing";
import { TypeLine } from "@/components/motion/TypeLine";
import { RealityChart } from "@/components/RealityChart";
import {
  type Candle,
  classifyRegime,
  deriveMetrics,
  DIAGNOSIS_CODE,
  type Regime,
} from "@/lib/diagnosis";
import { getFlow, type Market, MARKET_LABEL } from "@/lib/flow";

/**
 * Beat 5 — Reality. The real 30-day record for the chosen asset, an honest
 * data-derived diagnosis (deriveMetrics + classifyRegime), and the contrast
 * with what the patient self-reported. This is the last beat before treatment;
 * NO treatment/recolour is applied here — beat 6 is a separate session.
 */

type Asset = NonNullable<ReturnType<typeof getFlow>["asset"]>;

type State =
  | { kind: "loading" }
  | { kind: "empty" }
  | { kind: "error"; message: string }
  | { kind: "data"; candles: Candle[]; asset?: Asset; market?: Market };

// What each diagnosed regime implies about the market, for the self-report contrast.
const IMPLIED_MARKET: Record<Regime, Market | null> = {
  euphoria: "bull",
  drawdown: "bear",
  coma: null,
  chop: "chop",
};

const STEPS = [
  "Pulling 30-day history",
  "Reconstructing the record",
  "Cross-referencing self-report",
  "Formalising the diagnosis",
];

export default function RealityPage() {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    // Defer state writes past the effect body (no synchronous setState in an
    // effect); sessionStorage can only be read on the client anyway.
    const raf = requestAnimationFrame(() => {
      const flow = getFlow();
      if (flow.candles?.length) {
        setState({
          kind: "data",
          candles: flow.candles,
          asset: flow.asset,
          market: flow.market,
        });
        return;
      }
      // Direct navigation / refresh with storage cleared: try to recover via
      // the asset id, else send the patient back to intake.
      if (flow.asset) {
        fetch(`/api/ohlc?query=${encodeURIComponent(flow.asset.id)}`, {
          cache: "no-store",
          signal: controller.signal,
        })
          .then(async (res) => {
            const data = (await res.json()) as {
              candles?: Candle[];
              error?: string;
            };
            if (res.ok && data.candles?.length) {
              setState({
                kind: "data",
                candles: data.candles,
                asset: flow.asset,
                market: flow.market,
              });
            } else {
              setState({
                kind: "error",
                message: data.error ?? "The record could not be reopened.",
              });
            }
          })
          .catch(() => {
            if (!controller.signal.aborted) {
              setState({
                kind: "error",
                message: "The records room is unreachable.",
              });
            }
          });
        return;
      }
      setState({ kind: "empty" });
    });
    return () => {
      cancelAnimationFrame(raf);
      controller.abort();
    };
  }, []);

  return (
    <BeatShell theme="diagnosis" phase="Reality">
      <div className="flex flex-1 flex-col">
        <span className="readout text-xs font-medium uppercase tracking-[0.24em] text-clinic-muted">
          The record
        </span>

        {state.kind === "loading" && (
          <p className="mt-8 readout flex items-center gap-2 text-sm text-clinic-muted">
            <span className="gct-breathe inline-block h-2 w-2 rounded-full bg-clinic-accent" />
            Reopening the record…
          </p>
        )}

        {state.kind === "empty" && (
          <EmptyPrompt message="No intake on record. We can't read a record you haven't named." />
        )}

        {state.kind === "error" && <EmptyPrompt message={state.message} />}

        {state.kind === "data" && (
          <DataView
            candles={state.candles}
            asset={state.asset}
            market={state.market}
            revealed={revealed}
            onRevealed={() => setRevealed(true)}
          />
        )}
      </div>
    </BeatShell>
  );
}

function EmptyPrompt({ message }: { message: string }) {
  return (
    <div className="mt-8 flex flex-col items-start gap-6">
      <p className="max-w-xl rounded-xl border border-clinic-line bg-clinic-surface px-5 py-4 text-sm leading-relaxed text-clinic-fg">
        {message}
      </p>
      <Link
        href="/intake"
        className="inline-flex rounded-lg bg-clinic-accent px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-clinic-accent-strong"
      >
        Return to intake →
      </Link>
    </div>
  );
}

function DataView({
  candles,
  asset,
  market,
  revealed,
  onRevealed,
}: {
  candles: Candle[];
  asset?: Asset;
  market?: Market;
  revealed: boolean;
  onRevealed: () => void;
}) {
  const metrics = deriveMetrics(candles);
  const diagnosis = classifyRegime(metrics);
  const code = DIAGNOSIS_CODE[diagnosis.regime];

  const symbol = (asset?.symbol ?? "asset").toUpperCase();
  const title = `${asset?.name ?? "Asset"} · ${symbol}/USD · 30 days`;

  const contrast = buildContrast(market, diagnosis.regime);

  if (!revealed) {
    return (
      <div className="mt-8">
        <Processing
          steps={STEPS}
          className="flex flex-col gap-2"
          onDone={onRevealed}
        />
      </div>
    );
  }

  return (
    <div className="mt-6 flex flex-col gap-8">
      {/* The real record */}
      <div className="gct-rise rounded-2xl border border-clinic-line bg-clinic-surface p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <span className="readout text-[0.7rem] uppercase tracking-[0.2em] text-clinic-muted">
            Patient record · {title}
          </span>
          <span className="readout text-[0.7rem] uppercase tracking-[0.2em] text-clinic-muted">
            Real data
          </span>
        </div>
        <RealityChart candles={candles} />
      </div>

      {/* Diagnosis */}
      <div>
        <span className="readout text-xs font-medium uppercase tracking-[0.24em] text-clinic-muted">
          Diagnosis · code {code}
        </span>
        <h1 className="mt-3 max-w-2xl text-2xl font-semibold leading-tight tracking-tight sm:text-3xl text-clinic-alert">
          <TypeLine text={diagnosis.label} speed={22} />
        </h1>
        <p
          className="gct-rise mt-4 max-w-xl leading-relaxed text-clinic-muted"
          style={{ animationDelay: "400ms" }}
        >
          {diagnosis.note}
        </p>
        <p
          className="gct-rise mt-4 max-w-xl text-sm font-medium text-clinic-fg"
          style={{ animationDelay: "560ms" }}
        >
          {contrast}
        </p>
      </div>

      {/* Real market vitals — derived, not CU */}
      <div>
        <span className="readout text-xs font-medium uppercase tracking-[0.24em] text-clinic-muted">
          Market vitals · real data
        </span>
        <dl className="mt-4 grid gap-3 sm:grid-cols-4">
          <Vital label="30-day change" value={`${fmtSigned(metrics.pctChange)}%`} delay={0} />
          <Vital label="Max drawdown" value={`${fmtSigned(metrics.maxDrawdown)}%`} delay={80} />
          <Vital label="Longest red streak" value={`${metrics.longestRedStreak}`} delay={160} />
          <Vital
            label="Red candles"
            value={`${Math.round(metrics.redCandleRatio * 100)}%`}
            delay={240}
          />
        </dl>
      </div>

      {/* Begin treatment — beat 6 ships separately (see report). */}
      <div className="mt-2 border-t border-clinic-line pt-6">
        <button
          type="button"
          disabled
          aria-disabled="true"
          className="inline-flex cursor-not-allowed rounded-lg bg-clinic-accent px-6 py-3 text-sm font-semibold text-white opacity-40"
        >
          Begin treatment →
        </button>
        <p className="mt-3 text-xs text-clinic-muted">
          The treatment room is being prepared. Your session opens shortly.
        </p>
      </div>
    </div>
  );
}

function Vital({
  label,
  value,
  delay,
}: {
  label: string;
  value: string;
  delay: number;
}) {
  return (
    <div
      className="gct-rise rounded-xl border border-clinic-line bg-clinic-surface px-4 py-3"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="readout text-[0.65rem] uppercase tracking-[0.16em] text-clinic-muted">
        {label}
      </div>
      <div className="readout mt-1 text-lg font-semibold tabular-nums text-clinic-fg">
        {value}
      </div>
    </div>
  );
}

function fmtSigned(n: number): string {
  const rounded = Math.round(n * 10) / 10;
  return rounded > 0 ? `+${rounded}` : `${rounded}`;
}

function buildContrast(market: Market | undefined, regime: Regime): string {
  if (!market) {
    return "No self-report on file. The data will speak for itself.";
  }
  const implied = IMPLIED_MARKET[regime];
  const label = MARKET_LABEL[market];
  if (implied === market) {
    return `Patient self-reported: ${label}. The data concurs — a rare and unsettling agreement.`;
  }
  return `Patient self-reported: ${label}. The data disagrees.`;
}
