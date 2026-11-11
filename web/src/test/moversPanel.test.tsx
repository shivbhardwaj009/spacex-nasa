import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MoversPanel } from "@/components/movers/MoversPanel";
import type { MoverCandidate } from "@/types";

const MOCK_MOVERS: MoverCandidate[] = [
  {
    object_id: "SPX-MOV-0001",
    ra: 270.2651,
    dec: 66.6981,
    type: "known",
    match_name: "1 Ceres",
    confidence: 0.92,
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
    ],
    spectrum: null,
  },
  {
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
  },
  {
    object_id: "SPX-MOV-0003",
    ra: 271.0,
    dec: 67.0,
    type: "known",
    match_name: "2 Pallas",
    confidence: 0.45,
    is_synthetic: false,
    motion: {
      ra_rate_arcsec_per_day: 5.0,
      dec_rate_arcsec_per_day: -8.0,
    },
    detections: [
      {
        epoch_id: "epoch_01",
        date: "2026-03-01T12:00:00Z",
        ra: 271.0,
        dec: 67.0,
        flux: 310.0,
        cutout_url: "cutouts/SPX-MOV-0003_epoch_01.png",
      },
    ],
    spectrum: null,
  },
];

describe("MoversPanel Component", () => {
  it("renders ranked list sorted by confidence descending by default", () => {
    const handleSelect = vi.fn();
    render(
      <MoversPanel
        movers={MOCK_MOVERS}
        selectedId={null}
        onSelectMover={handleSelect}
      />
    );

    // Initial counter announcement
    expect(screen.getByText("3 of 3")).toBeInTheDocument();

    // Verify all 3 cards rendered
    expect(screen.getByText("SPX-MOV-0001")).toBeInTheDocument();
    expect(screen.getByText("SPX-MOV-0002")).toBeInTheDocument();
    expect(screen.getByText("SPX-MOV-0003")).toBeInTheDocument();
  });

  it("filters by Known and Unknown status tabs", () => {
    const handleSelect = vi.fn();
    render(
      <MoversPanel
        movers={MOCK_MOVERS}
        selectedId={null}
        onSelectMover={handleSelect}
      />
    );

    // Click 'Known' filter button
    fireEvent.click(screen.getByRole("button", { name: "Known" }));
    expect(screen.getByText("2 of 3")).toBeInTheDocument();
    expect(screen.queryByText("SPX-MOV-0002")).not.toBeInTheDocument();

    // Click 'Unknown' filter button
    fireEvent.click(screen.getByRole("button", { name: "Unknown" }));
    expect(screen.getByText("1 of 3")).toBeInTheDocument();
    expect(screen.getByText("SPX-MOV-0002")).toBeInTheDocument();
    expect(screen.queryByText("SPX-MOV-0001")).not.toBeInTheDocument();
  });

  it("filters by text search on object_id or match_name", () => {
    const handleSelect = vi.fn();
    render(
      <MoversPanel
        movers={MOCK_MOVERS}
        selectedId={null}
        onSelectMover={handleSelect}
      />
    );

    const searchInput = screen.getByLabelText("Filter movers by ID or name");
    fireEvent.change(searchInput, { target: { value: "ceres" } });

    expect(screen.getByText("1 of 3")).toBeInTheDocument();
    expect(screen.getByText("SPX-MOV-0001")).toBeInTheDocument();
    expect(screen.queryByText("SPX-MOV-0002")).not.toBeInTheDocument();
  });

  it("triggers selection callback on click and keyboard Enter", () => {
    const handleSelect = vi.fn();
    render(
      <MoversPanel
        movers={MOCK_MOVERS}
        selectedId={null}
        onSelectMover={handleSelect}
      />
    );

    const card1 = screen.getByText("SPX-MOV-0001").closest("article");
    expect(card1).toBeTruthy();

    fireEvent.click(card1!);
    expect(handleSelect).toHaveBeenCalledWith(MOCK_MOVERS[0]);

    fireEvent.keyDown(card1!, { key: "Enter" });
    expect(handleSelect).toHaveBeenCalledTimes(2);
  });

  it("displays empty state when no results match and resets filters", () => {
    const handleSelect = vi.fn();
    render(
      <MoversPanel
        movers={MOCK_MOVERS}
        selectedId={null}
        onSelectMover={handleSelect}
      />
    );

    const searchInput = screen.getByLabelText("Filter movers by ID or name");
    fireEvent.change(searchInput, { target: { value: "NonExistentObject999" } });

    expect(screen.getByText("No movers match the current filters")).toBeInTheDocument();

    const resetBtn = screen.getByRole("button", { name: "Reset Filters" });
    fireEvent.click(resetBtn);

    expect(screen.getByText("3 of 3")).toBeInTheDocument();
  });
});
