"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { BeatShell } from "@/components/BeatShell";
import { CopeStat } from "@/components/CopeStat";
import { Processing } from "@/components/motion/Processing";
import { TypeLine } from "@/components/motion/TypeLine";
import { WELLBEING_UNIT_DEFINITION } from "@/lib/config";
import { getFlow, type Market } from "@/lib/flow";

/**
 * Beat 3 — Diagnosis of denial. Whatever the patient answered, the clinic
 * arrives at the same conclusion; only the phrasing is route-specific. A short
 * clinical response, then intake metrics measured in CU. Amber (warning) theme.
 */

type MarketKey = Market | "unknown";

const VERDICT: Record<MarketKey, { line: string; note: string }> = {
  bull: {
    line: "Denial. Classic presentation.",
    note: "You reported a bull market. The confidence is noted. Confidence is not a treatment.",
  },
  chop: {
    line: "Chop is bear with extra steps.",
    note: "Sideways is not safety. It is the same descent, taken slowly enough to feel like a decision.",
  },
  bear: {
    line: "Acceptance. The most dangerous stage.",
    note: "You named it correctly, which means you are no longer bracing. That is precisely when it lands.",
  },
  unknown: {
    line: "Denial. We'll take it as read.",
    note: "You skipped the questions. The clinic has seen enough presentations to fill in the rest.",
  },
};

const METRICS: Record<MarketKey, Array<{ label: string; value: number }>> = {
  bull: [
    { label: "Hopium Reserve", value: 84 },
    { label: "Conviction", value: 88 },
    { label: "Emotional Liquidity", value: 41 },
    { label: "Denial Index", value: 96 },
  ],
  chop: [
    { label: "Hopium Reserve", value: 57 },
    { label: "Conviction", value: 44 },
    { label: "Emotional Liquidity", value: 92 },
    { label: "Denial Index", value: 81 },
  ],
  bear: [
    { label: "Hopium Reserve", value: 22 },
    { label: "Conviction", value: 51 },
    { label: "Emotional Liquidity", value: 138 },
    { label: "Denial Index", value: 73 },
  ],
  unknown: [
    { label: "Hopium Reserve", value: 64 },
    { label: "Conviction", value: 60 },
    { label: "Emotional Liquidity", value: 100 },
    { label: "Denial Index", value: 88 },
  ],
};

const STEPS = [
  "Measuring Hopium concentration",
  "Sampling Conviction levels",
  "Assessing Emotional Liquidity",
  "Calculating Denial Index",
];

export default function DenialPage() {
  const [market, setMarket] = useState<MarketKey>("unknown");
  const [measured, setMeasured] = useState(false);

  // Flow state lives in sessionStorage — read it after mount to avoid any
  // server/client mismatch. Deferred a frame so we never setState synchronously
  // inside the effect body.
  useEffect(() => {
    const raf = requestAnimationFrame(() =>
      setMarket(getFlow().market ?? "unknown"),
    );
    return () => cancelAnimationFrame(raf);
  }, []);

  const verdict = VERDICT[market];
  const metrics = METRICS[market];

  return (
    <BeatShell theme="denial" phase="Diagnosis">
      <div className="flex flex-1 flex-col">
        <span className="readout text-xs font-medium uppercase tracking-[0.24em] text-clinic-muted">
          Preliminary finding
        </span>

        <h1 className="mt-6 max-w-2xl text-3xl font-semibold leading-tight tracking-tight sm:text-4xl text-clinic-alert">
          <TypeLine text={verdict.line} speed={26} />
        </h1>

        <p className="gct-rise mt-6 max-w-xl leading-relaxed text-clinic-muted" style={{ animationDelay: "500ms" }}>
          {verdict.note}
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
            <>
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
              <p className="mt-4 max-w-xl text-xs leading-relaxed text-clinic-muted">
                {WELLBEING_UNIT_DEFINITION}
              </p>
            </>
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
