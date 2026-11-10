"""SPHEREx Stationary Source Rejection.

Identifies and filters out stationary background stars across multi-epoch
observations to isolate moving Solar System candidates.
"""

from __future__ import annotations

import math
from datetime import datetime
from typing import Dict, List, Set, Tuple

from detection.extract import SourceDetection


def angular_separation_arcsec(ra1: float, dec1: float, ra2: float, dec2: float) -> float:
    """Compute great-circle separation in arcseconds between two celestial points."""
    d_ra = (ra1 - ra2) * math.cos(math.radians((dec1 + dec2) / 2.0))
    d_dec = dec1 - dec2
    return math.hypot(d_ra, d_dec) * 3600.0


def filter_stationary_sources(
    epoch_detections: Dict[str, List[SourceDetection]],
    stationary_radius_arcsec: float = 2.0,
    min_stationary_epochs: int = 2,
) -> Tuple[List[SourceDetection], List[List[SourceDetection]]]:
    """Filter out stationary background stars from multi-epoch catalogs.

    Parameters
    ----------
    epoch_detections : dict
        Mapping from epoch_id to list of SourceDetection objects.
    stationary_radius_arcsec : float
        Maximum spatial distance in arcsec to consider detections co-located.
    min_stationary_epochs : int
        Minimum number of distinct epochs a source must appear at the same
        location to be classified as a stationary star.

    Returns
    -------
    moving_candidates : list of SourceDetection
        Catalog of detections that are not matched to stationary stars.
    stationary_stars : list of list of SourceDetection
        Grouped stationary star detections across epochs.
    """
    all_detections: List[SourceDetection] = []
    for detections in epoch_detections.values():
        all_detections.extend(detections)

    if not all_detections:
        return [], []

    stationary_detection_ids: Set[str] = set()
    stationary_groups: List[List[SourceDetection]] = []
    visited: Set[str] = set()

    for i, d1 in enumerate(all_detections):
        if d1.detection_id in visited:
            continue

        cluster: List[SourceDetection] = [d1]
        cluster_epochs: Set[str] = {d1.epoch_id}

        for j in range(i + 1, len(all_detections)):
            d2 = all_detections[j]
            if d2.detection_id in visited:
                continue
            if d2.epoch_id in cluster_epochs:
                # Same epoch cannot be the same stationary source
                continue

            sep = angular_separation_arcsec(d1.ra, d1.dec, d2.ra, d2.dec)
            if sep <= stationary_radius_arcsec:
                cluster.append(d2)
                cluster_epochs.add(d2.epoch_id)

        if len(cluster_epochs) >= min_stationary_epochs:
            stationary_groups.append(cluster)
            for item in cluster:
                stationary_detection_ids.add(item.detection_id)
                visited.add(item.detection_id)

    # Moving candidates are detections that were NOT tagged as stationary
    moving_candidates = [
        d for d in all_detections if d.detection_id not in stationary_detection_ids
    ]

    return moving_candidates, stationary_groups

