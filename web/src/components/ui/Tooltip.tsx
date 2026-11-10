"use client";

import React, { useState, useId } from "react";

export type TooltipPosition = "top" | "bottom" | "left" | "right";

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  position?: TooltipPosition;
  delayMs?: number;
}

export function Tooltip({
  content,
  children,
  position = "top",
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const tooltipId = useId();

  const positionStyles: Record<TooltipPosition, string> = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  const show = () => setIsVisible(true);
  const hide = () => setIsVisible(false);

  return (
    <div
      className="relative inline-flex items-center"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {React.cloneElement(children, {
        "aria-describedby": isVisible ? tooltipId : undefined,
      })}

      {isVisible && (
        <div
          id={tooltipId}
          role="tooltip"
          className={`absolute z-50 px-2.5 py-1.5 text-xs font-mono font-medium text-space-100 bg-space-850/95 backdrop-blur-md rounded-lg border border-cyan-500/30 shadow-xl whitespace-nowrap pointer-events-none transition-opacity duration-150 ${positionStyles[position]}`}
        >
          {content}
        </div>
      )}
    </div>
  );
}
