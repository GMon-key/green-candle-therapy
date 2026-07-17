"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { BeatShell } from "@/components/BeatShell";
import { CopeStat } from "@/components/CopeStat";
import { TypeLine } from "@/components/motion/TypeLine";
import { RecoveryCard } from "@/components/recovery/RecoveryCard";
import { ATTENDING_CLINICIAN } from "@/lib/assessment";
import { WELLBEING_UNIT_DEFINITION } from "@/lib/config";
import { getFlow } from "@/lib/flow";
import {
  buildShareIntentUrl,
  deriveRecovery,
  type RecoveryData,
} from "@/lib/recovery";

/**
 * Beat 7 — Discharge. A polished, deadpan-clinical discharge summary assembled
 * entirely from persisted data (asset, answers, GCT code, Reality Acceptance —
 * the SAME figures shown at beats 3/5), plus the deferred Cope Units reveal
 * (the recovery index, named quietly in CU). It composes a shareable PNG card
 * client-side and offers Download + Share-on-X. Recovery theme: soft calm green.
 *
 * Purple is deliberately ABSENT here — it is reserved for the on-chain moment
 * (the next pass) and the ending. The on-chain CTA below is a disabled seam only.
 */

// —— Living-interface timing (staggered arrival; reduced-motion resolves instant) ——
const RISE = {
  patient: 120,
  diagnosis: 240,
  treated: 360,
  metrics: 520,
  meta: 700,
  card: 820,
  actions: 960,
} as const;

const DOWNLOAD_FILENAME = "green-candle-therapy-discharge.png";

export default function RecoveryPage() {
  const router = useRouter();
  const [data, setData] = useState<RecoveryData | null>(null);
  const [treatmentDate, setTreatmentDate] = useState("");
  const cardCanvasRef = useRef<HTMLCanvasElement>(null);

  // Read persisted flow after mount (sessionStorage is client-only; defer a
  // frame so we never setState synchronously in the effect body). An incomplete
  // session can't be discharged — route back to the step that's missing.
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      const flow = getFlow();
      const derived = deriveRecovery(flow);
      if (!derived) {
        // No named asset but a completed assessment → intake; otherwise start over.
        router.replace(flow.market && flow.answers ? "/intake" : "/assessment");
        return;
      }
      setData(derived);
      setTreatmentDate(
        new Date().toLocaleDateString("en-GB", {
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
      );
    });
    return () => cancelAnimationFrame(raf);
  }, [router]);

  function handleDownload() {
    const canvas = cardCanvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = DOWNLOAD_FILENAME;
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  function handleShare() {
    if (!data) return;
    window.open(
      buildShareIntentUrl(data),
      "_blank",
      "noopener,noreferrer",
    );
  }

  if (!data) {
    return (
      <BeatShell theme="recovery" phase="Discharge">
        <p className="readout flex items-center gap-2 text-sm text-clinic-muted">
          <span className="gct-breathe inline-block h-2 w-2 rounded-full bg-clinic-accent" />
          Preparing your discharge summary…
        </p>
      </BeatShell>
    );
  }

  return (
    <BeatShell theme="recovery" phase="Discharge">
      <div className="flex flex-1 flex-col">
        {/* Letterhead */}
        <span className="readout text-xs font-medium uppercase tracking-[0.24em] text-clinic-muted">
          Green Candle Therapy
        </span>
        <h1 className="mt-3 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl text-clinic-fg">
          <TypeLine text="Discharge Summary" speed={30} />
        </h1>
        <p
          className="gct-rise mt-3 max-w-xl text-sm leading-relaxed text-clinic-muted"
          style={{ animationDelay: `${RISE.patient}ms` }}
        >
          Treatment concluded. The patient is cleared for discharge.
        </p>

        {/* The document */}
        <div className="mt-8 flex flex-col gap-7 rounded-2xl border border-clinic-line bg-clinic-surface p-6 sm:p-8">
          <Field label="Patient" delay={RISE.patient}>
            <span className="text-lg font-semibold text-clinic-fg">
              {data.patientLabel}
            </span>
          </Field>

          <Field label="Diagnosis" delay={RISE.diagnosis}>
            <span className="text-lg font-semibold text-clinic-accent-strong">
              {data.presentationTag}
            </span>
            <span className="readout mt-1 block text-[0.7rem] uppercase tracking-[0.16em] text-clinic-muted">
              {data.code} · {data.secondaryReference}
            </span>
          </Field>

          <Field label="Treated for" delay={RISE.treated}>
            <ul className="flex flex-col gap-2">
              {data.microDiagnoses.map((symptom, i) => (
                <li
                  key={i}
                  className="flex gap-2 text-sm leading-relaxed text-clinic-fg sm:text-base"
                >
                  <span aria-hidden className="text-clinic-accent">
                    ·
                  </span>
                  <span>
                    <TypeLine
                      text={symptom}
                      speed={14}
                      startDelay={RISE.treated + i * 900}
                    />
                  </span>
                </li>
              ))}
            </ul>
          </Field>

          {/* Reality Acceptance + the CU reveal, side by side */}
          <div
            className="gct-rise grid gap-3 sm:grid-cols-2"
            style={{ animationDelay: `${RISE.metrics}ms` }}
          >
            <CopeStat
              label="Reality Acceptance"
              value={data.realityAcceptance}
            />
            {/* THE CU REVEAL — the recovery index is the first place the unit is
                named, quietly, via showUnit. The footnote states the one CU
                definition once (from config), deadpan and unhedged. */}
            <div className="flex flex-col gap-2">
              <CopeStat
                label="Recovery index"
                value={data.recoveryCU}
                delayMs={90}
                showUnit
              />
              <p className="px-1 text-[0.65rem] leading-relaxed text-clinic-muted">
                {WELLBEING_UNIT_DEFINITION}
              </p>
            </div>
          </div>

          {/* Footer meta */}
          <div
            className="gct-rise flex flex-col gap-1 border-t border-clinic-line pt-5 text-xs text-clinic-muted"
            style={{ animationDelay: `${RISE.meta}ms` }}
          >
            <span>Treatment date: {treatmentDate}</span>
            <span>Attending clinician: {ATTENDING_CLINICIAN}</span>
          </div>
        </div>

        {/* The share card — displayed prominently (screenshot-ready). */}
        <div
          className="gct-rise mt-10"
          style={{ animationDelay: `${RISE.card}ms` }}
        >
          <span className="readout text-xs font-medium uppercase tracking-[0.24em] text-clinic-muted">
            Shareable summary
          </span>
          <div className="mt-4 overflow-hidden rounded-xl">
            <RecoveryCard data={data} canvasRef={cardCanvasRef} />
          </div>
        </div>

        {/* Share actions */}
        <div
          className="gct-rise mt-6 flex flex-col gap-3 sm:flex-row"
          style={{ animationDelay: `${RISE.actions}ms` }}
        >
          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex items-center justify-center rounded-lg border border-clinic-line bg-clinic-surface px-6 py-3 text-sm font-semibold text-clinic-fg transition-colors hover:border-clinic-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clinic-fg"
          >
            Download card
          </button>
          <button
            type="button"
            onClick={handleShare}
            className="inline-flex items-center justify-center rounded-lg bg-clinic-accent px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-clinic-accent-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clinic-fg"
          >
            Share on X
          </button>
        </div>

        {/* On-chain seam — a DISABLED placeholder only. The next pass fills this
            slot with wallet connect + recordRecovery, and introduces the Monad
            purple reserved for that moment. No purple, no wallet here yet. */}
        <div className="mt-10 border-t border-clinic-line pt-6">
          <button
            type="button"
            disabled
            aria-disabled="true"
            className="inline-flex cursor-not-allowed items-center gap-2 rounded-lg border border-dashed border-clinic-line bg-clinic-surface px-6 py-3 text-sm font-semibold text-clinic-muted opacity-70"
          >
            Record recovery on-chain
            <span className="readout text-[0.65rem] uppercase tracking-[0.16em]">
              coming shortly
            </span>
          </button>
          <p className="mt-3 max-w-md text-xs leading-relaxed text-clinic-muted">
            Make this discharge permanent. Recording opens shortly.
          </p>
        </div>
      </div>
    </BeatShell>
  );
}

/** A labelled field in the discharge document, arriving on a stagger. */
function Field({
  label,
  delay,
  children,
}: {
  label: string;
  delay: number;
  children: React.ReactNode;
}) {
  return (
    <div className="gct-rise" style={{ animationDelay: `${delay}ms` }}>
      <span className="readout text-[0.7rem] font-medium uppercase tracking-[0.2em] text-clinic-muted">
        {label}
      </span>
      <div className="mt-2">{children}</div>
    </div>
  );
}
