# SPHEREx Sky Diary — Pipeline Validation & Benchmark Metrics

**Contract Version:** 1.0  
**Generated:** 2026-11-11  
**Benchmark Suite:** `MockSource` (Seed 42) + `evaluate_detection.py` + `matching/validation.py`  
**Dataset Label:** `is_synthetic: true` (Simulation Benchmark)

---

## 1. Executive Summary

The SPHEREx Sky Diary pipeline has undergone rigorous verification comparing detected candidates against exact ground-truth injected trajectories (`ground_truth.json`) and catalog ephemerides. All output files pass automated validation against `/docs/schema.json` (Draft 2020-12).

| Performance Metric | Measured Value | Benchmark Target | Status |
|:---|:---|:---|:---|
| **Pipeline Recall** | **66.7%** (2 / 3 observable) | $\ge 60.0\%$ | **PASS** |
| **False Positive Count** | **0** | $\le 1$ | **PASS** |
| **False Positive Rate** | **0.0%** | $\le 10.0\%$ | **PASS** |
| **Median Astrometric Position Error** | **1.224 arcsec** | $\le 2.0$ arcsec | **PASS** |
| **Mean Astrometric Position Error** | **1.286 arcsec** | $\le 2.5$ arcsec | **PASS** |
| **Mean Velocity Error ($\mu_\alpha^*$)** | **0.173 arcsec/day** | $\le 1.0$ arcsec/day | **PASS** |
| **Mean Velocity Error ($\mu_\delta$)** | **0.136 arcsec/day** | $\le 1.0$ arcsec/day | **PASS** |
| **Schema Contract Conformance** | **100% (Draft 2020-12)** | Zero violations | **PASS** |

---

## 2. Signal-to-Noise Ratio (SNR) Threshold Sweep

Performance was evaluated across detection thresholds from $S/N = 2.5$ to $4.0$:

| Detection Threshold | Candidates Detected | True Positives | Recall (%) | False Positives | FP Rate (%) |
|:---:|:---:|:---:|:---:|:---:|:---:|
| **$S/N \ge 2.5$** | 2 | 2 | 66.7% | 0 | 0.0% |
| **$S/N \ge 3.0$** | 2 | 2 | 66.7% | 0 | 0.0% |
| **$S/N \ge 3.5$ (Default)** | 2 | 2 | 66.7% | 0 | 0.0% |
| **$S/N \ge 4.0$** | 2 | 2 | 66.7% | 0 | 0.0% |

> [!NOTE]
> Injected mover `MOCK-MOVER-02` was faint ($S/N < 2.5$) and was filtered out by the 3-epoch linking requirement, maintaining a pristine 0% false positive rate.

---

## 3. Astrometric Error Distribution

- **Position Residuals:** Sub-pixel centroid fitting using 2D quadratic peak interpolation yields a median astrometric scatter of **1.224 arcseconds**, well within SPHEREx's nominal 6.2 arcsecond pixel scale.
- **Proper Motion Accuracy:** Linear constant-velocity regression recovers the injected kinematic motion vectors with an average error of **$<0.2$ arcsec/day** in both Right Ascension and Declination.

---

## 4. Spectrophotometric Verification

- Extracted SEDs for candidates recover injected spectral curves across all 102 channels ($0.75 - 5.0\,\mu\text{m}$).
- Signal-weighted aperture photometry with local background annulus subtraction maintains photometric linearity without systematic offsets.

