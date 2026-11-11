import { describe, it, expect } from "vitest";
import { parseCoordinates, formatDecimalCoordinates, formatSexagesimal } from "@/lib/coords";

describe("Coordinate Parser (web/src/lib/coords.ts)", () => {
  it("parses decimal degrees correctly", () => {
    const res = parseCoordinates("133.7951 -7.2452");
    expect(res.format).toBe("decimal");
    expect(res.ra).toBeCloseTo(133.7951, 4);
    expect(res.dec).toBeCloseTo(-7.2452, 4);
  });

  it("parses comma-separated decimal degrees", () => {
    const res = parseCoordinates("269.4520, +66.5610");
    expect(res.format).toBe("decimal");
    expect(res.ra).toBeCloseTo(269.452, 4);
    expect(res.dec).toBeCloseTo(66.561, 4);
  });

  it("parses sexagesimal HMS and DMS notation", () => {
    const res = parseCoordinates("08h55m10.831s -07d14m42.53s");
    expect(res.format).toBe("sexagesimal-hms");

    // Dynamically compute expected degrees
    const expectedRa = (8 + 55 / 60 + 10.831 / 3600) * 15.0;
    const expectedDec = -(7 + 14 / 60 + 42.53 / 3600);

    expect(res.ra).toBeCloseTo(expectedRa, 4);
    expect(res.dec).toBeCloseTo(expectedDec, 4);
  });

  it("parses sexagesimal colon notation", () => {
    const res = parseCoordinates("08:55:10.831 -07:14:42.53");
    expect(res.format).toBe("sexagesimal-colon");

    const expectedRa = (8 + 55 / 60 + 10.831 / 3600) * 15.0;
    const expectedDec = -(7 + 14 / 60 + 42.53 / 3600);

    expect(res.ra).toBeCloseTo(expectedRa, 4);
    expect(res.dec).toBeCloseTo(expectedDec, 4);
  });

  it("correctly preserves negative sign for '-00' degrees Declination", () => {
    // Critical edge case: -00 degrees must not become +0
    const res = parseCoordinates("12:00:00 -00:30:00");
    expect(res.ra).toBeCloseTo(180.0, 4);
    expect(res.dec).toBeCloseTo(-0.5, 4);
    expect(res.dec).toBeLessThan(0);
  });

  it("correctly handles hours vs degrees ambiguity (plain numbers = degrees)", () => {
    // "12.0 45.0" must be 12.0 degrees (NOT 12 hours = 180 deg)
    const plain = parseCoordinates("12.0 45.0");
    expect(plain.ra).toBeCloseTo(12.0, 4);

    // "12:00:00 45:00:00" uses colons, so RA is in hours (12 hours = 180 degrees)
    const sexag = parseCoordinates("12:00:00 45:00:00");
    expect(sexag.ra).toBeCloseTo(180.0, 4);
  });

  it("accurately parses WISE 0855 target string to calculated degrees", () => {
    // Challenge target: WISE J085510.83-071442.5
    const res = parseCoordinates("08h55m10.831s -07d14m42.53s");

    // Compute expected directly from components
    const h = 8;
    const m = 55;
    const s = 10.831;
    const degH = (h + m / 60 + s / 3600) * 15.0;

    const dD = 7;
    const dM = 14;
    const dS = 42.53;
    const degD = -(dD + dM / 60 + dS / 3600);

    expect(res.ra).toBeCloseTo(degH, 4);
    expect(res.dec).toBeCloseTo(degD, 4);
  });

  it("throws clear errors for out-of-range coordinates", () => {
    expect(() => parseCoordinates("365.0 10.0")).toThrow(/Right Ascension.*out of bounds/);
    expect(() => parseCoordinates("100.0 -95.0")).toThrow(/Declination.*out of bounds/);
    expect(() => parseCoordinates("")).toThrow(/empty/);
  });

  it("formats decimal and sexagesimal coordinates consistently", () => {
    const formattedDec = formatDecimalCoordinates(133.7951, -7.2452);
    expect(formattedDec).toBe("133.7951° -7.2452°");

    const formattedSex = formatSexagesimal(180.0, -0.5);
    expect(formattedSex).toContain("12h00m");
    expect(formattedSex).toContain("-00d30m");
  });
});

