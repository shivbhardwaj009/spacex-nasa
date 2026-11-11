import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SpectrumChart } from "@/components/movers/SpectrumChart";
import type { MoverCandidate } from "@/types";

const MOCK_MOVER_WITH_SPECTRUM: MoverCandidate = {
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

const MOCK_MOVER_NO_SPECTRUM: MoverCandidate = {
  ...MOCK_MOVER_WITH_SPECTRUM,
  object_id: "SPX-MOV-0002",
  spectrum: null,
};

describe("SpectrumChart Component", () => {
  it("renders SVG spectrum plot and axes for candidate with spectrum", () => {
    render(<SpectrumChart mover={MOCK_MOVER_WITH_SPECTRUM} />);

    expect(screen.getByText("Spectrophotometry (SED)")).toBeInTheDocument();
    expect(screen.getByText("5 channels")).toBeInTheDocument();
    expect(screen.getByText("Partial spectrum (5 channels)")).toBeInTheDocument();

    // Check SVG plot role
    const svg = screen.getByRole("img", {
      name: /Spectrum plot for SPX-MOV-0001/i,
    });
    expect(svg).toBeInTheDocument();
  });

  it("handles null spectrum gracefully", () => {
    render(<SpectrumChart mover={MOCK_MOVER_NO_SPECTRUM} />);

    expect(screen.getByText("No spectrum extracted for this candidate.")).toBeInTheDocument();
  });

  it("toggles accessible data table with exact numeric values", () => {
    render(<SpectrumChart mover={MOCK_MOVER_WITH_SPECTRUM} />);

    const toggleBtn = screen.getByRole("button", { name: "View Data Table" });
    fireEvent.click(toggleBtn);

    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByText("0.7500")).toBeInTheDocument();
    expect(screen.getByText("1000.00")).toBeInTheDocument();
  });

  it("triggers CSV download with synthetic test data notice", () => {
    render(<SpectrumChart mover={MOCK_MOVER_WITH_SPECTRUM} />);

    // Mock createObjectURL & revokeObjectURL
    const createObjectURL = vi.fn().mockReturnValue("blob:test");
    const revokeObjectURL = vi.fn();
    window.URL.createObjectURL = createObjectURL;
    window.URL.revokeObjectURL = revokeObjectURL;

    const downloadBtn = screen.getByRole("button", { name: /Download CSV/i });
    fireEvent.click(downloadBtn);

    expect(createObjectURL).toHaveBeenCalledTimes(1);
  });
});
