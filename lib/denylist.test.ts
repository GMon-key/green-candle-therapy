import { describe, expect, it } from "vitest";

import { isDeniedAsset, isDeniedText } from "./denylist";

describe("isDeniedText", () => {
  it("refuses MON / MONKEY / MONAD, case-insensitive", () => {
    for (const q of ["MON", "mon", "Monkey", "MONKEY", "monad", "  MON  "]) {
      expect(isDeniedText(q)).toBe(true);
    }
  });

  it("treats every other query as a valid patient", () => {
    for (const q of ["bitcoin", "PEPE", "sol", "ethereum", "monero"]) {
      expect(isDeniedText(q)).toBe(false);
    }
  });
});

describe("isDeniedAsset", () => {
  it("refuses on symbol match", () => {
    expect(isDeniedAsset({ symbol: "MON", name: "Monad" })).toBe(true);
    expect(isDeniedAsset({ symbol: "monkey", name: "Monkey" })).toBe(true);
  });

  it("refuses on name match even if symbol differs", () => {
    expect(isDeniedAsset({ symbol: "XYZ", name: "Monad" })).toBe(true);
  });

  it("admits ordinary assets", () => {
    expect(isDeniedAsset({ symbol: "BTC", name: "Bitcoin" })).toBe(false);
    expect(isDeniedAsset({ symbol: "PEPE", name: "Pepe" })).toBe(false);
    expect(isDeniedAsset({ symbol: "XMR", name: "Monero" })).toBe(false);
  });
});
