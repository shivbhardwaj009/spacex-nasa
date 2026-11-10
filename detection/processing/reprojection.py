"""SPHEREx Image Processing - Common Grid Reprojection.

Reprojects multi-epoch images, variances, masks, and wavelength maps
onto a single common celestial reference grid using the reproject library.
"""

from __future__ import annotations

from typing import Tuple

import numpy as np
from astropy.wcs import WCS
from reproject import reproject_interp


def reproject_to_common_grid(
    pixels: np.ndarray,
    variance: np.ndarray,
    mask: np.ndarray,
    wavelength_map: np.ndarray,
    input_wcs: WCS,
    target_wcs: WCS,
    target_shape: Tuple[int, int],
) -> Tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    """Reproject an epoch observation onto a common target WCS grid.

    Propagates pixel flux, variance, masks, and per-pixel wavelength maps.

    Parameters
    ----------
    pixels : np.ndarray
        Input 2D image pixel array.
    variance : np.ndarray
        Input 2D pixel photometric variance map.
    mask : np.ndarray
        Input boolean 2D mask (True = bad / masked).
    wavelength_map : np.ndarray
        Input 2D wavelength map in microns.
    input_wcs : WCS
        Astrometric celestial WCS of the input image.
    target_wcs : WCS
        Reference common celestial WCS.
    target_shape : tuple of (int, int)
        Output dimensions (ny, nx) on the common grid.

    Returns
    -------
    reproj_pixels : np.ndarray
        Reprojected image pixels on common grid.
    reproj_variance : np.ndarray
        Propagated photometric variance map.
    reproj_mask : np.ndarray
        Propagated boolean mask (True = masked or out-of-bounds).
    reproj_wavelength : np.ndarray
        Reprojected per-pixel wavelength map in microns.
    """
    # 1. Reproject image pixels
    reproj_pixels, footprint = reproject_interp(
        (pixels, input_wcs),
        target_wcs,
        shape_out=target_shape,
        order="bilinear",
    )

    # 2. Reproject variance map
    reproj_variance, _ = reproject_interp(
        (variance, input_wcs),
        target_wcs,
        shape_out=target_shape,
        order="bilinear",
    )

    # 3. Reproject wavelength map
    reproj_wavelength, _ = reproject_interp(
        (wavelength_map, input_wcs),
        target_wcs,
        shape_out=target_shape,
        order="bilinear",
    )

    # 4. Reproject mask using nearest neighbor to preserve discrete flag boundaries
    float_mask = mask.astype(np.float32)
    reproj_mask_float, _ = reproject_interp(
        (float_mask, input_wcs),
        target_wcs,
        shape_out=target_shape,
        order="nearest-neighbor",
    )

    # Flag unobserved / out-of-bounds regions (footprint == 0 or NaNs)
    out_of_bounds = (footprint <= 0.0) | (~np.isfinite(reproj_pixels))
    final_mask = (reproj_mask_float > 0.1) | out_of_bounds

    # Clean NaNs in data arrays for masked regions
    clean_pixels = np.nan_to_num(reproj_pixels, nan=0.0).astype(np.float32)
    clean_variance = np.nan_to_num(reproj_variance, nan=1e6).astype(np.float32)
    clean_wavelength = np.nan_to_num(reproj_wavelength, nan=0.0).astype(np.float32)

    return clean_pixels, clean_variance, final_mask.astype(bool), clean_wavelength

