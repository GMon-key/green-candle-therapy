import { describe, expect, it } from "vitest";

import { patientLabelFrom, sanitizeHandle } from "./patient";

describe("sanitizeHandle", () => {
  it("strips a leading @", () => {
    expect(sanitizeHandle("@vitalik")).toBe("vitalik");
    expect(sanitizeHandle("@@@vitalik")).toBe("vitalik");
  });

  it("keeps the X username character set (letters, digits, underscore)", () => {
    expect(sanitizeHandle("eth_maxi_2021")).toBe("eth_maxi_2021");
  });

  it("strips whitespace, markup and injection-risky characters", () => {
    expect(sanitizeHandle("  <b>hi</b> ")).toBe("bhib"); // both b's survive; < > / stripped
    expect(sanitizeHandle('a"b\'c`d')).toBe("abcd");
    expect(sanitizeHandle("space name")).toBe("spacename");
  });

  it("strips emoji and other non-handle unicode", () => {
    expect(sanitizeHandle("🍌moon")).toBe("moon");
  });

  it("caps the length at 30", () => {
    const long = "a".repeat(50);
    expect(sanitizeHandle(long)).toHaveLength(30);
  });

  it("returns empty string when nothing usable remains", () => {
    expect(sanitizeHandle("@@@")).toBe("");
    expect(sanitizeHandle("   ")).toBe("");
    expect(sanitizeHandle("💀🔥")).toBe("");
    expect(sanitizeHandle("")).toBe("");
  });
});

describe("patientLabelFrom", () => {
  it("renders a handle with a leading @", () => {
    expect(patientLabelFrom({ handle: "vitalik" })).toBe("@vitalik");
  });

  it("renders a case ID as an anonymous patient number", () => {
    expect(patientLabelFrom({ caseId: "4471" })).toBe("Patient #4471");
  });

  it("prefers the handle when both are present", () => {
    expect(patientLabelFrom({ handle: "vitalik", caseId: "4471" })).toBe(
      "@vitalik",
    );
  });

  it("returns empty for an empty record", () => {
    expect(patientLabelFrom({})).toBe("");
  });
});
