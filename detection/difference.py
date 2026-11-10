"""SPHEREx Multi-Epoch Image Differencing.

Computes difference images between observation epochs with identical or
comparable Linear Variable Filter (LVF) wavelengths, propagating variance and masks.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

import numpy as np
from astropy.wcs import WCS

from detection.processing.types import ProcessedEpoch
from detection.processing.wavelength import comparable_mask


@dataclass
class DifferenceImage:
    """Container for background-subtracted, wavelength-matched difference image."""
    sci_epoch_id: str
    ref_epoch_id: str
    diff_pixels: np.ndarray       # 2D float32: I_sci - I_ref
    diff_variance: np.ndarray     # 2D float32: Var(I_sci) + Var(I_ref)
    mask: np.ndarray              # 2D bool: True = invalid or wavelength-mismatched
    wcs: WCS
    comparable_pixel_fraction: float


def compute_difference_image(
    epoch_sci: ProcessedEpoch,
    epoch_ref: ProcessedEpoch,
    tol_um: float = 0.05,
) -> DifferenceImage:
    """Compute difference image between science and reference epoch.

    Differencing is only evaluated on pixels where the Linear Variable Filter
    observed wavelengths match within tol_um.

    Parameters
    ----------
    epoch_sci : ProcessedEpoch
        Science observation epoch.
    epoch_ref : ProcessedEpoch
        Reference observation epoch.
    tol_um : float
        Wavelength comparability tolerance in micrometers.

    Returns
    -------
    DifferenceImage
        Difference pixel grid, propagated variance, and comparability mask.
    """
    if epoch_sci.pixels.shape != epoch_ref.pixels.shape:
        raise ValueError(
            f"Shape mismatch: {epoch_sci.pixels.shape} vs {epoch_ref.pixels.shape}"
        )

    # 1. Determine wavelength comparability mask
    comp_mask = comparable_mask(epoch_sci, epoch_ref, tol_um=tol_um)

    # 2. Subtract images: D = I_sci - I_ref
    diff_pixels = (epoch_sci.pixels - epoch_ref.pixels).astype(np.float32)

    # 3. Propagate photometric variance: Var(D) = Var(I_sci) + Var(I_ref)
    diff_variance = (epoch_sci.variance + epoch_ref.variance).astype(np.float32)

    # 4. Construct final difference mask:
    # A pixel is masked if either input is masked OR wavelengths are not comparable
    combined_mask = epoch_sci.mask | epoch_ref.mask | (~comp_mask)

    # Zero out non-comparable / masked pixels
    diff_pixels[combined_mask] = 0.0

    total_pixels = float(diff_pixels.size)
    comp_fraction = float(np.sum(comp_mask)) / total_pixels if total_pixels > 0 else 0.0

    return DifferenceImage(
        sci_epoch_id=epoch_sci.epoch_id,
        ref_epoch_id=epoch_ref.epoch_id,
        diff_pixels=diff_pixels,
        diff_variance=diff_variance,
        mask=combined_mask,
        wcs=epoch_sci.wcs,
        comparable_pixel_fraction=round(comp_fraction, 4),
    )

