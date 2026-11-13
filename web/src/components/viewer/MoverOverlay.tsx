"use client";

import React from "react";
import type { MoverCandidate, EpochInfo, Detection } from "@/types";

export interface MoverOverlayProps {
  movers: MoverCandidate[];
  currentEpoch: EpochInfo | null;
  currentEpochIndex: number;
  selectedObjectId?: string | null;
  onSelect: (objectId: string) => void;
  showTrails?: boolean;
  centerRa: number;
  centerDec: number;
  fovDeg: number;
  containerWidth: number;
  containerHeight: number;
  className?: string;
}

export function MoverOverlay({
  movers,
  currentEpoch,
  currentEpochIndex,
  selectedObjectId,
  onSelect,
  showTrails = true,
  centerRa,
  centerDec,
  fovDeg,
  containerWidth,
  containerHeight,
  className = "",
}: MoverOverlayProps) {
  if (!containerWidth || !containerHeight || fovDeg <= 0) {
    return null;
  }

  const cosDec = Math.cos((centerDec * Math.PI) / 180);
  const halfFov = fovDeg / 2.0;

  // Transform celestial (RA, Dec) into 2D container pixel coordinates (TAN projection approx)
  const skyToPixel = (ra: number, dec: number): { x: number; y: number; inBounds: boolean } => {
    const dRa = (ra - centerRa) * cosDec;
    const dDec = dec - centerDec;

    // Standard astronomy display: East is Left (-x), North is Up (-y)
    const x = containerWidth / 2 - (dRa / halfFov) * (containerWidth / 2);
    const y = containerHeight / 2 - (dDec / halfFov) * (containerHeight / 2);

    const inBounds = x >= 0 && x <= containerWidth && y >= 0 && y <= containerHeight;
    return { x, y, inBounds };
  };

  const isCrowded = movers.length > 12;

  return (
    <div
      className={`absolute inset-0 pointer-events-none overflow-hidden ${className}`}
      role="region"
      aria-label="Moving object detections and trajectories overlay"
    >
      {/* SVG Motion Trails Layer */}
      {showTrails && (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <marker
              id="arrow-cyan"
              viewBox="0 0 10 10"
              refX="6"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#22d3ee" />
            </marker>
            <marker
              id="arrow-amber"
              viewBox="0 0 10 10"
              refX="6"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#fbbf24" />
            </marker>
          </defs>

          {movers.map((mover) => {
            const isKnown = mover.type === "known";
            const isSelected = selectedObjectId === mover.object_id;

            // Collect historical detections up to current epoch
            const pastDetections = (mover.detections || []).slice(0, currentEpochIndex + 1);
            if (pastDetections.length < 2) return null;

            const points = pastDetections.map((det) => skyToPixel(det.ra, det.dec));
            const pathData = points
              .map((pt, i) => `${i === 0 ? "M" : "L"} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`)
              .join(" ");

            return (
              <path
                key={`trail-${mover.object_id}`}
                d={pathData}
                fill="none"
                stroke={isKnown ? "#22d3ee" : "#fbbf24"}
                strokeWidth={isSelected ? 2.5 : 1.5}
                strokeDasharray={isKnown ? "none" : "4 2"}
                strokeOpacity={isSelected ? 0.95 : 0.65}
                markerEnd={isKnown ? "url(#arrow-cyan)" : "url(#arrow-amber)"}
              />
            );
          })}
        </svg>
      )}

      {/* HTML Markers Layer */}
      {movers.map((mover) => {
        const isKnown = mover.type === "known";
        const isSelected = selectedObjectId === mover.object_id;

        // Check if there is a detection at the current epoch
        const currentDet: Detection | undefined = mover.detections?.find(
          (d) => d.epoch_id === currentEpoch?.epoch_id
        );

        let targetRa = mover.ra;
        let targetDec = mover.dec;
        let isPredicted = false;

        if (currentDet) {
          targetRa = currentDet.ra;
          targetDec = currentDet.dec;
        } else {
          // Extrapolate predicted position using motion vector
          isPredicted = true;
          const dtDays = currentEpochIndex * 1.0;
          targetRa = mover.ra + (mover.motion.ra_rate_arcsec_per_day * dtDays) / (3600 * cosDec);
          targetDec = mover.dec + (mover.motion.dec_rate_arcsec_per_day * dtDays) / 3600;
        }

        const { x, y, inBounds } = skyToPixel(targetRa, targetDec);
        if (!inBounds) return null;

        const showLabel = !isCrowded || isSelected;

        return (
          <div
            key={`marker-${mover.object_id}`}
            style={{
              transform: `translate3d(${x}px, ${y}px, 0)`,
            }}
            className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 group pointer-events-auto"
          >
            <button
              type="button"
              onClick={() => onSelect(mover.object_id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect(mover.object_id);
                }
              }}
              aria-label={`${isKnown ? "Known object" : "Unknown mover"} ${mover.match_name || mover.object_id}${
                isPredicted ? " (Predicted position)" : ""
              }`}
              className={`relative flex items-center justify-center transition-all duration-150 focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none ${
                isSelected ? "scale-125 z-30" : "hover:scale-110 z-10"
              }`}
            >
              {/* Shape Cue: Circle for Known vs Diamond for Unknown */}
              {isKnown ? (
                /* Circle for Known Asteroid / Comet */
                <div
                  className={`h-6 w-6 rounded-full border-2 flex items-center justify-center transition-all ${
                    isPredicted
                      ? "border-dashed border-cyan-400/50 bg-cyan-950/30 opacity-60"
                      : "border-cyan-400 bg-cyan-950/80 shadow-glow-cyan"
                  } ${isSelected ? "ring-2 ring-white" : ""}`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" />
                </div>
              ) : (
                /* Diamond (Rotated Square) for Unknown / Planet X Candidate */
                <div
                  className={`h-6 w-6 rotate-45 border-2 flex items-center justify-center transition-all ${
                    isPredicted
                      ? "border-dashed border-amber-400/50 bg-amber-950/30 opacity-60"
                      : "border-amber-400 bg-amber-950/80 shadow-glow-amber animate-pulse"
                  } ${isSelected ? "ring-2 ring-white" : ""}`}
                >
                  <span className="h-1.5 w-1.5 bg-amber-300 -rotate-45" />
                </div>
              )}

              {/* Synthetic TEST Badge */}
              {mover.is_synthetic && (
                <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded text-[8px] font-mono font-medium bg-slate-900/90 text-slate-300 border border-slate-700 leading-none tracking-wider">
                  TEST
                </span>
              )}

              {/* Hover / Selection Label */}
              <div
                className={`absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded text-[10px] font-mono whitespace-nowrap bg-space-950/95 border transition-opacity pointer-events-none shadow-xl flex items-center gap-1.5 ${
                  isKnown ? "border-cyan-500/50 text-cyan-300" : "border-amber-500/50 text-amber-300"
                } ${
                  showLabel
                    ? isSelected
                      ? "opacity-100 z-30"
                      : "opacity-0 group-hover:opacity-100 z-20"
                    : "opacity-0 group-hover:opacity-100 z-20"
                }`}
              >
                {/* Non-colour icon badge */}
                <span className="text-[11px] leading-none" aria-hidden="true">
                  {isKnown ? "●" : "◆"}
                </span>
                <span className="font-bold">{mover.match_name || mover.object_id}</span>
                {isPredicted && <span className="text-space-400 text-[9px]">[PREDICTED]</span>}
              </div>
            </button>
          </div>
        );
      })}
    </div>
  );
}

