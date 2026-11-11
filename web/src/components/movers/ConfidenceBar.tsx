"use client";

import React from "react";

export interface ConfidenceBarProps {
  /**
   * Confidence value between 0.0 and 1.0
   */
  value: number;
  /**
   * Whether to show the numerical percentage label.
   */
  showLabel?: boolean;
  /**
   * Size variant
   */
  size?: "sm" | "md" | "lg";
  className?: string;
}

export const ConfidenceBar: React.FC<ConfidenceBarProps> = ({
  value,
  showLabel = true,
  size = "md",
  className = "",
}) => {
  const clamped = Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
  const pct = Math.round(clamped * 100);

  // Color thresholds
  let barColor = "bg-amber-500";
  let textColor = "text-amber-400";
  if (pct >= 80) {
    barColor = "bg-emerald-400";
    textColor = "text-emerald-400";
  } else if (pct >= 55) {
    barColor = "bg-cyan-400";
    textColor = "text-cyan-300";
  }

  const heightClass = size === "sm" ? "h-1.5" : size === "lg" ? "h-3" : "h-2";

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div
        role="meter"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Detection confidence ${pct}%`}
        className={`flex-1 bg-slate-800 rounded-full overflow-hidden border border-slate-700/60 ${heightClass}`}
      >
        <div
          className={`${heightClass} ${barColor} transition-all duration-300 rounded-full`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showLabel && (
        <span
          className={`font-mono text-xs font-semibold tabular-nums shrink-0 ${textColor}`}
          aria-hidden="true"
        >
          {pct}%
        </span>
      )}
    </div>
  );
};
