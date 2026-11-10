"""SPHEREx Mover Detection - Artifact Rejection.

Filters candidate tracklets against instrumental artifacts, zero-motion residuals,
and Linear Variable Filter (LVF) color gradient effects.
"""

from __future__ import annotations

import math
from typing import List, Tuple

import numpy as np

from detection.movers.linking import LinkedTracklet


def filter_single_epoch_events(
    tracklets: List[LinkedTracklet],
    min_epochs: int = 3,
) -> Tuple[List[LinkedTracklet], List[LinkedTracklet]]:
    """Filter out tracklets spanning fewer than min_epochs distinct observations.

    Parameters
    ----------
    tracklets : list of LinkedTracklet
        Candidate tracklets.
    min_epochs : int
        Minimum distinct epoch count required.

    Returns
    -------
    passed : list of LinkedTracklet
    rejected : list of LinkedTracklet
    """
    passed: List[LinkedTracklet] = []
    rejected: List[LinkedTracklet] = []

    for trk in tracklets:
        unique_epochs = {d.epoch_id for d in trk.detections}
        if len(unique_epochs) >= min_epochs:
            passed.append(trk)
        else:
            rejected.append(trk)

    return passed, rejected


def filter_stationary_residuals(
    tracklets: List[LinkedTracklet],
    stationary_max_rate: float = 0.8,
) -> Tuple[List[LinkedTracklet], List[LinkedTracklet]]:
    """Filter out stationary residuals exhibiting near-zero proper motion.

    Stationary stars with imperfect subtraction or PSF wings produce spurious
    residuals that cluster at zero on-sky motion.

    Parameters
    ----------
    tracklets : list of LinkedTracklet
        Candidate tracklets.
    stationary_max_rate : float
        Maximum total proper motion in arcsec/day below which a tracklet
        is flagged as a stationary artifact.

    Returns
    -------
    passed : list of LinkedTracklet
        True moving object candidates.
    rejected : list of LinkedTracklet
        Stationary artifact tracklets.
    """
    passed: List[LinkedTracklet] = []
    rejected: List[LinkedTracklet] = []

    for trk in tracklets:
        total_speed = math.hypot(
            trk.ra_rate_arcsec_per_day,
            trk.dec_rate_arcsec_per_day,
        )
        if total_speed >= stationary_max_rate:
            passed.append(trk)
        else:
            rejected.append(trk)

    return passed, rejected


def filter_response_artifacts(
    tracklets: List[LinkedTracklet],
    corr_threshold: float = 0.70,
) -> Tuple[List[LinkedTracklet], List[LinkedTracklet]]:
    """Filter out false-positive residuals caused by Linear Variable Filter response variations.

    When stars are observed across shifting detector positions, steep spectral
    energy distributions can produce difference residuals that correlate
    linearly with local wavelength.

    Parameters
    ----------
    tracklets : list of LinkedTracklet
        Candidate tracklets.
    corr_threshold : float
        Absolute Pearson correlation threshold between flux and wavelength.

    Returns
    -------
    passed : list of LinkedTracklet
    rejected : list of LinkedTracklet
    """
    passed: List[LinkedTracklet] = []
    rejected: List[LinkedTracklet] = []

    for trk in tracklets:
        if len(trk.detections) < 3:
            passed.append(trk)
            continue

        fluxes = np.array([d.flux for d in trk.detections], dtype=np.float64)
        waves = np.array([d.wavelength_um for d in trk.detections], dtype=np.float64)

        # Check variance
        if np.std(fluxes) < 1e-3 or np.std(waves) < 1e-3:
            passed.append(trk)
            continue

        # Pearson correlation
        corr_matrix = np.corrcoef(fluxes, waves)
        r_val = float(corr_matrix[0, 1])

        # If flux strongly correlates with filter wavelength and tracklet is slow/spurious
        speed = math.hypot(trk.ra_rate_arcsec_per_day, trk.dec_rate_arcsec_per_day)
        if abs(r_val) >= corr_threshold and speed < 3.0:
            rejected.append(trk)
        else:
            passed.append(trk)

    return passed, rejected

