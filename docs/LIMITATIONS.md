# SPHEREx Sky Diary — Scientific Limitations & Known Boundaries

**Challenge:** NASA Space Apps Challenge 2026: Planet X and SPHEREx  
**Contract Version:** 1.0  
**Transparency Principle:** We state limitations plainly without exaggeration.

---

## 1. Synthetic Validation MVP (Pre-Flight Data Release)
- **Current Data Status:** The pipeline and web frontend are validated end-to-end on synthetic data (`MockSource`) and archived ephemerides. All synthetic data carries a mandatory, persistent **`TEST DATA`** badge.
- **Flight Data Boundary:** Official NASA/IPAC IRSA SPHEREx public survey data products (Level 2/3 calibrated spectral cubes) have not yet been released. When real data becomes available, switching `data_source: irsa` in `config/settings.yaml` activates the verified IRSA adapter without architectural changes.
- **No False Discoveries:** No candidate generated in mock mode is ever claimed or presented as a real physical Solar System discovery.

---

## 2. Astrometric & Kinematic Detection Boundaries
- **Slow Movers & Distant Planet X Candidates:**
  - Orbiting bodies beyond the Kuiper Belt (e.g. Planet X / Planet Nine at 300–700 AU) move at apparent rates of $\sim 0.5 - 2.0$ arcsec/day.
  - Detecting very slow movers requires long observational baselines (months to years) across multiple semi-annual SPHEREx survey passes. Fast cadence over few days will miss sub-arcsecond daily motion.
- **Fast Near-Earth Objects (NEOs):**
  - High-speed NEOs traversing $>150$ arcsec/day may trail across individual detector exposures or exit the narrow deep-field cutout within 1–2 epochs, failing the $N \ge 3$ epoch linking threshold.
- **Constant Velocity Approximation:**
  - The pipeline currently fits linear motion ($\mu_\alpha^*, \mu_\delta$) across epochs. Over baselines longer than a few weeks, apparent topocentric reflex motion from Earth's orbital parallax introduces significant orbital curvature, which requires quadratic or full Keplerian orbit fitting.

---

## 3. Spectrophotometric & Instrument Calibration
- **Linear Variable Filter (LVF) Effects:**
  - SPHEREx achieves spectrophotometry using linear variable filters where the observed wavelength depends continuously on focal plane position.
  - While our mock generator and adapter model this wavelength gradient across the 6 detector arrays, true on-orbit flat-fielding and point-spread function (PSF) variations across the LVF will require IRSA-provided calibration kernels.
- **Signal-to-Noise Thresholds:**
  - Detection thresholds ($S/N \ge 3.5$) and aperture radius parameters are provisional. In crowded galactic plane fields, stellar confusion noise increases false positive linking rates.

---

## 4. Catalog Matching & Ephemeris Coverage
- **Catalog Incompleteness:**
  - "Unknown" mover candidates are objects not matched to queried databases (IMCCE SkyBoT / JPL Horizons).
  - An "Unknown" label **does not guarantee a new discovery**. It may correspond to an uncatalogued faint main-belt asteroid, a variable star subtraction residual, an image artifact, or a high-proper-motion star.
- **Offline Ephemeris Cache:**
  - When running in `--offline` mode (or during network outages), the matching engine falls back to `/matching/cache/offline_known.json`. Asteroids not present in this local cache will remain classified as Unknown candidates.

---

## 5. Scope & MVP Architecture
- **Single Deep-Field Focus for MVP:**
  - The precomputed dataset currently centers on the SPHEREx Deep Field North region ($1.0^\circ$ FOV). Additional challenge targets (Barnard's Star, WISE 0855, etc.) are cataloged with coordinates, but full multi-epoch pixel stacks await targeted pipeline execution or public survey coverage.

