import { RecoveryCounter } from "@/components/RecoveryCounter";
import { ATTRIBUTION } from "@/lib/config";

/**
 * The clinic's method, stated sincerely. Four earnest stages — no mechanism
 * named. Nothing here is false; it simply does not explain how treatment works.
 */
const METHOD: Array<{ title: string; line: string }> = [
  {
    title: "Assessment",
    line: "We begin with a structured, confidential evaluation of your exposure and current condition. No account, no wallet, no cost.",
  },
  {
    title: "Diagnosis",
    line: "We identify the pattern behind the distress and name it plainly. Understanding the condition is the first step toward recovery.",
  },
  {
    title: "Treatment",
    line: "A guided recovery session, tailored to your case. The clinic's method is applied directly to your situation.",
  },
  {
    title: "Recovery",
    line: "You are discharged with a recovery certificate and, should you choose, an optional record of your completed treatment.",
  },
];

/** The clinic's stated services. Deadpan, sincere, mechanism-free. */
const SERVICES = [
  "Professional Assessment",
  "Individual Recovery Plan",
  "Recovery Certificate",
  "Optional On-Chain Record",
];

export default function Home() {
  return (
    <div
      data-theme="landing"
      className="flex flex-1 flex-col bg-clinic-bg text-clinic-fg"
    >
      {/* Clinic header */}
      <header className="sticky top-0 z-10 border-b border-clinic-line bg-clinic-bg/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <span className="readout text-sm font-semibold uppercase tracking-[0.2em]">
            Green Candle Therapy
          </span>
          <span className="readout flex items-center gap-2 text-[0.7rem] uppercase tracking-[0.18em] text-clinic-muted">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-clinic-accent opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-clinic-accent" />
            </span>
            Clinic open
          </span>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero — fits the viewport */}
        <section className="mx-auto flex w-full max-w-6xl flex-col justify-center gap-12 px-6 py-16 min-h-[calc(100dvh-61px)] lg:flex-row lg:items-center lg:gap-16">
          <div className="flex max-w-xl flex-col gap-6">
            <span className="readout text-xs font-medium uppercase tracking-[0.24em] text-clinic-muted">
              Outpatient Clinic · Market-Induced Distress
            </span>

            <h1 className="text-balance text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl">
              Green Candle Therapy
            </h1>

            <p className="text-lg font-medium text-clinic-muted">
              Outpatient Clinic for Market-Induced Distress
            </p>

            <p className="max-w-md text-lg leading-relaxed text-clinic-muted">
              Helping traders recover from prolonged exposure to financial
              markets.
            </p>

            <ul className="flex flex-col gap-2 pt-1">
              {SERVICES.map((service) => (
                <li
                  key={service}
                  className="flex items-center gap-3 text-sm text-clinic-fg"
                >
                  <span
                    aria-hidden
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-clinic-accent/12 text-clinic-accent"
                  >
                    <svg
                      viewBox="0 0 20 20"
                      className="h-3 w-3"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M4 10.5l4 4 8-9" />
                    </svg>
                  </span>
                  {service}
                </li>
              ))}
            </ul>

            <div className="pt-2">
              <a
                href="/assessment"
                className="inline-flex rounded-lg bg-clinic-accent px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-clinic-accent-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-clinic-fg"
              >
                Begin Assessment
              </a>
            </div>
          </div>

          {/* Instrument panel: the live counter */}
          <div className="lg:ml-auto">
            <div className="w-full max-w-sm rounded-2xl border border-clinic-line bg-clinic-surface p-7 shadow-sm">
              <RecoveryCounter />
            </div>
          </div>
        </section>

        {/* About the clinic — the method, stated sincerely. */}
        <section
          id="about"
          className="border-t border-clinic-line bg-clinic-surface/40 scroll-mt-16"
        >
          <div className="mx-auto w-full max-w-6xl px-6 py-20">
            <div className="flex flex-col gap-3">
              <span className="readout text-xs font-medium uppercase tracking-[0.24em] text-clinic-muted">
                Our Methodology
              </span>
              <h2 className="max-w-lg text-2xl font-semibold tracking-tight sm:text-3xl">
                About the Clinic
              </h2>
              <p className="max-w-2xl text-clinic-muted">
                A measured, four-stage approach to recovery. We treat the
                condition, not the symptom, and we do it in order.
              </p>
            </div>

            <ol className="mt-12 grid gap-x-10 gap-y-8 sm:grid-cols-2">
              {METHOD.map((stage, i) => (
                <li key={stage.title} className="flex gap-4">
                  <span className="readout shrink-0 text-sm font-semibold tabular-nums text-clinic-accent">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="flex flex-col gap-1 border-t border-clinic-line pt-2">
                    <span className="font-semibold">{stage.title}</span>
                    <span className="text-sm leading-relaxed text-clinic-muted">
                      {stage.line}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-clinic-line">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-6 py-8 text-xs text-clinic-muted sm:flex-row sm:items-center sm:justify-between">
          <span className="readout uppercase tracking-[0.18em]">
            Green Candle Therapy
          </span>
          <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span>{ATTRIBUTION.disclaimer}</span>
            <span aria-hidden className="hidden sm:inline">
              ·
            </span>
            <span>{ATTRIBUTION.data}</span>
            <span aria-hidden className="hidden sm:inline">
              ·
            </span>
            <span>{ATTRIBUTION.operator}</span>
          </span>
        </div>
      </footer>
    </div>
  );
}
