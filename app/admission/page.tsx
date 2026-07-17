"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { BeatShell } from "@/components/BeatShell";
import { TypeLine } from "@/components/motion/TypeLine";
import { sanitizeHandle, setHandle, skipHandle } from "@/lib/patient";

/**
 * Patient intake (before Q1). We take the patient's handle for the discharge
 * record, or let them stay anonymous (a case ID). The handle is personal data:
 * it is written to localStorage ONLY (see lib/patient) — never sent, never
 * POSTed, never mirrored server-side. Sanitized on the way in.
 *
 * Living-interface consistent with the other beats; reduced-motion resolves the
 * typed prompt instantly via TypeLine.
 */
export default function AdmissionPage() {
  const router = useRouter();
  const [value, setValue] = useState("");

  const cleaned = sanitizeHandle(value);

  function confirm() {
    // setHandle sanitizes; an empty/unusable handle falls back to a case ID.
    setHandle(value);
    router.push("/assessment");
  }

  function skip() {
    skipHandle();
    router.push("/assessment");
  }

  return (
    <BeatShell theme="assessment" phase="Admission">
      <div className="flex flex-1 flex-col">
        <span className="readout text-xs font-medium uppercase tracking-[0.24em] text-clinic-muted">
          Patient intake
        </span>

        <h1 className="mt-6 max-w-xl text-2xl font-semibold leading-snug tracking-tight sm:text-3xl">
          <TypeLine text="Please provide your handle for the record." speed={20} />
        </h1>
        <p
          className="gct-rise mt-4 max-w-md leading-relaxed text-clinic-muted"
          style={{ animationDelay: "200ms" }}
        >
          For the discharge summary. Kept on this device only — never sent
          anywhere. You may remain anonymous.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            confirm();
          }}
          className="gct-rise mt-8 flex flex-col gap-3 sm:flex-row"
          style={{ animationDelay: "320ms" }}
        >
          <div className="flex flex-1 items-center rounded-lg border border-clinic-line bg-clinic-surface px-4 focus-within:border-clinic-accent">
            <span aria-hidden className="readout text-sm text-clinic-muted">
              @
            </span>
            <input
              type="text"
              inputMode="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              maxLength={31}
              placeholder="yourhandle"
              aria-label="Your handle"
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              className="w-full bg-transparent px-2 py-3 text-sm text-clinic-fg outline-none placeholder:text-clinic-muted"
            />
          </div>
          <button
            type="submit"
            className="inline-flex items-center justify-center rounded-lg bg-clinic-accent px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-clinic-accent-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clinic-fg"
          >
            Confirm →
          </button>
        </form>

        {/* Live sanitized preview — shows exactly what will be filed. */}
        <p className="readout mt-4 min-h-[1.25rem] text-xs text-clinic-muted">
          {cleaned
            ? `Filed as @${cleaned}`
            : "No handle entered — you'll be filed anonymously."}
        </p>

        <div className="mt-8">
          <button
            type="button"
            onClick={skip}
            className="text-sm font-medium text-clinic-muted underline underline-offset-4 transition-colors hover:text-clinic-fg"
          >
            Prefer not to say
          </button>
        </div>

        <p
          className="gct-rise mt-auto pt-10 text-[0.7rem] leading-relaxed text-clinic-muted"
          style={{ animationDelay: "460ms" }}
        >
          Stored locally on this device. Not transmitted, not recorded on any
          server. It appears only on your discharge card.
        </p>
      </div>
    </BeatShell>
  );
}
