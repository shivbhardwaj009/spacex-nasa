import React from "react";
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import axe from "axe-core";
import { MoversPanel } from "@/components/movers/MoversPanel";
import { ObjectDetail } from "@/components/movers/ObjectDetail";
import { Filmstrip } from "@/components/movers/Filmstrip";
import { SpectrumChart } from "@/components/movers/SpectrumChart";
import { BeginnerTour } from "@/components/beginner/BeginnerTour";
import type { MoverCandidate } from "@/types";

const MOCK_MOVER: MoverCandidate = {
  object_id: "SPX-MOV-0001",
  ra: 270.2651,
  dec: 66.6981,
  type: "known",
  match_name: "1 Ceres",
  confidence: 0.9,
  is_synthetic: true,
  motion: { ra_rate_arcsec_per_day: 10, dec_rate_arcsec_per_day: 5 },
  detections: [
    {
      epoch_id: "epoch_01",
      date: "2026-03-01T12:00:00Z",
      ra: 270.2651,
      dec: 66.6981,
      flux: 765.5,
      cutout_url: "cutouts/test.png",
    },
  ],
  spectrum: {
    wavelength_um: [0.75, 1.25, 2.0, 3.5, 5.0],
    flux: [1000, 1100, 950, 800, 650],
    flux_err: [50, 45, 40, 35, 30],
  },
};

describe("Axe Accessibility Audits (Module 8 Components)", () => {
  it("MoversPanel passes axe accessibility without critical/serious violations", async () => {
    const { container } = render(
      <main>
        <MoversPanel
          movers={[MOCK_MOVER]}
          selectedId={null}
          onSelectMover={() => {}}
        />
      </main>
    );

    const results = await axe.run(container);
    const seriousOrCritical = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious"
    );
    expect(seriousOrCritical).toEqual([]);
  });

  it("ObjectDetail passes axe accessibility without critical/serious violations", async () => {
    const { container } = render(
      <main>
        <ObjectDetail
          mover={MOCK_MOVER}
          onClose={() => {}}
        />
      </main>
    );

    const results = await axe.run(container);
    const seriousOrCritical = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious"
    );
    expect(seriousOrCritical).toEqual([]);
  });

  it("Filmstrip passes axe accessibility without critical/serious violations", async () => {
    const { container } = render(
      <main>
        <Filmstrip mover={MOCK_MOVER} />
      </main>
    );

    const results = await axe.run(container);
    const seriousOrCritical = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious"
    );
    expect(seriousOrCritical).toEqual([]);
  });

  it("SpectrumChart passes axe accessibility without critical/serious violations", async () => {
    const { container } = render(
      <main>
        <SpectrumChart mover={MOCK_MOVER} />
      </main>
    );

    const results = await axe.run(container);
    const seriousOrCritical = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious"
    );
    expect(seriousOrCritical).toEqual([]);
  });

  it("BeginnerTour dialog passes axe accessibility without critical/serious violations", async () => {
    const { container } = render(
      <div>
        <BeginnerTour isOpen={true} onClose={() => {}} />
      </div>
    );

    const results = await axe.run(container);
    const seriousOrCritical = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious"
    );
    expect(seriousOrCritical).toEqual([]);
  });
});
