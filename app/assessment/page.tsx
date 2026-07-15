"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { BeatShell } from "@/components/BeatShell";
import { TypeLine } from "@/components/motion/TypeLine";
import { getFlow, type Market, patchFlow } from "@/lib/flow";

/**
 * Beat 2 — Assessment. Three mandatory questions, one at a time. Every answer
 * leads forward (no dead ends) and is met with a short clinical "reading" so the
 * patient feels diagnosed, not merely recorded.
 *
 * Answers LOCK on selection: once chosen, the answer is committed and cannot be
 * changed or revisited within the session. This is deliberate — if answers were
 * toggleable, a patient could compare paths side by side and discover that every
 * route ends in denial, spoiling the reveal. Replaying the whole flow fresh (a
 * new session) is encouraged; changing a single answer in place is not allowed.
 */

interface Option {
  value: string;
  label: string;
  /** the clinical aside shown after this answer is committed */
  reading: string;
}

interface Question {
  id: string;
  prompt: string;
  options: Option[];
}

const QUESTIONS: Question[] = [
  {
    id: "market",
    prompt: "What market do you think we're in?",
    options: [
      {
        value: "bull",
        label: "A bull market",
        reading: "Recorded. Optimism noted, and dated.",
      },
      {
        value: "bear",
        label: "A bear market",
        reading: "Recorded. Self-awareness present — we can work with that.",
      },
      {
        value: "chop",
        label: "Chop — sideways, going nowhere",
        reading: "Recorded. You've named the discomfort. Progress.",
      },
    ],
  },
  {
    id: "reaction",
    prompt: "When the position turns against you, what do you do?",
    options: [
      {
        value: "average_down",
        label: "Add to it. Conviction.",
        reading: "Elevated conviction. A common presentation.",
      },
      {
        value: "look_away",
        label: "Close the app and go outside.",
        reading: "Avoidance. Healthier than most of what we see.",
      },
      {
        value: "refresh",
        label: "Check it every few minutes.",
        reading: "Hypervigilance. The screen cannot be soothed.",
      },
    ],
  },
  {
    id: "duration",
    prompt: "How long have you been early?",
    options: [
      {
        value: "weeks",
        label: "A few weeks.",
        reading: "Acute onset. The prognosis is manageable.",
      },
      {
        value: "months",
        label: "Months.",
        reading: "Sustained exposure. We'll proceed carefully.",
      },
      {
        value: "timeless",
        label: "I've stopped measuring in time.",
        reading: "Chronic. You have transcended the calendar.",
      },
    ],
  },
];

export default function AssessmentPage() {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  // The committed answer for the CURRENT question. Once set, it is locked.
  const [locked, setLocked] = useState<string | null>(null);

  const question = QUESTIONS[index];
  const isLast = index === QUESTIONS.length - 1;
  const chosen = useMemo(
    () => question.options.find((o) => o.value === locked) ?? null,
    [question, locked],
  );

  function commit(value: string) {
    // One-way: ignore any click once an answer is committed for this question.
    if (locked !== null) return;
    setLocked(value);

    // Persist immediately. Q1 is the self-reported market carried to beat 5.
    if (question.id === "market") {
      patchFlow({ market: value as Market });
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
      <div className="flex flex-1 flex-col">
        <span className="readout text-xs font-medium uppercase tracking-[0.24em] text-clinic-muted">
          Assessment · {String(index + 1).padStart(2, "0")} / 0{QUESTIONS.length}
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
