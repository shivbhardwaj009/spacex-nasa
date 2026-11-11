import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SidePanel } from "@/components/layout/SidePanel";
import { SearchBox } from "@/components/viewer/SearchBox";
import { TimeBar } from "@/components/time/TimeBar";
import { ShareModal } from "@/components/share/ShareModal";
import type { MoverCandidate } from "@/types";

const MOCK_MOVER: MoverCandidate = {
  object_id: "SPX-MOV-0001",
  ra: 270.2651,
  dec: 66.6981,
  type: "known",
  match_name: "1 Ceres",
  confidence: 0.91,
  is_synthetic: true,
  motion: { ra_rate_arcsec_per_day: 15.0, dec_rate_arcsec_per_day: 8.0 },
  detections: [
    {
      epoch_id: "epoch_01",
      date: "2026-03-01T12:00:00Z",
      ra: 270.2651,
      dec: 66.6981,
      flux: 750.0,
      cutout_url: "cutouts/SPX-MOV-0001_epoch_01.png",
    },
  ],
  spectrum: {
    wavelength_um: [0.75, 1.5, 2.5, 3.5, 5.0],
    flux: [1000, 1100, 950, 800, 650],
    flux_err: [50, 45, 40, 35, 30],
  },
};

const MOCK_EPOCHS = [
  { epoch_id: "epoch_01", date: "2026-03-01T00:00:00Z", band_count: 102 },
  { epoch_id: "epoch_02", date: "2026-03-02T00:00:00Z", band_count: 102 },
];

describe("Mobile Pass & Responsive Touch Target Audits (Task 6)", () => {
  it("SidePanel mobile header toggle has minimum 44px touch target and expands on tap", () => {
    const handleSelect = vi.fn();
    render(
      <SidePanel
        movers={[MOCK_MOVER]}
        selectedMover={null}
        onSelectMover={handleSelect}
        beginnerMode={false}
      />
    );

    const toggleBtn = screen.getByRole("button", { name: /Expand mover panel/i });
    expect(toggleBtn).toBeInTheDocument();
    // Class specifies touch-friendly min-h-[44px]
    expect(toggleBtn.className).toContain("min-h-[44px]");

    // Click toggle
    fireEvent.click(toggleBtn);
    expect(screen.getByRole("button", { name: /Collapse mover panel/i })).toBeInTheDocument();
  });

  it("SearchBox input and quick-pick chips have touch-friendly height >= 32px to 44px", () => {
    render(<SearchBox onCoordinateSelect={() => {}} />);

    const input = screen.getByLabelText("Search celestial coordinates or object name");
    expect(input.className).toContain("min-h-[44px]");

    const chips = screen.getAllByRole("button", { name: /Barnard|WISE|Ceres|Epsilon|RW|R Dra/i });
    for (const chip of chips) {
      expect(chip.className).toContain("min-h-[32px]");
    }
  });

  it("TimeBar controls have touch-friendly buttons for thumb interaction", () => {
    const handleEpoch = vi.fn();
    render(
      <TimeBar
        epochs={MOCK_EPOCHS}
        currentEpochIndex={0}
        onEpochChange={handleEpoch}
      />
    );

    const playBtn = screen.getByRole("button", { name: /Play Time-Lapse/i });
    expect(playBtn.className).toContain("min-h-[44px]");
  });

  it("ShareModal fits within responsive viewport constraints", () => {
    render(
      <ShareModal
        isOpen={true}
        onClose={() => {}}
        mover={MOCK_MOVER}
      />
    );

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    // Modal uses responsive max-w and p-4
    expect(dialog.className).toContain("p-4");
  });
});
