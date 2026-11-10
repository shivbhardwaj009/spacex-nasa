"""SPHEREx Mover Detection Pipeline.

Executes end-to-end transient extraction, stationary star rejection,
multi-epoch tracklet linkage, and cutout generation.
Validated against docs/schema.json v1.0.
"""

from __future__ import annotations

import json
import math
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
from PIL import Image

from data.adapter.base import EpochImage, EpochSource, RegionInfo
from data.adapter.factory import get_source, load_config
from detection.extract import SourceDetection, extract_sources
from detection.processing.pipeline import process_epochs
from detection.processing.types import ProcessedEpoch
from detection.stationary import filter_stationary_sources
from detection.tracklet import TrackletCandidate, link_tracklets
from docs.validate import validate_file

PROJECT_ROOT = Path(__file__).resolve().parent.parent


def save_cutout_image(
    image: np.ndarray,
    center_x: float,
    center_y: float,
    output_path: Path,
    cutout_size: int = 64,
) -> None:
    """Extract a 2D postage-stamp cutout centered on the detection and save as PNG."""
    ny, nx = image.shape
    half = cutout_size // 2

    ix = int(round(center_x))
    iy = int(round(center_y))

    x0 = max(0, ix - half)
    x1 = min(nx, ix + half)
    y0 = max(0, iy - half)
    y1 = min(ny, iy + half)

    patch = image[y0:y1, x0:x1]
    # Pad if near edges
    if patch.shape != (cutout_size, cutout_size):
        padded = np.zeros((cutout_size, cutout_size), dtype=np.float32)
        py0 = max(0, half - (iy - y0))
        py1 = py0 + patch.shape[0]
        px0 = max(0, half - (ix - x0))
        px1 = px0 + patch.shape[1]
        padded[py0:py1, px0:px1] = patch
        patch = padded

    # Normalize to 8-bit RGB with contrast stretch
    vmin = float(np.nanpercentile(patch, 5))
    vmax = float(np.nanpercentile(patch, 99.5))
    if vmax <= vmin:
        vmax = vmin + 1.0

    scaled = np.clip((patch - vmin) / (vmax - vmin) * 255.0, 0, 255).astype(np.uint8)
    rgb = np.stack([scaled, scaled, scaled], axis=-1)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    img = Image.fromarray(rgb, mode="RGB")
    img.save(output_path, format="PNG")


def run_detection_pipeline(
    source: EpochSource,
    region: Optional[RegionInfo | Dict[str, Any]] = None,
    fov_deg: float = 0.2,
    snr_threshold: float = 3.5,
    min_epochs: int = 3,
    max_velocity_arcsec_day: float = 120.0,
    output_dir: Optional[str | Path] = None,
) -> Dict[str, Any]:
    """Execute complete multi-epoch source extraction and tracklet linkage pipeline.

    Parameters
    ----------
    source : EpochSource
        Data adapter providing observations.
    region : RegionInfo or dict, optional
        Target region specification.
    fov_deg : float
        Search field of view in degrees.
    snr_threshold : float
        Source detection threshold in multiples of background RMS.
    min_epochs : int
        Minimum number of distinct epochs for moving tracklet.
    max_velocity_arcsec_day : float
        Maximum allowable proper motion in arcsec/day.
    output_dir : str or Path, optional
        Output destination directory.

    Returns
    -------
    candidates_payload : dict
        Schema v1.0 compliant JSON candidate catalog.
    """
    if isinstance(region, dict):
        reg = RegionInfo.from_dict(region)
    elif isinstance(region, RegionInfo):
        reg = region
    else:
        reg = RegionInfo()

    out_base = Path(output_dir or (PROJECT_ROOT / "data" / "output"))
    cutouts_dir = out_base / "cutouts"
    candidates_json = out_base / "candidates.json"
    cutouts_dir.mkdir(parents=True, exist_ok=True)

    # 1. Process and align multi-epoch images onto common reference grid
    processed_epochs = process_epochs(
        source=source,
        region=reg,
        fov_deg=fov_deg,
        output_dir=out_base / "processed",
    )

    # 2. Extract point sources from each epoch
    epoch_detections: Dict[str, List[SourceDetection]] = {}
    for proc_ep in processed_epochs:
        # Wrap ProcessedEpoch into EpochImage interface for extractor
        ep_img = EpochImage(
            pixels=proc_ep.pixels,
            variance=proc_ep.variance,
            mask=proc_ep.mask.astype(np.uint8),
            wcs=proc_ep.wcs,
            wavelength_map=proc_ep.wavelength_map,
            metadata={"epoch_id": proc_ep.epoch_id, "date": proc_ep.date},
        )
        dets = extract_sources(ep_img, snr_threshold=snr_threshold)
        epoch_detections[proc_ep.epoch_id] = dets

    total_detections = sum(len(d) for d in epoch_detections.values())

    # 3. Filter stationary background stars
    transient_detections, stationary_stars = filter_stationary_sources(
        epoch_detections=epoch_detections,
        stationary_radius_arcsec=2.2,
        min_stationary_epochs=2,
    )

    # 4. Link transient detections into moving object tracklets
    tracklets = link_tracklets(
        detections=transient_detections,
        min_epochs=min_epochs,
        max_velocity_arcsec_day=max_velocity_arcsec_day,
        max_rms_arcsec=1.5,
    )

    # 5. Assemble Schema v1.0 Candidates Payload
    epochs_meta = [
        {"epoch_id": ep.epoch_id, "date": ep.date, "band_count": 102}
        for ep in processed_epochs
    ]

    movers: List[Dict[str, Any]] = []
    # Build dictionary of processed epoch image pixels for fast cutout access
    epoch_pix_map = {ep.epoch_id: ep.pixels for ep in processed_epochs}

    for idx, trk in enumerate(tracklets):
        obj_id = f"SPX-MOV-{idx + 1:04d}"
        detections_list: List[Dict[str, Any]] = []

        for d in trk.detections:
            cutout_filename = f"{obj_id}_{d.epoch_id}.png"
            cutout_rel_url = f"cutouts/{cutout_filename}"
            cutout_abs = cutouts_dir / cutout_filename

            if d.epoch_id in epoch_pix_map:
                save_cutout_image(
                    image=epoch_pix_map[d.epoch_id],
                    center_x=d.x_px,
                    center_y=d.y_px,
                    output_path=cutout_abs,
                    cutout_size=64,
                )

            detections_list.append({
                "epoch_id": d.epoch_id,
                "date": d.date,
                "ra": d.ra,
                "dec": d.dec,
                "flux": d.flux,
                "cutout_url": cutout_rel_url,
            })

        # Calculate confidence metric from detection SNR and astrometric fit
        snr_factor = min(1.0, trk.snr_mean / 15.0)
        rms_factor = max(0.5, 1.0 - (trk.rms_arcsec / 2.0))
        epoch_factor = min(1.0, len(trk.detections) / 5.0)
        confidence = round(float(0.70 * snr_factor + 0.15 * rms_factor + 0.15 * epoch_factor), 3)
        confidence = max(0.50, min(0.99, confidence))

        movers.append({
            "object_id": obj_id,
            "ra": trk.ra_ref,
            "dec": trk.dec_ref,
            "type": "unknown",  # Awaiting Module 4 catalog cross-matching
            "match_name": None,
            "confidence": confidence,
            "is_synthetic": True,  # Mandatory Rule 2 for synthetic data
            "motion": {
                "ra_rate_arcsec_per_day": trk.ra_rate_arcsec_per_day,
                "dec_rate_arcsec_per_day": trk.dec_rate_arcsec_per_day,
            },
            "detections": detections_list,
            "spectrum": None,  # Awaiting Module 5 spectrophotometric extraction
        })

    payload = {
        "schema_version": "1.0",
        "data_version": "v0.1.0-detection",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "fov_deg": fov_deg,
        "region": reg.to_dict(),
        "epochs": epochs_meta,
        "movers": movers,
    }

    # Write output candidates.json
    with open(candidates_json, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)

    # Validate output against schema v1.0
    validate_file(candidates_json)

    return payload
