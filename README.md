# SPHEREx Sky Diary 🔭🪐
> **NASA Space Apps Challenge 2026** — *Challenge: Planet X and SPHEREx*

SPHEREx Sky Diary is an open-source, web-based astronomical exploration tool that allows researchers and citizen scientists to enter celestial coordinates (RA/Dec) or target names, view multi-epoch SPHEREx sky cutouts, inspect automatically detected moving objects (asteroids, comets, or undiscovered Planet X candidates), classify them as **Known** or **Unknown**, and examine their 102-channel infrared spectrophotometry (0.75 – 5.0 µm).

---

## 🏛️ System Architecture

The project enforces a **strictly decoupled offline-first static architecture**:

```
 ┌────────────────────────────────────────────────────────┐
 │                   OFFLINE PYTHON PIPELINE              │
 │                                                        │
 │   [ SPHEREx Data ] ──> [ /detection ] ──> [ /matching ]│
 │                                               │        │
 │                                               ▼        │
 │                                         [ /spectra ]   │
 │                                               │        │
 │                                               ▼        │
 │                          [ /data/output/candidates.json ]
 │                          [ /data/output/cutouts/*.png   ]
 └───────────────────────────────────────────────┬────────┘
                                                 │
                                Validated against│
                               docs/schema.json  │ (Draft 2020-12)
                                                 │
 ┌───────────────────────────────────────────────▼────────┐
 │                  READ-ONLY WEB FRONTEND                │
 │                     (Next.js + TS)                     │
 │                                                        │
 │   • Reads static JSON and cutout PNGs                  │
 │   • Zero server-side or heavy browser computing        │
 │   • Aladin Lite interactive sky view                   │
 │   • "TEST DATA" warning badges for synthetic data      │
 └────────────────────────────────────────────────────────┘
```

---

## 📜 Core Architectural Invariants

1. **Strict Versioned Schema Contract (`v1.0`):**
   All pipeline stages communicate exclusively through `/docs/schema.json`. Changes require bumping the schema version and updating `/docs/CONTRACT.md`.
2. **Synthetic Data Transparency:**
   All mock/simulated entities must have `is_synthetic: true`. The web interface displays a persistent **"TEST DATA"** badge whenever synthetic data is viewed.
3. **Data Source Switch (`config/settings.yaml`):**
   A single configuration key switches between mock data generation and real NASA/IPAC IRSA SPHEREx data (`data_source: mock | irsa`).
4. **Isolated Adapter:**
   All real SPHEREx file handling is strictly isolated in `/data/adapter.py`. Unverified assumptions regarding FITS headers or wavelengths are marked with `TODO(VERIFY)`.
5. **Format Validation:**
   Every output file must validate against `/docs/schema.json` via `/docs/validate.py`. Format breaks fail loudly.

---

## 📁 Repository Structure

```
├── config/
│   └── settings.yaml          # Master configuration (data_source: mock | irsa, etc.)
├── data/
│   ├── adapter.py             # Isolated data source adapter
│   ├── mock/
│   │   └── generate_mock.py   # Seeded synthetic generator (~25 movers, 102 bands)
│   └── output/
│       ├── candidates.json    # Schema v1.0 validated candidate payload
│       └── cutouts/           # 2D synthetic astronomical cutout PNGs
├── detection/                 # Source extraction and tracklet linkage
├── matching/                  # Known Solar System object cross-matcher
├── spectra/                   # 102-channel spectrophotometry characterization
├── docs/
│   ├── schema.json            # JSON Schema (Draft 2020-12) contract v1.0
│   ├── CONTRACT.md            # API contract specification & fields documentation
│   └── validate.py            # Reusable schema and semantic validator
├── tests/
│   └── test_schema.py         # Pytest suite validating schema & edge cases
├── web/                       # Next.js + TypeScript + Tailwind web application
├── Makefile                   # Automation targets (setup, test, pipeline, web)
├── pyproject.toml             # Python package configuration
├── requirements.txt           # Python dependencies
└── README.md                  # Project documentation
```

---

## 🚀 Getting Started

### Prerequisites
- Python 3.11+
- Node.js 18+ and npm

### 1. Installation
Using Makefile:
```bash
make setup
```
Or manually:
```bash
pip install -r requirements.txt
cd web && npm install && cd ..
```

### 2. Run Tests
```bash
make test
# or
pytest -v tests
```

### 3. Generate Mock Data Pipeline
```bash
make pipeline
# or
python data/mock/generate_mock.py
```
This produces:
- `data/output/candidates.json`: 25 simulated movers (known asteroids and unknown Planet X candidates) with 102-point spectrophotometry (0.75 – 5.0 µm) across 3–6 epochs.
- `data/output/cutouts/*.png`: Synthetic 2D FITS-like cutout images.

### 4. Run the Web Application
```bash
make web
# or
cd web && npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Current Verification Status (Module 0)

| Requirement | Status | Verification |
|---|---|---|
| Monorepo layout (`/data`, `/detection`, `/matching`, `/spectra`, `/web`, `/docs`, `/tests`, `/config`) | ✅ Implemented | Verified |
| Schema Contract (`/docs/schema.json` draft 2020-12) | ✅ Implemented | Validated via `jsonschema` Draft202012Validator |
| Contract Documentation (`/docs/CONTRACT.md`) | ✅ Complete | Documented |
| Reusable Validator (`/docs/validate.py`) | ✅ Implemented | Validates schema & semantic invariants |
| Mock Generator (`/data/mock/generate_mock.py`) | ✅ Complete | 25 movers, 106 cutouts, seeded RNG |
| Schema Tests (`/tests/test_schema.py`) | ✅ Passing | 19 tests passing (invalid types, bounds, array lengths) |
| Git Setup & Push | 🔄 In Progress | Initial commit & remote push |

---

## 🔭 What to Verify Next
- `TODO(VERIFY)`: Specific FITS extension HDU structure for SPHEREx public data when released by IPAC/IRSA.
- `TODO(VERIFY)`: WCS projection parameters and spectral dispersion conventions for level 2 / level 3 SPHEREx data cubes.

