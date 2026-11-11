"use client";

import React, { useState, useMemo, useRef } from "react";
import type { MoverCandidate } from "@/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Slider } from "@/components/ui/Slider";
import { ConfidenceBar } from "./ConfidenceBar";
import { GlossaryTooltip } from "@/components/beginner/GlossaryTooltip";
import { computeTotalRate, computePositionAngle, positionAngleToCompass } from "@/lib/motion";

export type MoverFilterType = "all" | "known" | "unknown";
export type MoverSortKey = "confidence_desc" | "confidence_asc" | "rate_desc" | "name_asc" | "detections_desc";

export interface MoversPanelProps {
  movers: MoverCandidate[];
  selectedId: string | null;
  onSelectMover: (mover: MoverCandidate) => void;
  beginnerMode?: boolean;
  className?: string;
}

export const MoversPanel: React.FC<MoversPanelProps> = ({
  movers,
  selectedId,
  onSelectMover,
  beginnerMode = false,
  className = "",
}) => {
  const [filterType, setFilterType] = useState<MoverFilterType>("all");
  const [minConfidence, setMinConfidence] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortKey, setSortKey] = useState<MoverSortKey>("confidence_desc");

  const listRef = useRef<HTMLDivElement>(null);

  // Filter and sort candidates
  const filteredMovers = useMemo(() => {
    return movers
      .filter((m) => {
        // Classification filter
        if (filterType === "known" && m.type !== "known") return false;
        if (filterType === "unknown" && m.type !== "unknown") return false;

        // Confidence filter
        if (m.confidence < minConfidence) return false;

        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchesId = m.object_id.toLowerCase().includes(q);
          const matchesName = m.match_name ? m.match_name.toLowerCase().includes(q) : false;
          if (!matchesId && !matchesName) return false;
        }

        return true;
      })
      .sort((a, b) => {
        switch (sortKey) {
          case "confidence_desc":
            return b.confidence - a.confidence;
          case "confidence_asc":
            return a.confidence - b.confidence;
          case "rate_desc": {
            const rateA = computeTotalRate(a.motion?.ra_rate_arcsec_per_day ?? 0, a.motion?.dec_rate_arcsec_per_day ?? 0);
            const rateB = computeTotalRate(b.motion?.ra_rate_arcsec_per_day ?? 0, b.motion?.dec_rate_arcsec_per_day ?? 0);
            return rateB - rateA;
          }
          case "detections_desc":
            return (b.detections?.length || 0) - (a.detections?.length || 0);
          case "name_asc": {
            const nameA = a.match_name || a.object_id;
            const nameB = b.match_name || b.object_id;
            return nameA.localeCompare(nameB);
          }
          default:
            return b.confidence - a.confidence;
        }
      });
  }, [movers, filterType, minConfidence, searchQuery, sortKey]);

  // Reset filters helper
  const handleResetFilters = () => {
    setFilterType("all");
    setMinConfidence(0);
    setSearchQuery("");
    setSortKey("confidence_desc");
  };

  // Keyboard navigation across cards
  const handleCardKeyDown = (e: React.KeyboardEvent, index: number, mover: MoverCandidate) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelectMover(mover);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const nextIdx = (index + 1) % filteredMovers.length;
      const target = listRef.current?.children[nextIdx] as HTMLElement | undefined;
      target?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prevIdx = (index - 1 + filteredMovers.length) % filteredMovers.length;
      const target = listRef.current?.children[prevIdx] as HTMLElement | undefined;
      target?.focus();
    }
  };

  return (
    <div className={`flex flex-col h-full bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-xl overflow-hidden shadow-xl text-slate-100 ${className}`}>
      {/* Panel Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/80 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold tracking-wider uppercase text-white flex items-center gap-1.5">
              <span>Detected Movers</span>
              <GlossaryTooltip termKey="motionTrail" beginnerMode={beginnerMode} />
            </h2>
            <span
              aria-live="polite"
              className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700/60"
            >
              {filteredMovers.length} of {movers.length}
            </span>
          </div>

          {/* Quick Filter Tabs */}
          <div className="flex items-center rounded-lg bg-slate-900 border border-slate-800 p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setFilterType("all")}
              aria-pressed={filterType === "all"}
              className={`px-2 py-1 rounded transition-colors ${
                filterType === "all" ? "bg-cyan-900/70 text-cyan-200 font-semibold" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setFilterType("known")}
              aria-pressed={filterType === "known"}
              className={`px-2 py-1 rounded transition-colors ${
                filterType === "known" ? "bg-cyan-900/70 text-cyan-200 font-semibold" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Known
            </button>
            <button
              type="button"
              onClick={() => setFilterType("unknown")}
              aria-pressed={filterType === "unknown"}
              className={`px-2 py-1 rounded transition-colors ${
                filterType === "unknown" ? "bg-amber-900/70 text-amber-200 font-semibold" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Unknown
            </button>
          </div>
        </div>

        {/* Search input & Sort dropdown */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by ID or name..."
              aria-label="Filter movers by ID or name"
              className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                aria-label="Clear search"
                className="absolute right-2 top-1.5 text-xs text-slate-400 hover:text-slate-200"
              >
                ✕
              </button>
            )}
          </div>

          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as MoverSortKey)}
            aria-label="Sort movers list by"
            className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-400"
          >
            <option value="confidence_desc">Confidence (Highest first)</option>
            <option value="confidence_asc">Confidence (Lowest first)</option>
            <option value="rate_desc">Speed / Motion Rate (Fastest)</option>
            <option value="detections_desc">Detections Count (Most)</option>
            <option value="name_asc">Name / Object ID (A - Z)</option>
          </select>
        </div>

        {/* Minimum Confidence Slider */}
        <div className="flex flex-col gap-1 pt-1">
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              Min Confidence: {Math.round(minConfidence * 100)}%
              <GlossaryTooltip termKey="confidence" beginnerMode={beginnerMode} />
            </span>
            {minConfidence > 0 && (
              <button
                type="button"
                onClick={() => setMinConfidence(0)}
                className="text-[10px] text-cyan-400 hover:underline"
              >
                Reset
              </button>
            )}
          </div>
          <Slider
            value={minConfidence}
            min={0}
            max={1}
            step={0.05}
            onChange={setMinConfidence}
            formatValue={(v) => `${Math.round(v * 100)}%`}
            aria-label="Minimum confidence threshold slider"
          />
        </div>
      </div>

      {/* Movers List or Empty State */}
      <div
        ref={listRef}
        role="feed"
        aria-label="List of detected moving candidates"
        className="flex-1 overflow-y-auto p-3 flex flex-col gap-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900 focus:outline-none"
      >
        {filteredMovers.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center text-slate-400">
            <div className="text-3xl mb-2">🔭</div>
            <p className="text-sm font-semibold text-slate-300">No movers match the current filters</p>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              Try lowering the confidence threshold or clearing the search query.
            </p>
            <Button variant="outline" size="sm" onClick={handleResetFilters}>
              Reset Filters
            </Button>
          </div>
        ) : (
          filteredMovers.map((m, idx) => {
            const isSelected = m.object_id === selectedId;
            const isKnown = m.type === "known";
            const firstDet = m.detections?.[0];
            const rawCutout = firstDet?.cutout_url || "";
            const cutoutSrc = rawCutout.startsWith("/") ? rawCutout : `/${rawCutout}`;

            const totalRate = computeTotalRate(
              m.motion?.ra_rate_arcsec_per_day ?? 0,
              m.motion?.dec_rate_arcsec_per_day ?? 0
            );
            const pa = computePositionAngle(
              m.motion?.ra_rate_arcsec_per_day ?? 0,
              m.motion?.dec_rate_arcsec_per_day ?? 0
            );
            const compass = positionAngleToCompass(pa);

            return (
              <article
                key={m.object_id}
                role="article"
                tabIndex={0}
                aria-current={isSelected ? "true" : undefined}
                aria-label={`Mover ${m.object_id}, ${isKnown ? `Known: ${m.match_name}` : "Unknown mover"}, confidence ${Math.round(
                  m.confidence * 100
                )}%, motion ${totalRate.toFixed(1)} arcseconds per day`}
                onClick={() => onSelectMover(m)}
                onKeyDown={(e) => handleCardKeyDown(e, idx, m)}
                className={`flex gap-3 p-2.5 rounded-lg border cursor-pointer transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-cyan-400 select-none ${
                  isSelected
                    ? "border-cyan-400 bg-cyan-950/40 shadow-lg shadow-cyan-950/60 ring-1 ring-cyan-400"
                    : "border-slate-800 bg-slate-900/60 hover:bg-slate-900 hover:border-slate-700"
                }`}
              >
                {/* Thumbnail Cutout from First Detection */}
                <div className="relative w-16 h-16 shrink-0 rounded bg-slate-950 overflow-hidden border border-slate-800 flex items-center justify-center">
                  {rawCutout ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={cutoutSrc}
                      alt={`Thumbnail for ${m.object_id}`}
                      className="w-full h-full object-cover filter contrast-110 brightness-105"
                      loading="lazy"
                    />
                  ) : (
                    <span className="text-xl">🌌</span>
                  )}

                  {/* Motion arrow marker */}
                  <div
                    className="absolute top-1 right-1 w-4 h-4 rounded-full bg-slate-950/80 flex items-center justify-center pointer-events-none"
                    title={`Angle ${Math.round(pa)}°`}
                  >
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{
                        transform: `rotate(${pa}deg)`,
                        transformOrigin: "center center",
                      }}
                      className={isKnown ? "text-cyan-400" : "text-amber-400"}
                    >
                      <line x1="12" y1="19" x2="12" y2="5" />
                      <polyline points="5 12 12 5 19 12" />
                    </svg>
                  </div>
                </div>

                {/* Card Main Info */}
                <div className="flex-1 min-w-0 flex flex-col justify-between gap-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-col min-w-0">
                      <span className="font-mono text-xs font-bold text-white truncate">
                        {m.object_id}
                      </span>
                      <span className="text-[11px] text-cyan-300 font-semibold truncate">
                        {m.match_name || "Unmatched candidate"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <Badge variant={isKnown ? "known" : "unknown"} size="sm">
                        {isKnown ? "Known" : "Unknown"}
                      </Badge>
                      {m.is_synthetic && (
                        <Badge variant="test-data" size="sm">
                          TEST
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Motion rate & Confidence Bar */}
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="font-mono text-slate-300">
                      {totalRate.toFixed(1)} &quot;/d ({compass})
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {m.detections?.length || 0} epochs
                    </span>
                  </div>

                  <ConfidenceBar value={m.confidence} size="sm" showLabel={true} />
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
};
