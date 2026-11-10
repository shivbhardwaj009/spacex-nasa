"""SPHEREx Mover Detection - Model Differencing.

Differences individual observation epochs against the static-sky template model.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import List, Tuple

import numpy as np
from astropy.wcs import WCS

from detection.processing.types import ProcessedEpoch


@dataclass
class EpochDifference:
    """Result of subtracting static-sky model from a single observation epoch."""
    epoch_id: str
    date: str
    diff_pixels: np.ndarray    # D = I_epoch - M_static
    diff_variance: np.ndarray  # Var(D) = Var(I_epoch) + Var(M_static)
    mask: np.ndarray           # Combined invalid mask
    wcs: WCS
    wavelength_map: np.ndarray


def difference_epoch_against_model(
    epoch: ProcessedEpoch,
    static_model: np.ndarray,
    static_variance: np.ndarray,
    static_mask: np.ndarray,
) -> EpochDifference:
    """Subtract static-sky template model from single epoch image.

    Parameters
    ----------
    epoch : ProcessedEpoch
        Target observation epoch.
    static_model : np.ndarray
        2D static-sky template model.
    static_variance : np.ndarray
        2D variance map of static template.
    static_mask : np.ndarray
        2D boolean mask of static template.

    Returns
    -------
    EpochDifference
        Residual difference image container with propagated uncertainties.
    """
    diff_pixels = (epoch.pixels - static_model).astype(np.float32)
    diff_variance = (epoch.variance + static_variance).astype(np.float32)
    diff_mask = epoch.mask | static_mask

    # Zero out masked regions
    diff_pixels[diff_mask] = 0.0

    return EpochDifference(
        epoch_id=epoch.epoch_id,
        date=epoch.date,
        diff_pixels=diff_pixels,
        diff_variance=diff_variance,
        mask=diff_mask,
        wcs=epoch.wcs,
        wavelength_map=epoch.wavelength_map,
    )


def difference_all_epochs(
    epochs: List[ProcessedEpoch],
    static_model: np.ndarray,
    static_variance: np.ndarray,
    static_mask: np.ndarray,
) -> List[EpochDifference]:
    """Difference all epochs against static-sky template."""
    return [
        difference_epoch_against_model(ep, static_model, static_variance, static_mask)
        for ep in epochs
    ]

