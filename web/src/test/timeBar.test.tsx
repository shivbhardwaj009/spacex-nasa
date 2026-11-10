import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { TimeBar } from "@/components/time/TimeBar";

const mockEpochs = [
  { epoch_id: "epoch_01", date: "2026-03-01T00:00:00Z", band_count: 102 },
  { epoch_id: "epoch_02", date: "2026-03-02T00:00:00Z", band_count: 102 },
  { epoch_id: "epoch_03", date: "2026-03-03T00:00:00Z", band_count: 102 },
  { epoch_id: "epoch_04", date: "2026-03-05T00:00:00Z", band_count: 102 },
  { epoch_id: "epoch_05", date: "2026-03-07T00:00:00Z", band_count: 102 },
];

describe("TimeBar Component (web/src/components/time/TimeBar.tsx)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders epoch dates and tick labels with real uneven spacing", () => {
    render(
      <TimeBar
        epochs={mockEpochs}
        currentEpochIndex={0}
        onEpochChange={vi.fn()}
      />
    );

    expect(screen.getAllByText(/epoch_01/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/epoch_05/i).length).toBeGreaterThanOrEqual(1);
  });

  it("calls onEpochChange when next and prev buttons are clicked", () => {
    const handleEpochChange = vi.fn();
    render(
      <TimeBar
        epochs={mockEpochs}
        currentEpochIndex={1}
        onEpochChange={handleEpochChange}
      />
    );

    const prevBtn = screen.getByLabelText(/Previous observation epoch/i);
    const nextBtn = screen.getByLabelText(/Next observation epoch/i);

    fireEvent.click(prevBtn);
    expect(handleEpochChange).toHaveBeenCalledWith(0);

    fireEvent.click(nextBtn);
    expect(handleEpochChange).toHaveBeenCalledWith(2);
  });

  it("handles keyboard shortcuts (Space, ArrowLeft, ArrowRight) and ignores inside inputs", () => {
    const handleEpochChange = vi.fn();
    render(
      <div>
        <input data-testid="test-input" />
        <TimeBar
          epochs={mockEpochs}
          currentEpochIndex={2}
          onEpochChange={handleEpochChange}
        />
      </div>
    );

    // Press ArrowRight outside input
    fireEvent.keyDown(window, { code: "ArrowRight" });
    expect(handleEpochChange).toHaveBeenCalledWith(3);

    // Press ArrowLeft outside input
    fireEvent.keyDown(window, { code: "ArrowLeft" });
    expect(handleEpochChange).toHaveBeenCalledWith(1);

    handleEpochChange.mockClear();

    // Inside input: shortcuts MUST be ignored
    const input = screen.getByTestId("test-input");
    fireEvent.keyDown(input, { code: "ArrowRight" });
    expect(handleEpochChange).not.toHaveBeenCalled();
  });

  it("advances epochs automatically during playback and loops", () => {
    const handleEpochChange = vi.fn();
    render(
      <TimeBar
        epochs={mockEpochs}
        currentEpochIndex={0}
        onEpochChange={handleEpochChange}
      />
    );

    const playBtn = screen.getByLabelText(/Play time-lapse/i);
    fireEvent.click(playBtn);

    act(() => {
      vi.advanceTimersByTime(1100);
    });

    expect(handleEpochChange).toHaveBeenCalledWith(1);
  });
});
