"use client";

import React from "react";
import Link from "next/link";
import { TestDataBadge, Tooltip } from "@/components/ui";

export interface AppHeaderProps {
  isSynthetic?: boolean;
  beginnerMode: boolean;
  onToggleBeginnerMode: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onSearchSubmit: (e: React.FormEvent) => void;
  candidateCount?: number;
  onOpenTour?: () => void;
  onOpenShare?: () => void;
}

export function AppHeader({
  isSynthetic = false,
  beginnerMode,
  onToggleBeginnerMode,
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  candidateCount = 0,
  onOpenTour,
  onOpenShare,
}: AppHeaderProps) {
  return (
    <header className="h-16 px-4 md:px-6 border-b border-white/10 bg-black/75 backdrop-blur-md flex items-center justify-between gap-4 shrink-0 z-30 select-none">
      {/* 1. NASA Meatball & SPHEREx Brand */}
      <div className="flex items-center gap-3 shrink-0">
        <Link
          href="/"
          className="flex items-center gap-2.5 focus-visible:ring-2 focus-visible:ring-cyan-400 rounded-lg group"
          aria-label="SPHEREx Sky Diary Home"
        >
          {/* Authentic NASA Meatball Insignia Vector */}
          <div className="h-9 w-9 rounded-full bg-[#0b3d91] relative overflow-hidden flex items-center justify-center shadow-lg shadow-blue-950/60 border border-blue-400/30 group-hover:scale-105 transition-transform shrink-0">
            {/* Red Vector Chevron */}
            <svg
              className="absolute inset-0 w-full h-full"
              viewBox="0 0 100 100"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* White Starfield */}
              <circle cx="25" cy="30" r="1.5" fill="white" opacity="0.9" />
              <circle cx="75" cy="28" r="1.2" fill="white" opacity="0.8" />
              <circle cx="35" cy="72" r="1.5" fill="white" opacity="0.7" />
              <circle cx="68" cy="68" r="1" fill="white" opacity="0.9" />
              <circle cx="50" cy="20" r="1.3" fill="white" opacity="0.8" />
              <circle cx="82" cy="50" r="1.2" fill="white" opacity="0.8" />
              {/* Orbit Ellipse */}
              <ellipse
                cx="50"
                cy="50"
                rx="42"
                ry="18"
                stroke="white"
                strokeWidth="2.5"
                strokeOpacity="0.8"
                transform="rotate(-25 50 50)"
              />
              {/* Aeronautics Red Chevron */}
              <path
                d="M18 68 L50 22 L65 52 L54 52 L48 38 L30 68 Z"
                fill="#fc3d21"
              />
            </svg>
            {/* NASA Text */}
            <span className="relative z-10 text-[9px] font-black tracking-tighter text-white font-sans drop-shadow-md">
              NASA
            </span>
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm md:text-base tracking-widest text-white uppercase font-sans">
                SPHEREx Sky Diary
              </span>
              <span className="hidden xl:inline-block text-[9px] font-mono tracking-widest uppercase px-1.5 py-0.5 rounded bg-white/10 text-space-300 border border-white/10">
                Planet X &amp; Movers
              </span>
            </div>
            <span className="text-[10px] text-space-400 font-mono tracking-wider hidden sm:block">
              EYES ON SPHEREx SURVEY ARCHIVE
            </span>
          </div>
        </Link>

        {/* Global TEST DATA Badge */}
        {isSynthetic && (
          <div className="ml-1">
            <TestDataBadge />
          </div>
        )}
      </div>

      {/* 2. Center Search Input Box */}
      <form
        onSubmit={onSearchSubmit}
        className="flex-1 max-w-md mx-2 hidden md:flex items-center"
        role="search"
      >
        <div className="relative w-full">
          <label htmlFor="sky-search-input" className="sr-only">
            Search RA, Dec coordinates or object name
          </label>
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-space-400">
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <input
            id="sky-search-input"
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={`Search ${candidateCount} movers by ID, designation or RA/Dec...`}
            className="w-full min-h-[38px] pl-9 pr-10 py-1.5 text-xs font-mono rounded-full bg-white/5 border border-white/10 text-white placeholder-space-400 transition-all focus:border-cyan-400 focus:bg-black/80 focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              aria-label="Clear search query"
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-space-400 hover:text-white"
            >
              <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          )}
        </div>
      </form>

      {/* 3. Right NASA Eyes Toolbar Controls */}
      <div className="flex items-center gap-2 md:gap-3 shrink-0">
        {/* Beginner vs Scientific Mode Toggle */}
        <Tooltip
          content={
            beginnerMode
              ? "Beginner Mode: Simplified labels and guided explanations"
              : "Expert/Scientific Mode: Full astrometric rates and 102-channel SED flux data"
          }
          position="bottom"
        >
          <button
            type="button"
            onClick={onToggleBeginnerMode}
            role="switch"
            aria-checked={beginnerMode}
            className="min-h-[36px] px-3 py-1 rounded-full border border-white/10 bg-white/5 hover:bg-white/10 transition-colors flex items-center gap-2 text-xs font-mono focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none"
          >
            <span
              className={`h-2 w-2 rounded-full transition-colors ${
                beginnerMode ? "bg-cyan-400 animate-pulse" : "bg-space-400"
              }`}
            />
            <span className="hidden sm:inline text-space-300">Mode:</span>
            <span className={beginnerMode ? "text-cyan-300 font-bold" : "text-space-200"}>
              {beginnerMode ? "Beginner" : "Scientific"}
            </span>
          </button>
        </Tooltip>

        {/* Guided Tour Trigger Button */}
        {onOpenTour && (
          <button
            type="button"
            onClick={onOpenTour}
            className="min-h-[36px] px-3 rounded-full text-xs font-sans tracking-wide text-space-200 hover:text-white hover:bg-white/10 border border-transparent hover:border-white/10 transition-all flex items-center gap-1.5"
            aria-label="Start guided walkthrough tour"
          >
            <span className="text-amber-400">★</span>
            <span className="hidden md:inline">Tour</span>
          </button>
        )}

        {/* Share Button (NASA Eyes style) */}
        {onOpenShare && (
          <button
            type="button"
            onClick={onOpenShare}
            className="min-h-[36px] px-3.5 rounded-full text-xs font-sans tracking-wide text-white bg-white/10 hover:bg-white/20 border border-white/10 transition-all flex items-center gap-1.5"
            aria-label="Share current sky view"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" />
            </svg>
            <span>Share</span>
          </button>
        )}

        {/* Link to Design System Catalog */}
        <Link href="/design" tabIndex={-1}>
          <button
            type="button"
            className="min-h-[36px] px-3 rounded-full text-xs font-mono text-space-400 hover:text-space-200 transition-colors hidden xl:inline-flex items-center"
          >
            /design
          </button>
        </Link>
      </div>
    </header>
  );
}
