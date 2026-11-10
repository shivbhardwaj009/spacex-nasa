"""SPHEREx Spectrophotometry FastAPI Service.

Provides on-demand spectrophotometric extraction via HTTP:
  GET /spectrum?ra=269.45&dec=66.56&fov=0.2&six_bands=false
Includes static demo fallback when running offline or without live adapter data.
"""

from __future__ import annotations

import glob
import json
import math
from pathlib import Path
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from spectra.extractor import get_spectrum
from spectra.taxonomy import classify_spectral_taxonomy

app = FastAPI(
    title="SPHEREx Sky Diary Spectrophotometry API",
    description="Extracts 102-channel (0.75-5.00 um) spectrophotometric SEDs from SPHEREx data cubes.",
    version="1.0.0",
)

# Enable CORS for local Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

SPECTRA_DIR = Path("data/output/spectra")


def find_nearest_static_spectrum(
    ra: float, dec: float, max_separation_deg: float = 2.0
) -> Optional[Dict[str, Any]]:
    """Find the nearest precomputed demo spectrum from static JSON files."""
    if not SPECTRA_DIR.exists():
        return None

    json_files = list(SPECTRA_DIR.glob("*.json"))
    if not json_files:
        return None

    best_match: Optional[Dict[str, Any]] = None
    min_dist_deg = float("inf")

    cos_dec = math.cos(math.radians(dec))
    for jf in json_files:
        try:
            with open(jf, "r", encoding="utf-8") as f:
                data = json.load(f)
            cand_ra = float(data.get("ra", 0.0))
            cand_dec = float(data.get("dec", 0.0))

            dist = math.hypot((ra - cand_ra) * cos_dec, dec - cand_dec)
            if dist < min_dist_deg:
                min_dist_deg = dist
                best_match = data
                best_match["separation_arcsec"] = round(dist * 3600.0, 2)
        except Exception:
            continue

    return best_match


@app.get("/health")
def health_check() -> Dict[str, Any]:
    """Service health and catalog status."""
    static_count = len(list(SPECTRA_DIR.glob("*.json"))) if SPECTRA_DIR.exists() else 0
    return {
        "status": "online",
        "service": "spherex-spectrophotometry",
        "version": "1.0.0",
        "precomputed_spectra_available": static_count,
    }


@app.get("/spectrum")
def read_spectrum(
    ra: float = Query(..., ge=0.0, lt=360.0, description="Right Ascension in degrees (J2000)"),
    dec: float = Query(..., ge=-90.0, le=90.0, description="Declination in degrees (J2000)"),
    fov: float = Query(0.2, gt=0.0, le=5.0, description="Field of view radius in degrees"),
    six_bands: bool = Query(False, description="Pool into 6 broad detector bands"),
    demo: bool = Query(False, description="Force static demo fallback"),
) -> Dict[str, Any]:
    """Retrieve spectrophotometric SED for given celestial coordinates.

    If demo=True or live extraction encounters an uninitialized region, falls back
    to the nearest pre-computed static spectrum.
    """
    if demo:
        nearest = find_nearest_static_spectrum(ra, dec)
        if nearest:
            nearest["fallback"] = True
            return nearest

    try:
        # Live extraction from configured data source
        spec = get_spectrum(ra=ra, dec=dec, fov_deg=fov, sum_six_bands=six_bands)
        taxonomy = classify_spectral_taxonomy(
            wavelength_um=spec["wavelength_um"],
            flux=spec["flux"],
        )
        return {
            "ra": ra,
            "dec": dec,
            "fov_deg": fov,
            "is_synthetic": True,
            "fallback": False,
            "spectrum": spec,
            "taxonomy": {
                "class": taxonomy["taxonomy_class"],
                "spectral_slope_pct_per_um": taxonomy["spectral_slope_pct_per_um"],
                "absorption_features": taxonomy["absorption_features"],
            },
        }
    except Exception as exc:
        # Graceful fallback to nearest static demo point
        nearest = find_nearest_static_spectrum(ra, dec)
        if nearest:
            nearest["fallback"] = True
            nearest["error_reason"] = str(exc)
            return nearest
        raise HTTPException(
            status_code=500,
            detail=f"Live extraction failed and no static demo spectra found: {exc}",
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)
