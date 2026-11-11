"use client";

import React, { useId, useMemo, useState } from "react";
import type { MoverCandidate } from "@/types";
import { Button } from "@/components/ui/Button";

export interface SpectrumChartProps {
  mover: MoverCandidate;
  className?: string;
}

interface DataPoint {
  index: number;
  wavelength: number;
  flux: number;
  fluxErr: number;
  x: number;
  y: number;
  yUpper: number;
  yLower: number;
}

export const SpectrumChart: React.FC<SpectrumChartProps> = ({ mover, className = "" }) => {
  const chartId = useId();
  const [activePoint, setActivePoint] = useState<DataPoint | null>(null);
  const [showTable, setShowTable] = useState<boolean>(false);

  const spectrum = mover.spectrum;

  // Process data points and coordinate layout
  const { points, xMin, xMax, yMin, yMax, isPartial } = useMemo(() => {
    if (!spectrum || !Array.isArray(spectrum.wavelength_um) || !Array.isArray(spectrum.flux)) {
      return { points: [], xMin: 0.75, xMax: 5.0, yMin: 0, yMax: 100, isPartial: false };
    }

    const rawPoints: { wl: number; fl: number; err: number }[] = [];
    const n = Math.min(spectrum.wavelength_um.length, spectrum.flux.length);

    for (let i = 0; i < n; i++) {
      const wl = spectrum.wavelength_um[i];
      const fl = spectrum.flux[i];
      const err = Array.isArray(spectrum.flux_err) ? spectrum.flux_err[i] ?? 0 : 0;

      if (Number.isFinite(wl) && Number.isFinite(fl)) {
        rawPoints.push({ wl, fl, err: Number.isFinite(err) ? Math.max(0, err) : 0 });
      }
    }

    if (rawPoints.length === 0) {
      return { points: [], xMin: 0.75, xMax: 5.0, yMin: 0, yMax: 100, isPartial: false };
    }

    // Sort by wavelength ascending
    rawPoints.sort((a, b) => a.wl - b.wl);

    let x0 = rawPoints[0].wl;
    let x1 = rawPoints[rawPoints.length - 1].wl;
    if (x0 === x1) {
      x0 -= 0.1;
      x1 += 0.1;
    }

    let y0 = Infinity;
    let y1 = -Infinity;
    for (const p of rawPoints) {
      const lower = p.fl - p.err;
      const upper = p.fl + p.err;
      if (lower < y0) y0 = lower;
      if (upper > y1) y1 = upper;
    }

    // Add padding to y axis
    const yPad = (y1 - y0) * 0.12 || 10;
    const finalYMin = Math.max(0, y0 - yPad);
    const finalYMax = y1 + yPad;

    // SVG coordinate space
    const width = 600;
    const height = 280;
    const padL = 60;
    const padR = 25;
    const padT = 30;
    const padB = 45;

    const plotW = width - padL - padR;
    const plotH = height - padT - padB;

    const scaleX = (val: number) => padL + ((val - x0) / (x1 - x0)) * plotW;
    const scaleY = (val: number) => padT + plotH - ((val - finalYMin) / (finalYMax - finalYMin)) * plotH;

    const mapped: DataPoint[] = rawPoints.map((p, idx) => ({
      index: idx,
      wavelength: p.wl,
      flux: p.fl,
      fluxErr: p.err,
      x: scaleX(p.wl),
      y: scaleY(p.fl),
      yUpper: scaleY(p.fl + p.err),
      yLower: scaleY(Math.max(0, p.fl - p.err)),
    }));

    return {
      points: mapped,
      xMin: x0,
      xMax: x1,
      yMin: finalYMin,
      yMax: finalYMax,
      isPartial: mapped.length > 0 && mapped.length < 10,
    };
  }, [spectrum]);

  // Generate SVG path for line and error band
  const { linePath, areaPath } = useMemo(() => {
    if (points.length === 0) return { linePath: "", areaPath: "" };

    const line = points.map((p, idx) => `${idx === 0 ? "M" : "L"} ${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

    // Error band: top forward, then bottom backward
    const upperPoints = points.map((p, idx) => `${idx === 0 ? "M" : "L"} ${p.x.toFixed(1)},${p.yUpper.toFixed(1)}`);
    const lowerPoints = [...points]
      .reverse()
      .map((p) => `L ${p.x.toFixed(1)},${p.yLower.toFixed(1)}`);
    const area = `${upperPoints.join(" ")} ${lowerPoints.join(" ")} Z`;

    return { linePath: line, areaPath: area };
  }, [points]);

  // Client-side CSV export
  const downloadCsv = () => {
    if (!spectrum || points.length === 0) return;

    const lines: string[] = [];
    lines.push("# SPHEREx Sky Diary - Spectrophotometric SED (102-channel)");
    lines.push(`# Target Object: ${mover.object_id}`);
    if (mover.match_name) {
      lines.push(`# Catalog Match: ${mover.match_name}`);
    }
    lines.push(`# Classification: ${mover.type}`);
    if (mover.is_synthetic) {
      lines.push("# NOTE: TEST DATA - Synthesized spectrum for pipeline verification only");
    }
    lines.push("wavelength_um,flux,flux_err");

    for (const p of points) {
      lines.push(`${p.wavelength.toFixed(4)},${p.flux.toFixed(4)},${p.fluxErr.toFixed(4)}`);
    }

    const csvContent = lines.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${mover.object_id}_spectrum.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!spectrum || points.length === 0) {
    return (
      <div className={`p-6 rounded-xl bg-slate-900/60 border border-slate-800 text-center ${className}`}>
        <div className="text-3xl mb-2">📊</div>
        <p className="text-sm font-semibold text-slate-300">No spectrum extracted for this candidate.</p>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          Spectrophotometry requires sufficient signal-to-noise across multi-channel filter arrays.
        </p>
      </div>
    );
  }

  const isKnown = mover.type === "known";
  const strokeColor = isKnown ? "#22d3ee" : "#fbbf24"; // cyan-400 or amber-400
  const fillColor = isKnown ? "rgba(6, 182, 212, 0.18)" : "rgba(245, 158, 11, 0.18)";

  // X-axis ticks (e.g. at 1.0, 2.0, 3.0, 4.0, 5.0)
  const xTicks = [1.0, 2.0, 3.0, 4.0, 5.0].filter((val) => val >= xMin && val <= xMax);
  // Y-axis 4 ticks
  const yTicks = [0, 0.33, 0.66, 1.0].map((t) => yMin + t * (yMax - yMin));

  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {/* Header with Title and Actions */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold uppercase tracking-wider text-[11px] text-slate-300">
            Spectrophotometry (SED)
          </span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700/60">
            {points.length} channels
          </span>
          {isPartial && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800">
              Partial spectrum ({points.length} channels)
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowTable((prev) => !prev)}
            aria-expanded={showTable}
            aria-controls={`${chartId}-table`}
            className="text-xs text-slate-400 hover:text-slate-200"
          >
            {showTable ? "Hide Data Table" : "View Data Table"}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={downloadCsv}
            className="text-xs gap-1.5 border-slate-700 hover:border-cyan-400"
          >
            <span>⬇</span>
            <span>Download CSV</span>
          </Button>
        </div>
      </div>

      {/* SVG Plot */}
      <div className="relative w-full bg-slate-950/90 rounded-xl border border-slate-800/80 p-2 overflow-hidden shadow-inner">
        <svg
          viewBox="0 0 600 280"
          className="w-full h-auto select-none"
          role="img"
          aria-label={`Spectrum plot for ${mover.object_id} spanning ${xMin.toFixed(2)} to ${xMax.toFixed(
            2
          )} micrometers`}
        >
          <defs>
            <linearGradient id={`${chartId}-grad`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={strokeColor} stopOpacity="0.3" />
              <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines and Y ticks */}
          {yTicks.map((yVal, i) => {
            const yPos = 30 + 205 - ((yVal - yMin) / (yMax - yMin)) * 205;
            return (
              <g key={`y-${i}`}>
                <line
                  x1={60}
                  y1={yPos}
                  x2={575}
                  y2={yPos}
                  stroke="#1e293b"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />
                <text
                  x={52}
                  y={yPos + 3}
                  textAnchor="end"
                  fill="#64748b"
                  fontSize="10"
                  fontFamily="monospace"
                >
                  {yVal.toFixed(0)}
                </text>
              </g>
            );
          })}

          {/* X ticks */}
          {xTicks.map((xVal, i) => {
            const xPos = 60 + ((xVal - xMin) / (xMax - xMin)) * 515;
            return (
              <g key={`x-${i}`}>
                <line
                  x1={xPos}
                  y1={30}
                  x2={xPos}
                  y2={235}
                  stroke="#1e293b"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />
                <text
                  x={xPos}
                  y={252}
                  textAnchor="middle"
                  fill="#64748b"
                  fontSize="10"
                  fontFamily="monospace"
                >
                  {xVal.toFixed(1)} µm
                </text>
              </g>
            );
          })}

          {/* Axis Labels */}
          <text
            x={317}
            y={272}
            textAnchor="middle"
            fill="#94a3b8"
            fontSize="11"
            fontWeight="bold"
          >
            Wavelength λ (µm)
          </text>
          <text
            x={16}
            y={135}
            textAnchor="middle"
            fill="#94a3b8"
            fontSize="11"
            fontWeight="bold"
            transform="rotate(-90 16 135)"
          >
            Flux (calibrated units)
          </text>

          {/* Error Band */}
          {areaPath && (
            <path
              d={areaPath}
              fill={fillColor}
              stroke="none"
              opacity="0.8"
            />
          )}

          {/* Flux Spectrum Line */}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke={strokeColor}
              strokeWidth="2.2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}

          {/* Data Points */}
          {points.map((p) => {
            const isHovered = activePoint?.index === p.index;
            return (
              <circle
                key={p.index}
                cx={p.x}
                cy={p.y}
                r={isHovered ? 5.5 : 2.5}
                fill={isHovered ? "#ffffff" : strokeColor}
                stroke={isHovered ? strokeColor : "#090d16"}
                strokeWidth={isHovered ? 2 : 1}
                onMouseEnter={() => setActivePoint(p)}
                onMouseLeave={() => setActivePoint(null)}
                className="cursor-pointer transition-all"
              >
                <title>{`Band ${p.index + 1}: ${p.wavelength.toFixed(2)} µm, Flux ${p.flux.toFixed(1)} ± ${p.fluxErr.toFixed(1)}`}</title>
              </circle>
            );
          })}

          {/* Active Tooltip within SVG */}
          {activePoint && (
            <g transform={`translate(${Math.min(460, Math.max(70, activePoint.x - 70))}, ${Math.max(35, activePoint.y - 50)})`}>
              <rect
                width="140"
                height="42"
                rx="6"
                fill="#0f172a"
                stroke="#38bdf8"
                strokeWidth="1.2"
                className="filter drop-shadow-md"
              />
              <text x="8" y="16" fill="#38bdf8" fontSize="10" fontWeight="bold">
                λ: {activePoint.wavelength.toFixed(3)} µm
              </text>
              <text x="8" y="32" fill="#e2e8f0" fontSize="10" fontFamily="monospace">
                F: {activePoint.flux.toFixed(1)} ± {activePoint.fluxErr.toFixed(1)}
              </text>
            </g>
          )}
        </svg>
      </div>

      {/* Accessible Collapsible Data Table */}
      {showTable && (
        <div
          id={`${chartId}-table`}
          className="mt-2 max-h-60 overflow-y-auto rounded-lg border border-slate-800 bg-slate-950/70 p-2 text-xs"
        >
          <table className="w-full text-left border-collapse" aria-label="Spectral photometry data points">
            <caption className="sr-only">102-channel spectrophotometry table</caption>
            <thead>
              <tr className="border-b border-slate-800 text-[11px] font-semibold text-slate-400">
                <th className="py-1 px-2">Channel</th>
                <th className="py-1 px-2">Wavelength (µm)</th>
                <th className="py-1 px-2">Flux</th>
                <th className="py-1 px-2">Uncertainty (±)</th>
              </tr>
            </thead>
            <tbody className="font-mono text-slate-300 divide-y divide-slate-800/50">
              {points.map((p) => (
                <tr key={p.index} className="hover:bg-slate-900/60">
                  <td className="py-1 px-2 text-slate-500">#{p.index + 1}</td>
                  <td className="py-1 px-2 text-cyan-300">{p.wavelength.toFixed(4)}</td>
                  <td className="py-1 px-2">{p.flux.toFixed(2)}</td>
                  <td className="py-1 px-2 text-slate-400">±{p.fluxErr.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
