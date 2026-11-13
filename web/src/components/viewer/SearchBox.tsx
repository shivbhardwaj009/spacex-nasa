"use client";

import React, { useState } from "react";
import { CHALLENGE_TARGETS, type TargetMetadata } from "@/data/targets";
import { parseCoordinates } from "@/lib/coords";
import { resolveObjectName } from "@/lib/sesame";

export interface SearchBoxProps {
  onCoordinateSelect: (coords: { ra: number; dec: number; name?: string; fov?: number }) => void;
  isDemo?: boolean;
  className?: string;
}

export function SearchBox({
  onCoordinateSelect,
  isDemo = false,
  className = "",
}: SearchBoxProps) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [announcement, setAnnouncement] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;

    setErrorMsg(null);
    setInfoMsg(null);
    setLoading(true);

    try {
      // 1. Try parsing directly as coordinates (decimal or sexagesimal)
      try {
        const coords = parseCoordinates(q);
        const msg = `Navigating to coordinates: RA ${coords.ra.toFixed(4)}°, Dec ${coords.dec.toFixed(4)}° (${coords.format})`;
        setAnnouncement(msg);
        onCoordinateSelect({ ra: coords.ra, dec: coords.dec });
        setLoading(false);
        return;
      } catch {
        // Not a coordinate string; treat as an object name
      }

      // 2. Resolve as an object name (offline dictionary or CDS Sesame)
      const resolved = await resolveObjectName(q, { isDemo, timeoutMs: 5000 });
      const msg = `Found ${resolved.name} at RA ${resolved.ra.toFixed(4)}°, Dec ${resolved.dec.toFixed(4)}° via ${resolved.source}`;
      setAnnouncement(msg);
      onCoordinateSelect({ ra: resolved.ra, dec: resolved.dec, name: resolved.name });
    } catch (err: unknown) {
      const errText = err instanceof Error ? err.message : "Failed to resolve search input";
      setErrorMsg(errText);
      setAnnouncement(`Error: ${errText}`);
    } finally {
      setLoading(false);
    }
  };

  const handleChipSelect = (target: TargetMetadata) => {
    setQuery(target.name);
    setErrorMsg(null);
    const msg = `Selected challenge target: ${target.name} (RA ${target.ra.toFixed(4)}°, Dec ${target.dec.toFixed(4)}°)`;
    setAnnouncement(msg);

    // Target data availability check
    if (target.name !== "SPHEREx Deep Field North") {
      setInfoMsg(`No precomputed SPHEREx data for ${target.name} yet. Showing sky background view.`);
    } else {
      setInfoMsg(null);
    }

    onCoordinateSelect({
      ra: target.ra,
      dec: target.dec,
      name: target.name,
      fov: target.fovDefault,
    });
  };

  return (
    <div className={`flex flex-col gap-2 w-full ${className}`}>
      {/* Search Input Form */}
      <form onSubmit={handleSubmit} className="relative flex items-center w-full" role="search">
        <label htmlFor="searchbox-input" className="sr-only">
          Search celestial coordinates or object name
        </label>
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-space-400">
          {loading ? (
            <svg
              className="animate-spin h-4 w-4 text-cyan-400"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
          ) : (
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          )}
        </div>

        <input
          id="searchbox-input"
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (errorMsg) setErrorMsg(null);
          }}
          placeholder="RA/Dec (133.79 -7.24, 08h55m -07d14m) or target name..."
          className="w-full min-h-[44px] pl-10 pr-24 py-2 text-xs md:text-sm font-mono rounded-xl bg-space-950/80 border border-white/10 text-space-100 placeholder-space-400 transition-all focus:border-cyan-400 focus:bg-space-900 focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none"
        />

        <div className="absolute inset-y-0 right-1 flex items-center pr-1.5 gap-1">
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setErrorMsg(null);
              }}
              aria-label="Clear query"
              className="min-h-[36px] min-w-[36px] flex items-center justify-center text-space-400 hover:text-white"
            >
              ✕
            </button>
          )}
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="min-h-[36px] px-3 rounded-lg bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600 text-space-950 font-bold text-xs font-mono disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            Go
          </button>
        </div>
      </form>

      {/* Quick-Pick Target Chips for Challenge Targets */}
      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
        <span className="text-[10px] font-mono uppercase text-space-400 mr-1 shrink-0">
          Targets:
        </span>
        {CHALLENGE_TARGETS.map((t) => (
          <button
            key={t.name}
            type="button"
            onClick={() => handleChipSelect(t)}
            className="min-h-[32px] px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-space-850 hover:bg-space-800 text-space-200 border border-white/10 hover:border-cyan-400/50 hover:text-cyan-300 transition-colors focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none"
            title={`${t.name} (RA ${t.ra.toFixed(4)}°, Dec ${t.dec.toFixed(4)}°) - ${t.description}`}
          >
            {t.name}
          </button>
        ))}
      </div>

      {/* Screen Reader Announcement (aria-live) */}
      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>

      {/* Target Data Availability Notice */}
      {infoMsg && (
        <div
          role="status"
          className="p-2 rounded-lg bg-sky-950/70 border border-sky-500/40 text-xs text-sky-200 font-mono flex items-start gap-2 animate-in fade-in"
        >
          <span className="text-cyan-400 font-bold shrink-0">ℹ</span>
          <span>{infoMsg}</span>
        </div>
      )}

      {/* Error Message Alert */}
      {errorMsg && (
        <div
          role="alert"
          className="p-2 rounded-lg bg-slate-900/90 border border-red-500/30 text-xs text-slate-300 font-mono flex items-start gap-2 animate-in fade-in"
        >
          <span className="text-red-400 font-bold shrink-0">!</span>
          <span>{errorMsg}</span>
        </div>
      )}
    </div>
  );
}

