/**
 * SHORT symptom labels — terse, deadpan noun-phrase condensations of each
 * answer's full micro-diagnosis. Used ONLY in the X post's "Treated for" list,
 * where the full sentences would blow past X's 280-char prefill limit. The full
 * micro-diagnoses are UNCHANGED and still shown on the card + denial screen.
 *
 * Keyed by answer id (the option `value` stored in flow.answers). Option values
 * are unique across every question, so a flat map is unambiguous. Every
 * clause-bearing Q2/Q3 option across all routes has exactly one label; a test
 * (symptomLabels.test.ts) enforces completeness + uniqueness so this set can
 * never silently drift from the assessment options.
 */
export const SYMPTOM_LABELS: Record<string, string> = {
  // — bull · Q2 (bull_drop) —
  volatility: "Drawdown dismissed as noise",
  consolidation: "Decline reframed as consolidation",
  understand: "Awaiting market apology",
  buy_more: "Loss-triggered exposure increase",
  // — bull · Q3 (bull_early) —
  weeks: "Quietly extended timeline",
  longer: "Vaguely widening timeline",
  last_cycle: "Unrevised multi-cycle conviction",
  timeless: "Timeless, unfalsifiable thesis",
  // — chop · Q2 (chop_reason) —
  comes_back: "Stagnation mistaken for stability",
  not_broken: "Goalposts continuously moved",
  building_energy: "Inactivity read as stored potential",
  direction_overrated: "Directionlessness reframed as stance",
  // — chop · Q3 (chop_waiting) —
  breakout: "Perpetually imminent breakout",
  final_flush: "Recurring 'final' capitulation",
  macro: "External-contingent recovery",
  apology: "Vindication demanded before action",
  // — bear · Q2 (bear_recovery) —
  any_day: "Permanently imminent recovery",
  next_catalyst: "Pending unnamed catalyst",
  when_i_sell: "Personal market-causation belief",
  on_weekly: "Escaped to a higher timeframe",
  // — bear · Q3 (bear_strategy) —
  accumulate: "Accumulation against conceded conditions",
  hold: "Pricing dismissed as temporary error",
  next_candle: "Single-candle reversal dependency",
  accidental_investor: "Involuntary long-term conversion",
};

/** The short label for an answer id, falling back to the id if unmapped. */
export function shortLabelFor(answerId: string | undefined): string {
  return (answerId && SYMPTOM_LABELS[answerId]) || answerId || "";
}
