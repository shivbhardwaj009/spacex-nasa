#!/usr/bin/env python3
"""SPHEREx Mock Data Generator.

Generates synthetic SPHEREx candidates.json and 2D cutout images for testing
and development of the SPHEREx Sky Diary pipeline.

Strictly sets is_synthetic: true on all produced entities.
Validated against docs/schema.json v1.0.
"""

from __future__ import annotations

import json
import math
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List

import numpy as np
import yaml
from PIL import Image

# Import validator
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT))
from docs.validate import validate_file  # noqa: E402


KNOWN_ASTEROID_NAMES = [
    "1 Ceres",
    "4 Vesta",
    "2 Pallas",
    "10 Hygiea",
    "433 Eros",
    "101955 Bennu",
    "162173 Ryugu",
    "99942 Apophis",
    "3200 Phaethon",
    "2024 BX1",
    "2015 BZ509",
    "588 Achilles",
    "624 Hektor",
    "944 Hidalgo",
    "2060 Chiron",
]


def load_settings() -> Dict[str, Any]:
    """Load settings from config/settings.yaml if available."""
    settings_file = PROJECT_ROOT / "config" / "settings.yaml"
    if settings_file.is_file():
        with open(settings_file, "r", encoding="utf-8") as f:
            return yaml.safe_load(f) or {}
    return {}


def create_cutout_image(
    output_path: Path,
    size: int = 64,
    center_offset_x: float = 0.0,
    center_offset_y: float = 0.0,
    snr: float = 12.0,
    rng: np.random.Generator = None,
) -> None:
    """Generate a realistic synthetic 2D astronomical cutout with PSF and sky noise."""
    if rng is None:
        rng = np.random.default_rng()

    # Sky background noise
    bg_mean = 100.0
    bg_std = 12.0
    img_data = rng.normal(loc=bg_mean, scale=bg_std, size=(size, size))

    # Add a couple of static background stars
    num_stars = rng.integers(1, 4)
    for _ in range(num_stars):
        sx = rng.uniform(5, size - 5)
        sy = rng.uniform(5, size - 5)
        s_peak = rng.uniform(40.0, 180.0)
        yy, xx = np.ogrid[:size, :size]
        star_psf = s_peak * np.exp(-((xx - sx) ** 2 + (yy - sy) ** 2) / (2.0 * 1.5 ** 2))
        img_data += star_psf

    # Add the mover source at (center + offset)
    cx = (size / 2.0) + center_offset_x
    cy = (size / 2.0) + center_offset_y
    peak_flux = bg_std * snr
    yy, xx = np.ogrid[:size, :size]
    mover_psf = peak_flux * np.exp(-((xx - cx) ** 2 + (yy - cy) ** 2) / (2.0 * 1.8 ** 2))
    img_data += mover_psf

    # Normalize to 8-bit grayscale [0, 255]
    vmin = bg_mean - 2.5 * bg_std
    vmax = bg_mean + peak_flux * 1.2
    clipped = np.clip((img_data - vmin) / (vmax - vmin) * 255.0, 0, 255).astype(np.uint8)

    # Convert to RGB image with subtle deep-space tint
    rgb = np.zeros((size, size, 3), dtype=np.uint8)
    rgb[..., 0] = np.clip(clipped * 0.9, 0, 255).astype(np.uint8)  # R
    rgb[..., 1] = np.clip(clipped * 0.95, 0, 255).astype(np.uint8) # G
    rgb[..., 2] = clipped                                         # B

    img = Image.fromarray(rgb, mode="RGB")
    output_path.parent.mkdir(parents=True, exist_ok=True)
    img.save(output_path, format="PNG")


def generate_spectrum(
    wavelengths: np.ndarray,
    mover_type: str,
    base_flux: float,
    rng: np.random.Generator,
) -> Dict[str, List[float]]:
    """Synthesize 102-point SPHEREx spectrophotometry (0.75 - 5.0 um)."""
    # Normalized continuum
    w = wavelengths
    if mover_type == "known":
        # Asteroid: reflected solar continuum declining past 2.5 um + silicate absorption at 1.0 & 2.0 um
        # + thermal emission rising past 3.5 um
        solar_peak = np.exp(-((w - 0.8) ** 2) / (2 * 1.2 ** 2))
        silicate_1um = 0.25 * np.exp(-((w - 1.05) ** 2) / (2 * 0.15 ** 2))
        silicate_2um = 0.15 * np.exp(-((w - 2.00) ** 2) / (2 * 0.25 ** 2))
        thermal_emission = 0.6 * (1.0 / (1.0 + np.exp(-(w - 3.8) / 0.4)))
        continuum = (solar_peak - silicate_1um - silicate_2um + thermal_emission + 0.3)
    else:
        # Unknown mover / distant icy candidate (Planet X / Centaur / TNO)
        # Cold slope with deep volatile ice absorption (H2O at 1.5, 2.0, 3.0 um; CO2 ice at 4.26 um)
        ice_slope = 0.8 * (w / 5.0) ** 0.5
        h2o_15 = 0.35 * np.exp(-((w - 1.52) ** 2) / (2 * 0.12 ** 2))
        h2o_20 = 0.45 * np.exp(-((w - 2.02) ** 2) / (2 * 0.15 ** 2))
        h2o_30 = 0.60 * np.exp(-((w - 3.05) ** 2) / (2 * 0.30 ** 2))
        co2_42 = 0.40 * np.exp(-((w - 4.26) ** 2) / (2 * 0.08 ** 2))
        continuum = np.maximum(0.1, ice_slope - h2o_15 - h2o_20 - h2o_30 - co2_42 + 0.4)

    # Scale by base flux
    flux_density = base_flux * (continuum / np.mean(continuum))

    # Add realistic photometric uncertainty (3% - 6% 1-sigma noise)
    rel_err = rng.uniform(0.03, 0.06, size=len(w))
    flux_err = np.maximum(0.5, flux_density * rel_err)
    noisy_flux = rng.normal(loc=flux_density, scale=flux_err)
    noisy_flux = np.maximum(0.1, noisy_flux)

    return {
        "wavelength_um": [round(float(val), 4) for val in wavelengths],
        "flux": [round(float(val), 3) for val in noisy_flux],
        "flux_err": [round(float(val), 3) for val in flux_err],
    }


def generate_mock_dataset(
    output_json_path: Path,
    cutouts_dir: Path,
    num_movers: int = 25,
    seed: int = 42,
) -> Dict[str, Any]:
    """Generate mock dataset conforming to schema v1.0."""
    rng = np.random.default_rng(seed)

    # Sky Region: SPHEREx Deep Field North (Mock)
    ra_center = 269.452
    dec_center = 66.561
    radius_deg = 0.5
    fov_deg = 1.0

    # 6 Observation Epochs (spanning ~6 days)
    base_time = datetime(2026, 3, 1, 12, 0, 0, tzinfo=timezone.utc)
    epoch_offsets_hours = [0.0, 18.5, 42.0, 71.5, 98.0, 136.0]
    epochs: List[Dict[str, Any]] = []
    for i, offset in enumerate(epoch_offsets_hours):
        dt = base_time + timedelta(hours=offset)
        epochs.append({
            "epoch_id": f"epoch_{i + 1:02d}",
            "date": dt.isoformat(),
            "band_count": 102,
        })

    # Spectral channel grid (102 SPHEREx channels from 0.75 to 5.0 um)
    wavelengths = np.linspace(0.75, 5.00, 102)

    # Generate Movers
    num_known = int(num_movers * 0.6)  # ~15 known, ~10 unknown
    mover_indices = list(range(num_movers))
    known_set = set(rng.choice(mover_indices, size=num_known, replace=False))

    movers: List[Dict[str, Any]] = []

    for idx in range(num_movers):
        obj_id = f"SPX-MOV-{idx + 1:04d}"
        is_known = idx in known_set
        mover_type = "known" if is_known else "unknown"

        if is_known:
            name_idx = idx % len(KNOWN_ASTEROID_NAMES)
            match_name: str | None = KNOWN_ASTEROID_NAMES[name_idx]
            confidence = round(float(rng.uniform(0.85, 0.99)), 3)
        else:
            match_name = None
            confidence = round(float(rng.uniform(0.68, 0.93)), 3)

        # Reference position distributed uniformly inside circular region
        r = radius_deg * math.sqrt(rng.uniform(0.05, 0.85))
        theta = rng.uniform(0, 2 * math.pi)
        ra_ref = ra_center + (r * math.cos(theta)) / math.cos(math.radians(dec_center))
        dec_ref = dec_center + (r * math.sin(theta))

        # Motion rates in arcseconds per day
        # Asteroids move typically 15 to 45 arcsec/day; distant Planet X candidates ~1 to 5 arcsec/day
        if is_known:
            ra_rate = float(rng.uniform(-40.0, 40.0))
            dec_rate = float(rng.uniform(-25.0, 25.0))
        else:
            # Distant trans-Neptunian or Planet X mover (slow) or fast NEO
            if rng.random() > 0.4:
                # Slow mover (TNO / Planet X candidate)
                ra_rate = float(rng.uniform(-8.0, 8.0))
                dec_rate = float(rng.uniform(-6.0, 6.0))
            else:
                # High speed unknown mover
                ra_rate = float(rng.uniform(-60.0, 60.0))
                dec_rate = float(rng.uniform(-40.0, 40.0))

        # Each mover detected in 3 to 6 epochs
        num_detections = int(rng.integers(3, len(epochs) + 1))
        det_epoch_indices = sorted(rng.choice(len(epochs), size=num_detections, replace=False))

        detections: List[Dict[str, Any]] = []
        base_flux = float(rng.uniform(80.0, 950.0))

        for ep_idx in det_epoch_indices:
            ep = epochs[ep_idx]
            t_days = epoch_offsets_hours[ep_idx] / 24.0

            # Calculate on-sky trajectory (arcsec -> deg)
            delta_ra_deg = (ra_rate * t_days) / (3600.0 * math.cos(math.radians(dec_center)))
            delta_dec_deg = (dec_rate * t_days) / 3600.0

            # Astrometric measurement noise (~0.05 arcsec)
            noise_ra = float(rng.normal(0, 0.05 / 3600.0))
            noise_dec = float(rng.normal(0, 0.05 / 3600.0))

            det_ra = round(ra_ref + delta_ra_deg + noise_ra, 6)
            det_dec = round(dec_ref + delta_dec_deg + noise_dec, 6)

            # Photometric flux with small rotational light curve variation
            det_flux = round(float(base_flux * (1.0 + 0.15 * math.sin(t_days * 3.5) + rng.normal(0, 0.03))), 2)

            # Generate synthetic cutout PNG
            cutout_filename = f"{obj_id}_{ep['epoch_id']}.png"
            cutout_rel_url = f"cutouts/{cutout_filename}"
            cutout_abs_path = cutouts_dir / cutout_filename

            # Subpixel offset in cutout image
            sub_x = float(rng.uniform(-3.0, 3.0))
            sub_y = float(rng.uniform(-3.0, 3.0))
            snr = max(4.0, min(25.0, det_flux / 35.0))
            create_cutout_image(
                cutout_abs_path,
                size=64,
                center_offset_x=sub_x,
                center_offset_y=sub_y,
                snr=snr,
                rng=rng,
            )

            detections.append({
                "epoch_id": ep["epoch_id"],
                "date": ep["date"],
                "ra": det_ra,
                "dec": det_dec,
                "flux": det_flux,
                "cutout_url": cutout_rel_url,
            })

        # Synthesize 102-point spectrum (or null in rare unextracted candidate)
        spectrum = generate_spectrum(wavelengths, mover_type, base_flux, rng)

        movers.append({
            "object_id": obj_id,
            "ra": round(ra_ref, 6),
            "dec": round(dec_ref, 6),
            "type": mover_type,
            "match_name": match_name,
            "confidence": confidence,
            "is_synthetic": True,  # Mandatory Rule 2
            "motion": {
                "ra_rate_arcsec_per_day": round(ra_rate, 3),
                "dec_rate_arcsec_per_day": round(dec_rate, 3),
            },
            "detections": detections,
            "spectrum": spectrum,
        })

    payload = {
        "schema_version": "1.0",
        "data_version": "v0.1.0-mock",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "fov_deg": fov_deg,
        "region": {
            "name": "SPHEREx Deep Field North (Mock)",
            "ra_center": ra_center,
            "dec_center": dec_center,
            "radius_deg": radius_deg,
        },
        "epochs": epochs,
        "movers": movers,
    }

    # Write output JSON
    output_json_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_json_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)

    return payload


def main() -> None:
    """CLI execution for mock data generation."""
    settings = load_settings()
    num_movers = settings.get("mock", {}).get("num_movers", 25)
    seed = settings.get("mock", {}).get("random_seed", 42)

    output_dir = PROJECT_ROOT / "data" / "output"
    cutouts_dir = output_dir / "cutouts"
    output_json = output_dir / "candidates.json"

    print(f"[1/3] Generating {num_movers} mock SPHEREx movers with seed={seed}...")
    generate_mock_dataset(
        output_json_path=output_json,
        cutouts_dir=cutouts_dir,
        num_movers=num_movers,
        seed=seed,
    )
    print(f"[2/3] Output saved to {output_json}")

    print("[3/3] Validating output against schema v1.0...")
    validated = validate_file(output_json)
    print(f"[SUCCESS] Generated {len(validated['movers'])} synthetic movers. All schema invariants satisfied!")


if __name__ == "__main__":
    main()

