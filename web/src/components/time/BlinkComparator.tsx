"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui";
import { DESIGN_TOKENS } from "@/design/tokens";
import type { EpochInfo } from "@/types";

export interface BlinkComparatorProps {
  epochs: EpochInfo[];
  currentEpochIndex?: number;
  onEpochChange: (index: number) => void;
  className?: string;
}

export function BlinkComparator({
  epochs,
  onEpochChange,
  className = "",
}: BlinkComparatorProps) {
  const [epochAIndex, setEpochAIndex] = useState<number>(0);
  const [epochBIndex, setEpochBIndex] = useState<number>(Math.min(1, epochs.length - 1));
  const [activeFrame, setActiveFrame] = useState<"A" | "B">("A");
  const [isBlinking, setIsBlinking] = useState<boolean>(false);
  const [flickerRateHz, setFlickerRateHz] = useState<number>(DESIGN_TOKENS.a11y.defaultBlinkHz);
  const [isDifferenceMode, setIsDifferenceMode] = useState<boolean>(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(false);

  const blinkTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Check prefers-reduced-motion
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);

    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Safe flicker toggle (capped at <= 3.0 Hz)
  const safeRateHz = Math.min(DESIGN_TOKENS.a11y.maxBlinkHz, Math.max(0.2, flickerRateHz));
  const intervalMs = Math.round(1000 / safeRateHz);

  // Toggle active frame between A and B
  const toggleFrame = useCallback(() => {
    setActiveFrame((prev) => {
      const next = prev === "A" ? "B" : "A";
      onEpochChange(next === "A" ? epochAIndex : epochBIndex);
      return next;
    });
  }, [epochAIndex, epochBIndex, onEpochChange]);

  // Automated blinking loop
  useEffect(() => {
    if (!isBlinking || prefersReducedMotion || epochAIndex === epochBIndex) {
      if (blinkTimerRef.current) clearInterval(blinkTimerRef.current);
      return;
    }

    blinkTimerRef.current = setInterval(() => {
      toggleFrame();
    }, intervalMs);

    return () => {
      if (blinkTimerRef.current) clearInterval(blinkTimerRef.current);
    };
  }, [isBlinking, prefersReducedMotion, epochAIndex, epochBIndex, intervalMs, toggleFrame]);

  return (
    <div
      className={`glass-panel p-4 rounded-2xl border border-white/10 flex flex-col gap-3 select-none ${className}`}
      role="region"
      aria-label="Astronomical blink comparator"
    >
      {/* Title & Photosensitivity Warning */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2.5">
        <div>
          <h3 className="text-sm font-bold text-white font-mono flex items-center gap-2">
            <span>⚡ Blink Comparator</span>
            <span className="text-[10px] text-cyan-300 font-normal">
              (Discover Movers via Rapid Alternate Switching)
            </span>
          </h3>
        </div>

        {/* Photosensitivity Safe Rate Indicator */}
        <span
          className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950/70 text-amber-300 border border-amber-500/40"
          title="Flicker rate is strictly capped at <= 3 flashes/sec for photosensitivity safety"
        >
          Safe Rate Capped: ≤ {DESIGN_TOKENS.a11y.maxBlinkHz} Hz
        </span>
      </div>

      {/* Epoch Selectors (A and B) */}
      <div className="grid grid-cols-2 gap-3 text-xs font-mono">
        {/* Epoch A */}
        <div className="p-2.5 rounded-xl bg-space-950/60 border border-white/5 space-y-1">
          <div className="flex items-center justify-between text-space-400">
            <span>Epoch A (Base)</span>
            {activeFrame === "A" && <span className="text-cyan-400 font-bold">● ACTIVE</span>}
          </div>
          <select
            value={epochAIndex}
            onChange={(e) => {
              const idx = Number(e.target.value);
              setEpochAIndex(idx);
              if (activeFrame === "A") onEpochChange(idx);
            }}
            aria-label="Select Epoch A for blink comparator"
            className="w-full min-h-[36px] px-2 py-1 rounded bg-space-900 border border-white/10 text-white focus:border-cyan-400 focus-visible:outline-none"
          >
            {epochs.map((ep, i) => (
              <option key={ep.epoch_id} value={i}>
                {ep.epoch_id} ({new Date(ep.date).toLocaleDateString()})
              </option>
            ))}
          </select>
        </div>

        {/* Epoch B */}
        <div className="p-2.5 rounded-xl bg-space-950/60 border border-white/5 space-y-1">
          <div className="flex items-center justify-between text-space-400">
            <span>Epoch B (Comparison)</span>
            {activeFrame === "B" && <span className="text-amber-400 font-bold">● ACTIVE</span>}
          </div>
          <select
            value={epochBIndex}
            onChange={(e) => {
              const idx = Number(e.target.value);
              setEpochBIndex(idx);
              if (activeFrame === "B") onEpochChange(idx);
            }}
            aria-label="Select Epoch B for blink comparator"
            className="w-full min-h-[36px] px-2 py-1 rounded bg-space-900 border border-white/10 text-white focus:border-cyan-400 focus-visible:outline-none"
          >
            {epochs.map((ep, i) => (
              <option key={ep.epoch_id} value={i}>
                {ep.epoch_id} ({new Date(ep.date).toLocaleDateString()})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Mode Controls: Auto Blink vs Manual vs Difference */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <div className="flex items-center gap-2">
          {/* Auto Blink Toggle (Disabled if reduced motion is preferred) */}
          {!prefersReducedMotion ? (
            <Button
              variant={isBlinking ? "amber" : "primary"}
              size="sm"
              onClick={() => setIsBlinking(!isBlinking)}
              disabled={epochAIndex === epochBIndex}
              className="min-h-[44px] px-4 font-mono font-bold"
            >
              {isBlinking ? "⏸ Stop Blink" : "▶ Start Auto-Blink"}
            </Button>
          ) : (
            <span className="text-xs font-mono text-space-400">
              Reduced-motion active. Use Manual Toggle:
            </span>
          )}

          {/* Manual Toggle Button */}
          <Button
            variant="secondary"
            size="sm"
            onClick={toggleFrame}
            disabled={isBlinking}
            aria-label="Switch between Frame A and Frame B"
            className="min-h-[44px] px-3 font-mono"
          >
            Switch to Frame {activeFrame === "A" ? "B" : "A"}
          </Button>

          {/* Difference Mode (B - A) Toggle */}
          <Button
            variant={isDifferenceMode ? "outline" : "ghost"}
            size="sm"
            onClick={() => setIsDifferenceMode(!isDifferenceMode)}
            className={`min-h-[44px] px-3 font-mono text-xs ${
              isDifferenceMode ? "border-cyan-400 text-cyan-300 bg-cyan-950/40" : ""
            }`}
          >
            {isDifferenceMode ? "✓ Difference Mode (B − A)" : "Difference Mode"}
          </Button>
        </div>

        {/* Flicker Rate Slider */}
        <div className="flex items-center gap-2 text-xs font-mono text-space-300">
          <label htmlFor="flicker-rate-input" className="text-space-400">
            Rate:
          </label>
          <input
            id="flicker-rate-input"
            type="range"
            min="0.5"
            max="3.0"
            step="0.25"
            value={safeRateHz}
            disabled={isBlinking || prefersReducedMotion}
            onChange={(e) => setFlickerRateHz(parseFloat(e.target.value))}
            className="w-20 accent-cyan-400 cursor-pointer"
          />
          <span className="w-12 text-cyan-300 font-bold">{safeRateHz.toFixed(1)} Hz</span>
        </div>
      </div>

      {/* Difference Mode Educational Badge */}
      {isDifferenceMode && (
        <div className="p-2.5 rounded-lg bg-cyan-950/40 border border-cyan-500/30 text-xs font-mono text-cyan-200">
          <strong>Difference View Active (Epoch B minus Epoch A):</strong> Stationary stars cancel out to near-zero background; moving solar system bodies emerge as dipole positive/negative residuals.
        </div>
      )}
    </div>
  );
}
