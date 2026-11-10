"""SPHEREx Catalog Matching - Data Structures.

Defines types for known celestial bodies, ephemeris predictions,
and cross-match results.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Optional


@dataclass(frozen=True)
class KnownObject:
    """Catalog metadata and reference state vector for a known Solar System body."""
    designation: str
    name: str
    body_type: str
    ra_deg: float
    dec_deg: float
    ra_rate_arcsec_per_day: float
    dec_rate_arcsec_per_day: float
    magnitude_v: float = 15.0
    epoch_date: str = "2026-03-01T00:00:00Z"
    aliases: List[str] = field(default_factory=list)


@dataclass(frozen=True)
class EphemerisPrediction:
    """Predicted celestial coordinates and motion rates at a specific observation epoch."""
    object_name: str
    designation: str
    body_type: str
    epoch_id: str
    date: str
    ra: float
    dec: float
    ra_rate_arcsec_per_day: float
    dec_rate_arcsec_per_day: float


@dataclass
class MatchRecord:
    """Detailed result of matching a candidate mover against a known object."""
    candidate_id: str
    is_matched: bool
    match_name: Optional[str] = None
    designation: Optional[str] = None
    body_type: Optional[str] = None
    mean_distance_arcsec: float = 0.0
    velocity_diff_arcsec_day: float = 0.0
    matched_epochs_count: int = 0

