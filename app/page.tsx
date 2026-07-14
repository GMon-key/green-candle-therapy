import { RecoveryCounter } from "@/components/RecoveryCounter";
import { ATTRIBUTION } from "@/lib/config";

/** The treatment pathway. A real sequence, so numbered stages carry meaning. */
const STAGES: Array<{ title: string; line: string }> = [
  { title: "Intake", line: "Tell us which asset put you here." },
  { title: "Assessment", line: "A short questionnaire. Yes, there are feelings involved." },
  { title: "Diagnosis", line: "We name the condition. In Latin, if it helps." },
  { title: "Charting", line: "We pull the real chart. This part will sting." },
  { title: "Prognosis", line: "An honest reading of the damage, measured to the candle." },
  { title: "Treatment", line: "We heal the chart. Red becomes green. Wicks straighten." },
  { title: "Discharge", line: "You leave with a certificate and a card to share." },
  { title: "Follow-up", line: "Optionally, record your recovery on-chain. For the group." },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col">
      {/* Clinic header */}
      <header className="sticky top-0 z-10 border-b border-line bg-paper/85 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <span className="readout text-sm font-semibold uppercase tracking-[0.2em]">
            Green Candle Therapy
          </span>
          <span className="readout flex items-center gap-2 text-[0.7rem] uppercase tracking-[0.18em] text-mute">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-heal opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-heal" />
            </span>
            Clinic open
          </span>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero — fits the viewport */}
        <section className="mx-auto flex w-full max-w-6xl flex-col justify-center gap-12 px-6 py-16 min-h-[calc(100dvh-61px)] lg:flex-row lg:items-center lg:gap-16">
          <div className="flex max-w-xl flex-col gap-6">
            <span className="readout text-xs font-medium uppercase tracking-[0.24em] text-mute">
              Outpatient clinic · Market-induced distress
            </span>

            <h1 className="text-balance text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl">
              We can&rsquo;t fix your portfolio.
              <br />
              <span className="text-heal">We can fix your chart.</span>
            </h1>

            <p className="max-w-md text-lg leading-relaxed text-mute">
              A therapeutic experience for traders in acute drawdown. Bring the
              coin that hurt you. Leave with a chart that loves you back.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-1">
              <a
                href="#pathway"
                className="rounded-lg bg-heal px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-heal-bright focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
              >
                How the treatment works ↓
              </a>
              <span className="text-xs text-mute">
                Free. No wallet required.
              </span>
            </div>
          </div>

          {/* Instrument panel: the live counter */}
          <div className="lg:ml-auto">
            <div className="w-full max-w-sm rounded-2xl border border-line bg-surface p-7 shadow-sm">
              <RecoveryCounter />
              <p className="mt-6 border-t border-line pt-4 text-xs italic text-mute">
                {ATTRIBUTION.disclaimer}
              </p>
            </div>
          </div>
        </section>

        {/* Treatment pathway */}
        <section
          id="pathway"
          className="border-t border-line bg-surface/40 scroll-mt-16"
        >
          <div className="mx-auto w-full max-w-6xl px-6 py-20">
            <div className="flex flex-col gap-3">
              <span className="readout text-xs font-medium uppercase tracking-[0.24em] text-mute">
                The treatment pathway
              </span>
              <h2 className="max-w-lg text-2xl font-semibold tracking-tight sm:text-3xl">
                Eight stages, start to discharge.
              </h2>
            </div>

            <ol className="mt-12 grid gap-x-10 gap-y-8 sm:grid-cols-2">
              {STAGES.map((stage, i) => (
                <li key={stage.title} className="flex gap-4">
                  <span className="readout shrink-0 text-sm font-semibold tabular-nums text-heal">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="flex flex-col gap-1 border-t border-line pt-2">
                    <span className="font-semibold">{stage.title}</span>
                    <span className="text-sm leading-relaxed text-mute">
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
      <footer className="border-t border-line">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-6 py-8 text-xs text-mute sm:flex-row sm:items-center sm:justify-between">
          <span className="readout uppercase tracking-[0.18em]">
            Green Candle Therapy
          </span>
          <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span>{ATTRIBUTION.disclaimer}</span>
            <span aria-hidden className="hidden sm:inline">·</span>
            <span>{ATTRIBUTION.data}</span>
            <span aria-hidden className="hidden sm:inline">·</span>
            <span>{ATTRIBUTION.operator}</span>
          </span>
        </div>
      </footer>
    </div>
  );
}
