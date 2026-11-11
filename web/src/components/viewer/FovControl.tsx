"use client";

import React, { useState } from "react";
import { DESIGN_TOKENS } from "@/design/tokens";

export interface FovControlProps {
  fov: number;
  onFovChange: (newFov: number) => void;
  coverageLimitDeg?: number;
  className?: string;
}

export function FovControl({
  fov,
  onFovChange,
  coverageLimitDeg = DESIGN_TOKENS.fov.coverageLimitDeg,
  className = "",
}: FovControlProps) {
  const [customInput, setCustomInput] = useState<string>(String(fov));
  const [isEditingCustom, setIsEditingCustom] = useState(false);

  const presets = DESIGN_TOKENS.fov.presets;
  const isOverCoverage = fov > coverageLimitDeg;

  const clampFov = (val: number): number => {
    return Math.max(DESIGN_TOKENS.fov.min, Math.min(DESIGN_TOKENS.fov.max, val));
  };

  const handlePresetSelect = (presetVal: number) => {
    setIsEditingCustom(false);
    setCustomInput(String(presetVal));
    onFovChange(presetVal);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(customInput);
    if (!isNaN(parsed) && parsed > 0) {
      const clamped = clampFov(parsed);
      setCustomInput(String(clamped));
      onFovChange(clamped);
      setIsEditingCustom(false);
    }
  };

  return (
    <div className={`glass-panel-subtle p-3 rounded-xl border border-white/10 flex flex-col gap-2 ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-mono font-bold text-space-200">
          Field of View (FoV):
        </span>
        <span className="text-xs font-mono font-bold text-cyan-400">
          {fov.toFixed(2)}° ({Math.round(fov * 60)}&apos;)
        </span>
      </div>

      {/* Preset Buttons */}
      <div className="flex flex-wrap items-center gap-1.5">
        {presets.map((preset) => {
          const isSelected = Math.abs(fov - preset) < 0.001;
          return (
            <button
              key={preset}
              type="button"
              onClick={() => handlePresetSelect(preset)}
              className={`min-h-[36px] px-2.5 py-1 text-xs font-mono rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none ${
                isSelected
                  ? "bg-cyan-500 text-space-950 font-bold shadow-md shadow-cyan-500/20"
                  : "bg-space-850 hover:bg-space-800 text-space-300 border border-white/5"
              }`}
            >
              {preset}°
            </button>
          );
        })}

        {/* Custom FoV Input Toggle */}
        {!isEditingCustom ? (
          <button
            type="button"
            onClick={() => setIsEditingCustom(true)}
            className="min-h-[36px] px-2.5 py-1 text-xs font-mono rounded-lg bg-space-850 hover:bg-space-800 text-space-400 border border-white/5 hover:text-white"
          >
            Custom...
          </button>
        ) : (
          <form onSubmit={handleCustomSubmit} className="flex items-center gap-1">
            <input
              type="number"
              step="0.05"
              min="0.02"
              max="5.0"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              className="w-16 min-h-[36px] px-1.5 py-0.5 text-xs font-mono rounded bg-space-950 border border-cyan-400 text-white"
              autoFocus
            />
            <button
              type="submit"
              className="min-h-[36px] px-2 py-0.5 text-xs font-mono rounded bg-cyan-500 text-space-950 font-bold"
            >
              Set
            </button>
          </form>
        )}
      </div>

      {/* Educational Note */}
      <p className="text-[10px] text-space-400 font-mono leading-tight">
        Tip: Larger fields track faster movers, but require wider data footprints.
      </p>

      {/* Coverage Warning Banner */}
      {isOverCoverage && (
        <div
          role="status"
          className="p-2 rounded-lg bg-amber-950/50 border border-amber-500/40 text-[11px] text-amber-300 font-mono flex items-start gap-1.5"
        >
          <span className="text-amber-400 font-bold shrink-0">ℹ</span>
          <span>No precomputed data for this field ({fov.toFixed(2)}° &gt; {coverageLimitDeg}°). Showing sky background only.</span>
        </div>
      )}
    </div>
  );
}

