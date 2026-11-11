import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { GLOSSARY, GlossaryTooltip, BeginnerTour } from "@/components/beginner";

describe("Beginner Mode & Science Glossary", () => {
  it("provides definitions for all 10 required astronomical terms", () => {
    const requiredTerms = [
      "epoch",
      "blinkComparator",
      "motionTrail",
      "confidence",
      "known",
      "unknown",
      "spectrum",
      "wavelength",
      "fov",
      "testData",
    ];

    for (const term of requiredTerms) {
      expect(GLOSSARY[term]).toBeDefined();
      expect(GLOSSARY[term].term).toBeTruthy();
      expect(GLOSSARY[term].short).toBeTruthy();
      expect(GLOSSARY[term].detail).toBeTruthy();
    }
  });

  it("renders GlossaryTooltip only when beginnerMode is true", () => {
    const { rerender } = render(
      <GlossaryTooltip termKey="confidence" beginnerMode={false}>
        <span>Confidence Label</span>
      </GlossaryTooltip>
    );

    expect(screen.getByText("Confidence Label")).toBeInTheDocument();
    expect(screen.queryByLabelText("Definition of Detection Confidence")).not.toBeInTheDocument();

    rerender(
      <GlossaryTooltip termKey="confidence" beginnerMode={true}>
        <span>Confidence Label</span>
      </GlossaryTooltip>
    );

    expect(screen.getByLabelText("Definition of Detection Confidence")).toBeInTheDocument();
  });

  it("navigates 4-step BeginnerTour dialog", () => {
    const handleClose = vi.fn();
    render(<BeginnerTour isOpen={true} onClose={handleClose} />);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("1. Search the Sky")).toBeInTheDocument();

    // Step 2
    fireEvent.click(screen.getByRole("button", { name: "Next Step" }));
    expect(screen.getByText("2. Watch the Sky Move")).toBeInTheDocument();

    // Step 3
    fireEvent.click(screen.getByRole("button", { name: "Next Step" }));
    expect(screen.getByText("3. Spot Detected Movers")).toBeInTheDocument();

    // Step 4
    fireEvent.click(screen.getByRole("button", { name: "Next Step" }));
    expect(screen.getByText("4. Inspect Spectra & Share")).toBeInTheDocument();

    // Finish
    fireEvent.click(screen.getByRole("button", { name: "Get Started" }));
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("closes BeginnerTour on Escape key", () => {
    const handleClose = vi.fn();
    render(<BeginnerTour isOpen={true} onClose={handleClose} />);

    fireEvent.keyDown(window, { key: "Escape" });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});

