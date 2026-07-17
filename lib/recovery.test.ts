import { describe, expect, it } from "vitest";

import { ROUTES } from "./assessment";
import type { FlowState } from "./flow";
import {
  buildShareIntentUrl,
  buildShareText,
  deriveRecovery,
  presentationTag,
  RECOVERY_CU_FLOOR,
  RECOVERY_CU_MAX,
  RECOVERY_SHARE_URL,
  recoveryIndexCU,
} from "./recovery";

/** A complete bull-route flow: Q2 = consolidation (idx 2), Q3 = last_cycle (idx 3). */
function bullFlow(): FlowState {
  return {
    market: "bull",
    answers: {
      market: "bull",
      bull_drop: "consolidation",
      bull_early: "last_cycle",
    },
    asset: { id: "bitcoin", name: "Bitcoin", symbol: "btc" },
    realityAcceptance: 40,
  };
}

describe("recoveryIndexCU", () => {
  it("sits at the floor when there is no denial (full reality acceptance)", () => {
    expect(recoveryIndexCU(100)).toBe(RECOVERY_CU_FLOOR);
  });

  it("rises with denial but never reaches a clean 100", () => {
    // denial 100 -> 72 + 100*0.25 = 97 (below the defensive ceiling and 100).
    expect(recoveryIndexCU(0)).toBe(97);
    expect(recoveryIndexCU(0)).toBeLessThan(100);
    expect(recoveryIndexCU(0)).toBeLessThanOrEqual(RECOVERY_CU_MAX);
  });

  it("is monotonic — deeper denial means more Cope Units", () => {
    expect(recoveryIndexCU(80)).toBeLessThan(recoveryIndexCU(20));
  });

  it("is deterministic for the same input", () => {
    expect(recoveryIndexCU(40)).toBe(recoveryIndexCU(40));
  });
});

describe("presentationTag", () => {
  it("reformats each route's finding headline into a comma tag", () => {
    expect(presentationTag("bull")).toBe("Denial, classic presentation");
    expect(presentationTag("chop")).toBe("Denial, sideways presentation");
    expect(presentationTag("bear")).toBe("Denial, prognostic presentation");
  });

  it("derives from the finding headline (single source of truth)", () => {
    // Guard: if a headline ever changes, the tag follows it — no drift.
    for (const market of ["bull", "chop", "bear"] as const) {
      expect(presentationTag(market).toLowerCase()).toContain(
        ROUTES[market].finding.headline.split(".")[1].trim().toLowerCase(),
      );
    }
  });
});

describe("deriveRecovery", () => {
  it("returns null when the flow has no market", () => {
    expect(deriveRecovery({ asset: { id: "x", name: "X", symbol: "x" } })).toBeNull();
  });

  it("returns null when no asset was named", () => {
    const noAsset = bullFlow();
    delete noAsset.asset;
    expect(deriveRecovery(noAsset)).toBeNull();
  });

  it("returns null when a required answer is missing", () => {
    expect(
      deriveRecovery({
        market: "bull",
        answers: { market: "bull", bull_drop: "consolidation" },
        asset: { id: "bitcoin", name: "Bitcoin", symbol: "btc" },
      }),
    ).toBeNull();
  });

  it("assembles the patient label, code and micro-diagnoses from persisted data", () => {
    const data = deriveRecovery(bullFlow());
    expect(data).not.toBeNull();
    if (!data) return;
    expect(data.patientLabel).toBe("BITCOIN (BTC/USD)");
    expect(data.presentationTag).toBe("Denial, classic presentation");
    // GCT-[routeDigit=3][Q2 consolidation, idx 1 -> 2][Q3 last_cycle, idx 2 -> 3]
    expect(data.code).toBe("GCT-323");
    expect(data.secondaryReference).toBe("ICD-GC-143");
    expect(data.microDiagnoses[0]).toBe(
      ROUTES.bull.q2.options[1].clause,
    );
    expect(data.microDiagnoses[1]).toBe(
      ROUTES.bull.q3.options[2].clause,
    );
    expect(data.realityAcceptance).toBe(40);
    expect(data.recoveryCU).toBe(recoveryIndexCU(40));
  });

  it("uses the persisted Reality Acceptance verbatim, without recompute", () => {
    // A deliberately-off persisted value is honoured, proving no recompute.
    const data = deriveRecovery({ ...bullFlow(), realityAcceptance: 7 });
    expect(data?.realityAcceptance).toBe(7);
  });
});

describe("buildShareText", () => {
  const data = deriveRecovery(bullFlow())!;
  const text = buildShareText(data);

  it("follows the exact template with the slots filled", () => {
    expect(text).toBe(
      [
        "🩺 Green Candle Therapy — Discharge Summary",
        "",
        "Treated for:",
        `· ${data.microDiagnoses[0]}`,
        `· ${data.microDiagnoses[1]}`,
        "",
        "Reality Acceptance: 40%.",
        "The chart has been treated. The market remains unchanged.",
        "",
        "Thanks @MonkeHQ, I now feel better 🍌",
        "",
        RECOVERY_SHARE_URL,
      ].join("\n"),
    );
  });

  it("is anti-spam compliant: 2 emoji, 1 mention, 1 link, no hashtags", () => {
    expect(text.match(/🩺/g)?.length).toBe(1);
    expect(text.match(/🍌/g)?.length).toBe(1);
    expect(text.match(/@\w+/g)).toEqual(["@MonkeHQ"]);
    expect(text.match(/https?:\/\//g)?.length).toBe(1);
    expect(text).not.toContain("#");
  });
});

describe("buildShareIntentUrl", () => {
  const data = deriveRecovery(bullFlow())!;

  it("targets twitter.com/intent/tweet with a URL-encoded text param", () => {
    const url = buildShareIntentUrl(data);
    expect(url.startsWith("https://twitter.com/intent/tweet?text=")).toBe(true);
    // Newlines survive as %0A; spaces are encoded; the payload round-trips.
    expect(url).toContain("%0A");
    const decoded = decodeURIComponent(url.split("text=")[1]);
    expect(decoded).toBe(buildShareText(data));
  });
});
