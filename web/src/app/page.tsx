"use client";

import React, { useState } from "react";
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
  const [isTimeControlsOpen, setIsTimeControlsOpen] = useState<boolean>(true);

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
        <Card className="max-w-md w-full border-rose-500/40 p-6 space-y-4">
          <div className="h-12 w-12 rounded-full bg-rose-950/80 border border-rose-500/60 mx-auto flex items-center justify-center text-rose-400 text-xl font-bold">
            !
          </div>

          <div className="space-y-2">
            <h2 className="text-lg font-bold text-white">
              Data Pipeline Error
            </h2>
            <p className="text-xs text-rose-300 font-mono">
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
     FULL APPLICATION SHELL
     ========================================================= */
  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-space-950">
      {/* 1. Top Bar */}
      <AppHeader
        isSynthetic={isSynthetic}
        beginnerMode={beginnerMode}
        onToggleBeginnerMode={() => setBeginnerMode(!beginnerMode)}
        searchQuery=""
        onSearchChange={() => {}}
        onSearchSubmit={(e) => e.preventDefault()}
        candidateCount={catalog.movers.length}
        onOpenTour={() => setIsTourOpen(true)}
        onOpenShare={() => setIsGlobalShareOpen(true)}
      />

      {/* Demo Mode Honesty Banner */}
      {urlState.demo && (
        <div className="w-full bg-amber-950/90 border-b border-amber-500/50 py-1.5 px-4 text-center text-xs font-mono text-amber-200 flex items-center justify-between gap-2 z-40 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-amber-400 font-bold shrink-0">⚠</span>
            <span className="truncate">
              DEMO MODE ACTIVE: Using offline synthetic benchmark data (SPHEREx Deep Field North). TEST DATA badge active on all views.
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsDemoTourOpen(true)}
            className="text-xs py-0.5 px-2.5 min-h-[28px] border-amber-500/50 text-amber-300 hover:border-amber-400 shrink-0"
          >
            ▶ 3-Min Pitch Tour
          </Button>
        </div>
      )}

      {/* Secondary Controls Bar: Coordinate Search, Mode, Demo Switch, Trails */}
      <div className="px-4 py-2 border-b border-white/10 glass-panel-subtle flex flex-wrap items-center justify-between gap-3 shrink-0 z-20">
        {/* Coordinate & Target SearchBox */}
        <div className="flex-1 max-w-xl">
          <SearchBox
            onCoordinateSelect={handleSearchCoordinate}
            isDemo={urlState.demo}
          />
        </div>

        {/* Mode Switches: Viewer vs Blink, Trails, Demo Mode */}
        <div className="flex items-center gap-2">
          {/* Mode Selector */}
          <div className="flex items-center rounded-xl bg-space-900 border border-white/10 p-0.5 text-xs font-mono">
            <button
              type="button"
              onClick={() => setUrlState({ mode: "viewer" })}
              className={`min-h-[32px] px-3 py-1 rounded-lg transition-colors ${
                urlState.mode === "viewer"
                  ? "bg-cyan-500 text-space-950 font-bold"
                  : "text-space-300 hover:text-white"
              }`}
            >
              Sky Viewer
            </button>
            <button
              type="button"
              onClick={() => setUrlState({ mode: "blink" })}
              className={`min-h-[32px] px-3 py-1 rounded-lg transition-colors ${
                urlState.mode === "blink"
                  ? "bg-cyan-500 text-space-950 font-bold"
                  : "text-space-300 hover:text-white"
              }`}
            >
              Blink Comparator
            </button>
          </div>

          {/* Motion Trails Toggle */}
          <button
            type="button"
            onClick={() => setUrlState({ trails: !urlState.trails })}
            className={`min-h-[36px] px-3 py-1 rounded-xl text-xs font-mono border transition-colors ${
              urlState.trails
                ? "bg-cyan-950/60 border-cyan-500/50 text-cyan-300"
                : "bg-space-900 border-white/10 text-space-400"
            }`}
          >
            Trails: {urlState.trails ? "ON" : "OFF"}
          </button>

          {/* Demo Mode Toggle (Forces offline plain canvas & local targets) */}
          <button
            type="button"
            onClick={() => setUrlState({ demo: !urlState.demo })}
            className={`min-h-[36px] px-3 py-1 rounded-xl text-xs font-mono border transition-colors ${
              urlState.demo
                ? "bg-amber-950/70 border-amber-500/50 text-amber-300 font-bold"
                : "bg-space-900 border-white/10 text-space-400"
            }`}
          >
            Demo: {urlState.demo ? "OFFLINE" : "ONLINE"}
          </button>
        </div>
      </div>

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

            {/* Right NASA HUD Vertical Action Palette */}
            <div className="absolute right-3 top-1/2 -translate-y-1/2 z-30 hidden md:flex flex-col gap-2 p-1.5 rounded-2xl bg-black/75 backdrop-blur-md border border-white/15 shadow-2xl">
              {/* Mode Toggle (Viewer vs Blink) */}
              <Tooltip content={urlState.mode === "viewer" ? "Switch to Blink Comparator" : "Switch to Sky Viewer"} position="left">
                <button
                  type="button"
                  onClick={() => setUrlState({ mode: urlState.mode === "viewer" ? "blink" : "viewer" })}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                    urlState.mode === "blink"
                      ? "bg-cyan-500 text-black font-bold shadow-lg shadow-cyan-500/40"
                      : "text-space-300 hover:text-white hover:bg-white/10"
                  }`}
                  aria-label="Toggle Blink Mode"
                >
                  <span className="text-base">⚡</span>
                </button>
              </Tooltip>

              {/* Motion Trails Toggle */}
              <Tooltip content={urlState.trails ? "Hide Trajectory Trails" : "Show Trajectory Trails"} position="left">
                <button
                  type="button"
                  onClick={() => setUrlState({ trails: !urlState.trails })}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                    urlState.trails
                      ? "bg-cyan-950/80 border border-cyan-400 text-cyan-300 shadow-md shadow-cyan-950/60"
                      : "text-space-400 hover:text-white hover:bg-white/10"
                  }`}
                  aria-label="Toggle Orbit Trails"
                >
                  <span className="text-sm">✨</span>
                </button>
              </Tooltip>

              <div className="h-px w-6 bg-white/10 mx-auto my-0.5" />

              {/* Zoom In (Decrease FOV) */}
              <Tooltip content="Zoom In (Narrow Field)" position="left">
                <button
                  type="button"
                  onClick={() => setUrlState({ fov: Math.max(0.02, +(urlState.fov * 0.7).toFixed(3)) })}
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-space-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  aria-label="Zoom In"
                >
                  <span className="text-lg font-bold font-mono">+</span>
                </button>
              </Tooltip>

              {/* Zoom Out (Increase FOV) */}
              <Tooltip content="Zoom Out (Wide Field)" position="left">
                <button
                  type="button"
                  onClick={() => setUrlState({ fov: Math.min(5.0, +(urlState.fov * 1.4).toFixed(3)) })}
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-space-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  aria-label="Zoom Out"
                >
                  <span className="text-lg font-bold font-mono">−</span>
                </button>
              </Tooltip>

              <div className="h-px w-6 bg-white/10 mx-auto my-0.5" />

              {/* Fullscreen Toggle */}
              <Tooltip content="Toggle Fullscreen" position="left">
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
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-space-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  aria-label="Toggle Fullscreen"
                >
                  <span className="text-sm">⤢</span>
                </button>
              </Tooltip>
            </div>

            {/* Bottom-Left NASA Eyes "● LIVE" Indicator */}
            <div className="absolute bottom-4 left-4 z-20 hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/75 backdrop-blur-md border border-white/15 text-xs font-mono text-white select-none shadow-2xl">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
              </span>
              <span className="font-bold tracking-widest text-emerald-400 text-[11px]">LIVE</span>
              <span className="text-white/20">|</span>
              <span className="text-space-300 text-[10px] tracking-wide uppercase">
                {catalog?.region?.name || "SPHEREx NEP Field"} ({urlState.ra.toFixed(2)}°, {urlState.dec.toFixed(2)}°)
              </span>
            </div>

            {/* Bottom Floating NASA Eyes "TIME CONTROLS" Drawer */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center max-w-[95vw] md:max-w-3xl w-full pointer-events-auto">
              {/* Collapsible Tab Header: ▲ TIME CONTROLS */}
              <button
                type="button"
                onClick={() => setIsTimeControlsOpen(!isTimeControlsOpen)}
                className="px-4 py-1.5 rounded-t-xl bg-black/85 hover:bg-black/95 backdrop-blur-md border-t border-x border-white/20 text-xs font-mono text-white shadow-2xl flex items-center gap-2 transition-all cursor-pointer"
                aria-expanded={isTimeControlsOpen}
                aria-label="Toggle Time Controls Drawer"
              >
                <span className="text-cyan-400 font-bold">{isTimeControlsOpen ? "▼" : "▲"}</span>
                <span className="tracking-widest uppercase font-semibold text-[11px] font-sans">Time Controls</span>
                <span className="text-space-400 text-[10px]">
                  ({epochs[urlState.epoch]?.epoch_id || `Epoch ${urlState.epoch + 1}`} · {epochs[urlState.epoch]?.date?.slice(0, 10) || "2025-04-15"})
                </span>
              </button>

              {/* Drawer Body */}
              {isTimeControlsOpen && (
                <div className="w-full p-2.5 rounded-b-2xl rounded-t-lg bg-black/85 backdrop-blur-xl border border-white/15 shadow-2xl">
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
