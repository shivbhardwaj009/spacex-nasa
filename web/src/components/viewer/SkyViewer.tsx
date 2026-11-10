/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useRef, useState, useId } from "react";
import { DESIGN_TOKENS } from "@/design/tokens";
import { MoverOverlay } from "./MoverOverlay";
import { EpochFrames } from "./EpochFrames";
import type { MoverCandidate, EpochInfo } from "@/types";

export interface SkyViewerProps {
  ra: number;
  dec: number;
  fov: number;
  onMove?: (ra: number, dec: number, fov: number) => void;
  movers: MoverCandidate[];
  selectedObjectId?: string | null;
  epochIndex: number;
  epochs: EpochInfo[];
  onSelect: (objectId: string) => void;
  showTrails?: boolean;
  surveyId?: string;
  isDemo?: boolean;
  className?: string;
}

export function SkyViewer({
  ra,
  dec,
  fov,
  onMove,
  movers,
  selectedObjectId,
  epochIndex,
  epochs,
  onSelect,
  showTrails = true,
  surveyId = DESIGN_TOKENS.surveys.defaultSurveyId,
  isDemo = false,
  className = "",
}: SkyViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const aladinDivId = useId().replace(/:/g, "_");

  const [aladinError, setAladinError] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 500 });
  const [useCanvasFallback, setUseCanvasFallback] = useState(isDemo);

  const aladinInstanceRef = useRef<any>(null);
  const isUpdatingFromProps = useRef(false);
  const onMoveRef = useRef(onMove);
  onMoveRef.current = onMove;

  // ResizeObserver to track container dimensions for accurate marker projection
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setDimensions({
          width: Math.max(300, entry.contentRect.width),
          height: Math.max(300, entry.contentRect.height),
        });
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Update canvas fallback if isDemo changes
  useEffect(() => {
    if (isDemo) {
      setUseCanvasFallback(true);
    }
  }, [isDemo]);

  // Aladin Lite initialization & StrictMode cleanup
  useEffect(() => {
    if (useCanvasFallback || typeof window === "undefined") {
      return;
    }

    let isCancelled = false;
    let aladinInstance: any = null;

    const initAladin = async () => {
      try {
        const aladinModule = await import("aladin-lite");
        const A = (aladinModule as any).default || aladinModule;

        if (isCancelled) return;

        // Ensure target container exists
        const targetElement = document.getElementById(aladinDivId);
        if (!targetElement) return;

        // Clean any existing children in container to prevent duplicate WebGL canvases
        targetElement.innerHTML = "";

        // Wait for library ready
        if (A.init && typeof A.init.then === "function") {
          await A.init;
        }

        if (isCancelled) return;

        // TODO(VERIFY): Aladin Lite v3 initialization options and survey ID
        aladinInstance = A.aladin(`#${aladinDivId}`, {
          survey: surveyId,
          fov: fov,
          target: `${ra} ${dec}`,
          showCooGrid: true,
          showCooGridControl: false,
          showFullscreenControl: false,
          showLayersControl: false,
          showGotoControl: false,
          showShareControl: false,
          showSimbadPointerControl: false,
          cooFrame: "equatorial",
        });

        aladinInstanceRef.current = aladinInstance;

        // Listen for pan and zoom events
        if (aladinInstance && typeof aladinInstance.on === "function") {
          aladinInstance.on("positionChanged", () => {
            if (isUpdatingFromProps.current || !onMoveRef.current) return;
            const [curRa, curDec] = aladinInstance.getRaDec();
            const curFov = aladinInstance.getFov()[0];
            onMoveRef.current(curRa, curDec, curFov);
          });

          aladinInstance.on("zoomChanged", (newFov: any) => {
            if (isUpdatingFromProps.current || !onMoveRef.current) return;
            const [curRa, curDec] = aladinInstance.getRaDec();
            onMoveRef.current(curRa, curDec, newFov);
          });
        }

        setAladinError(null);
      } catch (err: unknown) {
        if (!isCancelled) {
          const msg = err instanceof Error ? err.message : "Aladin Lite initialization failed";
          setAladinError(msg);
          setUseCanvasFallback(true); // Fallback to offline canvas
        }
      }
    };

    initAladin();

    // Cleanup on unmount (React Strict Mode safe)
    return () => {
      isCancelled = true;
      if (aladinInstanceRef.current) {
        try {
          if (typeof aladinInstanceRef.current.destroy === "function") {
            aladinInstanceRef.current.destroy();
          }
        } catch {
          // ignore
        }
        aladinInstanceRef.current = null;
      }
      const el = document.getElementById(aladinDivId);
      if (el) el.innerHTML = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aladinDivId, surveyId, useCanvasFallback]);

  // Synchronize incoming RA, Dec, FoV props to Aladin instance without loops
  useEffect(() => {
    const inst = aladinInstanceRef.current;
    if (!inst) return;

    try {
      isUpdatingFromProps.current = true;
      inst.gotoRaDec(ra, dec);
      inst.setFov(fov);
    } catch {
      // ignore
    } finally {
      setTimeout(() => {
        isUpdatingFromProps.current = false;
      }, 50);
    }
  }, [ra, dec, fov]);

  const currentEpoch = epochs[epochIndex] || null;

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full bg-space-950 overflow-hidden select-none ${className}`}
      role="region"
      aria-label="Celestial sky view and multi-epoch observation player"
    >
      {/* 1. Aladin Lite WebGL Canvas Mount Container */}
      {!useCanvasFallback && (
        <div
          id={aladinDivId}
          className="absolute inset-0 w-full h-full z-0"
          style={{ width: "100%", height: "100%" }}
        />
      )}

      {/* 2. Offline Fallback Plain Star-Field Canvas (Used in Demo mode or when Aladin fails) */}
      {useCanvasFallback && (
        <div
          className="absolute inset-0 w-full h-full z-0 flex items-center justify-center bg-space-950"
          style={{
            backgroundImage: `radial-gradient(circle at 50% 50%, rgba(34,211,238,0.08) 0%, transparent 75%),
              linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)`,
            backgroundSize: "100% 100%, 50px 50px, 50px 50px",
          }}
        >
          {/* Circular Sky Reticle */}
          <div className="relative h-72 w-72 sm:h-96 sm:w-96 rounded-full border border-cyan-500/30 flex items-center justify-center shadow-2xl shadow-cyan-950/40">
            <div className="absolute inset-10 rounded-full border border-dashed border-white/10" />
            <div className="absolute h-full w-px bg-white/10" />
            <div className="absolute w-full h-px bg-white/10" />
            <span className="absolute top-2 text-[10px] font-mono text-space-400">+N</span>
            <span className="absolute bottom-2 text-[10px] font-mono text-space-400">-S</span>
            <span className="absolute left-2 text-[10px] font-mono text-space-400">+E</span>
            <span className="absolute right-2 text-[10px] font-mono text-space-400">-W</span>
          </div>

          {/* Offline/Demo mode notice */}
          <div className="absolute bottom-4 left-4 z-20 px-2.5 py-1 rounded-lg bg-space-900/90 border border-white/10 text-[11px] font-mono text-space-300">
            {isDemo ? (
              <span className="text-amber-300 font-bold">● Offline Demo Mode (Plain Canvas)</span>
            ) : (
              <span className="text-cyan-300">
                {aladinError ? "Aladin unavailable - Running Offline Canvas" : "Offline Star-Field Canvas"}
              </span>
            )}
          </div>
        </div>
      )}

      {/* 3. Display-Ready SPHEREx Epoch Frame Overlay */}
      <EpochFrames
        epochIndex={epochIndex}
        opacity={0.75}
        isDemo={isDemo}
        className="absolute inset-0 z-10 pointer-events-none"
      />

      {/* 4. Moving Object Markers & Trails Layer */}
      <MoverOverlay
        movers={movers}
        currentEpoch={currentEpoch}
        currentEpochIndex={epochIndex}
        selectedObjectId={selectedObjectId}
        onSelect={onSelect}
        showTrails={showTrails}
        centerRa={ra}
        centerDec={dec}
        fovDeg={fov}
        containerWidth={dimensions.width}
        containerHeight={dimensions.height}
        className="z-20"
      />

      {/* 5. Sky Coordinates Overlay Badge */}
      <div className="absolute top-3 right-3 z-30 px-2.5 py-1.5 rounded-xl bg-space-950/85 backdrop-blur-md border border-white/10 text-right text-xs font-mono pointer-events-none space-y-0.5">
        <div className="text-[10px] text-space-400">POINTING (J2000)</div>
        <div className="text-cyan-300 font-bold">
          RA {ra.toFixed(4)}° • Dec {dec >= 0 ? `+${dec.toFixed(4)}` : dec.toFixed(4)}°
        </div>
        <div className="text-[10px] text-space-400">FoV: {fov.toFixed(2)}°</div>
      </div>
    </div>
  );
}
