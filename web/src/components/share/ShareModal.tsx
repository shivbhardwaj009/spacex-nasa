"use client";

import React, { useState, useEffect } from "react";
import type { MoverCandidate } from "@/types";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { generateShareCardBlob } from "./ShareCardGenerator";

export interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  mover?: MoverCandidate | null;
  regionName?: string;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  mover,
  regionName = "SPHEREx Deep Field",
}) => {
  const [shareUrl, setShareUrl] = useState<string>("");
  const [copiedUrl, setCopiedUrl] = useState<boolean>(false);
  const [copiedEmbed, setCopiedEmbed] = useState<boolean>(false);
  const [announcement, setAnnouncement] = useState<string>("");
  const [isGeneratingPng, setIsGeneratingPng] = useState<boolean>(false);
  const [canWebShare, setCanWebShare] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setShareUrl(window.location.href);
      setCanWebShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
    }
  }, [isOpen, mover]);

  const embedCode = `<iframe src="${shareUrl}${shareUrl.includes("?") ? "&" : "?"}embed=1" width="100%" height="600" frameborder="0" title="SPHEREx Sky Diary Viewer" allow="fullscreen"></iframe>`;

  const copyToClipboard = async (text: string, type: "url" | "embed") => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === "url") {
        setCopiedUrl(true);
        setAnnouncement("Share URL copied to clipboard");
        setTimeout(() => setCopiedUrl(false), 2500);
      } else {
        setCopiedEmbed(true);
        setAnnouncement("Embed HTML snippet copied to clipboard");
        setTimeout(() => setCopiedEmbed(false), 2500);
      }
    } catch {
      setAnnouncement("Failed to copy automatically. Please copy manually.");
    }
  };

  const handleWebShare = async () => {
    if (!navigator.share) return;
    try {
      await navigator.share({
        title: mover ? `SPHEREx Mover: ${mover.object_id}` : "SPHEREx Sky Diary",
        text: mover
          ? `Check out mover candidate ${mover.object_id} (${mover.match_name || mover.type}) on SPHEREx Sky Diary!`
          : "Explore candidate solar system movers in SPHEREx infrared sky surveys.",
        url: shareUrl,
      });
      setAnnouncement("Shared successfully");
    } catch {
      // User cancelled or unsupported
    }
  };

  const handleDownloadPng = async () => {
    if (!mover) return;
    try {
      setIsGeneratingPng(true);
      const blob = await generateShareCardBlob({ mover, regionName });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `SPHEREx_${mover.object_id}_share.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setAnnouncement("Share card PNG downloaded");
    } catch (err) {
      console.error(err);
      setAnnouncement("Failed to render share card image.");
    } finally {
      setIsGeneratingPng(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={mover ? `Share ${mover.object_id}` : "Share Sky Diary View"}
      size="lg"
    >
      <div className="flex flex-col gap-5 text-slate-200">
        {/* Screen reader live region */}
        <div aria-live="polite" className="sr-only">
          {announcement}
        </div>

        {/* 1. Direct Link */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="share-link-input" className="text-xs font-semibold text-slate-300">
            Direct Link (Includes Coordinates & Selected Target)
          </label>
          <div className="flex items-center gap-2">
            <input
              id="share-link-input"
              type="text"
              readOnly
              value={shareUrl}
              className="flex-1 bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-2 text-xs font-mono text-cyan-300 focus:outline-none focus:ring-2 focus:ring-cyan-400 select-all"
            />
            <Button
              variant={copiedUrl ? "primary" : "secondary"}
              size="sm"
              onClick={() => copyToClipboard(shareUrl, "url")}
            >
              {copiedUrl ? "Copied!" : "Copy"}
            </Button>
          </div>
        </div>

        {/* 2. Web Share API */}
        {canWebShare && (
          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950/60 border border-slate-800">
            <span className="text-xs text-slate-300">Share directly via system apps:</span>
            <Button variant="outline" size="sm" onClick={handleWebShare}>
              📤 Share with Device...
            </Button>
          </div>
        )}

        {/* 3. Image Share Card (if mover selected) */}
        {mover && (
          <div className="flex flex-col gap-2 p-3.5 rounded-lg bg-slate-950/70 border border-slate-800">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200">
                Social Media Share Card (PNG)
              </span>
              <Button
                variant="primary"
                size="sm"
                onClick={handleDownloadPng}
                disabled={isGeneratingPng}
                className="gap-1.5"
              >
                <span>🖼</span>
                <span>{isGeneratingPng ? "Rendering..." : "Download Card (PNG)"}</span>
              </Button>
            </div>
            <p className="text-[11px] text-slate-400">
              Generates a client-side 1200×630px social card with motion rate, coordinates, classification, and test data transparency badge.
            </p>
          </div>
        )}

        {/* 4. Embed Snippet */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="embed-snippet-input" className="text-xs font-semibold text-slate-300">
            Embed in Website or Blog (Iframe)
          </label>
          <div className="flex items-center gap-2">
            <input
              id="embed-snippet-input"
              type="text"
              readOnly
              value={embedCode}
              className="flex-1 bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-2 text-xs font-mono text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 select-all"
            />
            <Button
              variant={copiedEmbed ? "primary" : "secondary"}
              size="sm"
              onClick={() => copyToClipboard(embedCode, "embed")}
            >
              {copiedEmbed ? "Copied!" : "Copy Embed"}
            </Button>
          </div>
        </div>

        {/* 5. Animated GIF Export (Documented TODO placeholder) */}
        <div className="p-3 rounded-lg bg-slate-900/40 border border-slate-800/80 text-xs text-slate-400 flex items-start gap-2.5">
          <span className="text-amber-400 text-base">ℹ</span>
          <div>
            <span className="font-semibold text-slate-300">Animated Blink GIF: </span>
            <span>
              {/* TODO(VERIFY): Client-side GIF generation requires a web-worker GIF encoder (e.g. gifshot / omggif).
                  Users can currently use the interactive Blink Comparator in the browser or screen-record time-lapses. */}
              Multi-epoch animated GIF export is planned for the v1.1 release. For live animations, toggle the Blink Comparator in the Time Bar.
            </span>
          </div>
        </div>
      </div>
    </Modal>
  );
};

