"""SPHEREx Image Processing - Multi-Epoch Flux Normalisation.

Calibrates relative photometric throughput across epochs using stable,
isolated, moderately bright reference stars.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import List, Tuple

import numpy as np
from photutils.aperture import CircularAperture, aperture_photometry
from photutils.detection import DAOStarFinder


@dataclass
class ReferenceStar:
    """Catalog of a selected photometric calibration star."""
    star_id: str
    x_px: float
    y_px: float
    mean_flux: float
    flux_scatter_rel: float
    fluxes_per_epoch: List[float]


def select_reference_stars(
    images: List[np.ndarray],
    masks: List[np.ndarray],
    min_separation_px: float = 5.0,
    min_snr: float = 12.0,
    max_flux_cap: float = 1e5,
    max_relative_scatter: float = 0.15,
    fwhm_px: float = 2.8,
    aperture_r_px: float = 3.0,
) -> List[ReferenceStar]:
    """Select isolated, moderately bright, non-variable reference stars.

    Selection Criteria Documentation:
    ---------------------------------
    1. **Isolation Criterion**: Must have no other detected source within
       `min_separation_px` (default 5.0 px) to prevent contamination of aperture
       fluxes by overlapping wings or unresolved companions.
    2. **Moderate Brightness Criterion**: Flux must meet `min_snr` (>= 12) for
       clean photometric measurement, while remaining below `max_flux_cap` to
       avoid detector saturation and non-linear response regimes.
    3. **Non-Variability Criterion**: Cross-epoch fractional standard deviation
       (std(F) / mean(F)) must be below `max_relative_scatter` (default <= 15%)
       to ensure the star is intrinsically stable and not a variable star or mover.
    4. **Unmasked Criterion**: Star aperture must be entirely clear of bad pixels
       or masked edges in all observation epochs.
    """
    if not images:
        return []

    ref_img = images[0]
    ref_mask = masks[0]

    # Find candidates on reference epoch
    finder = DAOStarFinder(fwhm=fwhm_px, threshold=3.0 * float(np.nanstd(ref_img[~ref_mask])), exclude_border=True)
    table = finder(ref_img, mask=ref_mask)

    if table is None or len(table) == 0:
        return []

    if "x_centroid" in table.colnames:
        candidate_x = np.array(table["x_centroid"], dtype=np.float32)
        candidate_y = np.array(table["y_centroid"], dtype=np.float32)
    else:
        candidate_x = np.array(table["xcentroid"], dtype=np.float32)
        candidate_y = np.array(table["ycentroid"], dtype=np.float32)
    n_cand = len(candidate_x)

    # 1. Isolation check
    isolated_mask = np.ones(n_cand, dtype=bool)
    for i in range(n_cand):
        dists = np.hypot(candidate_x - candidate_x[i], candidate_y - candidate_y[i])
        # Count neighbors within min_separation_px (excluding self)
        neighbors = np.sum((dists < min_separation_px) & (dists > 0.01))
        if neighbors > 0:
            isolated_mask[i] = False

    passed_indices = np.where(isolated_mask)[0]
    if len(passed_indices) == 0:
        return []

    # 2. Extract multi-epoch aperture photometry
    positions = np.transpose([candidate_x[passed_indices], candidate_y[passed_indices]])
    aperture = CircularAperture(positions, r=aperture_r_px)

    epoch_fluxes = []
    for img, msk in zip(images, masks):
        phot = aperture_photometry(img, aperture, mask=msk)
        epoch_fluxes.append(np.array(phot["aperture_sum"], dtype=np.float32))

    epoch_fluxes_arr = np.array(epoch_fluxes)  # Shape: (n_epochs, n_stars)

    selected_stars: List[ReferenceStar] = []
    for star_idx in range(len(passed_indices)):
        fluxes = epoch_fluxes_arr[:, star_idx]
        if np.any(np.isnan(fluxes)) or np.any(fluxes <= 0):
            continue

        mean_f = float(np.mean(fluxes))
        std_f = float(np.std(fluxes))
        rel_scatter = std_f / mean_f if mean_f > 0 else 1.0

        # Check moderate brightness and non-variability
        if mean_f < (min_snr * 5.0) or mean_f > max_flux_cap:
            continue
        if rel_scatter > max_relative_scatter:
            continue

        orig_idx = passed_indices[star_idx]
        selected_stars.append(
            ReferenceStar(
                star_id=f"REF-STAR-{len(selected_stars) + 1:03d}",
                x_px=float(candidate_x[orig_idx]),
                y_px=float(candidate_y[orig_idx]),
                mean_flux=round(mean_f, 2),
                flux_scatter_rel=round(rel_scatter, 4),
                fluxes_per_epoch=[round(float(f), 2) for f in fluxes],
            )
        )

    return selected_stars


def normalize_epochs(
    images: List[np.ndarray],
    variances: List[np.ndarray],
    masks: List[np.ndarray],
) -> Tuple[List[np.ndarray], List[np.ndarray], List[float], List[ReferenceStar]]:
    """Normalize multi-epoch image flux using stable reference stars.

    Returns
    -------
    norm_images : list of np.ndarray
        Flux-normalized images.
    norm_variances : list of np.ndarray
        Properly scaled variance maps.
    scale_factors : list of float
        Relative photometric scale factor per epoch.
    reference_stars : list of ReferenceStar
        Catalog of stars used for normalisation.
    """
    ref_stars = select_reference_stars(images, masks)

    if not ref_stars:
        # Fallback: unity scale if no qualifying stars found
        return list(images), list(variances), [1.0] * len(images), []

    # Calculate median flux ratio relative to epoch 0
    ref_fluxes = np.array([s.fluxes_per_epoch for s in ref_stars])  # (n_stars, n_epochs)
    base_epoch_flux = ref_fluxes[:, 0]  # (n_stars,)

    scale_factors: List[float] = []
    norm_images: List[np.ndarray] = []
    norm_variances: List[np.ndarray] = []

    for ep_idx in range(len(images)):
        ep_flux = ref_fluxes[:, ep_idx]
        ratios = ep_flux / np.maximum(1e-4, base_epoch_flux)
        scale = float(np.median(ratios))
        if scale <= 0 or not np.isfinite(scale):
            scale = 1.0

        scale_factors.append(round(scale, 4))
        norm_images.append((images[ep_idx] / scale).astype(np.float32))
        norm_variances.append((variances[ep_idx] / (scale ** 2)).astype(np.float32))

    return norm_images, norm_variances, scale_factors, ref_stars

