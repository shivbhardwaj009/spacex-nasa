"""SPHEREx Sky Diary - Abstract Data Adapter Interface.

Defines the core EpochSource protocol, RegionInfo, EpochInfo, and EpochImage
contracts consumed by detection, matching, and spectral pipelines.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

import numpy as np
from astropy.wcs import WCS


@dataclass(frozen=True)
class RegionInfo:
    """Target sky region metadata."""
    name: str = "SPHEREx Region"
    ra_center: float = 269.452
    dec_center: float = 66.561
    radius_deg: float = 0.5

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> RegionInfo:
        return cls(
            name=str(data.get("name", "SPHEREx Region")),
            ra_center=float(data.get("ra_center", 269.452)),
            dec_center=float(data.get("dec_center", 66.561)),
            radius_deg=float(data.get("radius_deg", 0.5)),
        )

    def to_dict(self) -> Dict[str, Any]:
        return {
            "name": self.name,
            "ra_center": self.ra_center,
            "dec_center": self.dec_center,
            "radius_deg": self.radius_deg,
        }


@dataclass(frozen=True)
class EpochInfo:
    """Metadata describing a single observation epoch."""
    epoch_id: str
    date: str
    files: List[str]
    band_count: int = 102


@dataclass
class EpochImage:
    """Container for multi-extension astronomical image and spectral metadata."""
    pixels: np.ndarray
    variance: np.ndarray
    mask: np.ndarray
    wcs: WCS
    wavelength_map: np.ndarray  # 2D float array in microns (per-pixel)
    metadata: Dict[str, Any] = field(default_factory=dict)

    def __post_init__(self) -> None:
        """Validate array shape invariants."""
        expected_shape = self.pixels.shape
        if len(expected_shape) != 2:
            raise ValueError(f"EpochImage pixels must be 2-dimensional, got {expected_shape}")
        if self.variance.shape != expected_shape:
            raise ValueError(
                f"Variance shape {self.variance.shape} does not match pixels {expected_shape}"
            )
        if self.mask.shape != expected_shape:
            raise ValueError(f"Mask shape {self.mask.shape} does not match pixels {expected_shape}")
        if self.wavelength_map.shape != expected_shape:
            raise ValueError(
                f"Wavelength map shape {self.wavelength_map.shape} does not match pixels {expected_shape}"
            )


class EpochSource(ABC):
    """Abstract interface for retrieving SPHEREx multi-epoch observations."""

    @abstractmethod
    def list_epochs(
        self,
        region: Optional[RegionInfo | Dict[str, Any]] = None,
        fov_deg: float = 0.2,
    ) -> List[EpochInfo]:
        """List observation epochs intersecting the specified region."""
        pass

    @abstractmethod
    def load_epoch(
        self,
        epoch_id: str,
        region: Optional[RegionInfo | Dict[str, Any]] = None,
        fov_deg: float = 0.2,
    ) -> EpochImage:
        """Load 2D image, variance, mask, WCS, and per-pixel wavelength map."""
        pass

