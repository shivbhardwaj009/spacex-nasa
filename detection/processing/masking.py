"""SPHEREx Image Processing - Bad Pixel and Cosmic Ray Masking.

Combines adapter data quality flags with robust spatial outlier detection
to flag bad pixels, dead columns, and sharp cosmic-ray hits.
"""

from __future__ import annotations

import numpy as np
from scipy.ndimage import median_filter


def create_bad_pixel_mask(
    pixels: np.ndarray,
    adapter_mask: np.ndarray | None = None,
    rms_map: np.ndarray | None = None,
    nsigma_outlier: float = 6.0,
) -> np.ndarray:
    """Create combined boolean mask from adapter flags and spatial outliers.

    Parameters
    ----------
    pixels : np.ndarray
        2D image pixel array.
    adapter_mask : np.ndarray, optional
        Data quality mask provided by EpochSource adapter (nonzero = masked).
    rms_map : np.ndarray, optional
        Background RMS noise map. If None, estimated via MAD.
    nsigma_outlier : float
        Threshold in sigma for flagging unphysical positive/negative single-pixel spikes.

    Returns
    -------
    combined_mask : np.ndarray
        2D boolean array where True indicates bad or masked pixels.
    """
    # 1. Non-finite values
    invalid_mask = ~np.isfinite(pixels)

    # 2. Adapter data quality mask
    if adapter_mask is not None:
        base_mask = (adapter_mask.astype(bool)) | invalid_mask
    else:
        base_mask = invalid_mask.copy()

    # 3. Robust outlier detection via spatial median residual
    # Sharp single-pixel spikes (cosmic rays or hot/dead pixels) deviate strongly
    # from a 3x3 median filter compared to broad astronomical PSFs
    clean_pixels = np.where(base_mask, np.nanmedian(pixels[~base_mask]) if np.any(~base_mask) else 0.0, pixels)
    med_smooth = median_filter(clean_pixels, size=3)
    residual = clean_pixels - med_smooth

    if rms_map is not None:
        local_rms = np.maximum(1e-4, rms_map)
    else:
        # Estimate global noise via median absolute deviation (MAD)
        mad = float(np.nanmedian(np.abs(residual - np.nanmedian(residual))))
        local_rms = max(1e-4, 1.4826 * mad)

    outlier_spikes = (np.abs(residual) > (nsigma_outlier * local_rms))

    # Combine masks
    combined_mask = base_mask | outlier_spikes
    return combined_mask.astype(bool)

