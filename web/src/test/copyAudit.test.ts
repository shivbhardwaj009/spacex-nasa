import { describe, it, expect } from "vitest";
import { GLOSSARY } from "@/content/glossary";
import demoScript from "../../public/demo/demo_script.json";

describe("Copy & Scientific Honesty Audit (Task 8)", () => {
  it("ensures 'Unknown' mover definition states 'no catalog match, candidate for follow-up'", () => {
    const unknownEntry = GLOSSARY.unknown;
    expect(unknownEntry).toBeDefined();
    expect(unknownEntry.short.toLowerCase()).toContain("no catalog match");
    expect(unknownEntry.short.toLowerCase()).toContain("candidate for follow-up");
    expect(unknownEntry.detail).toContain("NOT a confirmed new discovery");
  });

  it("ensures 'TEST DATA' definition clearly states synthetic / simulation provenance", () => {
    const testDataEntry = GLOSSARY.testData;
    expect(testDataEntry).toBeDefined();
    expect(testDataEntry.short.toLowerCase()).toContain("synthetic");
    expect(testDataEntry.detail).toContain("never be cited as real celestial discoveries");
  });

  it("audits demo script captions against overclaims of new planets or unconfirmed discoveries", () => {
    expect(demoScript.is_synthetic).toBe(true);

    for (const step of demoScript.steps) {
      const lowerCaption = step.caption.toLowerCase();
      // Must not claim unconfirmed new planet discovery
      expect(lowerCaption).not.toContain("discovered a new planet");
      expect(lowerCaption).not.toContain("confirmed new planet");
      expect(lowerCaption).not.toContain("confirmed planet x");

      // When mentioning unknown movers, must emphasize honest labeling
      if (lowerCaption.includes("unknown candidate") || lowerCaption.includes("spx-mov-0002")) {
        expect(lowerCaption).toContain("not matched to asteroid catalogs");
      }
    }
  });

  it("audits all glossary terms for honest scientific framing", () => {
    for (const [, entry] of Object.entries(GLOSSARY)) {
      expect(entry.term).toBeTruthy();
      expect(entry.short).toBeTruthy();
      // No sensationalist marketing hype
      expect(entry.short.toLowerCase()).not.toContain("revolutionary discovery");
      expect(entry.detail.toLowerCase()).not.toContain("guaranteed planet x");
    }
  });
});

