import React from "react";
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import axe from "axe-core";
import { TimeBar } from "@/components/time/TimeBar";
import { SearchBox } from "@/components/viewer/SearchBox";
import { FovControl } from "@/components/viewer/FovControl";
import { BlinkComparator } from "@/components/time/BlinkComparator";

const mockEpochs = [
  { epoch_id: "epoch_01", date: "2026-03-01T00:00:00Z", band_count: 102 },
  { epoch_id: "epoch_02", date: "2026-03-02T00:00:00Z", band_count: 102 },
];

describe("Axe Accessibility Audits (Module 7 UI Controls)", () => {
  it("SearchBox passes axe accessibility without critical/serious violations", async () => {
    const { container } = render(
      <main>
        <SearchBox onCoordinateSelect={() => {}} />
      </main>
    );

    const results = await axe.run(container);
    const seriousOrCritical = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious"
    );
    expect(seriousOrCritical).toEqual([]);
  });

  it("TimeBar passes axe accessibility without critical/serious violations", async () => {
    const { container } = render(
      <main>
        <TimeBar
          epochs={mockEpochs}
          currentEpochIndex={0}
          onEpochChange={() => {}}
        />
      </main>
    );

    const results = await axe.run(container);
    const seriousOrCritical = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious"
    );
    expect(seriousOrCritical).toEqual([]);
  });

  it("FovControl passes axe accessibility without critical/serious violations", async () => {
    const { container } = render(
      <main>
        <FovControl fov={0.2} onFovChange={() => {}} />
      </main>
    );

    const results = await axe.run(container);
    const seriousOrCritical = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious"
    );
    expect(seriousOrCritical).toEqual([]);
  });

  it("BlinkComparator passes axe accessibility without critical/serious violations", async () => {
    const { container } = render(
      <main>
        <BlinkComparator
          epochs={mockEpochs}
          currentEpochIndex={0}
          onEpochChange={() => {}}
        />
      </main>
    );

    const results = await axe.run(container);
    const seriousOrCritical = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious"
    );
    expect(seriousOrCritical).toEqual([]);
  });
});
