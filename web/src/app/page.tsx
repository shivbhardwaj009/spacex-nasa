"use client";

import { useEffect, useState } from "react";
import { CandidatesPayload, Mover } from "@/types/schema";

export default function Home() {
  const [data, setData] = useState<CandidatesPayload | null>(null);
  const [selectedMover, setSelectedMover] = useState<Mover | null>(null);
  const [filterType, setFilterType] = useState<"all" | "known" | "unknown">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/data/candidates.json")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}: Failed to load candidates.json`);
        return res.json();
      })
      .then((payload: CandidatesPayload) => {
        setData(payload);
        if (payload.movers && payload.movers.length > 0) {
          setSelectedMover(payload.movers[0]);
        }
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  const hasSynthetic = data?.movers.some((m) => m.is_synthetic) ?? false;

  const filteredMovers = data?.movers.filter((m) => {
    if (filterType === "all") return true;
    return m.type === filterType;
  }) ?? [];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur px-6 py-4 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🔭</span>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              SPHEREx Sky Diary
              <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-700">
                v1.0
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              NASA Space Apps Challenge 2026: Planet X &amp; SPHEREx
            </p>
          </div>
        </div>

        {/* Mandatory Rule 2: High-Visibility TEST DATA Badge */}
        {hasSynthetic && (
          <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/40 text-amber-300 px-3 py-1.5 rounded-md text-xs font-semibold animate-pulse">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            TEST DATA — Synthetic Pipeline Simulation
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 flex flex-col gap-6">
        {loading && (
          <div className="flex items-center justify-center py-20 text-slate-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500 mr-3"></div>
            Loading SPHEREx candidates...
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-950/50 border border-red-700 text-red-200 rounded-lg">
            <p className="font-semibold">Failed to load data:</p>
            <p className="text-sm font-mono mt-1">{error}</p>
          </div>
        )}

        {data && (
          <>
            {/* Region & Observation Summary */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                <span className="text-xs text-slate-400 uppercase tracking-wider">Region</span>
                <p className="text-base font-semibold text-white mt-1">{data.region.name}</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  RA {data.region.ra_center.toFixed(3)}°, Dec {data.region.dec_center.toFixed(3)}°
                </p>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                <span className="text-xs text-slate-400 uppercase tracking-wider">Search Radius</span>
                <p className="text-base font-semibold text-white mt-1">{data.region.radius_deg}°</p>
                <p className="text-xs text-slate-400 mt-0.5">FOV ~{data.fov_deg ?? 1.0}°</p>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                <span className="text-xs text-slate-400 uppercase tracking-wider">Observation Epochs</span>
                <p className="text-base font-semibold text-white mt-1">{data.epochs.length} Epochs</p>
                <p className="text-xs text-slate-400 mt-0.5">102 spectral channels (0.75 - 5.0 µm)</p>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
                <span className="text-xs text-slate-400 uppercase tracking-wider">Detected Movers</span>
                <p className="text-base font-semibold text-white mt-1">{data.movers.length} Candidates</p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {data.movers.filter((m) => m.type === "known").length} Known /{" "}
                  {data.movers.filter((m) => m.type === "unknown").length} Unknown
                </p>
              </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 border-b border-slate-800 pb-2">
              <button
                onClick={() => setFilterType("all")}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                  filterType === "all"
                    ? "bg-cyan-600 text-white"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                All Movers ({data.movers.length})
              </button>
              <button
                onClick={() => setFilterType("known")}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                  filterType === "known"
                    ? "bg-emerald-600 text-white"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                Known Asteroids/Comets ({data.movers.filter((m) => m.type === "known").length})
              </button>
              <button
                onClick={() => setFilterType("unknown")}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                  filterType === "unknown"
                    ? "bg-purple-600 text-white"
                    : "text-slate-400 hover:text-white hover:bg-slate-800"
                }`}
              >
                Unknown / Planet X Candidates ({data.movers.filter((m) => m.type === "unknown").length})
              </button>
            </div>

            {/* Main Grid: Mover List & Inspector */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column: Mover Cards */}
              <div className="lg:col-span-1 flex flex-col gap-3 max-h-[720px] overflow-y-auto pr-1">
                {filteredMovers.map((mover) => (
                  <div
                    key={mover.object_id}
                    onClick={() => setSelectedMover(mover)}
                    className={`p-3.5 rounded-lg border transition cursor-pointer ${
                      selectedMover?.object_id === mover.object_id
                        ? "border-cyan-500 bg-cyan-950/30"
                        : "border-slate-800 bg-slate-900/60 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs text-slate-400">{mover.object_id}</span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded font-semibold ${
                          mover.type === "known"
                            ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                            : "bg-purple-950 text-purple-300 border border-purple-800"
                        }`}
                      >
                        {mover.type === "known" ? mover.match_name : "UNKNOWN"}
                      </span>
                    </div>

                    <div className="mt-2 text-xs text-slate-300 flex justify-between">
                      <span>RA: {mover.ra.toFixed(4)}°</span>
                      <span>Dec: {mover.dec.toFixed(4)}°</span>
                    </div>

                    <div className="mt-1 text-xs text-slate-400 flex justify-between">
                      <span>Rate: {Math.hypot(mover.motion.ra_rate_arcsec_per_day, mover.motion.dec_rate_arcsec_per_day).toFixed(1)} &quot;/day</span>
                      <span>Confidence: {(mover.confidence * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Right Column: Selected Mover Details */}
              <div className="lg:col-span-2 flex flex-col gap-6">
                {selectedMover ? (
                  <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 flex flex-col gap-6">
                    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-lg font-bold text-white">{selectedMover.object_id}</h2>
                          <span
                            className={`text-xs px-2.5 py-0.5 rounded font-bold ${
                              selectedMover.type === "known"
                                ? "bg-emerald-900/60 text-emerald-300 border border-emerald-700"
                                : "bg-purple-900/60 text-purple-200 border border-purple-700"
                            }`}
                          >
                            {selectedMover.type === "known"
                              ? `Known: ${selectedMover.match_name}`
                              : "Unknown Mover Candidate"}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1">
                          Reference: RA {selectedMover.ra.toFixed(6)}°, Dec {selectedMover.dec.toFixed(6)}°
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-xs text-slate-400">Match Confidence</span>
                        <p className="text-base font-bold text-cyan-400">
                          {(selectedMover.confidence * 100).toFixed(1)}%
                        </p>
                      </div>
                    </div>

                    {/* Proper Motion */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 bg-slate-950 p-4 rounded-lg border border-slate-800/80">
                      <div>
                        <span className="text-xs text-slate-400">RA Motion Rate</span>
                        <p className="text-sm font-semibold text-slate-200 mt-0.5 font-mono">
                          {selectedMover.motion.ra_rate_arcsec_per_day} &quot;/day
                        </p>
                      </div>
                      <div>
                        <span className="text-xs text-slate-400">Dec Motion Rate</span>
                        <p className="text-sm font-semibold text-slate-200 mt-0.5 font-mono">
                          {selectedMover.motion.dec_rate_arcsec_per_day} &quot;/day
                        </p>
                      </div>
                      <div>
                        <span className="text-xs text-slate-400">Total Velocity</span>
                        <p className="text-sm font-semibold text-slate-200 mt-0.5 font-mono">
                          {Math.hypot(
                            selectedMover.motion.ra_rate_arcsec_per_day,
                            selectedMover.motion.dec_rate_arcsec_per_day
                          ).toFixed(2)}{" "}
                          &quot;/day
                        </p>
                      </div>
                    </div>

                    {/* Multi-Epoch Detections & Cutouts */}
                    <div>
                      <h3 className="text-sm font-semibold text-slate-200 mb-3">
                        Epoch Cutouts &amp; Astrometry ({selectedMover.detections.length} detections)
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                        {selectedMover.detections.map((det) => (
                          <div
                            key={det.epoch_id}
                            className="bg-slate-950 border border-slate-800 rounded p-2 flex flex-col items-center text-center"
                          >
                            <span className="text-[10px] font-mono text-cyan-400 mb-1">
                              {det.epoch_id}
                            </span>
                            <div className="w-16 h-16 bg-slate-900 rounded overflow-hidden border border-slate-800 relative">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={`/${det.cutout_url}`}
                                alt={`${selectedMover.object_id} ${det.epoch_id}`}
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <span className="text-[9px] text-slate-400 mt-1">
                              Flux: {det.flux}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* 102-point Infrared Spectrum Preview */}
                    <div>
                      <h3 className="text-sm font-semibold text-slate-200 mb-2 flex items-center justify-between">
                        <span>SPHEREx 102-Channel Spectrum (0.75 – 5.0 µm)</span>
                        <span className="text-xs font-mono text-slate-400">
                          {selectedMover.spectrum
                            ? `${selectedMover.spectrum.wavelength_um.length} channels`
                            : "No spectrum"}
                        </span>
                      </h3>

                      {selectedMover.spectrum ? (
                        <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 flex flex-col gap-2">
                          <div className="h-32 w-full flex items-end gap-[2px] pt-4 px-1">
                            {selectedMover.spectrum.flux.map((f, i) => {
                              const maxFlux = Math.max(...selectedMover.spectrum!.flux);
                              const heightPct = Math.max(8, (f / maxFlux) * 100);
                              return (
                                <div
                                  key={i}
                                  title={`${selectedMover.spectrum!.wavelength_um[i]} µm: ${f}`}
                                  className="flex-1 bg-cyan-500 hover:bg-cyan-300 rounded-t-sm transition-all"
                                  style={{ height: `${heightPct}%` }}
                                />
                              );
                            })}
                          </div>
                          <div className="flex justify-between text-[11px] text-slate-400 font-mono border-t border-slate-800 pt-1">
                            <span>0.75 µm</span>
                            <span>2.5 µm</span>
                            <span>5.00 µm</span>
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 bg-slate-950 border border-slate-800 text-slate-400 text-sm rounded">
                          Spectrum not extracted for this candidate.
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-900 border border-slate-800 rounded-lg p-12 text-center text-slate-400">
                    Select a mover candidate to view detections and spectrum.
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 px-6 py-4 text-xs text-slate-500 text-center">
        SPHEREx Sky Diary • NASA Space Apps Challenge 2026 • Contract Schema v1.0
      </footer>
    </div>
  );
}
