"""SPHEREx Source Detection - Background Estimation.

Provides robust 2D background estimation and RMS noise estimation
for SPHEREx imaging data using sigma-clipping and spline/median filtering.
"""

from __future__ import annotations

from typing import Tuple

import numpy as np
from photutils.background import Background2D, MedianBackground
from astropy.stats import SigmaClip


def estimate_background_2d(
    image: np.ndarray,
    mask: np.ndarray | None = None,
    box_size: int = 16,
    filter_size: int = 3,
    sigma: float = 3.0,
) -> Tuple[np.ndarray, np.ndarray]:
    """Estimate 2D background level and RMS noise map.

    Parameters
    ----------
    image : np.ndarray
        2D pixel array.
    mask : np.ndarray, optional
        Boolean or uint8 mask (nonzero values are masked).
    box_size : int
        Size of background estimation mesh box.
    filter_size : int
        Size of median filter kernel applied to background mesh.
    sigma : float
        Sigma-clipping threshold for clipping bright sources.

    Returns
    -------
    bkg_image : np.ndarray
        2D estimated smooth background.
    bkg_rms : np.ndarray
        2D estimated background RMS noise map.
    """
    ny, nx = image.shape
    # Adjust box size if image is small
    effective_box = min(box_size, max(4, min(ny, nx) // 4))

    bool_mask = mask.astype(bool) if mask is not None else None
    sigma_clip = SigmaClip(sigma=sigma)
    bkg_estimator = MedianBackground()

    try:
        bkg = Background2D(
            image,
            box_size=(effective_box, effective_box),
            filter_size=(filter_size, filter_size),
            sigma_clip=sigma_clip,
            bkg_estimator=bkg_estimator,
            mask=bool_mask,
            fill_value=0.0,
        )
        return bkg.background.astype(np.float32), bkg.background_rms.astype(np.float32)
    except Exception:
        # Fallback to global sigma-clipped statistics if 2D mesh fails
        valid_pixels = image[~bool_mask] if bool_mask is not None else image
        med = float(np.nanmedian(valid_pixels))
        q75, q25 = np.percentile(valid_pixels, [75, 25])
        iqr_std = float((q75 - q25) / 1.349)
        std = max(1e-4, iqr_std)
        return np.full_like(image, med, dtype=np.float32), np.full_like(image, std, dtype=np.float32)

