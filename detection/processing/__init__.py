"""SPHEREx Image Processing Package.

Provides 2D background subtraction, bad-pixel/outlier masking,
common-grid reprojection, flux normalisation, and wavelength comparability masking.
"""

from detection.processing.background import estimate_and_subtract_background
from detection.processing.masking import create_bad_pixel_mask
from detection.processing.normalisation import normalize_epochs, select_reference_stars
from detection.processing.pipeline import process_epochs
from detection.processing.reprojection import reproject_to_common_grid
from detection.processing.types import ProcessedEpoch
from detection.processing.wavelength import (
    comparable_mask,
    compute_wavelength_difference,
)

__all__ = [
    "ProcessedEpoch",
    "estimate_and_subtract_background",
    "create_bad_pixel_mask",
    "reproject_to_common_grid",
    "normalize_epochs",
    "select_reference_stars",
    "comparable_mask",
    "compute_wavelength_difference",
    "process_epochs",
]

