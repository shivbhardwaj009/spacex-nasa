import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Filmstrip } from "@/components/movers/Filmstrip";
import type { MoverCandidate } from "@/types";

const MOCK_MOVER: MoverCandidate = {
  object_id: "SPX-MOV-0001",
  ra: 270.2651,
  dec: 66.6981,
  type: "known",
  match_name: "1 Ceres",
  confidence: 0.9,
  is_synthetic: true,
  motion: {
    ra_rate_arcsec_per_day: 10,
    dec_rate_arcsec_per_day: 0,
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
      ra: 270.30,
      dec: 66.70,
      flux: 750.0,
      cutout_url: "cutouts/SPX-MOV-0001_epoch_02.png",
    },
  ],
  spectrum: null,
};

describe("Filmstrip Component", () => {
  it("renders all detections as horizontal items with epoch IDs and dates", () => {
    const handleSelect = vi.fn();
    render(
      <Filmstrip
        mover={MOCK_MOVER}
        selectedEpochId="epoch_01"
        onSelectEpoch={handleSelect}
      />
    );

    expect(screen.getByText("epoch_01")).toBeInTheDocument();
    expect(screen.getByText("epoch_02")).toBeInTheDocument();
    expect(screen.getByText("#1")).toBeInTheDocument();
    expect(screen.getByText("#2")).toBeInTheDocument();
  });

  it("selects epoch on click and triggers callback", () => {
    const handleSelect = vi.fn();
    render(
      <Filmstrip
        mover={MOCK_MOVER}
        selectedEpochId="epoch_01"
        onSelectEpoch={handleSelect}
      />
    );

    const epoch2Item = screen.getByText("epoch_02").closest("[role='listitem']");
    expect(epoch2Item).toBeTruthy();

    fireEvent.click(epoch2Item!);
    expect(handleSelect).toHaveBeenCalledWith("epoch_02");
  });

  it("navigates across items with ArrowRight and ArrowLeft keyboard keys", () => {
    const handleSelect = vi.fn();
    render(
      <Filmstrip
        mover={MOCK_MOVER}
        selectedEpochId="epoch_01"
        onSelectEpoch={handleSelect}
      />
    );

    const items = screen.getAllByRole("listitem");
    fireEvent.keyDown(items[0], { key: "ArrowRight" });
    expect(handleSelect).toHaveBeenCalledWith("epoch_02");

    fireEvent.keyDown(items[1], { key: "ArrowLeft" });
    expect(handleSelect).toHaveBeenCalledWith("epoch_01");
  });

  it("displays missing cutout fallback if image load fails", () => {
    render(
      <Filmstrip
        mover={MOCK_MOVER}
        selectedEpochId="epoch_01"
      />
    );

    const img = screen.getByAltText(/Cutout for SPX-MOV-0001 at epoch epoch_01/i);
    fireEvent.error(img);

    expect(screen.getByText("Cutout missing")).toBeInTheDocument();
  });
});
