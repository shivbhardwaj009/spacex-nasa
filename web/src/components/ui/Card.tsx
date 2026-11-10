"use client";

import React, { forwardRef } from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  selected?: boolean;
  accent?: "none" | "cyan" | "amber" | "rose";
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      children,
      className = "",
      interactive = false,
      selected = false,
      accent = "none",
      ...props
    },
    ref
  ) => {
    const accentBorders = {
      none: "border-white/10 hover:border-white/20",
      cyan: "border-cyan-500/40 hover:border-cyan-400 shadow-glow-cyan",
      amber: "border-amber-500/40 hover:border-amber-400 shadow-glow-amber",
      rose: "border-rose-500/40 hover:border-rose-400",
    };

    const selectedStyles = selected
      ? "ring-2 ring-cyan-400 border-cyan-400/80 bg-space-850/90"
      : "";

    const interactiveStyles = interactive
      ? "cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none"
      : "";

    return (
      <div
        ref={ref}
        tabIndex={interactive ? 0 : undefined}
        role={interactive ? "button" : undefined}
        className={`glass-panel rounded-xl overflow-hidden border ${accentBorders[accent]} ${selectedStyles} ${interactiveStyles} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Card.displayName = "Card";

export function CardHeader({
  children,
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`px-5 py-4 border-b border-white/5 flex flex-col gap-1.5 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardTitle({
  children,
  className = "",
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={`text-lg font-semibold tracking-tight text-space-50 ${className}`}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardDescription({
  children,
  className = "",
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={`text-xs text-space-400 font-mono ${className}`} {...props}>
      {children}
    </p>
  );
}

export function CardContent({
  children,
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={`p-5 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({
  children,
  className = "",
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`px-5 py-3 border-t border-white/5 bg-space-950/40 flex items-center justify-between gap-3 text-xs text-space-300 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
