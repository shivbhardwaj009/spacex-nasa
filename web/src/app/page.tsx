"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { AppHeader } from "@/components/layout/AppHeader";
import { SidePanel } from "@/components/layout/SidePanel";
import { SearchBox, FovControl } from "@/components/viewer";
import { TimeBar, BlinkComparator } from "@/components/time";
import { Button, Card, TestDataBadge, ErrorBoundary } from "@/components/ui";
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

      {/* 2. Main Workspace */}
      <main className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* Left / Center: Sky View & Time Controls Area */}
        <div className="flex-1 flex flex-col h-full overflow-hidden relative">
          {/* Fallback Notice Banner if URL params were invalid */}
          {urlState.fallbackNotice && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-40 px-3 py-1 rounded-lg bg-amber-950/80 border border-amber-500/50 text-[11px] font-mono text-amber-200 shadow-xl">
              {urlState.fallbackNotice}
            </div>
          )}

          {/* Interactive Sky Viewer or Blink Comparator */}
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
          </div>

          {/* Bottom Time Controls Area: TimeBar or BlinkComparator */}
          <div className="p-3 border-t border-white/10 glass-panel-subtle shrink-0 z-20">
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
        </div>

        {/* Right Side Panel: Movers List & Inspector */}
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
