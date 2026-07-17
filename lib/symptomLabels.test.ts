import { describe, expect, it } from "vitest";

import { ROUTES } from "./assessment";
import type { Market } from "./flow";
import { SYMPTOM_LABELS, shortLabelFor } from "./symptomLabels";

const MARKETS: Market[] = ["bull", "chop", "bear"];

/** Every clause-bearing Q2/Q3 option value across all routes. */
function allAnswerIds(): string[] {
  const ids: string[] = [];
  for (const market of MARKETS) {
    const route = ROUTES[market];
    for (const q of [route.q2, route.q3]) {
      for (const opt of q.options) ids.push(opt.value);
    }
  }
  return ids;
}

describe("SYMPTOM_LABELS", () => {
  it("has a non-empty label for every Q2/Q3 option (completeness)", () => {
    for (const id of allAnswerIds()) {
      expect(SYMPTOM_LABELS[id], `missing label for "${id}"`).toBeTruthy();
    }
  });

  it("has no labels for answer ids that don't exist (no orphans)", () => {
    const valid = new Set(allAnswerIds());
    for (const id of Object.keys(SYMPTOM_LABELS)) {
      expect(valid.has(id), `orphan label for "${id}"`).toBe(true);
    }
  });

  it("keeps every label distinct so different paths read differently", () => {
    const labels = allAnswerIds().map((id) => SYMPTOM_LABELS[id]);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it("keeps labels terse (<= 42 chars) for the tweet", () => {
    for (const id of allAnswerIds()) {
      expect(SYMPTOM_LABELS[id].length).toBeLessThanOrEqual(42);
    }
  });

  it("falls back to the id when unmapped", () => {
    expect(shortLabelFor("not_a_real_id")).toBe("not_a_real_id");
    expect(shortLabelFor(undefined)).toBe("");
  });
});
