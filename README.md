# SPHEREx Sky Diary 🔭🪐
> **NASA Space Apps Challenge 2026** — *Challenge: Planet X and SPHEREx*

**SPHEREx Sky Diary** is an open-source, web-based astronomical exploration tool that allows researchers, students, and citizen scientists to enter celestial coordinates (RA/Dec) or target names, view multi-epoch SPHEREx sky cutouts, inspect automatically detected moving objects (asteroids, comets, or undiscovered Planet X candidates), classify them as **Known** or **Unknown**, and examine their 102-channel infrared spectrophotometry ($0.75 – 5.0\,\mu\text{m}$).

---

## 📸 Screenshots & UI Preview

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ [SPHEREx Sky Diary]  [TEST DATA]   [Search RA/Dec, Target...]   [Mode: Beginner/Expert]│
├───────────────────────────────────────────────────────────┬────────────────────────────┤
│                                                           │ 🔭 DETECTED MOVERS (2)     │
│                     CELESTIAL SKY VIEW                    │ ┌────────────────────────┐ │
│                                                           │ │ SPX-MOV-0001           │ │
│                 ·           ·        ·                    │ │ 1 Ceres  [✓ Known]     │ │
│                       ·                                   │ │ Rate: 15.0"/d (NE)     │ │
│               ·     [  +  ]         ·                     │ │ Confidence: 91% [████] │ │
│                     RA 269.4520° Dec +66.5610°            │ └────────────────────────┘ │
│                                                           │ ┌────────────────────────┐ │
│                 ·                 ·                       │ │ SPX-MOV-0002           │ │
│                                                           │ │ Candidate [⚠ Unknown]  │ │
│                                                           │ │ Rate: 19.2"/d (NW)     │ │
│                                                           │ │ Confidence: 74% [███░] │ │
│                                                           │ └────────────────────────┘ │
├───────────────────────────────────────────────────────────┴────────────────────────────┤
│ TIME BAR: [◀ Prev] [▶ Play] [Next ▶] [Blink Comparator] | Epoch 1 of 5 (2026-03-01)   │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🏛️ System Architecture

The project enforces a **strictly decoupled offline-first static architecture**:

```
 ┌───────────────────────────────────────────────────────────────────────┐
 │                       OFFLINE PYTHON PIPELINE                         │
 │                                                                       │
 │   [ Data Adapter ] ──> [ /detection ] ──> [ /matching ]               │
 │   (Mock or IRSA)       (Stack Aligned)    (SkyBoT / JPL Horizons)     │
 │                                                   │                   │
 │                                                   ▼                   │
 │                                             [ /spectra ]              │
 │                                             (102-Channel SEDs)        │
 │                                                   │                   │
 │                                                   ▼                   │
 │                                      [ /data/output/candidates.json ] │
 │                                      [ /data/output/frames/*.png    ] │
 │                                      [ /data/output/cutouts/*.png   ] │
 └───────────────────────────────────────────────────┬───────────────────┘
                                                     │
                                    Validated against│
                                   docs/schema.json  │ (Draft 2020-12)
                                                     │
 ┌───────────────────────────────────────────────────▼───────────────────┐
 │                       READ-ONLY WEB FRONTEND                          │
 │                       (Next.js 14 + TS + Tailwind)                    │
 │                                                                       │
 │   • Zero server-side heavy processing or live astronomical queries    │
 │   • Reads precomputed static JSON and PNG assets                      │
 │   • Interactive Aladin Lite sky viewport with offline canvas fallback │
 │   • Blink comparator, motion trail vectors, and filmstrip time-lapses │
 │   • Native SVG 102-channel spectrophotometric curves with CSV export  │
 │   • High-visibility "TEST DATA" badges on all simulated views         │
 └───────────────────────────────────────────────────────────────────────┘
```

---

## 📜 Core Architectural Invariants

1. **Strict Versioned Schema Contract (`v1.0`):**
   All pipeline stages communicate exclusively through `/docs/schema.json`. Format breaks fail loudly at build time.
2. **Synthetic Data Transparency:**
   All mock/simulated entities have `is_synthetic: true`. The web interface displays a persistent **"TEST DATA"** badge whenever synthetic data is viewed. Simulated data is never presented as real discovery.
3. **Scientific Honesty on Unknowns:**
   "Unknown" movers explicitly state: *"No catalog match, candidate for follow-up — not a confirmed discovery."*
4. **Data Source Switch (`config/settings.yaml`):**
   A single configuration key switches between mock data generation and real NASA/IPAC IRSA SPHEREx data (`data_source: mock | irsa`).
5. **Offline & Demo Guaranteed:**
   Demo mode (`?demo=1`) runs with **zero network requests**, using local star-field rendering, cached challenge targets, and pre-validated static SEDs.

---

## 🚀 Quick Start

### 1. Installation
Clone the repository and install dependencies:

```bash
# Clone
git clone https://github.com/shivbhardwaj009/spacex-nasa.git
cd "nasa sphere x"

# Install Python & Web dependencies
make setup
```

### 2. Run the Offline Pipeline

#### Running with Synthetic Mock Data:
```bash
make pipeline-mock
# Or: python scripts/run_pipeline.py --config config/settings.yaml --data-source mock
```
This aligns epochs, extracts transients, links tracklets, queries ephemerides, attaches 102-channel SEDs, exports cutouts, validates against Schema v1.0, and syncs assets to `web/public/data`.

#### Running with Real SPHEREx IRSA Data:
```bash
make pipeline-real
# Or: python scripts/run_pipeline.py --data-source irsa
```
> [!NOTE]
> Since public SPHEREx survey cubes are pending release, running `pipeline-real` halts with a structured report of open `TODO(VERIFY)` items and does **not** silently fall back to mock data.

### 3. Start the Web App
```bash
make web
# Or: cd web && npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Testing & Verification

The codebase includes full automated tests for both the Python pipeline and web client:

```bash
# Run Python pytest test suite (61 tests)
make test

# Run Web test suite (TypeScript typecheck, ESLint, 73 Vitest tests, Axe accessibility)
cd web
npm run typecheck
npm run lint
npm test
npm run build
```

---

## 🧭 Offline Demo Mode (`demo=1`) & 3-Minute Pitch

For science demonstrations and pitch presentations where internet connectivity is unreliable:

1. Open [http://localhost:3000/?demo=1](http://localhost:3000/?demo=1).
2. The app switches to offline canvas mode and displays the **DEMO MODE ACTIVE** honesty banner.
3. Click **"▶ 3-Min Pitch Tour"** to launch the automated, scripted walkthrough following `/docs/DEMO_SCRIPT.md`:
   - Step 1: Deep field overview ($0:00 - 0:25$)
   - Step 2: Blink comparator alternating optics ($0:25 - 0:50$)
   - Step 3: Motion trail vector overlay ($0:50 - 1:20$)
   - Step 4: Known object: 1 Ceres ($1:20 - 1:50$)
   - Step 5: Unknown candidate & honest science disclaimer ($1:50 - 2:20$)
   - Step 6: 102-channel spectrophotometry SED with CSV export ($2:20 - 2:45$)
   - Step 7: Social share card ($1200\times 630$) and embed snippet ($2:45 - 3:00$)

---

## 🎯 Challenge Targets & Adding Regions

The five official NASA Space Apps Challenge targets are pre-registered as one-click quick-picks:
- **Barnard's Star:** High-proper-motion star ($10.3''/\text{yr}$)
- **Epsilon Indi B:** Cold binary brown dwarf system (T1 + T6)
- **WISE 0855-0714:** Cold sub-stellar object with putative water-ice clouds ($7.2\,\text{ly}$)
- **RW Aurigae:** Classical T Tauri binary with circumstellar accretion
- **R Draconis:** Mira-type pulsating variable red giant

Targets without precomputed pipeline data display a clear status message: *"No precomputed SPHEREx data for this target yet. Showing sky background view."* Fake data is never displayed.

To add and process a new sky region, see [`docs/TARGETS.md`](docs/TARGETS.md).

---

## ⚖️ Scientific Limitations

See [`docs/LIMITATIONS.md`](docs/LIMITATIONS.md) for full details:
- **Pre-Flight Data:** Validated on `MockSource` simulations; awaiting Level 2/3 calibrated public data.
- **Distant Bodies (Planet X):** Objects at 300–700 AU move at $\sim 0.5 - 2.0''/\text{day}$, requiring multi-month baselines between survey passes.
- **Reflex Motion:** Long baselines require quadratic or Keplerian orbit fitting to account for Earth's orbital reflex parallax.

---

## 📚 Acknowledgements & Data Attribution

- **SPHEREx Mission:** This project uses mission parameters and specifications from NASA's Spectro-Photometer for the History of the Universe, Epoch of Reionization, and Ices Explorer (SPHEREx).
- **NASA/IPAC Infrared Science Archive (IRSA):**
  > `TODO(VERIFY)`: Include formal IRSA attribution statement upon ingesting live SPHEREx public survey archives:
  > *"This research has made use of the NASA/IPAC Infrared Science Archive, which is funded by the National Aeronautics and Space Administration and operated by the California Institute of Technology."*
- **Ephemerides:** IMCCE SkyBoT Virtual Observatory service and NASA/JPL Horizons ephemeris computation service.
- **Celestial Cartography:** CDS Aladin Lite developed by the Centre de Données astronomiques de Strasbourg.
