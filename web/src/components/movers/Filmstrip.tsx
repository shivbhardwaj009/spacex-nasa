"use client";

import React, { useRef, useState } from "react";
import type { MoverCandidate, MoverDetection } from "@/types";
import { computePositionAngle } from "@/lib/motion";

export interface FilmstripProps {
  mover: MoverCandidate;
  selectedEpochId?: string | null;
  onSelectEpoch?: (epochId: string) => void;
  className?: string;
}

/**
 * Format ISO 8601 date to a concise, readable timestamp.
 */
function formatShortDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "UTC",
    }) + " UTC";
  } catch {
    return isoString;
  }
}

export const Filmstrip: React.FC<FilmstripProps> = ({
  mover,
  selectedEpochId,
  onSelectEpoch,
  className = "",
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  const detections = mover.detections || [];

  // Compute position angle for motion vector arrow
  const paDeg = computePositionAngle(
    mover.motion?.ra_rate_arcsec_per_day ?? 0,
    mover.motion?.dec_rate_arcsec_per_day ?? 0
  );

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      const next = (index + 1) % detections.length;
      const target = containerRef.current?.children[next] as HTMLElement | undefined;
      target?.focus();
      if (onSelectEpoch && detections[next]) {
        onSelectEpoch(detections[next].epoch_id);
      }
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      const prev = (index - 1 + detections.length) % detections.length;
      const target = containerRef.current?.children[prev] as HTMLElement | undefined;
      target?.focus();
      if (onSelectEpoch && detections[prev]) {
        onSelectEpoch(detections[prev].epoch_id);
      }
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (onSelectEpoch && detections[index]) {
        onSelectEpoch(detections[index].epoch_id);
      }
    }
  };

  const handleImageError = (epochId: string) => {
    setFailedImages((prev) => ({ ...prev, [epochId]: true }));
  };

  if (detections.length === 0) {
    return (
      <div className="p-4 rounded-lg bg-slate-900/60 border border-slate-800 text-center text-xs text-slate-400">
        No cutout detections available for candidate {mover.object_id}.
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span className="font-semibold uppercase tracking-wider text-[11px] text-slate-300">
          Cutout Time-Lapse ({detections.length} detections)
        </span>
        <span className="text-[11px] text-slate-500">
          Use ←/→ keys to step epochs
        </span>
      </div>

      <div
        ref={containerRef}
        role="list"
        aria-label={`Cutout filmstrip for ${mover.object_id}`}
        className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900 focus:outline-none"
      >
        {detections.map((det: MoverDetection, idx: number) => {
          const isSelected = selectedEpochId === det.epoch_id;
          const hasFailed = failedImages[det.epoch_id];
          const rawUrl = det.cutout_url || "";
          const cutoutSrc = rawUrl.startsWith("/") ? rawUrl : `/${rawUrl}`;

          return (
            <div
              key={det.epoch_id}
              role="listitem"
              tabIndex={0}
              aria-label={`Cutout at epoch ${det.epoch_id}, ${det.date}. ${
                isSelected ? "Currently selected." : "Click to select."
              }`}
              aria-current={isSelected ? "date" : undefined}
              onClick={() => onSelectEpoch?.(det.epoch_id)}
              onKeyDown={(e) => handleKeyDown(e, idx)}
              className={`shrink-0 w-28 flex flex-col rounded-lg overflow-hidden border transition-all cursor-pointer group focus:outline-none focus:ring-2 focus:ring-cyan-400 ${
                isSelected
                  ? "border-cyan-400 bg-cyan-950/40 shadow-md shadow-cyan-950/50 ring-1 ring-cyan-400"
                  : "border-slate-800 bg-slate-900/70 hover:border-slate-700 hover:bg-slate-900"
              }`}
            >
              {/* Image Frame with Motion Vector Arrow */}
              <div className="relative w-28 h-28 bg-slate-950 flex items-center justify-center overflow-hidden">
                {!hasFailed && det.cutout_url ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={cutoutSrc}
                    alt={`Cutout for ${mover.object_id} at epoch ${det.epoch_id}, date ${det.date}`}
                    onError={() => handleImageError(det.epoch_id)}
                    className="w-full h-full object-cover transition-transform group-hover:scale-105 filter contrast-110 brightness-105"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-center p-2 text-slate-500">
                    <span className="text-xl">🌌</span>
                    <span className="text-[10px] mt-1 font-mono">{det.epoch_id}</span>
                    <span className="text-[9px] text-slate-600">Cutout missing</span>
                  </div>
                )}

                {/* Motion Vector Arrow Overlay */}
                <div
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-slate-950/80 border border-slate-700/80 flex items-center justify-center shadow pointer-events-none"
                  title={`Motion angle ${Math.round(paDeg)}°`}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{
                      transform: `rotate(${paDeg}deg)`,
                      transformOrigin: "center center",
                    }}
                    className={mover.type === "known" ? "text-cyan-400" : "text-amber-400"}
                  >
                    <line x1="12" y1="19" x2="12" y2="5" />
                    <polyline points="5 12 12 5 19 12" />
                  </svg>
                </div>

                {/* Epoch index badge */}
                <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-slate-950/80 text-[10px] font-mono text-slate-300 pointer-events-none">
                  #{idx + 1}
                </div>
              </div>

              {/* Epoch Details Footer */}
              <div className="p-1.5 flex flex-col gap-0.5 border-t border-slate-800/80">
                <span className="font-mono text-[11px] font-bold text-slate-200 truncate">
                  {det.epoch_id}
                </span>
                <span className="text-[10px] text-slate-400 truncate">
                  {formatShortDate(det.date)}
                </span>
                {typeof det.flux === "number" && (
                  <span className="text-[9px] font-mono text-slate-500 truncate">
                    Flux: {det.flux.toFixed(1)}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
