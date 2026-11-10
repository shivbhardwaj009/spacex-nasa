"use client";

import React, { useState } from "react";
import { AppHeader } from "@/components/layout/AppHeader";
import { MainViewerArea } from "@/components/viewer/MainViewerArea";
import { SidePanel } from "@/components/layout/SidePanel";
import { Button, Card } from "@/components/ui";
import { useCandidateCatalog } from "@/lib/client";
import type { MoverCandidate } from "@/types";

export default function SkyDiaryApp() {
  const { data: catalog, loading, error, isSynthetic, reload } = useCandidateCatalog(
    "/data/candidates.json"
  );

  const [beginnerMode, setBeginnerMode] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedMover, setSelectedMover] = useState<MoverCandidate | null>(null);
  const [currentEpochIndex, setCurrentEpochIndex] = useState<number>(0);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catalog || !searchQuery.trim()) return;

    const q = searchQuery.toLowerCase().trim();
    const matched = catalog.movers.find(
      (m) =>
        m.object_id.toLowerCase().includes(q) ||
        (m.match_name && m.match_name.toLowerCase().includes(q))
    );

    if (matched) {
      setSelectedMover(matched);
    }
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
              {error || "Could not load candidates.json from /public/data"}
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
     APP SHELL (TOP BAR + VIEWER + SIDE PANEL / BOTTOM SHEET)
     ========================================================= */
  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-space-950">
      {/* 1. Top Bar */}
      <AppHeader
        isSynthetic={isSynthetic}
        beginnerMode={beginnerMode}
        onToggleBeginnerMode={() => setBeginnerMode(!beginnerMode)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSearchSubmit={handleSearchSubmit}
        candidateCount={catalog.movers.length}
      />

      {/* 2. Main Workspace: Viewer Area + Right Side Panel */}
      <main className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
        {/* Main Sky & Time-Lapse Viewer Area */}
        <MainViewerArea
          catalog={catalog}
          selectedMover={selectedMover}
          onSelectMover={setSelectedMover}
          currentEpochIndex={currentEpochIndex}
          onEpochChange={setCurrentEpochIndex}
          beginnerMode={beginnerMode}
        />

        {/* Right Side Panel (Desktop) / Bottom Sheet (Mobile) */}
        <SidePanel
          movers={catalog.movers}
          selectedMover={selectedMover}
          onSelectMover={setSelectedMover}
          beginnerMode={beginnerMode}
          searchFilter={searchQuery}
        />
      </main>
    </div>
  );
}
