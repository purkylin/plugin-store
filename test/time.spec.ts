import { describe, expect, it } from "vitest";
import { json } from "../src/http";
import { stripISO8601Milliseconds } from "../src/time";

describe("ISO 8601 timestamps", () => {
  it("formats dates without fractional seconds", () => {
    expect(stripISO8601Milliseconds("2026-08-01T12:34:56.789Z"))
      .toBe("2026-08-01T12:34:56Z");
  });

  it("normalizes legacy timestamps in JSON API responses", async () => {
    const response = json({
      created_at: "2026-08-01T12:34:56.789Z",
      label: "not-a-date.123Z",
    });
    expect(await response.json()).toEqual({
      created_at: "2026-08-01T12:34:56Z",
      label: "not-a-date.123Z",
    });
  });
});
