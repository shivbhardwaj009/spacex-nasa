"use client";

import React, { useEffect, useState } from "react";

export interface FrameManifestItem {
  epoch_id: string;
  date: string;
  image_path: string;
  bounds: {
    ra_min: number;
    ra_max: number;
    dec_min: number;
    dec_max: number;
    ra_center: number;
    dec_center: number;
    fov_deg: number;
  };
  is_synthetic: boolean;
}

export interface FramesManifest {
  schema_version: string;
  is_synthetic: boolean;
  bounds: FrameManifestItem["bounds"];
  frames: FrameManifestItem[];
}

export interface EpochFramesProps {
  epochIndex: number;
  manifestUrl?: string;
  opacity?: number;
  onManifestLoaded?: (manifest: FramesManifest) => void;
  isDemo?: boolean;
  className?: string;
}

export function EpochFrames({
  epochIndex,
  manifestUrl = "/data/frames_manifest.json",
  opacity = 0.85,
  onManifestLoaded,
  isDemo = false,
  className = "",
}: EpochFramesProps) {
  const [manifest, setManifest] = useState<FramesManifest | null>(null);
  const [loading, setLoading] = useState(!isDemo);
  const [preloadProgress, setPreloadProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isDemo) {
      setLoading(false);
      return;
    }
    let isCancelled = false;

    fetch(manifestUrl)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status} loading frames manifest`);
        return res.json();
      })
      .then((data: FramesManifest) => {
        if (isCancelled) return;
        setManifest(data);
        onManifestLoaded?.(data);

        // Preload all frames for smooth time-lapse playback
        const frames = data.frames || [];
        if (frames.length === 0) {
          setLoading(false);
          return;
        }

        let loadedCount = 0;
        frames.forEach((frame) => {
          const img = new window.Image();
          img.src = `/${frame.image_path}`;
          img.onload = img.onerror = () => {
            if (isCancelled) return;
            loadedCount++;
            setPreloadProgress(Math.round((loadedCount / frames.length) * 100));
            if (loadedCount >= frames.length) {
              setLoading(false);
            }
          };
        });
      })
      .catch((err: Error) => {
        if (!isCancelled) {
          setError(err.message || "Failed to load epoch frames");
          setLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [manifestUrl, onManifestLoaded, isDemo]);

  const activeFrame = manifest?.frames?.[epochIndex] || manifest?.frames?.[0];

  if (error || !activeFrame) {
    return null;
  }

  return (
    <div className={`relative pointer-events-none ${className}`}>
      {/* Loading Progress Bar (briefly visible during frame preloading) */}
      {loading && (
        <div className="absolute top-2 left-2 z-20 px-2.5 py-1 rounded bg-space-950/90 border border-cyan-500/30 text-[10px] font-mono text-cyan-300 flex items-center gap-1.5 shadow-lg">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-ping" />
          Preloading Frames: {preloadProgress}%
        </div>
      )}

      {/* Georeferenced SPHEREx Epoch Frame Overlay */}
      {/* TODO(VERIFY): Aladin Lite v3 FITS/HiPS image overlay placement method vs Canvas georeferenced projection */}
      <div
        className="w-full h-full flex items-center justify-center transition-opacity duration-200"
        style={{ opacity }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/${activeFrame.image_path}`}
          alt={`SPHEREx field for ${activeFrame.epoch_id}`}
          className="max-h-full max-w-full object-contain filter contrast-125 select-none"
        />
      </div>
    </div>
  );
}
