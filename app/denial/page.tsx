"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { BeatShell } from "@/components/BeatShell";
import { CopeStat } from "@/components/CopeStat";
import { Processing } from "@/components/motion/Processing";
import { TypeLine } from "@/components/motion/TypeLine";
import {
  ATTENDING_CLINICIAN,
  deriveDenial,
  type DerivedDenial,
  ROUTES,
  SECONDARY_REFERENCE,
} from "@/lib/assessment";
import { getFlow, type Market } from "@/lib/flow";

/**
 * Beat 3 — Diagnosis of denial. Whatever the patient answered, the clinic
 * arrives at the same conclusion; only the phrasing is route-specific. The
 * preliminary finding (headline / supporting / route framing) is read from the
 * shared assessment engine so it matches the route chosen at Q1. Amber theme.
 *
 * The assessment is mandatory, so a market is always on file — arriving here
 * without one means the flow was skipped, and we send the patient back to it.
 *
 * Metrics are on a fixed 0–100 scale and render as BARE numbers here — the CU
 * unit and its definition are deferred to beat 7 (see CopeStat).
 */

// The intake metric values on a fixed 0–100 scale. The values are deliberately
// abnormal — the patient is hopium-rich and deep in denial.
const METRICS: Record<Market, Array<{ label: string; value: number }>> = {
  bull: [
    { label: "Hopium Reserve", value: 92 },
    { label: "Conviction", value: 88 },
    { label: "Emotional Liquidity", value: 31 },
    { label: "Denial Index", value: 96 },
  ],
  chop: [
    { label: "Hopium Reserve", value: 61 },
    { label: "Conviction", value: 47 },
    { label: "Emotional Liquidity", value: 54 },
    { label: "Denial Index", value: 79 },
  ],
  bear: [
    { label: "Hopium Reserve", value: 26 },
    { label: "Conviction", value: 63 },
    { label: "Emotional Liquidity", value: 58 },
    { label: "Denial Index", value: 71 },
  ],
};

const STEPS = [
  "Measuring Hopium concentration",
  "Sampling Conviction levels",
  "Assessing Emotional Liquidity",
  "Calculating Denial Index",
];

export default function DenialPage() {
  const router = useRouter();
  const [market, setMarket] = useState<Market | null>(null);
  const [derived, setDerived] = useState<DerivedDenial | null>(null);
  const [measured, setMeasured] = useState(false);

  // Flow state lives in sessionStorage — read it after mount (deferred a frame
  // so we never setState synchronously in the effect body). The assessment is
  // mandatory: the individualised diagnosis is composed from the persisted
  // answers, so a missing market OR incomplete answers means the flow was
  // skipped, and we send the patient back to the assessment.
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      const flow = getFlow();
      const m = flow.market;
      if (!m) {
        router.replace("/assessment");
        return;
      }
      const d = deriveDenial(m, flow.answers);
      if (!d) {
        router.replace("/assessment");
        return;
      }
      setMarket(m);
      setDerived(d);
    });
    return () => cancelAnimationFrame(raf);
  }, [router]);

  if (!market || !derived) {
    // Momentary state while reading storage / redirecting.
    return (
      <BeatShell theme="denial" phase="Diagnosis">
        <p className="readout flex items-center gap-2 text-sm text-clinic-muted">
          <span className="gct-breathe inline-block h-2 w-2 rounded-full bg-clinic-accent" />
          Reviewing your assessment…
        </p>
      </BeatShell>
    );
  }

  const finding = ROUTES[market].finding;
  const metrics = METRICS[market];

  // Report rhythm: each diagnosis sentence types after the previous one lands,
  // so the four-sentence note "arrives" line by line. Under reduced-motion every
  // TypeLine completes instantly regardless of startDelay (see TypeLine). The
  // start of sentence i is the cumulative type-time of all sentences before it,
  // computed purely (no render-time mutation) — n is 4, so O(n²) is free.
  const DIAG_SPEED = 15; // ms per character
  const DIAG_BASE = 300; // ms before the first sentence begins
  const DIAG_GAP = 160; // ms pause between sentences
  const sentenceDelays = derived.sentences.map(
    (_, i) =>
      DIAG_BASE +
      derived.sentences
        .slice(0, i)
        .reduce((sum, prev) => sum + prev.length * DIAG_SPEED + DIAG_GAP, 0),
  );

  return (
    <BeatShell theme="denial" phase="Diagnosis">
      <div className="flex flex-1 flex-col">
        <span className="readout text-xs font-medium uppercase tracking-[0.24em] text-clinic-muted">
          Preliminary finding
        </span>

        <h1 className="mt-6 max-w-2xl text-3xl font-semibold leading-tight tracking-tight sm:text-4xl text-clinic-alert">
          <TypeLine text={finding.headline} speed={26} />
        </h1>

        <p className="gct-rise mt-6 max-w-xl leading-relaxed text-clinic-muted" style={{ animationDelay: "500ms" }}>
          {finding.supporting}
        </p>

        <p
          className="gct-rise mt-4 max-w-xl text-sm font-medium leading-relaxed text-clinic-fg"
          style={{ animationDelay: "640ms" }}
        >
          {finding.routeFraming}
        </p>

        {/* Individualised clinical diagnosis — assembled by rule from the
            patient's answers (stem + Q2 clause + Q3 clause + closer). The GCT
            code and Reality Acceptance are computed from the same answers. */}
        <div className="mt-10">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="readout text-xs font-medium uppercase tracking-[0.24em] text-clinic-muted">
              Clinical diagnosis · {derived.code}
            </span>
            <span className="readout text-[0.65rem] uppercase tracking-[0.18em] text-clinic-muted/70">
              {SECONDARY_REFERENCE}
            </span>
          </div>
          <span className="readout mt-1 block text-[0.65rem] uppercase tracking-[0.16em] text-clinic-muted/70">
            GCT · behavioural-longitudinal index
          </span>

          {/* Report-style: one sentence per line, typed in sequence. */}
          <div className="mt-5 flex max-w-xl flex-col gap-3">
            {derived.sentences.map((sentence, i) => (
              <p
                key={i}
                className="text-sm leading-relaxed text-clinic-fg sm:text-base"
              >
                <TypeLine
                  text={sentence}
                  speed={DIAG_SPEED}
                  startDelay={sentenceDelays[i]}
                />
              </p>
            ))}
          </div>

          {/* Reality Acceptance — the clinic's estimate of the PATIENT. Kept in
              the dashed "clinical estimate" zone so it is never mistakable for
              market data. Distinct from beat 5's market-vitals slot. */}
          <div className="mt-6 max-w-xs rounded-xl border border-dashed border-clinic-line bg-clinic-surface px-4 py-3">
            <div className="flex items-baseline justify-between gap-3">
              <span className="readout text-[0.65rem] uppercase tracking-[0.16em] text-clinic-muted">
                Reality Acceptance
              </span>
              <span className="readout text-lg font-semibold tabular-nums text-clinic-fg">
                {derived.realityAcceptance}%
              </span>
            </div>
            <p className="mt-1 text-[0.65rem] leading-relaxed text-clinic-muted">
              Clinical estimate. Not measured from market data.
            </p>
          </div>
        </div>

        <p
          className="gct-rise mt-8 text-xs text-clinic-muted"
          style={{ animationDelay: "760ms" }}
        >
          Attending clinician: {ATTENDING_CLINICIAN}
        </p>

        {/* Intake metrics — measured, then revealed. */}
        <div className="mt-10">
          <span className="readout text-xs font-medium uppercase tracking-[0.24em] text-clinic-muted">
            Intake measurements
          </span>

          {!measured ? (
            <Processing
              steps={STEPS}
              className="mt-4 flex flex-col gap-2"
              onDone={() => setMeasured(true)}
            />
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {metrics.map((m, i) => (
                <CopeStat
                  key={m.label}
                  label={m.label}
                  value={m.value}
                  delayMs={i * 90}
                />
              ))}
            </div>
          )}
        </div>

        <div className="mt-auto pt-10">
          <Link
            href="/intake"
            className="inline-flex rounded-lg bg-clinic-accent px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-clinic-accent-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clinic-fg"
          >
            Continue to intake →
          </Link>
        </div>
      </div>
    </BeatShell>
  );
}
