"""SPHEREx Spectrophotometry - Data Structures.

Defines containers for multi-epoch photometric samples, 102-channel SEDs,
and spectral taxonomy classifications.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Optional


@dataclass(frozen=True)
class PhotometricSample:
    """Individual spectrophotometric measurement at a specific epoch and wavelength."""
    epoch_id: str
    date: str
    wavelength_um: float
    flux: float
    flux_err: float
    snr: float


@dataclass
class ExtractedSpectrum:
    """102-channel spectrophotometric energy distribution (SED) spanning 0.75 - 5.00 um."""
    object_id: str
    wavelength_um: List[float]
    flux: List[float]
    flux_err: List[float]
    spectral_slope_pct_per_100nm: float = 0.0
    taxonomy_class: str = "Unclassified"
    absorption_features: Dict[str, float] = field(default_factory=dict)

    def __post_init__(self) -> None:
        """Enforce schema contract invariant."""
        w_len = len(self.wavelength_um)
        f_len = len(self.flux)
        e_len = len(self.flux_err)
        if not (w_len == f_len == e_len):
            raise ValueError(
                f"Array length mismatch: wavelength_um({w_len}) vs flux({f_len}) vs flux_err({e_len})"
            )
        if w_len != 102:
            raise ValueError(f"SPHEREx spectrum must contain exactly 102 channels, got {w_len}")

    def to_dict(self) -> Dict[str, List[float]]:
        """Format spectrum into schema v1.0 contract representation."""
        return {
            "wavelength_um": self.wavelength_um,
            "flux": self.flux,
            "flux_err": self.flux_err,
        }

