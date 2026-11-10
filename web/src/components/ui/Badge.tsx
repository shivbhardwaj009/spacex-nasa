"use client";

import React from "react";

export type BadgeVariant =
  | "known"
  | "unknown"
  | "test-data"
  | "neutral"
  | "success"
  | "info";

export type BadgeSize = "sm" | "md" | "lg";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
}

export function Badge({
  children,
  className = "",
  variant = "neutral",
  size = "md",
  dot = false,
  ...props
}: BadgeProps) {
  const baseStyles =
    "inline-flex items-center font-mono font-medium rounded-full border transition-colors select-none";

  const variantStyles: Record<BadgeVariant, string> = {
    known:
      "bg-cyan-950/80 text-cyan-300 border-cyan-500/50 shadow-sm shadow-cyan-900/30",
    unknown:
      "bg-amber-950/80 text-amber-300 border-amber-500/50 shadow-sm shadow-amber-900/30",
    "test-data":
      "bg-rose-950/90 text-rose-300 border-rose-500/80 animate-pulse font-bold tracking-wider shadow-sm shadow-rose-900/40",
    neutral:
      "bg-space-850 text-space-200 border-white/10",
    success:
      "bg-emerald-950/80 text-emerald-300 border-emerald-500/40",
    info:
      "bg-sky-950/80 text-sky-300 border-sky-500/40",
  };

  const dotColors: Record<BadgeVariant, string> = {
    known: "bg-cyan-400",
    unknown: "bg-amber-400",
    "test-data": "bg-rose-400",
    neutral: "bg-space-400",
    success: "bg-emerald-400",
    info: "bg-sky-400",
  };

  const sizeStyles: Record<BadgeSize, string> = {
    sm: "text-[11px] px-2 py-0.5 gap-1",
    md: "text-xs px-2.5 py-1 gap-1.5",
    lg: "text-sm px-3.5 py-1.5 gap-2",
  };

  return (
    <span
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {dot && (
        <span
          className={`h-1.5 w-1.5 rounded-full shrink-0 ${dotColors[variant]}`}
          aria-hidden="true"
        />
      )}
      <span>{children}</span>
    </span>
  );
}

/**
 * Convenient shortcut for displaying the global TEST DATA badge.
 */
export function TestDataBadge({ className = "" }: { className?: string }) {
  return (
    <Badge
      variant="test-data"
      size="md"
      dot
      className={`uppercase ${className}`}
      role="status"
      aria-label="Simulation test data active"
    >
      TEST DATA
    </Badge>
  );
}

