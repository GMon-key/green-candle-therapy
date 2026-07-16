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
    },
    {
      value: "bear",
      label: "A bear market.",
      reading:
        "Market awareness detected. Recovery expectations remain untested.",
    },
    {
      value: "chop",
      label: "Chop — sideways, going nowhere.",
      reading: "Directional ambiguity accepted as a temporary condition.",
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
        },
        {
          value: "consolidation",
          label: "This is healthy consolidation.",
          reading:
            "Adverse movement successfully reframed as structural progress.",
        },
        {
          value: "understand",
          label: "The market will understand eventually.",
          reading: "External recognition dependency detected.",
        },
        {
          value: "buy_more",
          label: "I should probably buy more.",
          reading: "Exposure-increasing response remains active.",
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
        },
        {
          value: "longer",
          label: "Longer than planned.",
          reading: "Original recovery window no longer available for review.",
        },
        {
          value: "last_cycle",
          label: "Since the last cycle.",
          reading: "Multi-cycle conviction remains unresolved.",
        },
        {
          value: "timeless",
          label: "I've stopped measuring in time.",
          reading: "Chronological accountability has been discontinued.",
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
        },
        {
          value: "not_broken",
          label: "Nothing has properly broken yet.",
          reading: "Damage threshold remains under continuous revision.",
        },
        {
          value: "building_energy",
          label: "The range is building energy.",
          reading: "Inactivity assigned latent bullish properties.",
        },
        {
          value: "direction_overrated",
          label: "Direction is overrated.",
          reading: "Outcome requirements have been relaxed.",
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
        },
        {
          value: "final_flush",
          label: "One final flush.",
          reading: "Multiple final events have been reported.",
        },
        {
          value: "macro",
          label: "Better macro conditions.",
          reading:
            "Responsibility successfully transferred to external variables.",
        },
        {
          value: "apology",
          label: "The chart to apologise.",
          reading: "Emotional negotiation with market structure detected.",
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
        },
        {
          value: "next_catalyst",
          label: "After the next catalyst.",
          reading: "Improvement outsourced to an unidentified future event.",
        },
        {
          value: "when_i_sell",
          label: "As soon as I sell.",
          reading: "Personal market-causation belief detected.",
        },
        {
          value: "on_weekly",
          label: "It already started on the weekly.",
          reading: "Timeframe substitution successfully completed.",
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
        },
        {
          value: "hold",
          label: "Hold until the market understands.",
          reading: "Price discovery considered temporarily mistaken.",
        },
        {
          value: "next_candle",
          label: "The next candle changes everything.",
          reading: "Single-event recovery dependency detected.",
        },
        {
          value: "accidental_investor",
          label: "I accidentally became a long-term investor.",
          reading: "Investment horizon extended without prior consent.",
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
  },
};
