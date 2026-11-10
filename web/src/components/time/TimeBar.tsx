"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { Button, Slider } from "@/components/ui";
import type { EpochInfo } from "@/types";

export interface TimeBarProps {
  epochs: EpochInfo[];
  currentEpochIndex: number;
  onEpochChange: (index: number) => void;
  className?: string;
}

export function TimeBar({
  epochs,
  currentEpochIndex,
  onEpochChange,
  className = "",
}: TimeBarProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1000); // ms per frame
  const [loop, setLoop] = useState<boolean>(true);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Check prefers-reduced-motion
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const listener = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener("change", listener);
    return () => mediaQuery.removeEventListener("change", listener);
  }, []);

  // Step functions
  const handlePrev = useCallback(() => {
    onEpochChange(Math.max(0, currentEpochIndex - 1));
  }, [currentEpochIndex, onEpochChange]);

  const handleNext = useCallback(() => {
    if (currentEpochIndex < epochs.length - 1) {
      onEpochChange(currentEpochIndex + 1);
    } else if (loop) {
      onEpochChange(0);
    } else {
      setIsPlaying(false);
    }
  }, [currentEpochIndex, epochs.length, loop, onEpochChange]);

  // Playback timer with requestAnimationFrame / interval
  useEffect(() => {
    if (!isPlaying || prefersReducedMotion || epochs.length <= 1) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      handleNext();
    }, playbackSpeed);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, prefersReducedMotion, epochs.length, playbackSpeed, handleNext]);

  // Pause playback automatically when tab is hidden
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isPlaying) {
        setIsPlaying(false);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [isPlaying]);

  // Keyboard Shortcuts (Space = Play/Pause, ArrowLeft/Right = Step)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Do not hijack keys while typing in input fields
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || (e.target as HTMLElement)?.isContentEditable) {
        return;
      }

      if (e.code === "Space") {
        e.preventDefault();
        if (!prefersReducedMotion) {
          setIsPlaying((prev) => !prev);
        }
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        handlePrev();
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        handleNext();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handlePrev, handleNext, prefersReducedMotion]);

  const currentEpoch = epochs[currentEpochIndex] || epochs[0];

  // Compute uneven tick labels with dates
  const ticks = epochs.map((ep, idx) => {
    const dateObj = new Date(ep.date);
    const dateFormatted = `${dateObj.getMonth() + 1}/${dateObj.getDate()}`;
    return {
      value: idx,
      label: `${ep.epoch_id} (${dateFormatted})`,
    };
  });

  return (
    <div
      className={`glass-panel p-3.5 md:p-4 rounded-2xl border border-white/10 flex flex-col gap-3 select-none ${className}`}
      role="region"
      aria-label="Time-lapse and observation epoch controls"
    >
      {/* Top Header: Current Epoch Info & Speed / Loop options */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="text-space-400">Epoch:</span>
          <span className="font-bold text-cyan-300">
            {currentEpoch ? currentEpoch.epoch_id.toUpperCase() : "N/A"}
          </span>
          {currentEpoch && (
            <span className="text-space-300">
              • {new Date(currentEpoch.date).toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
        </div>

        {/* Speed & Loop Controls */}
        <div className="flex items-center gap-3">
          {/* Loop toggle */}
          <label className="flex items-center gap-1.5 cursor-pointer text-space-300 hover:text-white">
            <input
              type="checkbox"
              checked={loop}
              onChange={(e) => setLoop(e.target.checked)}
              className="rounded bg-space-950 border-white/20 text-cyan-500 focus:ring-cyan-400"
            />
            <span>Loop</span>
          </label>

          {/* Speed Presets */}
          <div className="flex items-center gap-1">
            {[
              { label: "0.5x", ms: 2000 },
              { label: "1x", ms: 1000 },
              { label: "2x", ms: 500 },
            ].map((spd) => (
              <button
                key={spd.label}
                type="button"
                onClick={() => setPlaybackSpeed(spd.ms)}
                className={`min-h-[28px] px-2 py-0.5 rounded text-[11px] font-mono transition-colors focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                  playbackSpeed === spd.ms
                    ? "bg-cyan-500 text-space-950 font-bold"
                    : "bg-space-850 hover:bg-space-800 text-space-400"
                }`}
              >
                {spd.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Epoch Slider with Real Dates Ticks */}
      <div className="w-full px-1">
        <Slider
          min={0}
          max={Math.max(0, epochs.length - 1)}
          step={1}
          value={currentEpochIndex}
          onChange={onEpochChange}
          formatValue={(idx) =>
            epochs[idx]
              ? `${epochs[idx].epoch_id} (${new Date(epochs[idx].date).toLocaleDateString()})`
              : ""
          }
          ticks={ticks}
        />
      </div>

      {/* Playback Buttons Bar */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          {/* Previous Epoch */}
          <Button
            variant="secondary"
            size="sm"
            onClick={handlePrev}
            disabled={currentEpochIndex === 0 && !loop}
            aria-label="Previous observation epoch (Left Arrow)"
            className="min-h-[44px] min-w-[44px]"
          >
            ⏮
          </Button>

          {/* Play / Pause Toggle */}
          {!prefersReducedMotion ? (
            <Button
              variant={isPlaying ? "amber" : "primary"}
              size="md"
              onClick={() => setIsPlaying(!isPlaying)}
              aria-label={isPlaying ? "Pause time-lapse (Space)" : "Play time-lapse (Space)"}
              className="min-h-[44px] px-5 font-mono font-bold"
            >
              {isPlaying ? "⏸ Pause" : "▶ Play Time-Lapse"}
            </Button>
          ) : (
            <span className="text-[11px] font-mono text-space-400 px-2">
              Reduced Motion Active (Use Step Buttons)
            </span>
          )}

          {/* Next Epoch */}
          <Button
            variant="secondary"
            size="sm"
            onClick={handleNext}
            disabled={currentEpochIndex === epochs.length - 1 && !loop}
            aria-label="Next observation epoch (Right Arrow)"
            className="min-h-[44px] min-w-[44px]"
          >
            ⏭
          </Button>
        </div>

        {/* Keyboard shortcut hint */}
        <span className="text-[10px] font-mono text-space-400 hidden sm:inline">
          Shortcuts: Space (play/pause), ← / → (step)
        </span>
      </div>
    </div>
  );
}
