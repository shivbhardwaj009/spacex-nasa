import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ShareModal } from "@/components/share/ShareModal";
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
  spectrum: null,
};

describe("ShareModal Component", () => {
  it("renders copyable share link and embed snippet", () => {
    const handleClose = vi.fn();
    render(
      <ShareModal
        isOpen={true}
        onClose={handleClose}
        mover={MOCK_MOVER}
      />
    );

    expect(screen.getByLabelText(/Direct Link/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Embed in Website or Blog/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy Embed" })).toBeInTheDocument();
  });

  it("copies link to clipboard and announces to screen reader", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      configurable: true,
      writable: true,
    });

    render(
      <ShareModal
        isOpen={true}
        onClose={vi.fn()}
        mover={MOCK_MOVER}
      />
    );

    const copyBtn = screen.getByRole("button", { name: "Copy" });
    fireEvent.click(copyBtn);

    expect(writeText).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(screen.getByText("Copied!")).toBeInTheDocument();
    });
  });

  it("renders social share card download option for selected mover", () => {
    render(
      <ShareModal
        isOpen={true}
        onClose={vi.fn()}
        mover={MOCK_MOVER}
      />
    );

    expect(
      screen.getByRole("button", { name: /Download Card/i })
    ).toBeInTheDocument();
  });
});
