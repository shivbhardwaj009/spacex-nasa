"""SPHEREx Mover Detection - Core Pipeline.

Integrates static-sky modeling, model differencing, transient extraction,
tracklet linking, artifact filtering, cutout generation, and schema v1.0 export.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

import numpy as np
import yaml
from PIL import Image

from data.adapter.base import RegionInfo
from detection.movers.artifacts import (
    filter_response_artifacts,
    filter_single_epoch_events,
    filter_stationary_residuals,
)
from detection.movers.confidence import compute_mover_confidence
from detection.movers.difference import difference_all_epochs
from detection.movers.extractor import MoverDetection, extract_difference_sources
from detection.movers.linking import LinkedTracklet, link_tracklets
from detection.movers.static_sky import build_static_sky_model
from detection.processing.types import ProcessedEpoch
from docs.validate import validate_file

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent


def load_detection_config(config_path: Optional[str | Path] = None) -> Dict[str, Any]:
    """Load configuration from config/detection.yaml or fallback."""
    path = Path(config_path or (PROJECT_ROOT / "config" / "detection.yaml"))
    if not path.is_file():
        alt = PROJECT_ROOT / "config" / "settings.yaml"
        if alt.is_file():
            with open(alt, "r", encoding="utf-8") as f:
                return yaml.safe_load(f) or {}
        return {}
    with open(path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f) or {}


def extract_cutout_png(
    image: np.ndarray,
    center_x: float,
    center_y: float,
    output_path: Path,
    cutout_size: int = 64,
) -> None:
    """Extract a 2D postage-stamp cutout centered on the detection."""
    ny, nx = image.shape
    half = cutout_size // 2

    ix = int(round(center_x))
    iy = int(round(center_y))

    x0 = max(0, ix - half)
    x1 = min(nx, ix + half)
    y0 = max(0, iy - half)
    y1 = min(ny, iy + half)

    patch = image[y0:y1, x0:x1]
    if patch.shape != (cutout_size, cutout_size):
        padded = np.zeros((cutout_size, cutout_size), dtype=np.float32)
        py0 = max(0, half - (iy - y0))
        py1 = py0 + patch.shape[0]
        px0 = max(0, half - (ix - x0))
        px1 = px0 + patch.shape[1]
        padded[py0:py1, px0:px1] = patch
        patch = padded

    # Normalize contrast stretch
    p5 = float(np.nanpercentile(patch, 5))
    p99 = float(np.nanpercentile(patch, 99.5))
    span = max(1e-3, p99 - p5)

    scaled = np.clip((patch - p5) / span * 255.0, 0, 255).astype(np.uint8)
    rgb = np.stack([scaled, scaled, scaled], axis=-1)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    img = Image.fromarray(rgb, mode="RGB")
    img.save(output_path, format="PNG")


def detect_movers(
    epochs: List[ProcessedEpoch],
    region: Optional[RegionInfo | Dict[str, Any]] = None,
    config: Optional[Dict[str, Any] | str | Path] = None,
    output_dir: Optional[str | Path] = None,
    is_synthetic: bool = True,
) -> Dict[str, Any]:
    """Execute core mover detection on processed epoch stack.

    Parameters
    ----------
    epochs : list of ProcessedEpoch
        Stack of reprojected, background-subtracted, and normalized epochs from Module 2.
    region : RegionInfo or dict, optional
        Target region specification.
    config : dict or path, optional
        Detection configuration settings.
    output_dir : str or Path, optional
        Output destination directory.
    is_synthetic : bool
        Flag indicating if observations originate from synthetic source.

    Returns
    -------
    candidates_payload : dict
        Validated JSON schema v1.0 candidates payload.
    """
    if isinstance(config, (str, Path)):
        cfg = load_detection_config(config)
    elif isinstance(config, dict):
        cfg = config
    else:
        cfg = load_detection_config()

    if isinstance(region, dict):
        reg = RegionInfo.from_dict(region)
    elif isinstance(region, RegionInfo):
        reg = region
    else:
        reg = RegionInfo()

    out_base = Path(output_dir or (PROJECT_ROOT / "data" / "output"))
    cutouts_dir = out_base / "cutouts"
    candidates_file = out_base / "candidates.json"
    cutouts_dir.mkdir(parents=True, exist_ok=True)

    # 1. Static-sky model construction
    wave_tol = cfg.get("differencing", {}).get("wavelength_tol_um", 0.05)
    min_ep_med = cfg.get("differencing", {}).get("min_epochs_for_median", 2)
    static_model, static_var, static_mask = build_static_sky_model(
        epochs=epochs,
        wavelength_tol_um=wave_tol,
        min_epochs_for_median=min_ep_med,
    )

    # 2. Differencing each epoch against static-sky template
    diff_epochs = difference_all_epochs(epochs, static_model, static_var, static_mask)

    # 3. Source extraction above configurable S/N
    snr_thresh = cfg.get("extraction", {}).get("snr_threshold", 3.5)
    fwhm_px = cfg.get("extraction", {}).get("fwhm_px", 2.8)
    aperture_r = cfg.get("extraction", {}).get("aperture_radius_px", 2.5)

    detections_by_epoch: Dict[str, List[MoverDetection]] = {}
    for diff_ep in diff_epochs:
        dets = extract_difference_sources(
            diff_epoch=diff_ep,
            snr_threshold=snr_thresh,
            fwhm_px=fwhm_px,
            aperture_radius_px=aperture_r,
        )
        detections_by_epoch[diff_ep.epoch_id] = dets

    # 4. Constant-velocity tracklet linking across unequal dates
    min_det = cfg.get("tracklet", {}).get("min_detections", 3)
    max_rate = cfg.get("tracklet", {}).get("max_rate_arcsec_per_day", 120.0)
    min_rate = cfg.get("tracklet", {}).get("min_rate_arcsec_per_day", 0.5)
    match_r = cfg.get("tracklet", {}).get("match_radius_arcsec", 3.5)
    max_rms = cfg.get("tracklet", {}).get("max_rms_arcsec", 1.5)

    raw_tracklets = link_tracklets(
        detections_by_epoch=detections_by_epoch,
        min_detections=min_det,
        max_rate_arcsec_per_day=max_rate,
        min_rate_arcsec_per_day=min_rate,
        match_radius_arcsec=match_r,
        max_rms_arcsec=max_rms,
    )

    # 5. Artifact rejection filters
    # Filter A: Single-epoch events
    t_after_single, _ = filter_single_epoch_events(raw_tracklets, min_epochs=min_det)
    # Filter B: Stationary residuals (zero-motion fit)
    stat_rate = cfg.get("artifact_filters", {}).get("stationary_max_rate_arcsec_per_day", 0.8)
    t_after_stat, _ = filter_stationary_residuals(t_after_single, stationary_max_rate=stat_rate)
    # Filter C: Filter-response spectral variations
    corr_thresh = cfg.get("artifact_filters", {}).get("filter_response_corr_threshold", 0.70)
    final_tracklets, _ = filter_response_artifacts(t_after_stat, corr_threshold=corr_thresh)

    # 6. Build Candidate records with confidence scoring and cutout extraction
    epoch_pix_map = {ep.epoch_id: ep.pixels for ep in epochs}
    movers: List[Dict[str, Any]] = []

    for idx, trk in enumerate(final_tracklets):
        obj_id = f"SPX-MOV-{idx + 1:04d}"
        detections_payload: List[Dict[str, Any]] = []

        for d in trk.detections:
            cutout_name = f"{obj_id}_{d.epoch_id}.png"
            cutout_rel = f"cutouts/{cutout_name}"
            cutout_abs = cutouts_dir / cutout_name

            if d.epoch_id in epoch_pix_map:
                extract_cutout_png(
                    image=epoch_pix_map[d.epoch_id],
                    center_x=d.x_px,
                    center_y=d.y_px,
                    output_path=cutout_abs,
                    cutout_size=cfg.get("output", {}).get("cutout_size_px", 64),
                )

            detections_payload.append({
                "epoch_id": d.epoch_id,
                "date": d.date,
                "ra": d.ra,
                "dec": d.dec,
                "flux": d.flux,
                "cutout_url": cutout_rel,
            })

        # Confidence calculation
        confidence = compute_mover_confidence(
            snr_mean=trk.snr_mean,
            rms_arcsec=trk.rms_arcsec,
            epoch_count=len(trk.detections),
            max_rms_arcsec=max_rms,
            min_epochs=min_det,
            max_epochs_expected=len(epochs),
        )

        movers.append({
            "object_id": obj_id,
            "ra": trk.ra_ref,
            "dec": trk.dec_ref,
            "type": "unknown",  # Initial classification pending Module 4 catalog match
            "match_name": None,
            "confidence": confidence,
            "is_synthetic": is_synthetic,  # Rule 2: taken from source
            "motion": {
                "ra_rate_arcsec_per_day": trk.ra_rate_arcsec_per_day,
                "dec_rate_arcsec_per_day": trk.dec_rate_arcsec_per_day,
            },
            "detections": detections_payload,
            "spectrum": None,  # Pending Module 5 spectrophotometric extraction
        })

    epochs_meta = [
        {"epoch_id": ep.epoch_id, "date": ep.date, "band_count": 102}
        for ep in epochs
    ]

    payload = {
        "schema_version": "1.0",
        "data_version": "v0.1.0-mover-detection",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "fov_deg": round(float(epochs[0].metadata.get("fov_deg", 0.2)), 4),
        "region": reg.to_dict(),
        "epochs": epochs_meta,
        "movers": movers,
    }

    # 7. Write and validate candidates.json
    candidates_file.parent.mkdir(parents=True, exist_ok=True)
    with open(candidates_file, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)

    # Validate output schema contract
    validate_file(candidates_file)

    return payload
