"""SPHEREx Image Processing Pipeline.

Coordinates multi-epoch background subtraction, outlier masking,
common-grid reprojection, flux normalisation, and output artifact creation.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

import numpy as np

from data.adapter.base import EpochImage, EpochSource, RegionInfo
from detection.processing.background import estimate_and_subtract_background
from detection.processing.masking import create_bad_pixel_mask
from detection.processing.normalisation import normalize_epochs
from detection.processing.reprojection import reproject_to_common_grid
from detection.processing.types import ProcessedEpoch

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent


def process_epochs(
    source: EpochSource,
    region: Optional[RegionInfo | Dict[str, Any]] = None,
    fov_deg: float = 0.2,
    output_dir: Optional[str | Path] = None,
) -> List[ProcessedEpoch]:
    """Execute complete image processing pipeline across all observation epochs.

    Parameters
    ----------
    source : EpochSource
        Data adapter providing epoch observations.
    region : RegionInfo or dict, optional
        Target region specification.
    fov_deg : float
        Field of view size in degrees (default 0.2 deg).
    output_dir : str or Path, optional
        Destination directory for processed NPZ files and manifest.json.

    Returns
    -------
    processed_epochs : list of ProcessedEpoch
        Stack of aligned, background-subtracted, and normalized epoch data cubes.
    """
    if isinstance(region, dict):
        reg = RegionInfo.from_dict(region)
    elif isinstance(region, RegionInfo):
        reg = region
    else:
        reg = RegionInfo()

    out_path = Path(output_dir or (PROJECT_ROOT / "data" / "output" / "processed"))
    out_path.mkdir(parents=True, exist_ok=True)

    # 1. Query available epochs
    epoch_infos = source.list_epochs(reg, fov_deg=fov_deg)
    if not epoch_infos:
        raise ValueError(f"No observation epochs returned for region '{reg.name}'")

    raw_images: List[EpochImage] = []
    subtracted_images: List[np.ndarray] = []
    initial_masks: List[np.ndarray] = []

    # 2. Load epochs, subtract background, and mask bad pixels/outliers
    for ep_info in epoch_infos:
        img = source.load_epoch(ep_info.epoch_id, region=reg, fov_deg=fov_deg)
        raw_images.append(img)

        # Estimate background & RMS
        sub, bkg_map, rms_map = estimate_and_subtract_background(img.pixels, mask=img.mask)
        # Create robust mask
        combined_mask = create_bad_pixel_mask(sub, adapter_mask=img.mask, rms_map=rms_map)

        subtracted_images.append(sub)
        initial_masks.append(combined_mask)

    # 3. Define common reference grid based on epoch 0
    ref_image = raw_images[0]
    target_wcs = ref_image.wcs
    target_shape = ref_image.pixels.shape

    # 4. Reproject all epochs onto common reference grid
    reprojected_pixels: List[np.ndarray] = []
    reprojected_variances: List[np.ndarray] = []
    reprojected_masks: List[np.ndarray] = []
    reprojected_wavelengths: List[np.ndarray] = []

    for idx in range(len(raw_images)):
        r_pix, r_var, r_msk, r_wave = reproject_to_common_grid(
            pixels=subtracted_images[idx],
            variance=raw_images[idx].variance,
            mask=initial_masks[idx],
            wavelength_map=raw_images[idx].wavelength_map,
            input_wcs=raw_images[idx].wcs,
            target_wcs=target_wcs,
            target_shape=target_shape,
        )
        reprojected_pixels.append(r_pix)
        reprojected_variances.append(r_var)
        reprojected_masks.append(r_msk)
        reprojected_wavelengths.append(r_wave)

    # 5. Flux normalisation using stable reference stars
    norm_pix, norm_var, scale_factors, ref_stars = normalize_epochs(
        images=reprojected_pixels,
        variances=reprojected_variances,
        masks=reprojected_masks,
    )

    # 6. Assemble ProcessedEpoch objects
    processed_stack: List[ProcessedEpoch] = []
    manifest_epoch_records: List[Dict[str, Any]] = []

    for idx, ep_info in enumerate(epoch_infos):
        proc_ep = ProcessedEpoch(
            epoch_id=ep_info.epoch_id,
            date=ep_info.date,
            pixels=norm_pix[idx],
            variance=norm_var[idx],
            mask=reprojected_masks[idx],
            wcs=target_wcs,
            wavelength_map=reprojected_wavelengths[idx],
            norm_factor=scale_factors[idx],
            metadata={
                "fov_deg": fov_deg,
                "region": reg.to_dict(),
                "original_date": ep_info.date,
                "scale_factor": scale_factors[idx],
            },
        )
        processed_stack.append(proc_ep)

        # Save individual epoch NPZ
        npz_filename = f"processed_{ep_info.epoch_id}.npz"
        npz_path = out_path / npz_filename
        np.savez_compressed(
            npz_path,
            pixels=proc_ep.pixels,
            variance=proc_ep.variance,
            mask=proc_ep.mask,
            wavelength_map=proc_ep.wavelength_map,
            norm_factor=proc_ep.norm_factor,
        )

        valid_count = int(np.sum(~proc_ep.mask))
        mean_bkg = float(np.mean(proc_ep.pixels[~proc_ep.mask])) if valid_count > 0 else 0.0

        manifest_epoch_records.append({
            "epoch_id": ep_info.epoch_id,
            "date": ep_info.date,
            "file": npz_filename,
            "norm_factor": proc_ep.norm_factor,
            "valid_pixels": valid_count,
            "unmasked_fraction": round(valid_count / float(proc_ep.pixels.size), 4),
            "mean_background": round(mean_bkg, 4),
        })

    # 7. Write manifest.json
    manifest_path = out_path / "manifest.json"
    manifest_data = {
        "schema_version": "1.0",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "region": reg.to_dict(),
        "fov_deg": fov_deg,
        "grid_shape": list(target_shape),
        "reference_stars_count": len(ref_stars),
        "reference_stars": [
            {
                "star_id": s.star_id,
                "x_px": s.x_px,
                "y_px": s.y_px,
                "mean_flux": s.mean_flux,
                "flux_scatter_rel": s.flux_scatter_rel,
            }
            for s in ref_stars
        ],
        "epochs": manifest_epoch_records,
    }

    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest_data, f, indent=2)

    return processed_stack

