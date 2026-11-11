"use client";

import React, { useState, useEffect } from "react";
import type { MoverCandidate } from "@/types";
import { MoversPanel } from "@/components/movers/MoversPanel";
import { ObjectDetail } from "@/components/movers/ObjectDetail";
import { Badge } from "@/components/ui/Badge";

export interface SidePanelProps {
  movers: MoverCandidate[];
  selectedMover: MoverCandidate | null;
  onSelectMover: (mover: MoverCandidate | null) => void;
  beginnerMode: boolean;
  selectedEpochId?: string | null;
  onSelectEpoch?: (epochId: string) => void;
  regionName?: string;
}

export function SidePanel({
  movers,
  selectedMover,
  onSelectMover,
  beginnerMode,
  selectedEpochId,
  onSelectEpoch,
  regionName = "SPHEREx Deep Field",
}: SidePanelProps) {
  const [mobileExpanded, setMobileExpanded] = useState<boolean>(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState<boolean>(false);

  // If a mover is selected, automatically expand drawer so user sees details
  useEffect(() => {
    if (selectedMover) {
      setMobileExpanded(true);
      setDesktopCollapsed(false);
    }
  }, [selectedMover]);

  // Compute navigation indices for Next/Previous
  const currentIndex = selectedMover
    ? movers.findIndex((m) => m.object_id === selectedMover.object_id)
    : -1;
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < movers.length - 1;

  const handlePrevious = () => {
    if (hasPrevious) {
      onSelectMover(movers[currentIndex - 1]);
    }
  };

  const handleNext = () => {
    if (hasNext) {
      onSelectMover(movers[currentIndex + 1]);
    }
  };

  // If desktop is collapsed, show sleek NASA Eyes floating tab
  if (desktopCollapsed) {
    return (
      <div className="hidden md:flex absolute top-20 left-4 z-30">
        <button
          type="button"
          onClick={() => setDesktopCollapsed(false)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-black/75 hover:bg-black/90 backdrop-blur-md border border-white/20 text-white shadow-2xl transition-all group"
          title="Expand Featured Movers"
        >
          <span className="font-mono text-cyan-400 group-hover:translate-x-0.5 transition-transform">»</span>
          <span className="text-xs font-sans tracking-wide uppercase font-semibold">
            Movers ({movers.length})
          </span>
        </button>
      </div>
    );
  }

  return (
    <aside
      className={`glass-panel border-t md:border-t-0 md:border-r border-white/10 flex flex-col transition-all duration-300 z-30 ${
        mobileExpanded
          ? "fixed inset-x-0 bottom-0 h-[85vh] md:relative md:h-full md:w-[420px] lg:w-[460px]"
          : "fixed inset-x-0 bottom-0 h-16 md:relative md:h-full md:w-[420px] lg:w-[460px]"
      }`}
    >
      {/* Desktop NASA Eyes Panel Header */}
      <div className="hidden md:flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/40">
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-widest text-space-300 font-semibold font-sans">
            {selectedMover ? "Mover Analysis & SED" : "Featured Movers & Targets"}
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/10 text-cyan-300">
            {movers.length}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setDesktopCollapsed(true)}
          className="text-space-400 hover:text-white text-xs px-2 py-1 rounded hover:bg-white/10 transition-colors font-mono"
          title="Collapse Panel"
        >
          «
        </button>
      </div>

      {/* Mobile drag handle & toggle bar */}
      <div
        className="md:hidden flex items-center justify-between px-4 py-2 bg-space-900 border-b border-white/10 cursor-pointer select-none shrink-0 min-h-[44px]"
        onClick={() => setMobileExpanded(!mobileExpanded)}
      >
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-10 bg-white/20 rounded-full mx-auto" />
          <span className="text-xs font-mono font-bold text-space-100">
            {selectedMover
              ? selectedMover.match_name || selectedMover.object_id
              : `${movers.length} Movers Detected`}
          </span>
          {selectedMover && (
            <Badge variant={selectedMover.type === "known" ? "known" : "unknown"} size="sm">
              {selectedMover.type}
            </Badge>
          )}
        </div>
        <button
          type="button"
          aria-label={mobileExpanded ? "Collapse mover panel" : "Expand mover panel"}
          className="text-xs font-mono text-cyan-400 min-h-[44px] px-2 flex items-center"
        >
          {mobileExpanded ? "▼ Minimize" : "▲ Expand"}
        </button>
      </div>

      {/* Main Panel Content Area */}
      <div className={`flex-1 flex flex-col overflow-hidden p-2 md:p-3 ${!mobileExpanded ? "hidden md:flex" : "flex"}`}>
        {selectedMover ? (
          <ObjectDetail
            mover={selectedMover}
            onClose={() => onSelectMover(null)}
            onSelectEpoch={onSelectEpoch}
            selectedEpochId={selectedEpochId}
            beginnerMode={beginnerMode}
            hasPrevious={hasPrevious}
            hasNext={hasNext}
            onPrevious={handlePrevious}
            onNext={handleNext}
            regionName={regionName}
            className="h-full"
          />
        ) : (
          <MoversPanel
            movers={movers}
            selectedId={null}
            onSelectMover={(mover) => onSelectMover(mover)}
            beginnerMode={beginnerMode}
            className="h-full"
          />
        )}
      </div>
    </aside>
  );
}
