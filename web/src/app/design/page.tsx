"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Button,
  Badge,
  TestDataBadge,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Panel,
  Tooltip,
  Tabs,
  TabsList,
  TabTrigger,
  TabContent,
  Slider,
  Modal,
} from "@/components/ui";

export default function DesignSystemPage() {
  const [sliderVal, setSliderVal] = useState(3);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <div className="min-h-screen bg-space-950 text-space-100 p-6 md:p-12 max-w-7xl mx-auto space-y-12">
      {/* Header */}
      <header className="border-b border-white/10 pb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl font-bold bg-gradient-to-r from-cyan-400 via-sky-300 to-amber-300 bg-clip-text text-transparent font-sans">
              SPHEREx Sky Diary
            </span>
            <Badge variant="known" size="sm">Design System v1.0</Badge>
            <TestDataBadge />
          </div>
          <p className="text-sm text-space-400 font-mono">
            Accessible design tokens, deep space glass surfaces, and WCAG AA compliant interactive components.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="outline" size="sm">
              ← Return to Sky Diary App
            </Button>
          </Link>
        </div>
      </header>

      {/* 1. Design Tokens: Colors & Typography */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-space-50 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-cyan-400" />
          1. Cosmic Design Tokens & Contrast
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
          <div className="p-4 rounded-xl bg-space-950 border border-white/10 flex flex-col gap-1">
            <span className="text-xs font-mono text-space-400">Deep Navy Space</span>
            <span className="font-bold text-sm text-white">#050814</span>
            <span className="text-[10px] text-space-400">WCAG AAA (&gt;15:1)</span>
          </div>
          <div className="p-4 rounded-xl bg-space-900 border border-white/10 flex flex-col gap-1">
            <span className="text-xs font-mono text-space-400">Surface Navy</span>
            <span className="font-bold text-sm text-white">#090E24</span>
            <span className="text-[10px] text-space-400">Base Canvas</span>
          </div>
          <div className="p-4 rounded-xl bg-cyan-950/80 border border-cyan-500/50 flex flex-col gap-1 text-cyan-300">
            <span className="text-xs font-mono">Cyan (Known Objects)</span>
            <span className="font-bold text-sm">#22D3EE</span>
            <span className="text-[10px]">Asteroids / Comets</span>
          </div>
          <div className="p-4 rounded-xl bg-amber-950/80 border border-amber-500/50 flex flex-col gap-1 text-amber-300">
            <span className="text-xs font-mono">Amber (Unknown Movers)</span>
            <span className="font-bold text-sm">#FBBF24</span>
            <span className="text-[10px]">Planet X Candidates</span>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-700/80 flex flex-col gap-1 text-slate-300">
            <span className="text-xs font-mono">Slate Neutral</span>
            <span className="font-bold text-sm">#94A3B8</span>
            <span className="text-[10px]">TEST DATA Badge</span>
          </div>
          <div className="p-4 rounded-xl bg-space-850 border border-white/10 flex flex-col gap-1">
            <span className="text-xs font-mono text-space-400">Glass Panel</span>
            <span className="font-bold text-sm text-white">Blur 14px</span>
            <span className="text-[10px] text-space-400">rgba(13,21,54,0.72)</span>
          </div>
        </div>
      </section>

      {/* 2. Badges */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-space-50 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-cyan-400" />
          2. Badges (Known, Unknown, TEST DATA)
        </h2>
        <Card>
          <CardContent className="flex flex-wrap items-center gap-4">
            <Badge variant="known" dot size="lg">Known Asteroid (Ceres)</Badge>
            <Badge variant="known" dot size="md">Known Object</Badge>
            <Badge variant="known" size="sm">Catalog Match</Badge>

            <div className="h-6 w-px bg-white/10 mx-2" />

            <Badge variant="unknown" dot size="lg">Unknown Mover (Planet X Candidate)</Badge>
            <Badge variant="unknown" dot size="md">Unknown Candidate</Badge>
            <Badge variant="unknown" size="sm">Unmatched</Badge>

            <div className="h-6 w-px bg-white/10 mx-2" />

            <TestDataBadge />
            <Badge variant="neutral" size="md">Epoch 04 of 05</Badge>
            <Badge variant="success" dot size="md">102 Channels Ready</Badge>
          </CardContent>
        </Card>
      </section>

      {/* 3. Buttons */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-space-50 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-cyan-400" />
          3. Accessible Buttons (Min 44px Touch Targets)
        </h2>
        <Card>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary">Primary (Cyan)</Button>
              <Button variant="secondary">Secondary (Glass)</Button>
              <Button variant="amber">Amber (Unknown Action)</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="danger">Danger</Button>
              <Button variant="primary" isLoading>Processing</Button>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="primary" size="sm">Small (36px)</Button>
              <Button variant="primary" size="md">Medium (44px Touch)</Button>
              <Button variant="primary" size="lg">Large (48px Touch)</Button>
              <Button variant="secondary" size="md" disabled>Disabled State</Button>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* 4. Cards & Translucent Panels */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-space-50 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-cyan-400" />
          4. Cards & Panels
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card accent="cyan" interactive>
            <CardHeader>
              <div className="flex items-center justify-between">
                <Badge variant="known" dot size="sm">Known</Badge>
                <span className="text-xs text-space-400 font-mono">Score: 98%</span>
              </div>
              <CardTitle>SPX-MOV-0001</CardTitle>
              <CardDescription>Matched: 2024 BX1</CardDescription>
            </CardHeader>
            <CardContent className="text-xs space-y-1 font-mono text-space-300">
              <p>RA: 269.3682° | Dec: +66.5388°</p>
              <p>Rate: 35.4&quot;/day (Δα: +32.5, Δδ: +14.2)</p>
            </CardContent>
            <CardFooter>
              <span>5 Detections</span>
              <span className="text-cyan-400 font-medium">View Spectrum →</span>
            </CardFooter>
          </Card>

          <Card accent="amber" interactive>
            <CardHeader>
              <div className="flex items-center justify-between">
                <Badge variant="unknown" dot size="sm">Unknown Mover</Badge>
                <span className="text-xs text-space-400 font-mono">Score: 92%</span>
              </div>
              <CardTitle>SPX-MOV-0002</CardTitle>
              <CardDescription>Planet X Candidate</CardDescription>
            </CardHeader>
            <CardContent className="text-xs space-y-1 font-mono text-space-300">
              <p>RA: 269.4869° | Dec: +66.5721°</p>
              <p>Rate: 5.1&quot;/day (Slow Outermost Mover)</p>
            </CardContent>
            <CardFooter>
              <span>4 Detections</span>
              <span className="text-amber-400 font-medium">Inspect Trajectory →</span>
            </CardFooter>
          </Card>

          <Panel
            title="Collapsible Diagnostics Panel"
            subtitle="Real-time SPHEREx Stack Status"
            badge={<Badge variant="neutral" size="sm">Active</Badge>}
            collapsible
          >
            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-space-400">Total Epochs:</span>
                <span className="text-white font-bold">5 Epochs</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-space-400">Wavelength Range:</span>
                <span className="text-white font-bold">0.75 - 5.00 µm</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-space-400">Optical Dispersion:</span>
                <span className="text-cyan-400 font-bold">LVF Continuous</span>
              </div>
            </div>
          </Panel>
        </div>
      </section>

      {/* 5. Tooltips, Tabs & Sliders */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-space-50 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-cyan-400" />
          5. Tooltips, Tabs & Epoch Slider
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Tooltips & Slider */}
          <Card>
            <CardHeader>
              <CardTitle>Accessible Tooltips & Epoch Scrubber</CardTitle>
              <CardDescription>Hover or tab into elements to test keyboard accessibility</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-wrap items-center gap-4">
                <Tooltip content="Catalog Match: Verified against JPL Horizons & SkyBoT" position="top">
                  <Button variant="outline" size="sm">Tooltip Top</Button>
                </Tooltip>
                <Tooltip content="Linear Variable Filter position-dependent channel map" position="bottom">
                  <Button variant="outline" size="sm">Tooltip Bottom</Button>
                </Tooltip>
                <Tooltip content="Estimated 102-point spectrophotometric energy distribution" position="right">
                  <Button variant="outline" size="sm">Tooltip Right</Button>
                </Tooltip>
              </div>

              {/* Slider */}
              <Slider
                label="Observation Epoch Scrubber (Time-lapse Control)"
                min={1}
                max={5}
                step={1}
                value={sliderVal}
                onChange={setSliderVal}
                formatValue={(v) => `Epoch 0${v} (2026-03-0${v})`}
                ticks={[
                  { value: 1, label: "Ep 01" },
                  { value: 2, label: "Ep 02" },
                  { value: 3, label: "Ep 03" },
                  { value: 4, label: "Ep 04" },
                  { value: 5, label: "Ep 05" },
                ]}
              />
            </CardContent>
          </Card>

          {/* Tabs */}
          <Card>
            <CardHeader>
              <CardTitle>Interactive Tabbed Panels</CardTitle>
              <CardDescription>Keyboard navigable via Arrow keys, Home, and End</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue={activeTab} onValueChange={setActiveTab}>
                <TabsList className="w-full justify-start">
                  <TabTrigger value="overview">Overview</TabTrigger>
                  <TabTrigger value="spectrum">102-Channel SED</TabTrigger>
                  <TabTrigger value="timelapse">Time-lapse</TabTrigger>
                </TabsList>

                <TabContent value="overview" className="mt-4 p-4 rounded-xl bg-space-900/50 border border-white/5 text-xs font-mono space-y-2">
                  <p className="text-cyan-300 font-bold">Region: SPHEREx Deep Field North</p>
                  <p className="text-space-300">RA: 269.4520° | Dec: +66.5610° | FoV: 0.20°</p>
                  <p className="text-space-400">Total Candidates Detected: 25 movers</p>
                </TabContent>

                <TabContent value="spectrum" className="mt-4 p-4 rounded-xl bg-space-900/50 border border-white/5 text-xs font-mono space-y-2">
                  <p className="text-amber-300 font-bold">Spectrophotometry (0.75 - 5.00 µm)</p>
                  <p className="text-space-300">Resolution: R ~ 35 - 130 across 6 detector arrays</p>
                  <p className="text-space-400">Absorption Features: Water ice 1.52/2.02 µm, CO2 4.26 µm</p>
                </TabContent>

                <TabContent value="timelapse" className="mt-4 p-4 rounded-xl bg-space-900/50 border border-white/5 text-xs font-mono space-y-2">
                  <p className="text-space-100 font-bold">Multi-Epoch Sky Differencing</p>
                  <p className="text-space-300">Static sky median subtracted with comparable wavelength masks</p>
                  <p className="text-space-400">Baseline separation: 6 days</p>
                </TabContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* 6. Accessible Dialog / Modal */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-space-50 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-cyan-400" />
          6. Accessible Modal Dialog
        </h2>
        <Card>
          <CardContent className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-space-100">Mover Inspection Dialog</h3>
              <p className="text-xs text-space-400 font-mono">
                Accessible dialog with focus management, backdrop dismiss, and Escape listener.
              </p>
            </div>
            <Button variant="primary" onClick={() => setIsModalOpen(true)}>
              Open Demo Modal
            </Button>
          </CardContent>
        </Card>

        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="SPX-MOV-0002 Detailed Inspection"
          description="Classification: Unknown Mover / Planet X Candidate"
          footer={
            <>
              <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
                Dismiss
              </Button>
              <Button variant="amber" onClick={() => setIsModalOpen(false)}>
                Export Astrometry (.rwo)
              </Button>
            </>
          }
        >
          <div className="space-y-4 font-mono text-xs">
            <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-500/30 text-amber-200">
              Candidate shows slow retrograding motion consistent with an extreme trans-Neptunian object
              or distant Planet X candidate at &gt;250 AU.
            </div>

            <div className="grid grid-cols-2 gap-3 text-space-300">
              <div>
                <span className="text-space-400 block">Proper Motion:</span>
                <span className="text-white font-bold">5.1&quot;/day</span>
              </div>
              <div>
                <span className="text-space-400 block">Position Angle:</span>
                <span className="text-white font-bold">146.3°</span>
              </div>
              <div>
                <span className="text-space-400 block">Mean Flux (mJy):</span>
                <span className="text-white font-bold">42.5 ± 1.8</span>
              </div>
              <div>
                <span className="text-space-400 block">Taxonomy:</span>
                <span className="text-cyan-400 font-bold">Icy Volatile Signature</span>
              </div>
            </div>
          </div>
        </Modal>
      </section>
    </div>
  );
}

