import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MoverOverlay } from "@/components/viewer/MoverOverlay";
import type { MoverCandidate, EpochInfo } from "@/types";

const mockEpoch: EpochInfo = {
  epoch_id: "epoch_02",
  date: "2026-03-02T00:00:00Z",
  band_count: 102,
};

const mockMovers: MoverCandidate[] = [
  {
    object_id: "SPX-MOV-0001",
    ra: 269.368,
    dec: 66.538,
    type: "known",
    match_name: "2024 BX1",
    confidence: 0.98,
    is_synthetic: true,
    motion: { ra_rate_arcsec_per_day: 32.5, dec_rate_arcsec_per_day: 14.2 },
    detections: [
      { epoch_id: "epoch_01", date: "2026-03-01T00:00:00Z", ra: 269.35, dec: 66.53, flux: 800, cutout_url: "cutouts/1.png" },
      { epoch_id: "epoch_02", date: "2026-03-02T00:00:00Z", ra: 269.368, dec: 66.538, flux: 820, cutout_url: "cutouts/2.png" },
    ],
    spectrum: null,
  },
  {
    object_id: "SPX-MOV-0002",
    ra: 269.486,
    dec: 66.572,
    type: "unknown",
    match_name: null,
    confidence: 0.92,
    is_synthetic: true,
    motion: { ra_rate_arcsec_per_day: -4.2, dec_rate_arcsec_per_day: 2.8 },
    detections: [
      // Only detected in epoch_01 (missing in epoch_02 -> predicted position)
      { epoch_id: "epoch_01", date: "2026-03-01T00:00:00Z", ra: 269.49, dec: 66.57, flux: 410, cutout_url: "cutouts/3.png" },
    ],
    spectrum: null,
  },
];

describe("MoverOverlay Component (web/src/components/viewer/MoverOverlay.tsx)", () => {
  it("renders non-colour cues (● icon and circle for known, ◆ icon and diamond for unknown)", () => {
    render(
      <MoverOverlay
        movers={mockMovers}
        currentEpoch={mockEpoch}
        currentEpochIndex={1}
        onSelect={vi.fn()}
        centerRa={269.452}
        centerDec={66.561}
        fovDeg={0.2}
        containerWidth={600}
        containerHeight={500}
      />
    );

    // Non-colour cues present in text labels
    expect(screen.getByText("●")).toBeInTheDocument();
    expect(screen.getByText("◆")).toBeInTheDocument();
  });

  it("shows TEST badge for synthetic candidates", () => {
    render(
      <MoverOverlay
        movers={mockMovers}
        currentEpoch={mockEpoch}
        currentEpochIndex={1}
        onSelect={vi.fn()}
        centerRa={269.452}
        centerDec={66.561}
        fovDeg={0.2}
        containerWidth={600}
        containerHeight={500}
      />
    );

    const testBadges = screen.getAllByText("TEST");
    expect(testBadges.length).toBeGreaterThanOrEqual(1);
  });

  it("indicates predicted status when candidate has no detection at the current epoch", () => {
    render(
      <MoverOverlay
        movers={mockMovers}
        currentEpoch={mockEpoch}
        currentEpochIndex={1}
        onSelect={vi.fn()}
        centerRa={269.452}
        centerDec={66.561}
        fovDeg={0.2}
        containerWidth={600}
        containerHeight={500}
      />
    );

    expect(screen.getByText(/\[PREDICTED\]/i)).toBeInTheDocument();
  });

  it("fires onSelect callback on click and keyboard activation", () => {
    const handleSelect = vi.fn();
    render(
      <MoverOverlay
        movers={mockMovers}
        currentEpoch={mockEpoch}
        currentEpochIndex={1}
        onSelect={handleSelect}
        centerRa={269.452}
        centerDec={66.561}
        fovDeg={0.2}
        containerWidth={600}
        containerHeight={500}
      />
    );

    const btn = screen.getByLabelText(/Known object 2024 BX1/i);
    fireEvent.click(btn);
    expect(handleSelect).toHaveBeenCalledWith("SPX-MOV-0001");

    fireEvent.keyDown(btn, { key: "Enter" });
    expect(handleSelect).toHaveBeenCalledWith("SPX-MOV-0001");
  });
});

