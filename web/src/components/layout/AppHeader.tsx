"use client";

import React, { useState } from "react";
import Link from "next/link";
import { TestDataBadge } from "@/components/ui";

export interface AppHeaderProps {
  isSynthetic?: boolean;
  beginnerMode: boolean;
  onToggleBeginnerMode: () => void;
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onSearchSubmit?: (e: React.FormEvent) => void;
  candidateCount?: number;
  onOpenTour?: () => void;
  onOpenShare?: () => void;
  onOpenSearch?: () => void;
  activeTargetName?: string;
  isDemo?: boolean;
  onToggleDemo?: () => void;
}

export function AppHeader({
  isSynthetic = false,
  beginnerMode,
  onToggleBeginnerMode,
  onOpenTour,
  onOpenShare,
  onOpenSearch,
  activeTargetName = "3I/ATLAS · SPHEREx NEP FIELD",
  isDemo = false,
  onToggleDemo,
}: AppHeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <>
      <header className="h-14 px-6 md:px-8 border-b border-white/5 bg-gradient-to-b from-black/85 via-black/40 to-transparent flex items-center justify-between gap-4 shrink-0 z-30 select-none">
        {/* 1. NASA Meatball & EYES / SPHEREx Title (Identical to NASA Eyes) */}
        <div className="flex items-center gap-3.5 shrink-0">
          <Link
            href="/"
            className="flex items-center gap-3 focus-visible:ring-2 focus-visible:ring-cyan-400 rounded-lg group"
            aria-label="SPHEREx Sky Diary Home"
          >
            {/* NASA Meatball Insignia Vector */}
            <div className="h-8 w-8 rounded-full bg-[#0b3d91] relative overflow-hidden flex items-center justify-center border border-blue-400/30 group-hover:scale-105 transition-transform shrink-0">
              <svg
                className="absolute inset-0 w-full h-full"
                viewBox="0 0 100 100"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle cx="25" cy="30" r="1.5" fill="white" opacity="0.9" />
                <circle cx="75" cy="28" r="1.2" fill="white" opacity="0.8" />
                <circle cx="35" cy="72" r="1.5" fill="white" opacity="0.7" />
                <circle cx="68" cy="68" r="1" fill="white" opacity="0.9" />
                <circle cx="50" cy="20" r="1.3" fill="white" opacity="0.8" />
                <circle cx="82" cy="50" r="1.2" fill="white" opacity="0.8" />
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
                <path d="M18 68 L50 22 L65 52 L54 52 L48 38 L30 68 Z" fill="#fc3d21" />
              </svg>
              <span className="relative z-10 text-[8px] font-black tracking-tighter text-white font-sans drop-shadow-md">
                NASA
              </span>
            </div>

            {/* Title styled like EYES ON THE SOLAR SYSTEM */}
            <div className="flex items-center gap-2">
              <span className="font-sans text-xs md:text-sm font-semibold tracking-widest text-white/90 uppercase">
                Eyes on SPHEREx: Sky Diary
              </span>
            </div>
          </Link>

          {/* Minimal TEST DATA Indicator */}
          {isSynthetic && (
            <div className="ml-1">
              <TestDataBadge />
            </div>
          )}
        </div>

        {/* 2. Center Faint Celestial Target Indicator (e.g. 3I/ATLAS in screenshot) */}
        <div className="hidden lg:flex items-center gap-1.5 text-xs font-mono text-white/40 tracking-wider">
          <span className="text-white/20">○</span>
          <span className="truncate max-w-sm">{activeTargetName}</span>
        </div>

        {/* 3. Right Minimal NASA Eyes Actions: Search, Share, Menu */}
        <div className="flex items-center gap-4 md:gap-6 shrink-0 text-xs font-sans text-white/80">
          {/* Quick Search Icon Button */}
          <button
            type="button"
            onClick={onOpenSearch}
            className="text-white/70 hover:text-white transition-colors flex items-center gap-1.5 py-1 px-1.5 cursor-pointer"
            aria-label="Search celestial targets or coordinates"
            title="Search (Hotkey: /)"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>

          {/* Share */}
          {onOpenShare && (
            <button
              type="button"
              onClick={onOpenShare}
              className="text-white/70 hover:text-white transition-colors flex items-center gap-1.5 py-1 cursor-pointer tracking-wider"
              aria-label="Share current sky view"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" />
              </svg>
              <span className="hidden sm:inline">Share</span>
            </button>
          )}

          {/* Menu */}
          <button
            type="button"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="text-white/70 hover:text-white transition-colors flex items-center gap-1.5 py-1 cursor-pointer tracking-wider"
            aria-label="Toggle Navigation Menu"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            <span>Menu</span>
          </button>
        </div>
      </header>

      {/* Slide-out NASA Eyes Menu Drawer */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMenuOpen(false)}
          />

          {/* Drawer content */}
          <div className="relative w-80 max-w-[85vw] h-full bg-[#0a0f1d]/95 border-l border-white/10 p-6 flex flex-col justify-between shadow-2xl z-10 overflow-y-auto">
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-[#0b3d91] flex items-center justify-center text-[7px] font-black text-white">
                    NASA
                  </div>
                  <span className="text-xs uppercase tracking-widest text-white font-semibold">
                    Menu &amp; Settings
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsMenuOpen(false)}
                  className="text-white/40 hover:text-white text-lg font-mono px-2"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3">
                <p className="text-[10px] uppercase font-mono tracking-widest text-white/40">Navigation</p>
                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onOpenTour?.();
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-white flex items-center justify-between transition-colors"
                >
                  <span>🧭 Guided Walkthrough Tour</span>
                  <span className="text-cyan-400 font-mono text-[10px]">4 steps</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setIsMenuOpen(false);
                    onToggleBeginnerMode();
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-white flex items-center justify-between transition-colors"
                >
                  <span>Beginner Explanations</span>
                  <span className={`font-mono text-[10px] ${beginnerMode ? "text-cyan-400" : "text-white/40"}`}>
                    {beginnerMode ? "ON" : "OFF"}
                  </span>
                </button>

                {onToggleDemo && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onToggleDemo();
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-white flex items-center justify-between transition-colors"
                  >
                    <span>Offline Demo Mode</span>
                    <span className={`font-mono text-[10px] ${isDemo ? "text-amber-400" : "text-white/40"}`}>
                      {isDemo ? "OFFLINE" : "ONLINE"}
                    </span>
                  </button>
                )}

                <Link
                  href="/design"
                  className="block px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-space-300 hover:text-white transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  🎨 Design System Tokens
                </Link>
              </div>

              <div className="space-y-2 border-t border-white/10 pt-4">
                <p className="text-[10px] uppercase font-mono tracking-widest text-white/40">Challenge Context</p>
                <div className="p-3 rounded-lg bg-black/40 border border-white/5 text-[11px] text-white/60 space-y-1">
                  <p className="font-semibold text-white/80">NASA Space Apps Challenge 2026</p>
                  <p>Planet X and SPHEREx: Exploring Unknown Moving Objects across 102 infrared spectral channels.</p>
                </div>
              </div>
            </div>

            <div className="border-t border-white/10 pt-4 text-center text-[10px] text-white/30 font-mono">
              SPHEREx Sky Diary v1.0 · NASA Space Apps
            </div>
          </div>
        </div>
      )}
    </>
  );
}
