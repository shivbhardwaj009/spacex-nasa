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
  const [useCanvasFallback, setUseCanvasFallback] = useState<boolean>(() => {
    if (isDemo) return true;
    if (typeof navigator !== "undefined" && !navigator.onLine) return true;
    return false;
  });

  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ x: number; y: number; ra: number; dec: number } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Deterministic realistic star field for canvas/offline/demo mode
  const starsRef = useRef<Array<{ ra: number; dec: number; mag: number; color: string }>>([]);
  if (starsRef.current.length === 0) {
    let seed = 42;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    const colors = ["#ffffff", "#e0f2fe", "#fef3c7", "#fed7aa", "#bae6fd"];
    for (let i = 0; i < 280; i++) {
      starsRef.current.push({
        ra: 269.452 + (rand() - 0.5) * 4.5,
        dec: 66.561 + (rand() - 0.5) * 4.5,
        mag: 1.0 + rand() * 4.0,
        color: colors[Math.floor(rand() * colors.length)],
      });
    }
  }

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

  // Smooth mouse wheel zoom in and zoom out listener
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      // Zoom factor: 0.88 for zoom in, 1.14 for zoom out
      const factor = e.deltaY < 0 ? 0.88 : 1.14;
      const newFov = Math.max(0.01, Math.min(10.0, +(fov * factor).toFixed(4)));

      if (newFov !== fov) {
        onMoveRef.current?.(ra, dec, newFov);
        if (aladinInstanceRef.current && typeof aladinInstanceRef.current.setFov === "function") {
          aladinInstanceRef.current.setFov(newFov);
        }
      }
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [fov, ra, dec]);

  // Render dynamic starfield canvas when in offline/demo/canvas mode
  useEffect(() => {
    if (!useCanvasFallback || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, dimensions.width, dimensions.height);

    // Subtle cosmic radial gradient
    const grad = ctx.createRadialGradient(
      dimensions.width / 2,
      dimensions.height / 2,
      0,
      dimensions.width / 2,
      dimensions.height / 2,
      Math.max(dimensions.width, dimensions.height) / 2
    );
    grad.addColorStop(0, "rgba(6, 182, 212, 0.08)");
    grad.addColorStop(1, "rgba(2, 6, 23, 1)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, dimensions.width, dimensions.height);

    // Dynamic celestial grid lines that scale and pan with FOV
    ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
    ctx.lineWidth = 1;
    const gridSize = Math.max(30, Math.min(120, Math.round(50 / (fov / 0.2))));
    for (let x = (dimensions.width / 2) % gridSize; x < dimensions.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, dimensions.height);
      ctx.stroke();
    }
    for (let y = (dimensions.height / 2) % gridSize; y < dimensions.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(dimensions.width, y);
      ctx.stroke();
    }

    // Draw stars
    const cosDec = Math.cos((dec * Math.PI) / 180);
    const halfFov = fov / 2.0;

    starsRef.current.forEach((star) => {
      const dRa = (star.ra - ra) * cosDec;
      const dDec = star.dec - dec;

      // Astronomy convention: East is Left (-X), North is Up (-Y)
      const sx = dimensions.width / 2 - (dRa / halfFov) * (dimensions.width / 2);
      const sy = dimensions.height / 2 - (dDec / halfFov) * (dimensions.height / 2);

      if (sx >= -10 && sx <= dimensions.width + 10 && sy >= -10 && sy <= dimensions.height + 10) {
        ctx.fillStyle = star.color;
        const radius = Math.max(0.7, Math.min(3.5, star.mag * (0.2 / fov) * 0.75));
        ctx.beginPath();
        ctx.arc(sx, sy, radius, 0, Math.PI * 2);
        ctx.fill();

        if (star.mag > 3.0) {
          ctx.fillStyle = star.color + "22";
          ctx.beginPath();
          ctx.arc(sx, sy, radius * 2.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    });
  }, [ra, dec, fov, dimensions, useCanvasFallback]);

  // Aladin Lite initialization & StrictMode cleanup
  useEffect(() => {
    if (useCanvasFallback || typeof window === "undefined") {
      return;
    }

    let isCancelled = false;
    let aladinInstance: any = null;

    // Shield against unhandled promise rejections from Aladin Lite network requests (e.g. CDS unreachable)
    const handleRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const reasonStr = String(reason?.message || reason || "");
      const stackStr = String(reason?.stack || "");
      const isFetchOrAladin =
        reasonStr.includes("fetch") ||
        reasonStr.includes("NetworkError") ||
        reasonStr.includes("Failed to fetch") ||
        reasonStr.includes("Load failed") ||
        stackStr.includes("aladin") ||
        stackStr.includes("SkyViewer");

      if (isFetchOrAladin) {
        // Prevent Next.js development overlay and browser uncaught error banner
        event.preventDefault();
        if (!isCancelled) {
          console.warn("Aladin Lite network request failed; falling back to offline star-field canvas:", reason);
          setAladinError("Sky survey network connection unavailable. Operating in offline sky view.");
          setUseCanvasFallback(true);
        }
      }
    };

    const handleError = (event: ErrorEvent) => {
      const msg = String(event.message || "");
      if (msg.includes("Failed to fetch") || msg.includes("NetworkError") || msg.includes("aladin")) {
        event.preventDefault();
        if (!isCancelled) {
          console.warn("Aladin error intercepted; falling back to offline canvas:", msg);
          setAladinError("Sky survey network connection unavailable. Operating in offline sky view.");
          setUseCanvasFallback(true);
        }
      }
    };

    window.addEventListener("unhandledrejection", handleRejection);
    window.addEventListener("error", handleError);

    const initAladin = async () => {
      try {
        // Fast probe: check if CDS survey server is reachable before initializing Aladin Lite
        if (typeof navigator !== "undefined" && !navigator.onLine) {
          if (!isCancelled) {
            setAladinError("Offline: CDS sky survey unreachable. Operating in offline sky view.");
            setUseCanvasFallback(true);
          }
          return;
        }

        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 2000);
          await fetch("https://alasky.cds.unistra.fr/DSS/DSSColor/properties", {
            method: "HEAD",
            mode: "no-cors",
            signal: controller.signal,
          });
          clearTimeout(timeoutId);
        } catch {
          if (!isCancelled) {
            console.warn("CDS survey server unreachable. Gracefully switching to offline star-field canvas.");
            setAladinError("CDS survey server unreachable. Operating in offline sky view.");
            setUseCanvasFallback(true);
          }
          return;
        }

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
      window.removeEventListener("unhandledrejection", handleRejection);
      window.removeEventListener("error", handleError);
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

  // Pointer drag-to-pan hand relocation handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    if ((e.target as HTMLElement)?.closest("button, a, input, [role='button']")) return;

    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }

    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      ra,
      dec,
    };
    setIsDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStartRef.current) return;

    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;

    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;

    const cosDec = Math.cos((dragStartRef.current.dec * Math.PI) / 180);
    // East is Left (-X): dragging cursor right (+dx) brings Eastern sky into view -> RA increases
    const raDelta = (dx / dimensions.width) * (fov / (cosDec || 1));
    // North is Up (-Y): dragging cursor down (+dy) brings Northern sky into view -> Dec increases
    const decDelta = (dy / dimensions.height) * fov;

    let newRa = (dragStartRef.current.ra + raDelta) % 360;
    if (newRa < 0) newRa += 360;
    const newDec = Math.max(-89.9, Math.min(89.9, dragStartRef.current.dec + decDelta));

    onMoveRef.current?.(newRa, newDec, fov);

    if (aladinInstanceRef.current && typeof aladinInstanceRef.current.gotoRaDec === "function") {
      aladinInstanceRef.current.gotoRaDec(newRa, newDec);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragStartRef.current) {
      try {
        (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
      dragStartRef.current = null;
    }
    setIsDragging(false);
  };

  const handleDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement)?.closest("button, a, input, [role='button']")) return;
    const factor = e.shiftKey ? 1.5 : 0.65;
    const newFov = Math.max(0.01, Math.min(10.0, +(fov * factor).toFixed(4)));
    onMoveRef.current?.(ra, dec, newFov);
    if (aladinInstanceRef.current && typeof aladinInstanceRef.current.setFov === "function") {
      aladinInstanceRef.current.setFov(newFov);
    }
  };

  return (
    <div
      ref={containerRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onDoubleClick={handleDoubleClick}
      className={`relative w-full h-full bg-space-950 overflow-hidden select-none touch-none ${
        isDragging ? "cursor-grabbing" : "cursor-grab"
      } ${className}`}
      role="region"
      aria-label="Celestial sky view and multi-epoch observation player"
    >
      {/* Dynamic Hand & Pan Cursor Styling Injection for Aladin WebGL Canvas */}
      <style>{`
        #${aladinDivId}, #${aladinDivId} canvas {
          cursor: ${isDragging ? "grabbing" : "grab"} !important;
        }
      `}</style>

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
        <div className="absolute inset-0 w-full h-full z-0 flex items-center justify-center bg-space-950 pointer-events-none">
          <canvas
            ref={canvasRef}
            width={dimensions.width}
            height={dimensions.height}
            className="absolute inset-0 w-full h-full"
          />

          {/* Circular Sky Reticle */}
          <div className="relative h-72 w-72 sm:h-96 sm:w-96 rounded-full border border-cyan-500/30 flex items-center justify-center shadow-2xl shadow-cyan-950/40 pointer-events-none">
            <div className="absolute inset-10 rounded-full border border-dashed border-white/10" />
            <div className="absolute h-full w-px bg-white/10" />
            <div className="absolute w-full h-px bg-white/10" />
            <span className="absolute top-2 text-[10px] font-mono text-space-400">+N</span>
            <span className="absolute bottom-2 text-[10px] font-mono text-space-400">-S</span>
            <span className="absolute left-2 text-[10px] font-mono text-space-400">+E</span>
            <span className="absolute right-2 text-[10px] font-mono text-space-400">-W</span>
          </div>

          {/* Offline/Demo mode notice */}
          <div className="absolute bottom-4 left-4 z-20 px-2.5 py-1 rounded-lg bg-space-900/90 border border-white/10 text-[11px] font-mono text-space-300 pointer-events-none">
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
