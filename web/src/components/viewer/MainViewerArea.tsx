"use client";

import React, { useEffect, useState } from "react";
import { Button, Slider } from "@/components/ui";
import { formatCoordinates } from "@/lib/client";
import type { CandidateCatalog, MoverCandidate } from "@/types";

export interface MainViewerAreaProps {
  catalog: CandidateCatalog | null;
  selectedMover: MoverCandidate | null;
  onSelectMover: (mover: MoverCandidate) => void;
  currentEpochIndex: number;
  onEpochChange: (index: number) => void;
  beginnerMode: boolean;
}

export function MainViewerArea({
  catalog,
  selectedMover,
  onSelectMover,
  currentEpochIndex,
  onEpochChange,
  beginnerMode,
}: MainViewerAreaProps) {
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1000); // ms per frame

  const epochs = catalog?.epochs || [];
  const movers = catalog?.movers || [];
  const region = catalog?.region;
  const currentEpoch = epochs[currentEpochIndex] || epochs[0];

  // Auto-playback loop
  useEffect(() => {
    if (!isPlaying || epochs.length <= 1) return;

    const timer = setInterval(() => {
      onEpochChange((currentEpochIndex + 1) % epochs.length);
    }, playbackSpeed);

    return () => clearInterval(timer);
  }, [isPlaying, epochs.length, playbackSpeed, currentEpochIndex, onEpochChange]);

  // Keyboard navigation for time-lapse
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.code === "Space") {
        e.preventDefault();
        setIsPlaying((p) => !p);
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        onEpochChange(Math.min(epochs.length - 1, currentEpochIndex + 1));
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        onEpochChange(Math.max(0, currentEpochIndex - 1));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [epochs.length, currentEpochIndex, onEpochChange]);

  return (
    <div className="relative flex-1 flex flex-col h-full bg-space-950 overflow-hidden select-none">
      {/* Sky Canvas / Viewer Graphic Area */}
      <div className="relative flex-1 w-full overflow-hidden flex items-center justify-center p-4">
        {/* Deep space celestial background grid */}
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 50% 50%, rgba(34,211,238,0.12) 0%, transparent 70%),
              linear-gradient(to right, rgba(255,255,255,0.06) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255,255,255,0.06) 1px, transparent 1px)`,
            backgroundSize: "100% 100%, 40px 40px, 40px 40px",
          }}
        />

        {/* SPHEREx Field of View Circular Reticle (0.2° default footprint) */}
        <div className="relative h-64 w-64 sm:h-96 sm:w-96 md:h-[480px] md:w-[480px] rounded-full border border-cyan-500/25 flex items-center justify-center shadow-2xl shadow-cyan-950/40">
          {/* Inner reticle circles */}
          <div className="absolute inset-8 rounded-full border border-dashed border-white/10 pointer-events-none" />
          <div className="absolute inset-20 rounded-full border border-white/5 pointer-events-none" />
          <div className="absolute h-full w-px bg-white/10 pointer-events-none" />
          <div className="absolute w-full h-px bg-white/10 pointer-events-none" />

          {/* Celestial Grid Coordinates Labels */}
          <span className="absolute top-2 left-1/2 -translate-x-1/2 text-[10px] font-mono text-space-400 bg-space-950/80 px-1 rounded">
            +N (+δ)
          </span>
          <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] font-mono text-space-400 bg-space-950/80 px-1 rounded">
            -S (-δ)
          </span>
          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-mono text-space-400 bg-space-950/80 px-1 rounded">
            +E (+α)
          </span>
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-mono text-space-400 bg-space-950/80 px-1 rounded">
            -W (-α)
          </span>

          {/* Mover Markers Rendered in Field */}
          {movers.map((mover) => {
            const isKnown = mover.type === "known";
            const isSelected = selectedMover?.object_id === mover.object_id;

            // Compute relative display position from RA/Dec center
            const centerRa = region?.ra_center ?? 269.452;
            const centerDec = region?.dec_center ?? 66.561;
            const radius = region?.radius_deg ?? 0.2;

            // Normalized offsets (-1 to +1)
            const dRa = (mover.ra - centerRa) / (radius || 0.2);
            const dDec = (mover.dec - centerDec) / (radius || 0.2);

            // Clamp into display circle
            const leftPct = 50 - dRa * 40;
            const topPct = 50 - dDec * 40;

            return (
              <button
                key={mover.object_id}
                type="button"
                onClick={() => onSelectMover(mover)}
                aria-label={`Select mover ${mover.object_id}: ${mover.match_name || mover.type}`}
                className={`absolute -translate-x-1/2 -translate-y-1/2 group transition-all duration-300 focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none rounded-full ${
                  isSelected ? "scale-125 z-20" : "hover:scale-110 z-10"
                }`}
                style={{
                  left: `${Math.max(8, Math.min(92, leftPct))}%`,
                  top: `${Math.max(8, Math.min(92, topPct))}%`,
                }}
              >
                {/* Visual marker ring */}
                <div
                  className={`relative h-6 w-6 sm:h-7 sm:w-7 rounded-full flex items-center justify-center border-2 transition-all ${
                    isKnown
                      ? "border-cyan-400 bg-cyan-950/70 shadow-glow-cyan"
                      : "border-amber-400 bg-amber-950/70 shadow-glow-amber animate-pulse"
                  } ${isSelected ? "ring-2 ring-white" : ""}`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      isKnown ? "bg-cyan-300" : "bg-amber-300"
                    }`}
                  />
                </div>

                {/* Hover label */}
                <span
                  className={`absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded text-[10px] font-mono whitespace-nowrap bg-space-950/90 border transition-opacity pointer-events-none shadow-lg ${
                    isKnown
                      ? "border-cyan-500/40 text-cyan-300"
                      : "border-amber-500/40 text-amber-300"
                  } ${isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
                >
                  {mover.match_name || mover.object_id}
                </span>
              </button>
            );
          })}
        </div>

        {/* Top-Left Patch Info Overlay */}
        <div className="absolute top-4 left-4 glass-panel-subtle p-3 rounded-xl max-w-xs space-y-1 text-xs font-mono border border-white/10">
          <div className="flex items-center gap-2">
            <span className="font-bold text-space-100">{region?.name || "SPHEREx Field"}</span>
            <span className="text-[10px] text-space-400 font-normal">
              FoV: {catalog?.fov_deg ?? region?.radius_deg ?? 0.2}°
            </span>
          </div>
          <p className="text-space-300 text-[11px]">
            {region ? formatCoordinates(region.ra_center, region.dec_center) : "RA/Dec Center"}
          </p>
          <div className="flex items-center gap-2 pt-1 border-t border-white/5 text-[10px] text-space-400">
            <span className="flex items-center gap-1 text-cyan-300">
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" /> Known
            </span>
            <span className="flex items-center gap-1 text-amber-300">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" /> Unknown Mover
            </span>
          </div>
          {beginnerMode && (
            <p className="text-[10px] text-cyan-200/80 pt-1">
              Click any mover circle or hit Play to see sky time-lapse!
            </p>
          )}
        </div>

        {/* Top-Right Current Epoch Date Display */}
        {currentEpoch && (
          <div className="absolute top-4 right-4 glass-panel-subtle px-3 py-2 rounded-xl text-xs font-mono border border-white/10 text-right space-y-0.5">
            <div className="text-space-400 text-[10px]">CURRENT TIME-LAPSE EPOCH</div>
            <div className="text-cyan-300 font-bold">
              {currentEpoch.epoch_id.toUpperCase()} • {new Date(currentEpoch.date).toLocaleDateString()}
            </div>
            <div className="text-[10px] text-space-400">
              {currentEpoch.band_count} channels acquired
            </div>
          </div>
        )}
      </div>

      {/* Time-lapse Playback & Scrubber Controls (Footer Bar) */}
      <div className="glass-panel px-4 md:px-6 py-3 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0 z-20">
        {/* Playback Controls */}
        <div className="flex items-center gap-2">
          {/* Step Previous */}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onEpochChange(Math.max(0, currentEpochIndex - 1))}
            disabled={currentEpochIndex === 0}
            aria-label="Previous epoch"
            className="min-h-[44px] min-w-[44px]"
          >
            ⏮
          </Button>

          {/* Play / Pause Toggle */}
          <Button
            variant={isPlaying ? "amber" : "primary"}
            size="md"
            onClick={() => setIsPlaying(!isPlaying)}
            aria-label={isPlaying ? "Pause time-lapse" : "Play time-lapse"}
            className="min-h-[44px] px-4 font-mono font-bold"
          >
            {isPlaying ? "⏸ Pause" : "▶ Play Sky Diary"}
          </Button>

          {/* Step Next */}
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onEpochChange(Math.min(epochs.length - 1, currentEpochIndex + 1))}
            disabled={currentEpochIndex === epochs.length - 1}
            aria-label="Next epoch"
            className="min-h-[44px] min-w-[44px]"
          >
            ⏭
          </Button>
        </div>

        {/* Epoch Range Slider */}
        <div className="flex-1 max-w-md w-full px-2">
          <Slider
            min={0}
            max={Math.max(0, epochs.length - 1)}
            step={1}
            value={currentEpochIndex}
            onChange={onEpochChange}
            formatValue={(idx) =>
              epochs[idx] ? `${epochs[idx].epoch_id} (${new Date(epochs[idx].date).toLocaleDateString()})` : ""
            }
            ticks={epochs.map((ep, idx) => ({
              value: idx,
              label: `Ep ${idx + 1}`,
            }))}
          />
        </div>

        {/* Speed Toggle */}
        <div className="hidden md:flex items-center gap-1.5 text-xs font-mono text-space-400">
          <span>Speed:</span>
          {[
            { label: "0.5x", ms: 1600 },
            { label: "1x", ms: 1000 },
            { label: "2x", ms: 500 },
          ].map((spd) => (
            <button
              key={spd.label}
              type="button"
              onClick={() => setPlaybackSpeed(spd.ms)}
              className={`px-2 py-1 rounded min-h-[36px] transition-colors focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                playbackSpeed === spd.ms
                  ? "bg-cyan-500 text-space-950 font-bold"
                  : "bg-space-950/60 hover:bg-space-850 text-space-300"
              }`}
            >
              {spd.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
