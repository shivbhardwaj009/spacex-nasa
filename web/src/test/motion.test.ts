import { describe, it, expect } from "vitest";
import {
  computeTotalRate,
  computePositionAngle,
  positionAngleToCompass,
  formatSexagesimalCoords,
} from "@/lib/motion";

describe("Motion Calculations (lib/motion.ts)", () => {
  describe("computeTotalRate", () => {
    it("computes Euclidean norm when raRate is already projected (default)", () => {
      // 3-4-5 triangle
      const rate = computeTotalRate(3, 4);
      expect(rate).toBeCloseTo(5.0, 5);
    });

    it("handles zero motion", () => {
      expect(computeTotalRate(0, 0)).toBe(0);
    });

    it("projects by cos(dec) when isProjected is false", () => {
      // At Dec = 60 degrees, cos(60) = 0.5
      // raRate = 6 => projected = 3. decRate = 4 => total = 5
      const rate = computeTotalRate(6, 4, 60, false);
      expect(rate).toBeCloseTo(5.0, 4);
    });

    it("handles negative motion components correctly", () => {
      const rate = computeTotalRate(-3, -4);
      expect(rate).toBeCloseTo(5.0, 5);
    });
  });

  describe("computePositionAngle", () => {
    it("points North (0 deg) for pure positive Dec motion", () => {
      const pa = computePositionAngle(0, 10);
      expect(pa).toBeCloseTo(0, 1);
    });

    it("points East (90 deg) for pure positive RA motion", () => {
      const pa = computePositionAngle(10, 0);
      expect(pa).toBeCloseTo(90, 1);
    });

    it("points South (180 deg) for pure negative Dec motion", () => {
      const pa = computePositionAngle(0, -10);
      expect(pa).toBeCloseTo(180, 1);
    });

    it("points West (270 deg) for pure negative RA motion", () => {
      const pa = computePositionAngle(-10, 0);
      expect(pa).toBeCloseTo(270, 1);
    });

    it("points North-East (45 deg) for equal positive RA and Dec motion", () => {
      const pa = computePositionAngle(5, 5);
      expect(pa).toBeCloseTo(45, 1);
    });

    it("points North-West (315 deg) for negative RA and positive Dec motion", () => {
      const pa = computePositionAngle(-5, 5);
      expect(pa).toBeCloseTo(315, 1);
    });
  });

  describe("positionAngleToCompass", () => {
    it("converts angles to 8-point compass directions", () => {
      expect(positionAngleToCompass(0)).toBe("N");
      expect(positionAngleToCompass(45)).toBe("NE");
      expect(positionAngleToCompass(90)).toBe("E");
      expect(positionAngleToCompass(135)).toBe("SE");
      expect(positionAngleToCompass(180)).toBe("S");
      expect(positionAngleToCompass(225)).toBe("SW");
      expect(positionAngleToCompass(270)).toBe("W");
      expect(positionAngleToCompass(315)).toBe("NW");
      expect(positionAngleToCompass(355)).toBe("N");
    });
  });

  describe("formatSexagesimalCoords", () => {
    it("formats 0, 0 correctly", () => {
      expect(formatSexagesimalCoords(0, 0).combined).toBe("00h 00m 00.00s, +00° 00' 00.00\"");
    });

    it("formats positive RA and Dec correctly", () => {
      // RA 180 deg = 12h, Dec +45 deg
      const str = formatSexagesimalCoords(180, 45).combined;
      expect(str).toBe("12h 00m 00.00s, +45° 00' 00.00\"");
    });

    it("formats negative Dec correctly", () => {
      // RA 90 deg = 06h, Dec -30.5 deg = -30° 30' 00"
      const str = formatSexagesimalCoords(90, -30.5).combined;
      expect(str).toBe("06h 00m 00.00s, -30° 30' 00.00\"");
    });
  });
});
