"use client";

import React, { useId } from "react";

export interface SliderProps {
  label?: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (value: number) => void;
  formatValue?: (val: number) => string;
  ticks?: { value: number; label: string }[];
  className?: string;
  disabled?: boolean;
}

export function Slider({
  label,
  min,
  max,
  step = 1,
  value,
  onChange,
  formatValue = (v) => String(v),
  ticks,
  className = "",
  disabled = false,
}: SliderProps) {
  const inputId = useId();

  const percentage = Math.max(
    0,
    Math.min(100, ((value - min) / (max - min || 1)) * 100)
  );

  return (
    <div className={`flex flex-col gap-2 w-full ${className}`}>
      {label && (
        <div className="flex items-center justify-between text-xs font-mono text-space-300">
          <label htmlFor={inputId} className="font-medium text-space-200">
            {label}
          </label>
          <span className="text-cyan-400 font-bold">{formatValue(value)}</span>
        </div>
      )}

      {/* Touch-friendly target wrapper (min-h 44px) */}
      <div className="relative flex items-center min-h-[44px] touch-none">
        {/* Track background */}
        <div className="w-full h-2 rounded-full bg-space-950 border border-white/10 overflow-hidden relative">
          {/* Active fill with cyan glow */}
          <div
            className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 rounded-full transition-all duration-75"
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* Native range input for accessible keyboard & touch interactions */}
        <input
          id={inputId}
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed focus-visible:outline-none"
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuenow={value}
          aria-valuetext={formatValue(value)}
        />

        {/* Custom thumb visual */}
        <div
          className="absolute h-5 w-5 rounded-full bg-cyan-400 border-2 border-space-950 shadow-md shadow-cyan-400/50 pointer-events-none transition-all duration-75 -translate-x-1/2"
          style={{ left: `${percentage}%` }}
        />
      </div>

      {/* Optional epoch ticks */}
      {ticks && ticks.length > 0 && (
        <div className="flex justify-between items-center px-1 text-[10px] font-mono text-space-400">
          {ticks.map((t) => (
            <span
              key={t.value}
              className={`cursor-pointer transition-colors hover:text-cyan-300 ${
                t.value === value ? "text-cyan-400 font-bold" : ""
              }`}
              onClick={() => onChange(t.value)}
            >
              {t.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
