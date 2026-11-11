"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Button } from "@/components/ui/Button";

export interface DemoStep {
  step: number;
  time_s: number;
  duration_s: number;
  title: string;
  caption: string;
  state: Record<string, unknown>;
}

export interface DemoScriptData {
  title: string;
  version: string;
  total_duration_s: number;
  is_synthetic: boolean;
  steps: DemoStep[];
}

export interface DemoTourBarProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyState: (state: Record<string, unknown>) => void;
  className?: string;
}

export const DemoTourBar: React.FC<DemoTourBarProps> = ({
  isOpen,
  onClose,
  onApplyState,
  className = "",
}) => {
  const [script, setScript] = useState<DemoScriptData | null>(null);
  const [currentStepIdx, setCurrentStepIdx] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Load demo_script.json
  useEffect(() => {
    if (!isOpen) return;

    fetch("/demo/demo_script.json")
      .then((res) => res.json())
      .then((data: DemoScriptData) => {
        setScript(data);
        setCurrentStepIdx(0);
        setIsPlaying(true);
        if (data.steps && data.steps.length > 0) {
          onApplyState(data.steps[0].state);
        }
      })
      .catch((err) => {
        console.error("Failed to load demo script:", err);
      });
  }, [isOpen, onApplyState]);

  const steps = useMemo(() => script?.steps || [], [script]);
  const currentStep = steps[currentStepIdx];

  // Step transition helper
  const goToStep = useCallback(
    (idx: number) => {
      if (!steps || steps.length === 0) return;
      const targetIdx = Math.max(0, Math.min(steps.length - 1, idx));
      setCurrentStepIdx(targetIdx);
      onApplyState(steps[targetIdx].state);
    },
    [steps, onApplyState]
  );

  // Auto-play timer
  useEffect(() => {
    if (!isOpen || !isPlaying || steps.length === 0) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    const duration = (currentStep?.duration_s || 6) * 1000;
    timerRef.current = setTimeout(() => {
      if (currentStepIdx < steps.length - 1) {
        goToStep(currentStepIdx + 1);
      } else {
        // Reached end of tour
        setIsPlaying(false);
      }
    }, duration);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isOpen, isPlaying, currentStepIdx, steps.length, currentStep?.duration_s, goToStep]);

  if (!isOpen || !script || !currentStep) return null;

  return (
    <aside
      role="region"
      aria-label="3-Minute Demo Pitch Tour Controller"
      className={`fixed bottom-20 md:bottom-24 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-2xl bg-slate-900/95 backdrop-blur-md border border-cyan-500/50 rounded-2xl shadow-2xl p-4 text-slate-100 flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300 ${className}`}
    >
      {/* Top Bar with Step Title and Controls */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="px-2 py-0.5 text-[11px] font-bold font-mono rounded bg-cyan-950 text-cyan-300 border border-cyan-700/60 shrink-0">
            Step {currentStep.step} of {steps.length}
          </span>
          <h3 className="text-xs md:text-sm font-bold text-white truncate">
            {currentStep.title}
          </h3>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsPlaying((p) => !p)}
            className="text-xs px-2.5 py-1 text-cyan-300 hover:text-white"
            aria-label={isPlaying ? "Pause automated tour" : "Resume automated tour"}
          >
            {isPlaying ? "⏸ Pause" : "▶ Play"}
          </Button>

          <Button
            variant="ghost"
            size="sm"
            disabled={currentStepIdx === 0}
            onClick={() => goToStep(currentStepIdx - 1)}
            className="text-xs px-2 py-1 text-slate-300 disabled:opacity-30"
            aria-label="Previous demo step"
          >
            ←
          </Button>

          <Button
            variant="ghost"
            size="sm"
            disabled={currentStepIdx === steps.length - 1}
            onClick={() => goToStep(currentStepIdx + 1)}
            className="text-xs px-2 py-1 text-slate-300 disabled:opacity-30"
            aria-label="Next demo step"
          >
            →
          </Button>

          <button
            type="button"
            onClick={onClose}
            aria-label="Exit demo tour"
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-1"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Caption Content */}
      <p className="text-xs md:text-sm text-slate-200 leading-relaxed font-sans">
        {currentStep.caption}
      </p>

      {/* Step dots indicator */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-1.5">
          {steps.map((st, idx) => (
            <button
              key={st.step}
              type="button"
              onClick={() => goToStep(idx)}
              aria-label={`Jump to step ${st.step}: ${st.title}`}
              className={`h-1.5 rounded-full transition-all focus:outline-none focus:ring-1 focus:ring-cyan-400 ${
                idx === currentStepIdx
                  ? "w-8 bg-cyan-400"
                  : idx < currentStepIdx
                  ? "w-2.5 bg-cyan-800"
                  : "w-2 bg-slate-700 hover:bg-slate-500"
              }`}
            />
          ))}
        </div>

        <span className="text-[10px] text-slate-400 font-mono">
          3-Min Challenge Pitch
        </span>
      </div>
    </aside>
  );
};
