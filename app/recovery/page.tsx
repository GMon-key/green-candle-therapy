"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { BeatShell } from "@/components/BeatShell";
import { CopeStat } from "@/components/CopeStat";
import { TypeLine } from "@/components/motion/TypeLine";
import { OnChainRecord } from "@/components/onchain/OnChainRecord";
import { Web3Provider } from "@/components/onchain/Web3Provider";
import { RecoveryCard } from "@/components/recovery/RecoveryCard";
import { ATTENDING_CLINICIAN } from "@/lib/assessment";
import { WELLBEING_UNIT_DEFINITION } from "@/lib/config";
import { type FlowState, getFlow, patchFlow } from "@/lib/flow";
import { ensurePatientLabel } from "@/lib/patient";
import {
  buildShareIntentUrl,
  buildShareText,
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
  const [flow, setFlow] = useState<FlowState | null>(null);
  const [nonce, setNonce] = useState("");
  const [patientLabel, setPatientLabel] = useState("");
  const [treatmentDate, setTreatmentDate] = useState("");
  const [copied, setCopied] = useState(false);
  const cardCanvasRef = useRef<HTMLCanvasElement>(null);

  // Read persisted flow after mount (sessionStorage is client-only; defer a
  // frame so we never setState synchronously in the effect body). An incomplete
  // session can't be discharged — route back to the step that's missing.
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      let f = getFlow();
      const derived = deriveRecovery(f);
      if (!derived) {
        // No named asset but a completed assessment → intake; otherwise start over.
        router.replace(f.market && f.answers ? "/intake" : "/assessment");
        return;
      }
      // Mint a stable per-session nonce (once) for the on-chain sessionHash.
      if (!f.sessionNonce) f = patchFlow({ sessionNonce: String(Date.now()) });
      setFlow(f);
      setNonce(f.sessionNonce ?? "");
      setData(derived);
      // Patient identity is separate from the flow — read (or mint) it from the
      // localStorage-only patient record. Never derived from the asset.
      setPatientLabel(ensurePatientLabel());
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

  // Share on X. The URL is built SYNCHRONOUSLY at the top (no await/promise —
  // buildShareIntentUrl is a pure string build over already-loaded state), so the
  // user gesture stays "live" for the popup. Content is proven fine (the caption
  // prefills when pasted); the failure was the popup CONTEXT. Fix: open a blank
  // tab in the same tick (keeps the new-tab UX + gesture), then NAVIGATE it
  // top-level to the intent URL — the same top-level navigation the address bar
  // does, which prefills. We drop "noopener" so we get a real window reference
  // (to detect a popup block) and sever the opener manually. If the popup is
  // blocked (ref is null), fall back to a same-tab navigation so the share still
  // happens.
  function handleShare() {
    if (!data) return;
    const url = buildShareIntentUrl(data);
    console.info("[share-on-x] opening:", url);
    const w = window.open("", "_blank");
    console.info("[share] window.open returned:", w);
    if (w) {
      try {
        w.opener = null;
      } catch {
        /* cross-origin opener not writable — ignore */
      }
      w.location.href = url;
    } else {
      // Popup blocked → same-tab top-level nav (still prefills; leaves the app).
      window.location.href = url;
    }
  }

  // Bulletproof fallback: copy the full caption (link included) to the clipboard
  // so the post can be pasted into a fresh compose regardless of X's intent.
  async function handleCopy() {
    if (!data) return;
    try {
      await navigator.clipboard.writeText(buildShareText(data));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked (insecure context / permissions) — no-op */
    }
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
              {patientLabel}
            </span>
          </Field>

          <Field label="Presenting complaint" delay={RISE.patient + 60}>
            <span className="text-lg font-semibold text-clinic-fg">
              {data.presentingComplaint}
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
              {data.microLabels.map((symptom, i) => (
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
                      speed={16}
                      startDelay={RISE.treated + i * 320}
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
            <RecoveryCard
              data={data}
              patientLabel={patientLabel}
              canvasRef={cardCanvasRef}
            />
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
          {/* Share via window.open — the exact structure of our working Banana
              Line share (single text= param with the link inline, noopener). */}
          <button
            type="button"
            onClick={handleShare}
            className="inline-flex items-center justify-center rounded-lg bg-clinic-accent px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-clinic-accent-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clinic-fg"
          >
            Share on X
          </button>
          {/* Bulletproof fallback: copy the caption to paste manually. */}
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center justify-center rounded-lg border border-clinic-line bg-clinic-surface px-6 py-3 text-sm font-semibold text-clinic-fg transition-colors hover:border-clinic-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clinic-fg"
          >
            {copied ? "Copied ✓" : "Copy caption"}
          </button>
        </div>

        {/* On-chain seam (beat 8) — wallet connect + live counter read, in Monad
            purple. Provider is scoped here so wallet code never loads on the
            emotional beats. Stage 1: connect + read only; the write is Stage 2. */}
        {flow && nonce && (
          <Web3Provider>
            <OnChainRecord flow={flow} nonce={nonce} />
          </Web3Provider>
        )}
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
