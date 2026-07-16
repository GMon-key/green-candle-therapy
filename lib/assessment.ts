import type { Market } from "./flow";

/**
 * The shared assessment engine for beats 2–5. ONE engine, route-specific
 * content: Q1 is universal and selects the route (bull / bear / chop); each
 * route then supplies its own Q2 and Q3, its preliminary finding, and its
 * beat-5 self-report framing. All three routes converge on DENIAL through
 * different reasoning — there are no bespoke per-answer scripts and no separate
 * pages. Denial (beat 3) and reality (beat 5) both read their route framing
 * from here, so the copy has a single source of truth.
 *
 * Answers drive FRAMING ONLY. Nothing in this file touches real chart/candle
 * data, market maths, the data-derived diagnosis, token selection, or API
 * output — the chart stays authentic and asset-driven.
 *
 * Question-count invariant (deliberate asymmetry — do NOT normalise):
 *   Q1 = exactly 3 options · every route Q2 = exactly 4 · every route Q3 = 4.
 */

export interface AssessmentOption {
  value: string;
  label: string;
  /** The answer-specific micro-diagnosis shown once this answer is committed. */
  reading: string;
  /**
   * Hidden denial weight (1–10) — never shown as UI. Feeds ONLY the beat-3
   * Reality Acceptance estimate (a clinical read on the PATIENT), never any
   * chart/market maths. Higher = deeper denial.
   */
  weight: number;
  /**
   * The route-assembled diagnosis clause for this answer (Q2/Q3 options only;
   * Q1 has none). One sentence, slotted between the route stem and closer to
   * build the beat-3 individualised diagnosis.
   */
  clause?: string;
}

export interface AssessmentQuestion {
  id: string;
  prompt: string;
  options: AssessmentOption[];
}

/** The route's preliminary finding (beat 3). All routes land on denial. */
export interface PreliminaryFinding {
  headline: string;
  supporting: string;
  routeFraming: string;
}

export interface RouteContent {
  /** Route-specific second question — exactly 4 options. */
  q2: AssessmentQuestion;
  /** Route-specific third question — exactly 4 options. */
  q3: AssessmentQuestion;
  /** Beat 3 preliminary finding for this route. */
  finding: PreliminaryFinding;
  /** Beat 5 self-report intro — the stated-belief-vs-chart framing. */
  beat5Intro: string;
  /**
   * First + last sentence of the beat-3 individualised diagnosis. The full
   * diagnosis is [stem] + [Q2 clause] + [Q3 clause] + [closer] — four sentences
   * assembled by rule, never 48 hardcoded blocks. Each route's stem/closer is
   * built around its denial mechanism (confirmation / deferral / prognostic).
   */
  diagnosisStem: string;
  diagnosisCloser: string;
  /**
   * Route digit for the beat-3 display code GCT-[R][Q2idx][Q3idx]. DISPLAY only
   * — unrelated to the on-chain DIAGNOSIS_CODE (0–3) and to the regime-derived
   * DIAGNOSIS_DISPLAY_CODE used at beat 5.
   */
  codeDigit: 3 | 5 | 7;
}

/** The attending clinician, named on findings + formal diagnosis ONLY. */
export const ATTENDING_CLINICIAN = "Dr. Rowan Hale";

/** Q1 — universal. Selects the route. Exactly 3 options (do NOT add a fourth). */
export const Q1: AssessmentQuestion = {
  id: "market",
  prompt: "What market do you think we're in?",
  options: [
    {
      value: "bull",
      label: "A bull market.",
      reading: "Bullish classification recorded. Supporting evidence pending.",
      weight: 8,
    },
    {
      value: "bear",
      label: "A bear market.",
      reading:
        "Market awareness detected. Recovery expectations remain untested.",
      weight: 4,
    },
    {
      value: "chop",
      label: "Chop — sideways, going nowhere.",
      reading: "Directional ambiguity accepted as a temporary condition.",
      weight: 6,
    },
  ],
};

export const ROUTES: Record<Market, RouteContent> = {
  bull: {
    q2: {
      id: "bull_drop",
      prompt: "What do you usually tell yourself after a 20% drop?",
      options: [
        {
          value: "volatility",
          label: "It's just volatility.",
          reading: "Severity minimised through terminology adjustment.",
          weight: 6,
          clause:
            "A drawdown of that order is logged as noise rather than as data.",
        },
        {
          value: "consolidation",
          label: "This is healthy consolidation.",
          reading:
            "Adverse movement successfully reframed as structural progress.",
          weight: 8,
          clause:
            "A sharp decline is reclassified as healthy consolidation and treated as requiring no action.",
        },
        {
          value: "understand",
          label: "The market will understand eventually.",
          reading: "External recognition dependency detected.",
          weight: 7,
          clause:
            "Losses are attributed to a market that is temporarily mistaken and expected to come round.",
        },
        {
          value: "buy_more",
          label: "I should probably buy more.",
          reading: "Exposure-increasing response remains active.",
          weight: 10,
          clause:
            "Downward movement is received as an opportunity, and exposure is added rather than trimmed.",
        },
      ],
    },
    q3: {
      id: "bull_early",
      prompt: "How long have you been early?",
      options: [
        {
          value: "weeks",
          label: "A few weeks.",
          reading: "Early-stage timeline extension recorded.",
          weight: 3,
          clause:
            "The wait is described as short, though it has already been extended once without acknowledgement.",
        },
        {
          value: "longer",
          label: "Longer than planned.",
          reading: "Original recovery window no longer available for review.",
          weight: 6,
          clause:
            "The original timeframe has quietly widened and is no longer quoted with any precision.",
        },
        {
          value: "last_cycle",
          label: "Since the last cycle.",
          reading: "Multi-cycle conviction remains unresolved.",
          weight: 8,
          clause:
            "Commitment now spans more than one cycle while the reasoning behind it stays unrevised.",
        },
        {
          value: "timeless",
          label: "I've stopped measuring in time.",
          reading: "Chronological accountability has been discontinued.",
          weight: 10,
          clause:
            "Time has been dropped from the account entirely, which leaves the whole thesis unfalsifiable.",
        },
      ],
    },
    finding: {
      headline: "Denial. Classic presentation.",
      supporting:
        "You reported a bull market. Confidence is noted. Confidence is not a treatment.",
      routeFraming:
        "Bullish classification sustained through selective evidence and an expanding time horizon.",
    },
    beat5Intro:
      "Patient self-reported: bull market. Objective findings do not currently support that classification.",
    diagnosisStem:
      "The patient holds a fixed bullish position and interprets incoming information selectively to protect it.",
    diagnosisCloser:
      "Only the confirming reading is retained in each case, and the presentation is best described as denial by confirmation.",
    codeDigit: 3,
  },

  chop: {
    q2: {
      id: "chop_reason",
      prompt: "What makes you call this chop?",
      options: [
        {
          value: "comes_back",
          label: "Price keeps coming back.",
          reading: "Repeated recovery mistaken for durable stability.",
          weight: 6,
          clause:
            "Repeated returns to a familiar level are taken as evidence of stability rather than of stagnation.",
        },
        {
          value: "not_broken",
          label: "Nothing has properly broken yet.",
          reading: "Damage threshold remains under continuous revision.",
          weight: 7,
          clause:
            "Nothing is judged to have properly given way yet, and the threshold for what would count is revised each time it nears.",
        },
        {
          value: "building_energy",
          label: "The range is building energy.",
          reading: "Inactivity assigned latent bullish properties.",
          weight: 8,
          clause:
            "Prolonged inactivity is credited with storing potential rather than reflecting its absence.",
        },
        {
          value: "direction_overrated",
          label: "Direction is overrated.",
          reading: "Outcome requirements have been relaxed.",
          weight: 9,
          clause:
            "The requirement for an outcome is downgraded, so that going nowhere is presented as a deliberate stance.",
        },
      ],
    },
    q3: {
      id: "chop_waiting",
      prompt: "What are you waiting for?",
      options: [
        {
          value: "breakout",
          label: "A clean breakout.",
          reading: "Resolution remains indefinitely imminent.",
          weight: 5,
          clause:
            "The clean break being awaited is described as imminent and is never assigned a date.",
        },
        {
          value: "final_flush",
          label: "One final flush.",
          reading: "Multiple final events have been reported.",
          weight: 7,
          clause:
            "A single final capitulation is anticipated, though several previous events have already been designated final.",
        },
        {
          value: "macro",
          label: "Better macro conditions.",
          reading:
            "Responsibility successfully transferred to external variables.",
          weight: 6,
          clause:
            "Improvement is made contingent on external conditions that are neither specified nor within reach.",
        },
        {
          value: "apology",
          label: "The chart to apologise.",
          reading: "Emotional negotiation with market structure detected.",
          weight: 9,
          clause:
            "Vindication is made a precondition for action, with the patient waiting to be issued an apology that will not arrive.",
        },
      ],
    },
    finding: {
      headline: "Denial. Sideways presentation.",
      supporting:
        "You reported chop. Duration has not improved the classification.",
      routeFraming:
        "Prolonged directional weakness has been classified as temporary range behaviour.",
    },
    beat5Intro:
      "Patient self-reported: chop market. The chart has spent considerable time disagreeing without selecting a direction acceptable to the patient.",
    diagnosisStem:
      "The patient treats the current condition as a passing phase and withholds any conclusion until it settles.",
    diagnosisCloser:
      "In each case the present is classified as provisional, and the deferral of judgment is itself the denial.",
    codeDigit: 5,
  },

  bear: {
    q2: {
      id: "bear_recovery",
      prompt: "When do you expect recovery to begin?",
      options: [
        {
          value: "any_day",
          label: "Any day now.",
          reading: "Recovery remains permanently imminent.",
          weight: 8,
          clause:
            "Recovery is expected imminently and has been expected imminently for some time.",
        },
        {
          value: "next_catalyst",
          label: "After the next catalyst.",
          reading: "Improvement outsourced to an unidentified future event.",
          weight: 6,
          clause:
            "Improvement is pinned to a future catalyst that remains unidentified.",
        },
        {
          value: "when_i_sell",
          label: "As soon as I sell.",
          reading: "Personal market-causation belief detected.",
          weight: 9,
          clause:
            "The turn is believed to hinge on the patient personally and to arrive only upon selling.",
        },
        {
          value: "on_weekly",
          label: "It already started on the weekly.",
          reading: "Timeframe substitution successfully completed.",
          weight: 7,
          clause:
            "Recovery is reported as already under way on a timeframe conveniently longer than the one in front of the patient.",
        },
      ],
    },
    q3: {
      id: "bear_strategy",
      prompt: "What is your current strategy?",
      options: [
        {
          value: "accumulate",
          label: "Keep accumulating.",
          reading: "Exposure increasing despite acknowledged conditions.",
          weight: 8,
          clause:
            "Exposure continues to be increased despite the conditions the patient has already conceded.",
        },
        {
          value: "hold",
          label: "Hold until the market understands.",
          reading: "Price discovery considered temporarily mistaken.",
          weight: 7,
          clause:
            "The position is held on the premise that current pricing is a temporary error.",
        },
        {
          value: "next_candle",
          label: "The next candle changes everything.",
          reading: "Single-event recovery dependency detected.",
          weight: 9,
          clause:
            "Total reversal is expected from a single move, an expectation that survives each failure of the last.",
        },
        {
          value: "accidental_investor",
          label: "I accidentally became a long-term investor.",
          reading: "Investment horizon extended without prior consent.",
          weight: 5,
          clause:
            "A short-term position has been reclassified as a long-term investment without any decision to that effect.",
        },
      ],
    },
    finding: {
      headline: "Denial. Prognostic presentation.",
      supporting:
        "You correctly identified a bear market. Your recovery timeline remains clinically ambitious.",
      routeFraming:
        "Market awareness is present. Immediate recovery expectations remain elevated.",
    },
    beat5Intro:
      "Patient self-reported: bear market. Initial observations support your market classification. The expected recovery schedule does not.",
    diagnosisStem:
      "The patient accepts the diagnosis of a bear market but treats its consequences as indefinitely postponable.",
    diagnosisCloser:
      "The reality itself is not disputed, only its timetable — and that indefinite delay is the denial.",
    codeDigit: 7,
  },
};

/**
 * The three individualised elements the beat-3 denial screen renders, all
 * COMPOSED BY RULE from the persisted answers — never 48 hardcoded blocks:
 *  - `sentences`: [stem, Q2 clause, Q3 clause, closer] — the 4-sentence diagnosis
 *  - `code`: display code GCT-[route][Q2idx][Q3idx] (1-based option indices)
 *  - `realityAcceptance`: 3–97, the clinic's estimate of the PATIENT
 *
 * These are DISPLAY/framing only. Nothing here reads or mutates chart data, the
 * data-derived diagnosis, token selection, or API output. All three routes still
 * converge on denial; only the individual phrasing and figures differ.
 */
export interface DerivedDenial {
  sentences: [string, string, string, string];
  code: string;
  realityAcceptance: number;
}

/** Constant secondary reference on every diagnosis — never varied, never explained. */
export const SECONDARY_REFERENCE = "ICD-GC-143";

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(n, hi));
}

/**
 * Reality Acceptance — non-linear, worst-answer-weighted. Takes the three denial
 * weights (route + Q2 + Q3), leans hardest on the most-in-denial answer, and
 * inverts to an acceptance percentage. Deterministic: same answers → same value.
 */
function computeRealityAcceptance(
  routeWeight: number,
  q2Weight: number,
  q3Weight: number,
): number {
  const weights = [routeWeight, q2Weight, q3Weight];
  const hi = Math.max(...weights);
  const lo = Math.min(...weights);
  const mid = weights.reduce((s, w) => s + w, 0) - hi - lo;
  const denialLoad = (0.5 * hi + 0.3 * mid + 0.2 * lo) * 10;
  return clamp(Math.round(100 - denialLoad), 3, 97);
}

/**
 * Assemble the individualised denial from the patient's answers. Returns null
 * when a required answer is missing (direct navigation / cleared storage) so the
 * caller can send the patient back to the mandatory assessment.
 */
export function deriveDenial(
  market: Market,
  answers: Record<string, string> | undefined,
): DerivedDenial | null {
  const route = ROUTES[market];
  const a = answers ?? {};

  const q2Index = route.q2.options.findIndex(
    (o) => o.value === a[route.q2.id],
  );
  const q3Index = route.q3.options.findIndex(
    (o) => o.value === a[route.q3.id],
  );
  if (q2Index < 0 || q3Index < 0) return null;

  const q2 = route.q2.options[q2Index];
  const q3 = route.q3.options[q3Index];
  const routeWeight =
    Q1.options.find((o) => o.value === market)?.weight ?? 0;

  return {
    // Both Q2/Q3 options carry a clause by construction; assert for the type.
    sentences: [
      route.diagnosisStem,
      q2.clause as string,
      q3.clause as string,
      route.diagnosisCloser,
    ],
    code: `GCT-${route.codeDigit}${q2Index + 1}${q3Index + 1}`,
    realityAcceptance: computeRealityAcceptance(
      routeWeight,
      q2.weight,
      q3.weight,
    ),
  };
}
