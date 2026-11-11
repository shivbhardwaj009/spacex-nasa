import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { BlinkComparator } from "@/components/time/BlinkComparator";

const mockEpochs = [
  { epoch_id: "epoch_01", date: "2026-03-01T00:00:00Z", band_count: 102 },
  { epoch_id: "epoch_02", date: "2026-03-02T00:00:00Z", band_count: 102 },
  { epoch_id: "epoch_03", date: "2026-03-03T00:00:00Z", band_count: 102 },
];

describe("BlinkComparator Component (web/src/components/time/BlinkComparator.tsx)", () => {
  it("renders with photosensitivity safety cap notice", () => {
    render(
      <BlinkComparator
        epochs={mockEpochs}
        currentEpochIndex={0}
        onEpochChange={vi.fn()}
      />
    );

    expect(screen.getByText(/Safe Rate Capped: ≤ 3 Hz/i)).toBeInTheDocument();
  });

  it("allows switching between Frame A and Frame B manually", () => {
    const handleEpochChange = vi.fn();
    render(
      <BlinkComparator
        epochs={mockEpochs}
        currentEpochIndex={0}
        onEpochChange={handleEpochChange}
      />
    );

    const toggleBtn = screen.getByLabelText(/Switch between Frame A and Frame B/i);
    fireEvent.click(toggleBtn);

    expect(handleEpochChange).toHaveBeenCalledWith(1); // default Epoch B index
  });

  it("toggles difference mode view", () => {
    render(
      <BlinkComparator
        epochs={mockEpochs}
        currentEpochIndex={0}
        onEpochChange={vi.fn()}
      />
    );

    const diffBtn = screen.getByText(/Difference Mode/i);
    fireEvent.click(diffBtn);

    expect(screen.getByText(/Difference View Active/i)).toBeInTheDocument();
  });
});

