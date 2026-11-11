/**
 * SPHEREx Sky Diary - Share Card Canvas Generator.
 *
 * Generates an accessible 1200x630 social share card directly in the browser via HTML5 Canvas.
 */

import type { MoverCandidate } from "@/types";
import { computeTotalRate, computePositionAngle, positionAngleToCompass } from "@/lib/motion";

export interface ShareCardOptions {
  mover: MoverCandidate;
  regionName?: string;
}

/**
 * Render a high-resolution 1200x630 PNG card on a canvas and return a data URL.
 */
export async function generateShareCardBlob(options: ShareCardOptions): Promise<Blob> {
  const { mover, regionName = "SPHEREx Deep Field" } = options;

  const width = 1200;
  const height = 630;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Unable to obtain 2D canvas context");
  }

  // 1. Background gradient
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, "#060911");
  bgGrad.addColorStop(0.5, "#0a1324");
  bgGrad.addColorStop(1, "#030712");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // 2. Space grid / accent lines
  ctx.strokeStyle = "rgba(34, 211, 238, 0.08)";
  ctx.lineWidth = 1;
  for (let x = 60; x < width; x += 100) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 60; y < height; y += 100) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  // 3. Header branding
  ctx.fillStyle = "#38bdf8"; // cyan-400
  ctx.font = "bold 24px sans-serif";
  ctx.fillText("NASA SPACE APPS CHALLENGE 2026", 70, 75);

  ctx.fillStyle = "#f8fafc";
  ctx.font = "bold 44px sans-serif";
  ctx.fillText("SPHEREx Sky Diary", 70, 128);

  ctx.fillStyle = "#94a3b8";
  ctx.font = "18px sans-serif";
  ctx.fillText(`Target Region: ${regionName}`, 70, 160);

  // 4. Badges (Known / Unknown & TEST DATA)
  const isKnown = mover.type === "known";
  let badgeX = 70;
  const badgeY = 195;

  // Type Badge
  ctx.fillStyle = isKnown ? "rgba(6, 182, 212, 0.25)" : "rgba(245, 158, 11, 0.25)";
  ctx.strokeStyle = isKnown ? "#22d3ee" : "#f59e0b";
  ctx.lineWidth = 2;
  const typeText = isKnown ? `KNOWN OBJECT: ${mover.match_name || "Catalog Matched"}` : "UNKNOWN MOVER CANDIDATE";
  const typeWidth = ctx.measureText(typeText).width + 30;

  ctx.beginPath();
  ctx.roundRect(badgeX, badgeY, typeWidth, 38, 8);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = isKnown ? "#67e8f9" : "#fcd34d";
  ctx.font = "bold 16px sans-serif";
  ctx.fillText(typeText, badgeX + 15, badgeY + 25);

  badgeX += typeWidth + 15;

  // Test Data Badge
  if (mover.is_synthetic) {
    const testText = "TEST DATA (SYNTHETIC)";
    const testWidth = ctx.measureText(testText).width + 30;

    ctx.fillStyle = "rgba(239, 68, 68, 0.25)";
    ctx.strokeStyle = "#f87171";
    ctx.beginPath();
    ctx.roundRect(badgeX, badgeY, testWidth, 38, 8);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "#fca5a5";
    ctx.font = "bold 16px sans-serif";
    ctx.fillText(testText, badgeX + 15, badgeY + 25);
  }

  // 5. Main Object Details
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 52px monospace";
  ctx.fillText(mover.object_id, 70, 310);

  // Key metrics
  const totalRate = computeTotalRate(
    mover.motion?.ra_rate_arcsec_per_day ?? 0,
    mover.motion?.dec_rate_arcsec_per_day ?? 0
  );
  const pa = computePositionAngle(
    mover.motion?.ra_rate_arcsec_per_day ?? 0,
    mover.motion?.dec_rate_arcsec_per_day ?? 0
  );
  const compass = positionAngleToCompass(pa);

  const metrics = [
    { label: "COORDINATES (J2000)", value: `RA ${mover.ra.toFixed(4)}°, Dec ${mover.dec.toFixed(4)}°` },
    { label: "PROPER MOTION", value: `${totalRate.toFixed(2)} arcsec/day (${compass})` },
    { label: "DETECTIONS / EPOCHS", value: `${mover.detections?.length || 0} observations` },
    { label: "CONFIDENCE SCORE", value: `${Math.round(mover.confidence * 100)}%` },
  ];

  const gridY = 380;
  metrics.forEach((m, idx) => {
    const x = idx % 2 === 0 ? 70 : 620;
    const y = idx < 2 ? gridY : gridY + 90;

    ctx.fillStyle = "#64748b";
    ctx.font = "14px sans-serif";
    ctx.fillText(m.label, x, y);

    ctx.fillStyle = "#e2e8f0";
    ctx.font = "bold 26px monospace";
    ctx.fillText(m.value, x, y + 32);
  });

  // 6. Disclaimer footer
  ctx.fillStyle = "#475569";
  ctx.font = "14px sans-serif";
  const disclaimer = mover.type === "known"
    ? "Spectrophotometric detection verified against SkyBoT / JPL Horizons orbital databases."
    : "No catalog match, candidate for follow-up. Not confirmed as a new discovery. Subject to orbital confirmation.";
  ctx.fillText(disclaimer, 70, 580);

  // Return as Blob
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Canvas toBlob failed"));
    }, "image/png");
  });
}
