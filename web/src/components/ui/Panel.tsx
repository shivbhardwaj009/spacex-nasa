"use client";

import React, { useState } from "react";

export interface PanelProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
  bordered?: boolean;
}

export function Panel({
  children,
  title,
  subtitle,
  badge,
  actions,
  collapsible = false,
  defaultOpen = true,
  bordered = true,
  className = "",
  ...props
}: PanelProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <section
      className={`glass-panel rounded-2xl flex flex-col overflow-hidden transition-all duration-200 ${
        bordered ? "border border-white/10" : "border-0"
      } ${className}`}
      {...props}
    >
      {(title || subtitle || badge || actions || collapsible) && (
        <header className="px-5 py-4 border-b border-white/10 flex items-center justify-between gap-3 bg-space-900/60 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {collapsible && (
              <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                aria-expanded={isOpen}
                aria-label={isOpen ? "Collapse panel" : "Expand panel"}
                className="h-8 w-8 -ml-1 rounded-md flex items-center justify-center text-space-400 hover:text-white hover:bg-white/10 transition-colors focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none"
              >
                <svg
                  className={`h-4 w-4 transition-transform duration-200 ${
                    isOpen ? "rotate-90" : "rotate-0"
                  }`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}

            <div className="min-w-0">
              {title && (
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-semibold text-space-50 truncate">
                    {title}
                  </h2>
                  {badge && <span className="shrink-0">{badge}</span>}
                </div>
              )}
              {subtitle && (
                <p className="text-xs text-space-400 font-mono truncate mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </header>
      )}

      {isOpen && (
        <div className="flex-1 overflow-y-auto p-5 text-space-200">
          {children}
        </div>
      )}
    </section>
  );
}
