"use client";

import React from "react";
import { GLOSSARY, type GlossaryEntry } from "@/content/glossary";
import { Tooltip } from "@/components/ui/Tooltip";

export interface GlossaryTooltipProps {
  /**
   * Key in the GLOSSARY record (e.g. 'epoch', 'confidence', 'known', 'unknown', 'spectrum').
   */
  termKey: keyof typeof GLOSSARY | string;
  /**
   * Whether beginner mode is currently enabled.
   */
  beginnerMode: boolean;
  /**
   * Optional custom label text or children to annotate. If omitted, an inline (?) icon is rendered.
   */
  children?: React.ReactNode;
  /**
   * Optional additional class name.
   */
  className?: string;
}

export const GlossaryTooltip: React.FC<GlossaryTooltipProps> = ({
  termKey,
  beginnerMode,
  children,
  className = "",
}) => {
  if (!beginnerMode) {
    return children ? <>{children}</> : null;
  }

  const entry: GlossaryEntry | undefined = GLOSSARY[termKey];
  if (!entry) {
    return children ? <>{children}</> : null;
  }

  const tooltipContent = (
    <div className="max-w-xs text-left p-1">
      <div className="font-semibold text-slate-100 flex items-center gap-1.5 mb-1">
        <span className="text-cyan-400">ℹ</span>
        <span>{entry.term}</span>
      </div>
      <p className="text-xs text-slate-300 leading-relaxed">{entry.short}</p>
      {entry.detail && (
        <p className="text-[11px] text-slate-400 mt-1.5 border-t border-slate-700/60 pt-1 leading-normal">
          {entry.detail}
        </p>
      )}
    </div>
  );

  return (
    <span className={`inline-flex items-center gap-1 align-baseline ${className}`}>
      {children}
      <Tooltip content={tooltipContent} position="top">
        <button
          type="button"
          aria-label={`Definition of ${entry.term}`}
          className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-cyan-950/80 text-cyan-300 hover:text-cyan-100 hover:bg-cyan-800 text-[10px] font-bold border border-cyan-700/50 focus:outline-none focus:ring-2 focus:ring-cyan-400 transition-colors"
        >
          ?
        </button>
      </Tooltip>
    </span>
  );
};

