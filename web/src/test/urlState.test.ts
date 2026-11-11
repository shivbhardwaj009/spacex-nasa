import { describe, it, expect } from "vitest";
import { parseUrlParams, serializeUrlState, DEFAULT_VIEWER_STATE } from "@/lib/useUrlState";

describe("URL State Round-Trip & Fallback (web/src/lib/useUrlState.ts)", () => {
  it("correctly parses valid query parameters", () => {
    const qs = "ra=133.7951&dec=-7.2452&fov=0.50&epoch=3&object=SPX-MOV-0002&trails=0&mode=blink&embed=1&demo=1";
    const state = parseUrlParams(qs);

    expect(state.ra).toBeCloseTo(133.7951, 4);
    expect(state.dec).toBeCloseTo(-7.2452, 4);
    expect(state.fov).toBeCloseTo(0.5, 2);
    expect(state.epoch).toBe(3);
    expect(state.object).toBe("SPX-MOV-0002");
    expect(state.trails).toBe(false);
    expect(state.mode).toBe("blink");
    expect(state.embed).toBe(true);
    expect(state.demo).toBe(true);
    expect(state.fallbackNotice).toBeNull();
  });

  it("round-trips state to query string and back without data loss", () => {
    const original = {
      ra: 269.4521,
      dec: 66.561,
      fov: 0.2,
      epoch: 2,
      object: "SPX-MOV-0001",
      trails: true,
      mode: "viewer" as const,
      embed: false,
      demo: false,
    };

    const serialized = serializeUrlState(original);
    const parsed = parseUrlParams(serialized);

    expect(parsed.ra).toBeCloseTo(original.ra, 4);
    expect(parsed.dec).toBeCloseTo(original.dec, 4);
    expect(parsed.fov).toBeCloseTo(original.fov, 2);
    expect(parsed.epoch).toBe(original.epoch);
    expect(parsed.object).toBe(original.object);
  });

  it("gracefully falls back on invalid or out-of-bounds parameters without crashing", () => {
    const invalidQs = "ra=999.0&dec=-150.0&fov=-1.0&epoch=-5";
    const state = parseUrlParams(invalidQs);

    expect(state.ra).toBe(DEFAULT_VIEWER_STATE.ra);
    expect(state.dec).toBe(DEFAULT_VIEWER_STATE.dec);
    expect(state.fov).toBe(DEFAULT_VIEWER_STATE.fov);
    expect(state.epoch).toBe(0);
    expect(state.fallbackNotice).toBeTruthy();
  });
});

