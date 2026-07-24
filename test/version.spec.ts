import { describe, expect, it } from "vitest";
import { compareVersions, isVersionAtLeast } from "../src/version";

describe("version comparison", () => {
  it("compares dotted versions numerically", () => {
    expect(compareVersions("1.10.0", "1.9.0")).toBeGreaterThan(0);
    expect(compareVersions("1.4", "1.4.0")).toBe(0);
    expect(isVersionAtLeast("2.0.0", "2.1.0")).toBe(false);
    expect(isVersionAtLeast("2.0.0", null)).toBe(true);
  });
});
