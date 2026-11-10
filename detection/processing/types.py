"""SPHEREx Image Processing - Data Structures.

Defines ProcessedEpoch container representing background-subtracted,
mask-propagated, reprojected, and flux-normalized epoch observations.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict

import numpy as np
from astropy.wcs import WCS


@dataclass
class ProcessedEpoch:
    """Reprojected, background-subtracted, normalized epoch image on a common grid."""
    epoch_id: str
    date: str
    pixels: np.ndarray           # 2D float32 array
    variance: np.ndarray         # 2D float32 array
    mask: np.ndarray             # 2D bool array (True = bad / masked)
    wcs: WCS                     # Common reference WCS
    wavelength_map: np.ndarray   # 2D float32 array in microns
    norm_factor: float = 1.0     # Flux normalization scale factor
    metadata: Dict[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        shape = self.pixels.shape
        if self.variance.shape != shape:
            raise ValueError(f"Variance shape {self.variance.shape} does not match pixels {shape}")
        if self.mask.shape != shape:
            raise ValueError(f"Mask shape {self.mask.shape} does not match pixels {shape}")
        if self.wavelength_map.shape != shape:
            raise ValueError(f"Wavelength map shape {self.wavelength_map.shape} does not match pixels {shape}")

