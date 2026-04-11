import { describe, it, expect } from "vitest";
import { formatAge } from "./utils";

describe("formatAge", () => {
  it("returns dash for undefined", () => {
    expect(formatAge(undefined)).toBe("—");
  });

  it("returns dash for empty string", () => {
    expect(formatAge("")).toBe("—");
  });

  it("returns seconds for recent timestamps", () => {
    const now = new Date(Date.now() - 30_000).toISOString();
    expect(formatAge(now)).toBe("30s");
  });

  it("returns minutes", () => {
    const ts = new Date(Date.now() - 5 * 60_000).toISOString();
    expect(formatAge(ts)).toBe("5m");
  });

  it("returns hours", () => {
    const ts = new Date(Date.now() - 3 * 3600_000).toISOString();
    expect(formatAge(ts)).toBe("3h");
  });

  it("returns days", () => {
    const ts = new Date(Date.now() - 7 * 86400_000).toISOString();
    expect(formatAge(ts)).toBe("7d");
  });
});
