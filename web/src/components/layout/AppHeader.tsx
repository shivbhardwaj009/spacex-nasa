"use client";

import React from "react";
import Link from "next/link";
import { Button, TestDataBadge, Tooltip } from "@/components/ui";

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
    <header className="h-16 md:h-18 px-4 md:px-6 border-b border-white/10 glass-panel-subtle flex items-center justify-between gap-3 shrink-0 z-30">
      {/* Brand & Logo */}
      <div className="flex items-center gap-3 shrink-0">
        <Link
          href="/"
          className="flex items-center gap-2.5 focus-visible:ring-2 focus-visible:ring-cyan-400 rounded-lg"
          aria-label="SPHEREx Sky Diary Home"
        >
          {/* Cosmic SPHEREx Hexagonal Aperture Logo */}
          <div className="h-9 w-9 md:h-10 md:w-10 rounded-xl bg-gradient-to-tr from-cyan-600 via-sky-500 to-amber-400 flex items-center justify-center p-0.5 shadow-lg shadow-cyan-500/20">
            <div className="h-full w-full bg-space-950 rounded-[10px] flex items-center justify-center">
              <svg
                className="h-5 w-5 text-cyan-300"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.4" />
                <path d="M12 3a9 9 0 0 1 9 9" stroke="#22d3ee" strokeWidth="2.5" />
                <circle cx="16.5" cy="7.5" r="2" fill="#fbbf24" stroke="none" />
                <path d="M8 12h8M12 8v8" stroke="currentColor" strokeLinecap="round" />
              </svg>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base md:text-lg tracking-tight text-white font-sans">
                SPHEREx Sky Diary
              </span>
              <span className="hidden lg:inline-block text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-space-850 text-space-300 border border-white/10">
                NASA Space Apps 2026
              </span>
            </div>
            <p className="text-[11px] text-space-400 font-mono hidden sm:block">
              Planet X &amp; Asteroid Moving Object Explorer
            </p>
          </div>
        </Link>

        {/* Global TEST DATA Badge */}
        {isSynthetic && (
          <div className="ml-1">
            <TestDataBadge />
          </div>
        )}
      </div>

      {/* Search Input Box */}
      <form
        onSubmit={onSearchSubmit}
        className="flex-1 max-w-md mx-2 hidden sm:flex items-center"
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
            placeholder={`Search ${candidateCount} movers by RA, Dec or designation...`}
            className="w-full min-h-[44px] pl-9 pr-10 py-2 text-xs md:text-sm font-mono rounded-xl bg-space-950/80 border border-white/10 text-space-100 placeholder-space-400 transition-all focus:border-cyan-400 focus:bg-space-900 focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none"
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

      {/* Right Controls: Mode Toggle, Tour, Share, Design System Link */}
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
            className="min-h-[44px] px-3 py-1.5 rounded-xl border border-white/10 bg-space-850 hover:bg-space-800 transition-colors flex items-center gap-2 text-xs font-mono focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none"
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
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenTour}
            className="min-h-[44px] px-3 text-xs gap-1 border-white/10 text-cyan-300 hover:border-cyan-400"
            aria-label="Start guided walkthrough tour"
          >
            <span>🧭</span>
            <span className="hidden md:inline">Tour</span>
          </Button>
        )}

        {/* Share Button */}
        {onOpenShare && (
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenShare}
            className="min-h-[44px] px-3 text-xs gap-1 border-white/10 text-amber-300 hover:border-amber-400"
            aria-label="Share current sky view"
          >
            <span>🔗</span>
            <span className="hidden md:inline">Share</span>
          </Button>
        )}

        {/* Link to Design System Catalog */}
        <Link href="/design" tabIndex={-1}>
          <Button variant="ghost" size="sm" className="hidden lg:inline-flex text-xs font-mono">
            /design
          </Button>
        </Link>
      </div>
    </header>
  );
}
