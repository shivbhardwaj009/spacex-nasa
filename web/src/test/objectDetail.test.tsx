import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ObjectDetail } from "@/components/movers/ObjectDetail";
import type { MoverCandidate } from "@/types";

const MOCK_MOVER_KNOWN: MoverCandidate = {
  object_id: "SPX-MOV-0001",
  ra: 270.2651,
  dec: 66.6981,
  type: "known",
  match_name: "1 Ceres",
  confidence: 0.88,
  is_synthetic: true,
  motion: {
    ra_rate_arcsec_per_day: 26.2,
    dec_rate_arcsec_per_day: 6.5,
  },
  detections: [
    {
      epoch_id: "epoch_01",
      date: "2026-03-01T12:00:00Z",
      ra: 270.2651,
      dec: 66.6981,
      flux: 765.5,
      cutout_url: "cutouts/SPX-MOV-0001_epoch_01.png",
    },
    {
      epoch_id: "epoch_02",
      date: "2026-03-03T12:00:00Z",
      ra: 270.3,
      dec: 66.7,
      flux: 750.0,
      cutout_url: "cutouts/SPX-MOV-0001_epoch_02.png",
    },
  ],
  spectrum: {
    wavelength_um: [0.75, 1.25, 2.0, 3.5, 5.0],
    flux: [1000, 1100, 950, 800, 650],
    flux_err: [50, 45, 40, 35, 30],
  },
};

const MOCK_MOVER_UNKNOWN: MoverCandidate = {
  object_id: "SPX-MOV-0002",
  ra: 268.5,
  dec: 65.2,
  type: "unknown",
  match_name: null,
  confidence: 0.65,
  is_synthetic: true,
  motion: {
    ra_rate_arcsec_per_day: -15.0,
    dec_rate_arcsec_per_day: 12.0,
  },
  detections: [
    {
      epoch_id: "epoch_01",
      date: "2026-03-01T12:00:00Z",
      ra: 268.5,
      dec: 65.2,
      flux: 420.0,
      cutout_url: "cutouts/SPX-MOV-0002_epoch_01.png",
    },
  ],
  spectrum: null,
};

describe("ObjectDetail Component", () => {
  it("renders facts block: coordinates, motion, detections, confidence", () => {
    const handleClose = vi.fn();
    render(
      <ObjectDetail
        mover={MOCK_MOVER_KNOWN}
        onClose={handleClose}
      />
    );

    expect(screen.getByText("SPX-MOV-0001")).toBeInTheDocument();
    expect(screen.getByText("1 Ceres")).toBeInTheDocument();
    expect(screen.getByText("✓ Known Object")).toBeInTheDocument();
    expect(screen.getByText("TEST DATA")).toBeInTheDocument();

    // Coordinates check (decimal and sexagesimal)
    expect(screen.getByText("RA 270.2651°, Dec 66.6981°")).toBeInTheDocument();
    expect(screen.getByText("2 detections")).toBeInTheDocument();
    expect(screen.getByText("88%")).toBeInTheDocument();
  });

  it("displays honest-label note for Unknown movers", () => {
    const handleClose = vi.fn();
    render(
      <ObjectDetail
        mover={MOCK_MOVER_UNKNOWN}
        onClose={handleClose}
      />
    );

    expect(screen.getByText("SPX-MOV-0002")).toBeInTheDocument();
    expect(screen.getByText("⚠ Unknown Mover")).toBeInTheDocument();
    expect(screen.getByText("Honest Science Label:")).toBeInTheDocument();
    expect(
      screen.getByText(/Not matched to asteroid or comet catalogs queried/i)
    ).toBeInTheDocument();
  });

  it("switches tabs between Filmstrip, Spectrum, and JSON viewer", () => {
    const handleClose = vi.fn();
    render(
      <ObjectDetail
        mover={MOCK_MOVER_KNOWN}
        onClose={handleClose}
      />
    );

    // Initial tab is cutouts
    expect(screen.getByRole("tab", { name: /Cutout Filmstrip/i })).toHaveAttribute("aria-selected", "true");

    // Click Spectrum tab
    fireEvent.click(screen.getByRole("tab", { name: /Spectrum/i }));
    expect(screen.getByText("Spectrophotometry (SED)")).toBeInTheDocument();

    // Click JSON tab
    fireEvent.click(screen.getByRole("tab", { name: /Raw Contract JSON/i }));
    expect(screen.getByText(/Schema v1.0 Mover Object/i)).toBeInTheDocument();
  });

  it("triggers Next and Previous navigation callbacks", () => {
    const handleNext = vi.fn();
    const handlePrev = vi.fn();
    render(
      <ObjectDetail
        mover={MOCK_MOVER_KNOWN}
        onClose={vi.fn()}
        onNext={handleNext}
        onPrevious={handlePrev}
        hasNext={true}
        hasPrevious={true}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Next/i }));
    expect(handleNext).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: /Prev/i }));
    expect(handlePrev).toHaveBeenCalledTimes(1);
  });
});
