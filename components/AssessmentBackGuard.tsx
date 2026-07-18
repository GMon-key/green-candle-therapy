"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { resetFlow } from "@/lib/flow";

/**
 * Back-navigation guard for the assessment flow (beat 2, Q1–Q3).
 *
 * The assessment is a one-way diagnosis: answers LOCK on selection and cannot be
 * revisited (see app/assessment/page.tsx). A patient using the browser Back
 * button — or, on mobile, the back gesture — would otherwise unwind to a prior
 * question and shop for a different answer, which breaks that conceit.
 *
 * We intercept via the History API rather than trapping: on mount we seat a
 * guard entry on the history stack, and when a Back press pops it we re-seat it
 * (so the patient stays put on the CURRENT question) and raise a clinical modal.
 *   • "Continue assessment" — dismiss; stay on the current question, answers
 *     intact. This is the easy default (Escape / backdrop also choose it), so an
 *     accidental mobile back-swipe never feels punishing.
 *   • "Discharge myself"    — the deliberate exit: reset the session and return
 *     to the landing page, so a brand-new assessment starts clean.
 *
 * Back NEVER returns the patient to a previous question — popstate only re-seats
 * the guard and prompts; it never changes the question index.
 *
 * Scope: mounted only inside the assessment page, so the listener lives and dies
 * with that route and never touches navigation on the other beats.
 */
export function AssessmentBackGuard() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  // Set while we are intentionally leaving (discharge), so the popstate handler
  // stands down and does not re-arm against our own exit navigation.
  const dischargingRef = useRef(false);
  const continueRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    // Seat a guard entry so the first Back press pops THIS instead of leaving
    // the assessment URL. We catch that pop via popstate below.
    window.history.pushState(null, "", window.location.href);

    const onPopState = () => {
      if (dischargingRef.current) return;
      // Re-seat the guard immediately so we remain on this question and a
      // subsequent Back is still caught, then raise the modal.
      window.history.pushState(null, "", window.location.href);
      setOpen(true);
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const continueAssessment = useCallback(() => {
    // Stay exactly where we are — the guard entry is already re-seated.
    setOpen(false);
  }, []);

  const discharge = useCallback(() => {
    dischargingRef.current = true;
    setOpen(false);
    resetFlow();
    // Forward navigation (no popstate), so the guard handler will not fire; the
    // discharging flag is belt-and-braces in case it does.
    router.push("/");
  }, [router]);

  // Keep the modal legible + operable: lock background scroll, focus the default
  // action, and let Escape choose the non-punishing default (Continue).
  useEffect(() => {
    if (!open) return;
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    continueRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        continueAssessment();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, continueAssessment]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 backdrop-blur-sm sm:items-center"
      onClick={continueAssessment}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="backguard-title"
        aria-describedby="backguard-body"
        onClick={(e) => e.stopPropagation()}
        className="gct-rise w-full max-w-md rounded-2xl border border-clinic-line bg-clinic-surface p-6 text-clinic-fg shadow-2xl sm:p-8"
      >
        <span className="readout text-[0.65rem] font-medium uppercase tracking-[0.22em] text-clinic-muted">
          Assessment · Locked
        </span>

        <h2
          id="backguard-title"
          className="mt-3 text-xl font-semibold tracking-tight sm:text-2xl"
        >
          There is no going back.
        </h2>

        <p
          id="backguard-body"
          className="mt-3 text-sm leading-relaxed text-clinic-muted"
        >
          You made the right choice beginning treatment. Assessments cannot be
          un-taken. Continue your assessment — or discharge yourself against
          medical advice.
        </p>

        <div className="mt-7 flex flex-col gap-3">
          <button
            ref={continueRef}
            type="button"
            onClick={continueAssessment}
            className="inline-flex items-center justify-center rounded-lg bg-clinic-accent px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-clinic-accent-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clinic-fg"
          >
            Continue assessment
          </button>
          <button
            type="button"
            onClick={discharge}
            className="inline-flex items-center justify-center rounded-lg border border-clinic-line px-6 py-3 text-sm font-medium text-clinic-muted transition-colors hover:border-clinic-accent/50 hover:text-clinic-fg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clinic-fg"
          >
            Discharge myself
          </button>
        </div>
      </div>
    </div>
  );
}
