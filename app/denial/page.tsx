"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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
 *
 * The assessment is mandatory, so a market is always on file — arriving here
 * without one means the flow was skipped, and we send the patient back to it.
 */

const VERDICT: Record<Market, { line: string; note: string }> = {
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
};

// All CU metrics are on a fixed 0–100 scale. The values are deliberately
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
  const [measured, setMeasured] = useState(false);

  // Flow state lives in sessionStorage — read it after mount (deferred a frame
  // so we never setState synchronously in the effect body). The assessment is
  // mandatory: no market on file means the flow was skipped, so redirect back.
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      const m = getFlow().market;
      if (!m) {
        router.replace("/assessment");
        return;
      }
      setMarket(m);
    });
    return () => cancelAnimationFrame(raf);
  }, [router]);

  if (!market) {
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
