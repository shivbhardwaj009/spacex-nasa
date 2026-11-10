"""SPHEREx Mover Detection - Static-Sky Model.

Builds a per-pixel median static-sky reference image across aligned epochs
using masked arrays and comparable Linear Variable Filter (LVF) wavelengths.
"""

from __future__ import annotations

import math
from typing import List, Tuple

import numpy as np

from detection.processing.types import ProcessedEpoch


def build_static_sky_model(
    epochs: List[ProcessedEpoch],
    wavelength_tol_um: float = 0.05,
    min_epochs_for_median: int = 2,
) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    """Construct static-sky background/template model across multi-epoch stack.

    For each pixel on the common reference grid, only epochs observing within
    a comparable wavelength bandpass (|lambda - median(lambda)| <= tol) are combined
    into the median static model.

    Parameters
    ----------
    epochs : list of ProcessedEpoch
        Stack of reprojected, background-subtracted, and normalized epochs.
    wavelength_tol_um : float
        Maximum allowable wavelength difference in microns for combining pixels.
    min_epochs_for_median : int
        Minimum number of valid unmasked epochs required to form a static model pixel.

    Returns
    -------
    static_model : np.ndarray
        2D float32 median static-sky pixel map.
    static_variance : np.ndarray
        2D float32 propagated variance map of the static template.
    static_mask : np.ndarray
        2D boolean mask (True where static model could not be reliably formed).
    """
    if not epochs:
        raise ValueError("Cannot build static-sky model from empty epoch list.")

    shape = epochs[0].pixels.shape
    n_epochs = len(epochs)

    # Stack data cubes: shape (n_epochs, ny, nx)
    pixel_cube = np.stack([ep.pixels for ep in epochs], axis=0)
    var_cube = np.stack([ep.variance for ep in epochs], axis=0)
    mask_cube = np.stack([ep.mask for ep in epochs], axis=0)
    wave_cube = np.stack([ep.wavelength_map for ep in epochs], axis=0)

    static_model = np.zeros(shape, dtype=np.float32)
    static_variance = np.full(shape, 1e6, dtype=np.float32)
    static_mask = np.ones(shape, dtype=bool)

    # Vectorized / efficient pixel-by-pixel computation
    ny, nx = shape
    for y in range(ny):
        for x in range(nx):
            valid_idx = np.where(~mask_cube[:, y, x])[0]
            if len(valid_idx) < min_epochs_for_median:
                continue

            waves = wave_cube[valid_idx, y, x]
            med_wave = float(np.median(waves))
            # Keep epochs with matching wavelength within tolerance
            comp_idx = valid_idx[np.abs(waves - med_wave) <= wavelength_tol_um]

            if len(comp_idx) >= min_epochs_for_median:
                sample_pixels = pixel_cube[comp_idx, y, x]
                sample_vars = var_cube[comp_idx, y, x]

                # Per-pixel median across unmasked, wavelength-matched epochs
                med_val = float(np.median(sample_pixels))
                static_model[y, x] = med_val

                # Asymptotic variance of sample median: (pi / (2 * N)) * var
                n_samp = len(comp_idx)
                med_var = float(np.median(sample_vars))
                static_variance[y, x] = float((math.pi / (2.0 * n_samp)) * med_var)
                static_mask[y, x] = False

    return static_model, static_variance, static_mask
