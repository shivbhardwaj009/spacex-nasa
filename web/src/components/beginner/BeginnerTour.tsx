"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/Button";

export interface TourStep {
  title: string;
  badge: string;
  description: string;
  tip: string;
  targetHint: string;
}

export const TOUR_STEPS: TourStep[] = [
  {
    title: "1. Search the Sky",
    badge: "Step 1 of 4",
    description:
      "Enter celestial coordinates (RA/Dec), type an asteroid or comet name, or pick a curated region like the SPHEREx Deep Field North.",
    tip: "Look at the top navigation bar to search or switch between sample regions.",
    targetHint: "Search Box & Presets",
  },
  {
    title: "2. Watch the Sky Move",
    badge: "Step 2 of 4",
    description:
      "Use the Time Bar at the bottom to step through different observation epochs. Toggle the 'Blink' button to rapidly alternate between two dates — just like Clyde Tombaugh discovering Pluto!",
    tip: "Stationary stars stay completely still, while moving solar system objects jump back and forth.",
    targetHint: "Time Bar & Blink Comparator",
  },
  {
    title: "3. Spot Detected Movers",
    badge: "Step 3 of 4",
    description:
      "Our offline pipeline scans image subtractions and highlights candidates with colored markers. Cyan circles mark known cataloged asteroids; amber diamonds indicate unknown movers.",
    tip: "Hover or click on any marker to inspect its motion trail across the sky.",
    targetHint: "Sky Viewer & Overlays",
  },
  {
    title: "4. Inspect Spectra & Share",
    badge: "Step 4 of 4",
    description:
      "Click any mover card or sky marker to open its full dossier: motion vector, multi-epoch cutout filmstrip, 102-channel infrared spectrum, and share card generator.",
    tip: "You can download the SED as CSV or copy a direct link to share your finding!",
    targetHint: "Movers Panel & Detail Drawer",
  },
];

export interface BeginnerTourProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BeginnerTour: React.FC<BeginnerTourProps> = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);

  // Reset to step 0 whenever reopened
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(0);
    }
  }, [isOpen]);

  // Handle escape key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  const step = TOUR_STEPS[currentStep];
  const isLast = currentStep === TOUR_STEPS.length - 1;
  const isFirst = currentStep === 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-step-title"
      aria-describedby="tour-step-desc"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm transition-opacity"
    >
      <div className="relative w-full max-w-lg bg-slate-900 border border-cyan-500/30 rounded-xl shadow-2xl p-6 text-slate-100 flex flex-col gap-4 animate-in fade-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-xs font-semibold rounded bg-cyan-950 border border-cyan-700/60 text-cyan-300">
              {step.badge}
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Target: {step.targetHint}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close guided tour"
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-400"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex flex-col gap-3 py-2">
          <h2 id="tour-step-title" className="text-xl font-bold text-white tracking-wide">
            {step.title}
          </h2>
          <p id="tour-step-desc" className="text-sm text-slate-300 leading-relaxed">
            {step.description}
          </p>
          <div className="p-3 bg-cyan-950/40 border border-cyan-800/40 rounded-lg text-xs text-cyan-200 flex items-start gap-2">
            <span className="text-cyan-400 text-sm">💡</span>
            <div>
              <span className="font-semibold text-cyan-300">Pro-Tip: </span>
              {step.tip}
            </div>
          </div>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 py-1">
          {TOUR_STEPS.map((_, idx) => (
            <button
              key={idx}
              type="button"
              aria-label={`Jump to step ${idx + 1}`}
              onClick={() => setCurrentStep(idx)}
              className={`h-2 rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                idx === currentStep ? "w-6 bg-cyan-400" : "w-2 bg-slate-700 hover:bg-slate-500"
              }`}
            />
          ))}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between border-t border-slate-800 pt-4 mt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200"
          >
            Skip Tour
          </Button>

          <div className="flex items-center gap-2">
            {!isFirst && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
              >
                Back
              </Button>
            )}
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                if (isLast) {
                  onClose();
                } else {
                  setCurrentStep((prev) => prev + 1);
                }
              }}
            >
              {isLast ? "Get Started" : "Next Step"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
