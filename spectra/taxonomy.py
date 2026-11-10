"""SPHEREx Spectral Taxonomy & Absorption Feature Analysis.

Classifies extracted 0.75 - 5.0 um spectra into asteroid/comet taxonomies
(S-type, C-type, D-type) and volatile water/CO2 ice signatures.
"""

from __future__ import annotations

from typing import Any, Dict

import numpy as np


def measure_band_depth(
    wavelengths: np.ndarray,
    flux: np.ndarray,
    center_um: float,
    half_width_um: float = 0.08,
) -> float:
    """Measure fractional absorption band depth relative to local continuum."""
    # Band center region
    center_mask = np.abs(wavelengths - center_um) <= half_width_um
    # Flanking continuum regions
    left_mask = np.abs(wavelengths - (center_um - 2.5 * half_width_um)) <= half_width_um
    right_mask = np.abs(wavelengths - (center_um + 2.5 * half_width_um)) <= half_width_um

    if not np.any(center_mask) or not np.any(left_mask) or not np.any(right_mask):
        return 0.0

    f_center = float(np.mean(flux[center_mask]))
    f_left = float(np.mean(flux[left_mask]))
    f_right = float(np.mean(flux[right_mask]))
    f_continuum = (f_left + f_right) / 2.0

    if f_continuum <= 0:
        return 0.0

    depth = max(0.0, 1.0 - (f_center / f_continuum))
    return round(float(depth), 4)


def classify_spectral_taxonomy(
    wavelength_um: np.ndarray,
    flux: np.ndarray,
) -> Dict[str, Any]:
    """Classify 0.75 - 5.0 um spectrum into astrophysical taxonomies.

    Taxonomic Criteria:
    -------------------
    1. **Icy Body / Planet X Candidate**:
       Deep volatile absorption bands: H2O ice at 1.52 um, 2.02 um, and broad 3.05 um feature;
       CO2 ice band at 4.26 um.
    2. **S-type (Siliceous / Stony)**:
       Characteristic 1.05 um and 2.00 um olivine/pyroxene silicate absorption features,
       with red continuum slope falling past 2.5 um.
    3. **C-type (Carbonaceous)**:
       Flat, neutral, or slightly reddish continuum without silicate absorption.
    4. **D-type (Organic-rich / Trojan / Centaur)**:
       Very steep, featureless red continuum slope extending to 3.0 um.

    Returns
    -------
    dict
        Taxonomy classification, spectral slope, and measured absorption band depths.
    """
    w = np.asarray(wavelength_um)
    f = np.asarray(flux)

    # Reference flux at ~1.0 um for normalization
    ref_idx = int(np.argmin(np.abs(w - 1.0)))
    f_ref = max(1e-4, float(f[ref_idx]))
    f_norm = f / f_ref

    # Spectral slope S' between 0.85 um and 2.2 um (% per micrometer)
    idx_085 = int(np.argmin(np.abs(w - 0.85)))
    idx_220 = int(np.argmin(np.abs(w - 2.20)))
    slope_pct_per_um = ((f_norm[idx_220] - f_norm[idx_085]) / (w[idx_220] - w[idx_085])) * 100.0

    # Measure diagnostic absorption band depths
    depth_silicate_1um = measure_band_depth(w, f_norm, center_um=1.05, half_width_um=0.08)
    depth_silicate_2um = measure_band_depth(w, f_norm, center_um=2.00, half_width_um=0.12)
    depth_ice_15um = measure_band_depth(w, f_norm, center_um=1.52, half_width_um=0.07)
    depth_ice_20um = measure_band_depth(w, f_norm, center_um=2.02, half_width_um=0.08)
    depth_ice_30um = measure_band_depth(w, f_norm, center_um=3.05, half_width_um=0.18)
    depth_co2_42um = measure_band_depth(w, f_norm, center_um=4.26, half_width_um=0.06)

    # Classification logic
    if (depth_ice_15um > 0.15) or (depth_ice_20um > 0.20) or (depth_ice_30um > 0.25):
        taxonomy = "Icy Body (Volatile Ice / Planet X Candidate)"
    elif (depth_silicate_1um > 0.08) and (depth_silicate_2um > 0.05):
        taxonomy = "S-type (Siliceous / Stony Asteroid)"
    elif slope_pct_per_um > 25.0:
        taxonomy = "D-type (Organic-rich / Trojan / Centaur)"
    elif -5.0 <= slope_pct_per_um <= 18.0:
        taxonomy = "C-type (Carbonaceous / Primitive Asteroid)"
    else:
        taxonomy = "X-type / Unclassified"

    return {
        "taxonomy_class": taxonomy,
        "spectral_slope_pct_per_um": round(float(slope_pct_per_um), 2),
        "absorption_features": {
            "silicate_1.05um_depth": depth_silicate_1um,
            "silicate_2.00um_depth": depth_silicate_2um,
            "h2o_ice_1.52um_depth": depth_ice_15um,
            "h2o_ice_2.02um_depth": depth_ice_20um,
            "h2o_ice_3.05um_depth": depth_ice_30um,
            "co2_ice_4.26um_depth": depth_co2_42um,
        },
    }

