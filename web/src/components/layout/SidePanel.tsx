"use client";

import React, { useState } from "react";
import {
  Badge,
  Button,
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  TabContent,
  TabTrigger,
  Tabs,
  TabsList,
} from "@/components/ui";
import { formatCoordinates, formatMotionRate } from "@/lib/client";
import type { MoverCandidate } from "@/types";

export interface SidePanelProps {
  movers: MoverCandidate[];
  selectedMover: MoverCandidate | null;
  onSelectMover: (mover: MoverCandidate | null) => void;
  beginnerMode: boolean;
  searchFilter: string;
}

export function SidePanel({
  movers,
  selectedMover,
  onSelectMover,
  beginnerMode,
  searchFilter,
}: SidePanelProps) {
  const [filterType, setFilterType] = useState<"all" | "known" | "unknown">("all");
  const [detailTab, setDetailTab] = useState<"spectrum" | "detections" | "astrometry">("spectrum");
  const [mobileExpanded, setMobileExpanded] = useState<boolean>(false);

  // Apply filters
  const filteredMovers = movers.filter((m) => {
    if (filterType === "known" && m.type !== "known") return false;
    if (filterType === "unknown" && m.type !== "unknown") return false;

    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      const matchName = m.match_name?.toLowerCase() || "";
      const objId = m.object_id.toLowerCase();
      return matchName.includes(q) || objId.includes(q);
    }
    return true;
  });

  const knownCount = movers.filter((m) => m.type === "known").length;
  const unknownCount = movers.filter((m) => m.type === "unknown").length;

  return (
    <aside
      className={`glass-panel border-t md:border-t-0 md:border-l border-white/10 flex flex-col transition-all duration-300 z-30 ${
        mobileExpanded
          ? "fixed inset-x-0 bottom-0 h-[85vh] md:relative md:h-full md:w-[420px] lg:w-[460px]"
          : "fixed inset-x-0 bottom-0 h-16 md:relative md:h-full md:w-[420px] lg:w-[460px]"
      }`}
    >
      {/* Mobile drag handle & toggle bar */}
      <div
        className="md:hidden flex items-center justify-between px-4 py-3 bg-space-900 border-b border-white/10 cursor-pointer select-none shrink-0"
        onClick={() => setMobileExpanded(!mobileExpanded)}
      >
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-10 bg-white/20 rounded-full mx-auto" />
          <span className="text-xs font-mono font-bold text-space-100">
            {selectedMover ? selectedMover.match_name || selectedMover.object_id : `${movers.length} Movers Detected`}
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

      {/* Main Panel Body */}
      <div className={`flex-1 flex flex-col overflow-hidden ${!mobileExpanded ? "hidden md:flex" : "flex"}`}>
        {selectedMover ? (
          /* =========================================================
             DETAILED MOVER INSPECTOR VIEW
             ========================================================= */
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Inspector Header */}
            <div className="p-4 border-b border-white/10 bg-space-950/60 shrink-0 space-y-3">
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onSelectMover(null)}
                  className="text-xs text-space-400 hover:text-white -ml-2 min-h-[36px]"
                >
                  ← Back to Mover List
                </Button>
                <div className="flex items-center gap-2">
                  <Badge variant={selectedMover.type === "known" ? "known" : "unknown"} dot size="md">
                    {selectedMover.type === "known" ? "Known Asteroid" : "Unknown Mover"}
                  </Badge>
                  {selectedMover.is_synthetic && (
                    <Badge variant="test-data" size="sm">TEST</Badge>
                  )}
                </div>
              </div>

              <div>
                <h2 className="text-xl font-bold text-space-50 font-sans truncate">
                  {selectedMover.match_name || selectedMover.object_id}
                </h2>
                <p className="text-xs text-space-400 font-mono">
                  ID: {selectedMover.object_id} • Confidence: {(selectedMover.confidence * 100).toFixed(0)}%
                </p>
              </div>

              {/* Beginner Mode Helper Note */}
              {beginnerMode && (
                <div className="p-2.5 rounded-lg bg-cyan-950/40 border border-cyan-500/20 text-xs text-cyan-200">
                  {selectedMover.type === "known"
                    ? "✨ This object was recognized in known asteroid catalogs! Its orbit is already cataloged."
                    : "🔭 Unknown mover! It moved across SPHEREx images and does not match any known asteroid. Could be a distant Kuiper Belt Object or Planet X candidate!"}
                </div>
              )}
            </div>

            {/* Inspector Tab Controls */}
            <div className="flex-1 flex flex-col overflow-hidden p-4">
              <Tabs
                defaultValue={detailTab}
                onValueChange={(val) => setDetailTab(val as "spectrum" | "detections" | "astrometry")}
                className="flex-1 flex flex-col overflow-hidden"
              >
                <TabsList className="w-full shrink-0">
                  <TabTrigger value="spectrum" className="flex-1">Spectrum</TabTrigger>
                  <TabTrigger value="detections" className="flex-1">Cutouts ({selectedMover.detections.length})</TabTrigger>
                  <TabTrigger value="astrometry" className="flex-1">Astrometry</TabTrigger>
                </TabsList>

                {/* Tab 1: 102-Channel Spectrum */}
                <TabContent value="spectrum" className="flex-1 overflow-y-auto mt-4 space-y-4">
                  {selectedMover.spectrum ? (
                    <div className="space-y-4">
                      <div className="p-3 rounded-xl bg-space-950/60 border border-white/5 space-y-2">
                        <div className="flex justify-between items-center text-xs font-mono">
                          <span className="text-space-400">102 SPHEREx Spectral Channels:</span>
                          <span className="text-cyan-400 font-bold">0.75 – 5.00 µm</span>
                        </div>

                        {/* Interactive mini SED bar preview */}
                        <div className="h-28 flex items-end gap-[1px] bg-space-900/60 p-2 rounded-lg border border-white/5 overflow-x-auto">
                          {selectedMover.spectrum.flux.map((flx, i) => {
                            const maxF = Math.max(...(selectedMover.spectrum?.flux || [100]));
                            const heightPct = Math.max(8, Math.min(100, (flx / (maxF || 1)) * 100));
                            const wave = selectedMover.spectrum?.wavelength_um[i] || 0;
                            return (
                              <div
                                key={i}
                                className="group/bar relative flex-1 min-w-[2px] bg-gradient-to-t from-cyan-600 to-cyan-400 rounded-t-sm hover:from-amber-400 hover:to-amber-300 transition-colors"
                                style={{ height: `${heightPct}%` }}
                              >
                                <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover/bar:block text-[9px] font-mono bg-space-950 text-white px-1.5 py-0.5 rounded border border-white/20 whitespace-nowrap z-20">
                                  {wave.toFixed(2)}µm: {flx.toFixed(1)} mJy
                                </span>
                              </div>
                            );
                          })}
                        </div>
                        <div className="flex justify-between text-[10px] font-mono text-space-400">
                          <span>Array 1 (0.75 µm)</span>
                          <span>Array 3 (2.0 µm)</span>
                          <span>Array 6 (5.00 µm)</span>
                        </div>
                      </div>

                      {/* Diagnostic Volatiles & Taxonomy Summary */}
                      <div className="p-3 rounded-xl bg-space-950/40 border border-white/5 space-y-2 text-xs font-mono">
                        <div className="text-space-300 font-bold">Spectroscopic Fingerprints</div>
                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          <div className="p-2 rounded bg-space-900/60 border border-white/5">
                            <span className="text-space-400 block">Water Ice (2.02 µm):</span>
                            <span className="text-cyan-300 font-bold">Detected</span>
                          </div>
                          <div className="p-2 rounded bg-space-900/60 border border-white/5">
                            <span className="text-space-400 block">CO2 Ice (4.26 µm):</span>
                            <span className="text-cyan-300 font-bold">Detected</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-6 text-center text-xs font-mono text-space-400">
                      No spectrophotometric spectrum attached.
                    </div>
                  )}
                </TabContent>

                {/* Tab 2: Multi-Epoch Cutouts & Detections */}
                <TabContent value="detections" className="flex-1 overflow-y-auto mt-4 space-y-3">
                  {selectedMover.detections.map((det) => (
                    <div
                      key={det.epoch_id}
                      className="p-3 rounded-xl bg-space-950/60 border border-white/5 flex items-center justify-between gap-3 text-xs font-mono"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-white">{det.epoch_id.toUpperCase()}</span>
                          <span className="text-[10px] text-space-400">
                            {new Date(det.date).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-space-300 text-[11px]">
                          {formatCoordinates(det.ra, det.dec, 3)}
                        </p>
                        <p className="text-cyan-400 text-[11px]">Flux: {det.flux.toFixed(1)} mJy</p>
                      </div>

                      {/* Cutout Thumbnail */}
                      <div className="h-14 w-14 rounded-lg bg-space-900 border border-white/10 overflow-hidden shrink-0 relative flex items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={`/${det.cutout_url}`}
                          alt={`Cutout for ${selectedMover.object_id} at ${det.epoch_id}`}
                          className="h-full w-full object-cover"
                          onError={(e) => {
                            // Fallback to celestial icon if cutout image not found
                            e.currentTarget.style.display = "none";
                          }}
                        />
                        <span className="text-[10px] text-space-400 font-mono">FIT</span>
                      </div>
                    </div>
                  ))}
                </TabContent>

                {/* Tab 3: Astrometry & Proper Motion */}
                <TabContent value="astrometry" className="flex-1 overflow-y-auto mt-4 space-y-3 text-xs font-mono">
                  <div className="p-3 rounded-xl bg-space-950/60 border border-white/5 space-y-2">
                    <span className="text-space-400 block">Proper Motion Rate:</span>
                    <span className="text-base text-amber-300 font-bold block">
                      {formatMotionRate(
                        selectedMover.motion.ra_rate_arcsec_per_day,
                        selectedMover.motion.dec_rate_arcsec_per_day
                      )}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-space-300">
                    <div className="p-3 rounded-xl bg-space-950/40 border border-white/5">
                      <span className="text-space-400 block text-[10px]">RA Rate (Δα):</span>
                      <span className="text-white font-bold">{selectedMover.motion.ra_rate_arcsec_per_day.toFixed(1)}&quot;/day</span>
                    </div>
                    <div className="p-3 rounded-xl bg-space-950/40 border border-white/5">
                      <span className="text-space-400 block text-[10px]">Dec Rate (Δδ):</span>
                      <span className="text-white font-bold">{selectedMover.motion.dec_rate_arcsec_per_day.toFixed(1)}&quot;/day</span>
                    </div>
                    <div className="p-3 rounded-xl bg-space-950/40 border border-white/5">
                      <span className="text-space-400 block text-[10px]">Reference RA:</span>
                      <span className="text-white font-bold">{selectedMover.ra.toFixed(4)}°</span>
                    </div>
                    <div className="p-3 rounded-xl bg-space-950/40 border border-white/5">
                      <span className="text-space-400 block text-[10px]">Reference Dec:</span>
                      <span className="text-white font-bold">{selectedMover.dec.toFixed(4)}°</span>
                    </div>
                  </div>
                </TabContent>
              </Tabs>
            </div>
          </div>
        ) : (
          /* =========================================================
             CANDIDATES LIST VIEW
             ========================================================= */
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Filter Pills */}
            <div className="p-4 border-b border-white/10 shrink-0 space-y-3 bg-space-950/40">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-space-100 uppercase tracking-wider font-mono">
                  Detected Movers ({filteredMovers.length})
                </h2>
                <span className="text-xs text-space-400 font-mono">
                  {movers.length} Total
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setFilterType("all")}
                  className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-mono font-medium transition-colors focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                    filterType === "all"
                      ? "bg-space-100 text-space-950 font-bold"
                      : "bg-space-850 hover:bg-space-800 text-space-300"
                  }`}
                >
                  All ({movers.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType("known")}
                  className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-mono font-medium transition-colors focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                    filterType === "known"
                      ? "bg-cyan-500 text-space-950 font-bold"
                      : "bg-cyan-950/60 hover:bg-cyan-900/60 text-cyan-300 border border-cyan-500/30"
                  }`}
                >
                  Known ({knownCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType("unknown")}
                  className={`min-h-[36px] px-3 py-1 rounded-lg text-xs font-mono font-medium transition-colors focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                    filterType === "unknown"
                      ? "bg-amber-500 text-space-950 font-bold"
                      : "bg-amber-950/60 hover:bg-amber-900/60 text-amber-300 border border-amber-500/30"
                  }`}
                >
                  Unknown ({unknownCount})
                </button>
              </div>
            </div>

            {/* Scrollable Cards List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {filteredMovers.length === 0 ? (
                <div className="p-8 text-center text-xs font-mono text-space-400">
                  No movers match current filters.
                </div>
              ) : (
                filteredMovers.map((mover) => {
                  const isKnown = mover.type === "known";
                  return (
                    <Card
                      key={mover.object_id}
                      interactive
                      accent={isKnown ? "cyan" : "amber"}
                      onClick={() => onSelectMover(mover)}
                      className="transition-all"
                    >
                      <CardHeader className="py-3 px-4">
                        <div className="flex items-center justify-between">
                          <Badge variant={isKnown ? "known" : "unknown"} dot size="sm">
                            {isKnown ? "Known" : "Unknown Mover"}
                          </Badge>
                          <span className="text-[11px] font-mono text-space-400">
                            {(mover.confidence * 100).toFixed(0)}% Conf
                          </span>
                        </div>
                        <CardTitle className="text-base text-white">
                          {mover.match_name || mover.object_id}
                        </CardTitle>
                        <CardDescription className="text-[11px]">
                          {formatCoordinates(mover.ra, mover.dec, 3)}
                        </CardDescription>
                      </CardHeader>

                      <CardFooter className="py-2.5 px-4 text-[11px] font-mono flex items-center justify-between">
                        <span className="text-space-400">
                          {formatMotionRate(
                            mover.motion.ra_rate_arcsec_per_day,
                            mover.motion.dec_rate_arcsec_per_day
                          )}
                        </span>
                        <span className={isKnown ? "text-cyan-400 font-medium" : "text-amber-400 font-medium"}>
                          Inspect →
                        </span>
                      </CardFooter>
                    </Card>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
