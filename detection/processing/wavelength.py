"""SPHEREx Image Processing - Wavelength Handling & Comparability Mask.

Maintains reprojected 2D wavelength maps and determines spectral
comparability between epochs for Linear Variable Filter (LVF) data.
"""

from __future__ import annotations

import numpy as np

from detection.processing.types import ProcessedEpoch


def comparable_mask(
    epoch_a: ProcessedEpoch,
    epoch_b: ProcessedEpoch,
    tol_um: float = 0.05,
) -> np.ndarray:
    """Identify pixel coordinates where two epochs share matching observation wavelengths.

    Because SPHEREx uses Linear Variable Filters (LVF), different pointings or
    spacecraft roll angles place different spectral bandpasses at the same celestial
    RA/Dec coordinate. Image differencing can only be performed between pixels
    observing the sky in equivalent spectral regimes.

    TODO(VERIFY): In actual SPHEREx public observations, Linear Variable Filter (LVF)
    spatial dispersion maps may require full spectral cube reconstruction or bandpass
    convolution rather than simple per-pixel wavelength matching.

    Parameters
    ----------
    epoch_a : ProcessedEpoch
        First processed epoch observation.
    epoch_b : ProcessedEpoch
        Second processed epoch observation.
    tol_um : float
        Wavelength tolerance threshold in micrometers (default 0.05 um).

    Returns
    -------
    comp_mask : np.ndarray
        2D boolean array where True indicates that both pixels are unmasked
        and their observed wavelengths match within tol_um.
    """
    if epoch_a.pixels.shape != epoch_b.pixels.shape:
        raise ValueError(
            f"Epoch dimensions mismatch: {epoch_a.pixels.shape} vs {epoch_b.pixels.shape}"
        )

    # Both pixels must be valid (not masked) and possess non-zero wavelength coverage
    valid_unmasked = (~epoch_a.mask) & (~epoch_b.mask)
    valid_wavelength = (epoch_a.wavelength_map > 0.0) & (epoch_b.wavelength_map > 0.0)

    # Wavelength proximity check
    wavelength_diff = np.abs(epoch_a.wavelength_map - epoch_b.wavelength_map)
    within_tolerance = wavelength_diff <= tol_um

    return (valid_unmasked & valid_wavelength & within_tolerance).astype(bool)


def compute_wavelength_difference(
    epoch_a: ProcessedEpoch,
    epoch_b: ProcessedEpoch,
) -> np.ndarray:
    """Compute absolute difference map between reprojected wavelength grids in microns."""
    return np.abs(epoch_a.wavelength_map - epoch_b.wavelength_map).astype(np.float32)

