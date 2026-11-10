"""SPHEREx Image Processing - Sigma-Clipped Background Subtraction.

Estimates and subtracts 2D sky background using photutils Background2D
and astropy sigma_clipped_stats.
"""

from __future__ import annotations

from typing import Tuple

import numpy as np
from astropy.stats import SigmaClip, sigma_clipped_stats
from photutils.background import Background2D, MedianBackground


def estimate_and_subtract_background(
    pixels: np.ndarray,
    mask: np.ndarray | None = None,
    box_size: int = 16,
    filter_size: int = 3,
    sigma: float = 3.0,
) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Estimate and subtract 2D sky background from astronomical image.

    Parameters
    ----------
    pixels : np.ndarray
        Raw 2D image pixel values.
    mask : np.ndarray, optional
        Boolean or uint8 mask (True or nonzero values indicate masked pixels).
    box_size : int
        Size in pixels of background estimation mesh box.
    filter_size : int
        Size of median filter kernel for smoothing background mesh.
    sigma : float
        Sigma-clipping threshold for rejecting stars/cosmic rays.

    Returns
    -------
    subtracted : np.ndarray
        Background-subtracted 2D pixel array.
    background : np.ndarray
        Estimated 2D background level map.
    rms : np.ndarray
        Estimated 2D background RMS noise map.
    """
    bool_mask = mask.astype(bool) if mask is not None else None
    ny, nx = pixels.shape

    # Adaptive box size to handle diverse field of views
    effective_box = min(box_size, max(4, min(ny, nx) // 4))
    sigma_clip = SigmaClip(sigma=sigma, maxiters=5)
    bkg_estimator = MedianBackground()

    try:
        bkg = Background2D(
            pixels,
            box_size=(effective_box, effective_box),
            filter_size=(filter_size, filter_size),
            sigma_clip=sigma_clip,
            bkg_estimator=bkg_estimator,
            mask=bool_mask,
            fill_value=0.0,
        )
        bkg_map = bkg.background.astype(np.float32)
        rms_map = bkg.background_rms.astype(np.float32)
    except Exception:
        # Robust fallback using astropy sigma_clipped_stats
        _, median_val, std_val = sigma_clipped_stats(pixels, mask=bool_mask, sigma=sigma)
        bkg_map = np.full_like(pixels, median_val, dtype=np.float32)
        rms_map = np.full_like(pixels, max(1e-4, std_val), dtype=np.float32)

    subtracted = (pixels - bkg_map).astype(np.float32)
    return subtracted, bkg_map, rms_map

