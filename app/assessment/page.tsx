"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { AssessmentBackGuard } from "@/components/AssessmentBackGuard";
import { BeatShell } from "@/components/BeatShell";
import { TypeLine } from "@/components/motion/TypeLine";
import { type AssessmentQuestion, Q1, ROUTES } from "@/lib/assessment";
import { getFlow, type Market, patchFlow } from "@/lib/flow";

/**
 * Beat 2 — Assessment. Three mandatory questions, one at a time. Every answer
 * leads forward (no dead ends) and is met with a short clinical "reading" so the
 * patient feels diagnosed, not merely recorded.
 *
 * The flow is ROUTE-SPECIFIC: Q1 (universal) selects the route; Q2 and Q3 come
 * from the route the patient chose — all sourced from the shared assessment
 * engine (@/lib/assessment) so denial and reality frame the same route. Each
 * patient answers exactly Q1 + one route Q2 + one route Q3.
 *
 * Answers LOCK on selection: once chosen, the answer is committed and cannot be
 * changed or revisited within the session. This is deliberate — if answers were
 * toggleable, a patient could compare paths side by side and discover that every
 * route ends in denial, spoiling the reveal. Replaying the whole flow fresh (a
 * new session) is encouraged; changing a single answer in place is not allowed.
 */

const TOTAL = 3;

export default function AssessmentPage() {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  // The committed answer for the CURRENT question. Once set, it is locked.
  const [locked, setLocked] = useState<string | null>(null);
  // The route selected at Q1. Q2/Q3 are drawn from it; null until Q1 commits.
  const [market, setMarket] = useState<Market | null>(null);

  // Q1 is universal; Q2/Q3 belong to the chosen route. Until Q1 is answered,
  // only Q1 exists — the branch is unknown, so there is nothing else to show.
  const question: AssessmentQuestion = useMemo(() => {
    if (index === 0 || !market) return Q1;
    const route = ROUTES[market];
    return index === 1 ? route.q2 : route.q3;
  }, [index, market]);

  const isLast = index === TOTAL - 1;
  const chosen = useMemo(
    () => question.options.find((o) => o.value === locked) ?? null,
    [question, locked],
  );

  function commit(value: string) {
    // One-way: ignore any click once an answer is committed for this question.
    if (locked !== null) return;
    setLocked(value);

    // Persist immediately. Q1 is the self-reported market: it both selects the
    // route for Q2/Q3 and is carried to beat 5 for the self-report contrast.
    if (question.id === Q1.id) {
      const m = value as Market;
      setMarket(m);
      patchFlow({ market: m });
    }
    patchFlow({
      answers: { ...getFlow().answers, [question.id]: value },
    });
  }

  function advance() {
    if (locked === null) return;
    if (isLast) {
      router.push("/denial");
      return;
    }
    setIndex((i) => i + 1);
    setLocked(null);
  }

  return (
    <BeatShell theme="assessment" phase="Assessment">
      <AssessmentBackGuard />
      <div className="flex flex-1 flex-col">
        <span className="readout text-xs font-medium uppercase tracking-[0.24em] text-clinic-muted">
          Assessment · {String(index + 1).padStart(2, "0")} / 0{TOTAL}
        </span>

        {/* The question re-types each time index changes (key remount). */}
        <h1
          key={question.id}
          className="mt-10 max-w-xl text-2xl font-semibold leading-snug tracking-tight sm:text-3xl"
        >
          <TypeLine text={question.prompt} speed={20} />
        </h1>

        <div className="mt-8 flex flex-col gap-3">
          {question.options.map((option, i) => {
            const isChosen = locked === option.value;
            const isLockedOut = locked !== null && !isChosen;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => commit(option.value)}
                disabled={locked !== null}
                aria-pressed={isChosen}
                className={`gct-rise flex items-center justify-between rounded-xl border px-5 py-4 text-left text-sm font-medium transition-all ${
                  isChosen
                    ? "border-clinic-accent bg-clinic-accent/10 text-clinic-fg"
                    : isLockedOut
                      ? "cursor-default border-clinic-line bg-clinic-surface text-clinic-muted opacity-40"
                      : "cursor-pointer border-clinic-line bg-clinic-surface text-clinic-fg hover:border-clinic-accent/60"
                }`}
                style={{ animationDelay: `${120 + i * 70}ms` }}
              >
                <span>{option.label}</span>
                {isChosen ? (
                  <span className="readout flex items-center gap-1.5 text-[0.65rem] uppercase tracking-[0.16em] text-clinic-accent">
                    <span aria-hidden>✓</span> Committed
                  </span>
                ) : (
                  <span
                    aria-hidden
                    className="grid h-5 w-5 place-items-center rounded-full border border-clinic-line text-[0.6rem] text-transparent"
                  >
                    ✓
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* The clinical reading appears once an answer is committed. */}
        <div className="mt-8 min-h-[3.5rem]">
          {chosen && (
            <p key={chosen.value} className="readout text-sm text-clinic-muted">
              <TypeLine text={chosen.reading} speed={16} />
            </p>
          )}
        </div>

        <div className="mt-auto pt-8">
          <button
            type="button"
            onClick={advance}
            disabled={locked === null}
            className="inline-flex rounded-lg bg-clinic-accent px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-clinic-accent-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clinic-fg disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isLast ? "Complete assessment" : "Continue"} →
          </button>
        </div>
      </div>
    </BeatShell>
  );
}
