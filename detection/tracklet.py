"""SPHEREx Moving Object Tracklet Linkage.

Links non-stationary multi-epoch source detections into coherent
celestial tracklets conforming to linear proper motion.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import datetime
from typing import List, Optional, Tuple

import numpy as np

from detection.extract import SourceDetection
from detection.stationary import angular_separation_arcsec


@dataclass
class TrackletCandidate:
    """Linked celestial trajectory of a moving object candidate."""
    tracklet_id: str
    ra_ref: float
    dec_ref: float
    ra_rate_arcsec_per_day: float
    dec_rate_arcsec_per_day: float
    detections: List[SourceDetection]
    rms_arcsec: float
    snr_mean: float


def _parse_iso_date(date_str: str) -> float:
    """Convert ISO date string to elapsed days since Unix epoch."""
    dt = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
    return dt.timestamp() / 86400.0


def fit_linear_trajectory(
    detections: List[SourceDetection],
) -> Tuple[float, float, float, float, float]:
    """Fit linear celestial motion: RA(t) and Dec(t).

    Returns
    -------
    ra_ref : float
        Fitted Right Ascension at t0 (degrees).
    dec_ref : float
        Fitted Declination at t0 (degrees).
    ra_rate : float
        Fitted proper motion rate in RA (arcsec/day, cos(dec) projected).
    dec_rate : float
        Fitted proper motion rate in Dec (arcsec/day).
    rms_arcsec : float
        Root-mean-square astrometric residual in arcseconds.
    """
    times = np.array([_parse_iso_date(d.date) for d in detections])
    t0 = times[0]
    dt_days = times - t0

    ras = np.array([d.ra for d in detections])
    decs = np.array([d.dec for d in detections])
    mean_dec_rad = math.radians(float(np.mean(decs)))
    cos_dec = math.cos(mean_dec_rad)

    # RA fit (projected to arcsec)
    ra_arcsec = (ras - ras[0]) * 3600.0 * cos_dec
    dec_arcsec = (decs - decs[0]) * 3600.0

    # Linear regression: y = slope * dt + intercept
    A = np.vstack([dt_days, np.ones(len(dt_days))]).T
    ra_slope, ra_c = np.linalg.lstsq(A, ra_arcsec, rcond=None)[0]
    dec_slope, dec_c = np.linalg.lstsq(A, dec_arcsec, rcond=None)[0]

    # Residuals
    res_ra = ra_arcsec - (ra_slope * dt_days + ra_c)
    res_dec = dec_arcsec - (dec_slope * dt_days + dec_c)
    rms = float(np.sqrt(np.mean(res_ra ** 2 + res_dec ** 2)))

    fitted_ra0 = ras[0] + (ra_c / (3600.0 * cos_dec))
    fitted_dec0 = decs[0] + (dec_c / 3600.0)

    return float(fitted_ra0), float(fitted_dec0), float(ra_slope), float(dec_slope), rms


def link_tracklets(
    detections: List[SourceDetection],
    min_epochs: int = 3,
    max_velocity_arcsec_day: float = 120.0,
    max_rms_arcsec: float = 1.5,
) -> List[TrackletCandidate]:
    """Link transient detections across multiple epochs into linear tracklets.

    Parameters
    ----------
    detections : list of SourceDetection
        Candidate detections with stationary stars filtered out.
    min_epochs : int
        Minimum number of distinct epoch detections required for a valid tracklet.
    max_velocity_arcsec_day : float
        Maximum allowable apparent velocity in arcsec/day.
    max_rms_arcsec : float
        Maximum astrometric residual RMS for linear motion fit.

    Returns
    -------
    list of TrackletCandidate
        Discovered moving object tracklet candidates.
    """
    if len(detections) < min_epochs:
        return []

    # Sort detections by observation timestamp
    sorted_dets = sorted(detections, key=lambda d: _parse_iso_date(d.date))

    # Group detections by epoch
    epoch_groups: dict[str, List[SourceDetection]] = {}
    for d in sorted_dets:
        epoch_groups.setdefault(d.epoch_id, []).append(d)

    unique_epochs = list(epoch_groups.keys())
    if len(unique_epochs) < min_epochs:
        return []

    tracklets: List[TrackletCandidate] = []
    used_detection_ids: set[str] = set()

    # Form tracklet seeds using first two epochs
    ep0_dets = epoch_groups[unique_epochs[0]]
    ep1_dets = epoch_groups[unique_epochs[1]]

    for d0 in ep0_dets:
        t0 = _parse_iso_date(d0.date)
        for d1 in ep1_dets:
            t1 = _parse_iso_date(d1.date)
            dt = t1 - t0
            if dt <= 0:
                continue

            sep = angular_separation_arcsec(d0.ra, d0.dec, d1.ra, d1.dec)
            vel = sep / dt
            if vel > max_velocity_arcsec_day or vel < 0.2:
                # Exclude stationary or non-physically fast pairings
                continue

            # Initial velocity estimate
            cos_dec = math.cos(math.radians((d0.dec + d1.dec) / 2.0))
            ra_rate_est = ((d1.ra - d0.ra) * 3600.0 * cos_dec) / dt
            dec_rate_est = ((d1.dec - d0.dec) * 3600.0) / dt

            # Search subsequent epochs for matching trajectory points
            candidate_chain = [d0, d1]

            for next_ep in unique_epochs[2:]:
                for next_d in epoch_groups[next_ep]:
                    if next_d.detection_id in used_detection_ids:
                        continue
                    t_next = _parse_iso_date(next_d.date)
                    dt_from_0 = t_next - t0

                    # Predicted position
                    pred_ra = d0.ra + (ra_rate_est * dt_from_0) / (3600.0 * cos_dec)
                    pred_dec = d0.dec + (dec_rate_est * dt_from_0) / 3600.0

                    pred_sep = angular_separation_arcsec(pred_ra, pred_dec, next_d.ra, next_d.dec)
                    # Gating window: allow search radius scaled to motion
                    gating_window_arcsec = max(2.5, min(12.0, vel * 0.15))
                    if pred_sep <= gating_window_arcsec:
                        candidate_chain.append(next_d)
                        break

            # Evaluate candidate chain
            if len(candidate_chain) >= min_epochs:
                ra0, dec0, ra_rate, dec_rate, rms = fit_linear_trajectory(candidate_chain)
                if rms <= max_rms_arcsec:
                    snr_mean = float(np.mean([d.snr for d in candidate_chain]))
                    tr_id = f"TRK-{len(tracklets) + 1:04d}"
                    tracklet = TrackletCandidate(
                        tracklet_id=tr_id,
                        ra_ref=round(ra0, 6),
                        dec_ref=round(dec0, 6),
                        ra_rate_arcsec_per_day=round(ra_rate, 3),
                        dec_rate_arcsec_per_day=round(dec_rate, 3),
                        detections=candidate_chain,
                        rms_arcsec=round(rms, 3),
                        snr_mean=round(snr_mean, 2),
                    )
                    tracklets.append(tracklet)
                    for d in candidate_chain:
                        used_detection_ids.add(d.detection_id)
                    break  # Matched d0 to a tracklet

    return tracklets

