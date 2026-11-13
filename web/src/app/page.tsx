"use client";

import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { AppHeader } from "@/components/layout/AppHeader";
import { SidePanel } from "@/components/layout/SidePanel";
import { SearchBox, FovControl } from "@/components/viewer";
import { TimeBar, BlinkComparator } from "@/components/time";
import { Button, Card, TestDataBadge, ErrorBoundary, Tooltip } from "@/components/ui";
import { BeginnerTour, DemoTourBar } from "@/components/beginner";
import { ShareModal } from "@/components/share";
import { useCandidateCatalog } from "@/lib/client";
import { useUrlState } from "@/lib/useUrlState";

// Dynamically import SkyViewer with ssr: false (Aladin Lite is browser-only)
const DynamicSkyViewer = dynamic(
  () => import("@/components/viewer/SkyViewer").then((mod) => mod.SkyViewer),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-space-950 text-xs font-mono text-cyan-300">
        Initializing Celestial Viewport...
      </div>
    ),
  }
);

export default function SkyDiaryApp() {
  const [urlState, setUrlState] = useUrlState();
  const [beginnerMode, setBeginnerMode] = useState<boolean>(true);
  const [isTourOpen, setIsTourOpen] = useState<boolean>(false);
  const [isDemoTourOpen, setIsDemoTourOpen] = useState<boolean>(false);
  const [isGlobalShareOpen, setIsGlobalShareOpen] = useState<boolean>(false);
  const [isTimeControlsOpen, setIsTimeControlsOpen] = useState<boolean>(false);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);

  // Keyboard shortcut '/' to trigger search dialog
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && !["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault();
        setIsSearchOpen(true);
      } else if (e.key === "Escape") {
        setIsSearchOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Load curated offline demo data in demo mode, or master dataset
  const dataUrl = urlState.demo ? "/demo/candidates.json" : "/data/candidates.json";
  const { data: catalog, loading, error, isSynthetic, reload } = useCandidateCatalog(dataUrl);

  const epochs = catalog?.epochs || [];
  const movers = catalog?.movers || [];

  // Find selected mover from URL state or null
  const selectedMover = urlState.object
    ? movers.find((m) => m.object_id === urlState.object) || null
    : null;

  const handleSelectObjectId = (objectId: string) => {
    const isDesel = objectId === urlState.object;
    if (isDesel) {
      setUrlState({ object: null });
    } else {
      const match = movers.find((m) => m.object_id === objectId);
      setUrlState({
        object: objectId,
        ...(match ? { ra: match.ra, dec: match.dec } : {}),
      });
    }
  };

  const handleSearchCoordinate = (coords: { ra: number; dec: number; fov?: number }) => {
    setUrlState({
      ra: coords.ra,
      dec: coords.dec,
      ...(coords.fov ? { fov: coords.fov } : {}),
    });
  };

  /* =========================================================
     LOADING STATE
     ========================================================= */
  if (loading) {
    return (
      <div className="min-h-screen bg-space-950 flex flex-col items-center justify-center p-6 text-center space-y-6">
        <div className="relative">
          <div className="h-20 w-20 rounded-full border-2 border-cyan-500/30 border-t-cyan-400 animate-spin" />
          <div className="absolute inset-3 rounded-full border-2 border-amber-500/20 border-b-amber-400 animate-spin [animation-direction:reverse]" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="h-3 w-3 rounded-full bg-cyan-400 animate-ping" />
          </div>
        </div>

        <div className="space-y-2 max-w-sm">
          <h2 className="text-xl font-bold text-white font-sans">
            Calibrating SPHEREx Sky Diary
          </h2>
          <p className="text-xs text-space-400 font-mono">
            Loading multi-epoch cutouts, 102-channel spectrophotometry, and trajectory catalogs...
          </p>
        </div>
      </div>
    );
  }

  /* =========================================================
     ERROR STATE
     ========================================================= */
  if (error || !catalog) {
    return (
      <div className="min-h-screen bg-space-950 flex flex-col items-center justify-center p-6 text-center">
        <Card className="max-w-md w-full border-slate-800 p-6 space-y-4 bg-slate-950/90">
          <div className="h-12 w-12 rounded-full bg-slate-900 border border-slate-700 mx-auto flex items-center justify-center text-slate-300 text-xl font-medium">
            !
          </div>

          <div className="space-y-2">
            <h2 className="text-base font-semibold text-white">
              Data Pipeline Error
            </h2>
            <p className="text-xs text-slate-400 font-mono">
              {error || "Could not load candidate data catalog"}
            </p>
          </div>

          <p className="text-xs text-space-400">
            Verify that the offline pipeline or mock generator has executed and generated
            a valid schema v1.0 candidate catalog.
          </p>

          <Button variant="primary" onClick={reload} className="w-full">
            Retry Connection
          </Button>
        </Card>
      </div>
    );
  }

  /* =========================================================
     EMBED MODE (embed=1: Minimal chrome for iframes)
     ========================================================= */
  if (urlState.embed) {
    return (
      <div className="h-screen w-screen relative overflow-hidden bg-space-950">
        {/* Global TEST DATA Badge in embed view */}
        {isSynthetic && (
          <div className="absolute top-3 left-3 z-30">
            <TestDataBadge />
          </div>
        )}

        <ErrorBoundary fallbackTitle="Embedded Viewer Error">
          <DynamicSkyViewer
            ra={urlState.ra}
            dec={urlState.dec}
            fov={urlState.fov}
            onMove={(ra, dec, fov) => setUrlState({ ra, dec, fov })}
            movers={movers}
            selectedObjectId={urlState.object}
            epochIndex={urlState.epoch}
            epochs={epochs}
            onSelect={handleSelectObjectId}
            showTrails={urlState.trails}
            isDemo={urlState.demo}
          />
        </ErrorBoundary>

        {/* Embedded Time-lapse footer */}
        <div className="absolute bottom-3 inset-x-3 z-30">
          <TimeBar
            epochs={epochs}
            currentEpochIndex={urlState.epoch}
            onEpochChange={(epoch) => setUrlState({ epoch })}
          />
        </div>
      </div>
    );
  }

  /* =========================================================
     FULL APPLICATION SHELL (Ultra-Minimal NASA Eyes Style)
     ========================================================= */
  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-black text-white select-none relative">
      {/* 1. NASA Eyes Top Minimalist Header */}
      <AppHeader
        isSynthetic={isSynthetic}
        beginnerMode={beginnerMode}
        onToggleBeginnerMode={() => setBeginnerMode(!beginnerMode)}
        candidateCount={catalog.movers.length}
        onOpenTour={() => setIsTourOpen(true)}
        onOpenShare={() => setIsGlobalShareOpen(true)}
        onOpenSearch={() => setIsSearchOpen(true)}
        activeTargetName={catalog?.region?.name || "SPHEREx NEP Field"}
        isDemo={urlState.demo}
        onToggleDemo={() => setUrlState({ demo: !urlState.demo })}
      />

      {/* Demo Mode Honesty Banner (Slim & Unobtrusive) */}
      {urlState.demo && (
        <div className="w-full bg-amber-950/70 border-b border-amber-500/20 py-1 px-6 text-center text-[11px] font-mono text-amber-200/90 flex items-center justify-between gap-2 z-40 shrink-0">
          <div className="flex items-center gap-2 truncate">
            <span className="text-amber-400">⚠</span>
            <span className="truncate">
              DEMO BENCHMARK: SPHEREx Deep Field North (Synthetic Dataset).
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsDemoTourOpen(true)}
            className="text-[10px] uppercase tracking-wider text-amber-300 hover:text-white px-2 py-0.5 rounded border border-amber-500/30 hover:bg-amber-500/20 shrink-0 font-sans cursor-pointer"
          >
            ▶ Pitch Tour
          </button>
        </div>
      )}

      {/* 2. Main NASA Eyes Workspace */}
      <main className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* Left Floating SidePanel (NASA Eyes layout) */}
        <ErrorBoundary fallbackTitle="Movers Panel Error">
          <SidePanel
            movers={movers}
            selectedMover={selectedMover}
            onSelectMover={(mover) => {
              if (mover) {
                setUrlState({
                  object: mover.object_id,
                  ra: mover.ra,
                  dec: mover.dec,
                });
              } else {
                setUrlState({ object: null });
              }
            }}
            beginnerMode={beginnerMode}
            selectedEpochId={epochs[urlState.epoch]?.epoch_id}
            onSelectEpoch={(epochId) => {
              const idx = epochs.findIndex((e) => e.epoch_id === epochId);
              if (idx !== -1) {
                setUrlState({ epoch: idx });
              }
            }}
            regionName={catalog?.region?.name}
          />
        </ErrorBoundary>

        {/* Center / Full-Bleed Sky Canvas & HUD Overlays */}
        <div className="flex-1 flex flex-col h-full overflow-hidden relative">
          {/* Fallback Notice Banner if URL params were invalid */}
          {urlState.fallbackNotice && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-40 px-3 py-1 rounded-lg bg-amber-950/80 border border-amber-500/50 text-[11px] font-mono text-amber-200 shadow-xl">
              {urlState.fallbackNotice}
            </div>
          )}

          {/* Interactive Celestial Sky Canvas */}
          <div className="flex-1 relative w-full h-full overflow-hidden">
            <ErrorBoundary fallbackTitle="Sky Viewer Error">
              <DynamicSkyViewer
                ra={urlState.ra}
                dec={urlState.dec}
                fov={urlState.fov}
                onMove={(ra, dec, fov) => setUrlState({ ra, dec, fov })}
                movers={movers}
                selectedObjectId={urlState.object}
                epochIndex={urlState.epoch}
                epochs={epochs}
                onSelect={handleSelectObjectId}
                showTrails={urlState.trails}
                isDemo={urlState.demo}
              />
            </ErrorBoundary>

            {/* Field of View Floating Preset Overlay */}
            <div className="absolute top-3 left-3 z-30 max-w-xs">
              <FovControl
                fov={urlState.fov}
                onFovChange={(newFov) => setUrlState({ fov: newFov })}
              />
            </div>

            {/* Right Vertical Minimal Tool Strip (NASA Eyes Palette) */}
            <div className="absolute right-4 bottom-24 z-30 flex flex-col gap-2.5 p-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white/70 shadow-2xl">
              <Tooltip content={selectedMover ? "Close Details" : "Mover Details"} position="left">
                <button
                  type="button"
                  onClick={() => setUrlState({ object: selectedMover ? null : movers[0]?.object_id })}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                    selectedMover ? "text-cyan-400 font-bold bg-white/10" : "hover:text-white hover:bg-white/10"
                  }`}
                  aria-label="Object Info"
                >
                  <span className="text-xs font-serif italic">ⓘ</span>
                </button>
              </Tooltip>

              <Tooltip content={urlState.trails ? "Hide Trails" : "Show Trails"} position="left">
                <button
                  type="button"
                  onClick={() => setUrlState({ trails: !urlState.trails })}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                    urlState.trails ? "text-cyan-400 bg-white/10" : "hover:text-white hover:bg-white/10"
                  }`}
                  aria-label="Toggle Trails"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                  </svg>
                </button>
              </Tooltip>

              <Tooltip content="Zoom In" position="left">
                <button
                  type="button"
                  onClick={() => setUrlState({ fov: Math.max(0.02, +(urlState.fov * 0.7).toFixed(3)) })}
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:text-white hover:bg-white/10 transition-colors font-mono font-bold text-sm cursor-pointer"
                  aria-label="Zoom In"
                >
                  +
                </button>
              </Tooltip>

              <Tooltip content="Zoom Out" position="left">
                <button
                  type="button"
                  onClick={() => setUrlState({ fov: Math.min(5.0, +(urlState.fov * 1.4).toFixed(3)) })}
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:text-white hover:bg-white/10 transition-colors font-mono font-bold text-sm cursor-pointer"
                  aria-label="Zoom Out"
                >
                  −
                </button>
              </Tooltip>

              <Tooltip content={urlState.mode === "viewer" ? "Blink Mode" : "Sky Mode"} position="left">
                <button
                  type="button"
                  onClick={() => setUrlState({ mode: urlState.mode === "viewer" ? "blink" : "viewer" })}
                  className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
                    urlState.mode === "blink" ? "text-cyan-400 bg-white/10" : "hover:text-white hover:bg-white/10"
                  }`}
                  aria-label="Toggle Blink Mode"
                >
                  ⚡
                </button>
              </Tooltip>

              <Tooltip content="Fullscreen" position="left">
                <button
                  type="button"
                  onClick={() => {
                    if (typeof document !== "undefined") {
                      if (!document.fullscreenElement) {
                        document.documentElement.requestFullscreen().catch(() => {});
                      } else {
                        document.exitFullscreen().catch(() => {});
                      }
                    }
                  }}
                  className="w-8 h-8 rounded-full flex items-center justify-center hover:text-white hover:bg-white/10 transition-colors text-xs cursor-pointer"
                  aria-label="Toggle Fullscreen"
                >
                  ⤢
                </button>
              </Tooltip>
            </div>

            {/* Bottom-Left NASA Eyes "● LIVE" Indicator (Exact Match to Photo) */}
            <div className="absolute bottom-6 left-6 z-20 flex items-center gap-2 select-none pointer-events-none">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400 animate-pulse" />
              <span className="text-xs font-sans font-bold tracking-widest text-emerald-400 uppercase">
                LIVE
              </span>
            </div>

            {/* Bottom-Center Minimal TIME CONTROLS (Exact Match to Photo) */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center pointer-events-auto">
              <button
                type="button"
                onClick={() => setIsTimeControlsOpen(!isTimeControlsOpen)}
                className="group flex flex-col items-center gap-0.5 text-white/70 hover:text-white transition-colors cursor-pointer select-none py-1 px-3"
                aria-expanded={isTimeControlsOpen}
                aria-label="Toggle Time Controls Drawer"
              >
                <svg
                  className={`w-3.5 h-3.5 text-white/50 group-hover:text-white transition-transform ${isTimeControlsOpen ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                </svg>
                <span className="text-[10px] md:text-xs font-sans tracking-widest uppercase font-medium">
                  TIME CONTROLS
                </span>
              </button>

              {/* Sliding Drawer Container */}
              {isTimeControlsOpen && (
                <div className="mt-2 w-[92vw] max-w-3xl p-3 rounded-2xl bg-black/85 backdrop-blur-xl border border-white/10 shadow-2xl">
                  {urlState.mode === "viewer" ? (
                    <TimeBar
                      epochs={epochs}
                      currentEpochIndex={urlState.epoch}
                      onEpochChange={(epoch) => setUrlState({ epoch })}
                    />
                  ) : (
                    <BlinkComparator
                      epochs={epochs}
                      currentEpochIndex={urlState.epoch}
                      onEpochChange={(epoch) => setUrlState({ epoch })}
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Floating Spotlight Search Dialog (Hotkeyed to / or Q) */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/75 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={() => setIsSearchOpen(false)} />
          <div className="relative w-full max-w-xl p-4 rounded-2xl bg-[#0a0f1d] border border-white/15 shadow-2xl z-10 space-y-3">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="text-xs uppercase tracking-widest text-space-300 font-mono font-semibold">
                Target &amp; Coordinate Search
              </span>
              <button
                type="button"
                onClick={() => setIsSearchOpen(false)}
                className="text-white/40 hover:text-white font-mono text-xs px-2 cursor-pointer"
              >
                ESC
              </button>
            </div>
            <SearchBox
              onCoordinateSelect={(coords) => {
                handleSearchCoordinate(coords);
                setIsSearchOpen(false);
              }}
              isDemo={urlState.demo}
            />
          </div>
        </div>
      )}

      {/* Guided Tour Walkthrough Dialog */}
      <BeginnerTour
        isOpen={isTourOpen}
        onClose={() => setIsTourOpen(false)}
      />

      {/* 3-Minute Demo Pitch Automated Tour Bar */}
      <DemoTourBar
        isOpen={isDemoTourOpen}
        onClose={() => setIsDemoTourOpen(false)}
        onApplyState={(newState) => setUrlState(newState)}
      />

      {/* Global Share Dialog */}
      <ShareModal
        isOpen={isGlobalShareOpen}
        onClose={() => setIsGlobalShareOpen(false)}
        mover={selectedMover}
        regionName={catalog?.region?.name}
      />
    </div>
  );
}
