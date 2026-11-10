"""SPHEREx Mover Detection - Tracklet Linking.

Links transient detections into constant-velocity moving tracklets across
observations with unequal temporal spacing using pairwise seeding and extension.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import datetime
from typing import Dict, List, Set, Tuple

import numpy as np

from detection.movers.extractor import MoverDetection


@dataclass
class LinkedTracklet:
    """Linked celestial trajectory of candidate moving object."""
    tracklet_id: str
    ra_ref: float
    dec_ref: float
    ra_rate_arcsec_per_day: float
    dec_rate_arcsec_per_day: float
    detections: List[MoverDetection]
    rms_arcsec: float
    snr_mean: float


def parse_date_to_days(iso_date: str) -> float:
    """Parse ISO date string into elapsed days since Unix epoch."""
    dt = datetime.fromisoformat(iso_date.replace("Z", "+00:00"))
    return dt.timestamp() / 86400.0


def angular_distance_arcsec(ra1: float, dec1: float, ra2: float, dec2: float) -> float:
    """Calculate celestial angular distance in arcseconds."""
    cos_dec = math.cos(math.radians((dec1 + dec2) / 2.0))
    d_ra = (ra1 - ra2) * cos_dec
    d_dec = dec1 - dec2
    return math.hypot(d_ra, d_dec) * 3600.0


def fit_constant_velocity(
    detections: List[MoverDetection],
) -> Tuple[float, float, float, float, float]:
    """Fit constant-velocity linear trajectory: RA(t) and Dec(t).

    Returns
    -------
    ra0 : float
        Fitted Right Ascension at t0 in degrees.
    dec0 : float
        Fitted Declination at t0 in degrees.
    ra_rate : float
        Fitted proper motion rate in RA (arcsec/day, cos(dec) projected).
    dec_rate : float
        Fitted proper motion rate in Dec (arcsec/day).
    rms : float
        Astrometric residual RMS in arcseconds.
    """
    times = np.array([parse_date_to_days(d.date) for d in detections])
    t0 = times[0]
    dt = times - t0

    ras = np.array([d.ra for d in detections])
    decs = np.array([d.dec for d in detections])
    cos_dec = math.cos(math.radians(float(np.mean(decs))))

    # Projected coordinates in arcseconds
    x_arcsec = (ras - ras[0]) * 3600.0 * cos_dec
    y_arcsec = (decs - decs[0]) * 3600.0

    # LSTSQ linear model: [dt, 1]
    A = np.vstack([dt, np.ones(len(dt))]).T
    x_slope, x_c = np.linalg.lstsq(A, x_arcsec, rcond=None)[0]
    y_slope, y_c = np.linalg.lstsq(A, y_arcsec, rcond=None)[0]

    # Compute fit residuals
    res_x = x_arcsec - (x_slope * dt + x_c)
    res_y = y_arcsec - (y_slope * dt + y_c)
    rms = float(np.sqrt(np.mean(res_x ** 2 + res_y ** 2)))

    ra_fit_0 = float(ras[0] + (x_c / (3600.0 * cos_dec)))
    dec_fit_0 = float(decs[0] + (y_c / 3600.0))

    return ra_fit_0, dec_fit_0, float(x_slope), float(y_slope), rms


def link_tracklets(
    detections_by_epoch: Dict[str, List[MoverDetection]],
    min_detections: int = 3,
    max_rate_arcsec_per_day: float = 120.0,
    min_rate_arcsec_per_day: float = 0.5,
    match_radius_arcsec: float = 3.5,
    max_rms_arcsec: float = 1.5,
) -> List[LinkedTracklet]:
    """Link detections across epochs with unequal time spacing into moving tracklets.

    Algorithm:
    ----------
    1. Sort available observation epochs by observation date.
    2. Test pairwise detection seeds between early epochs (epoch_0 and epoch_1, etc.)
       verifying apparent speed lies in [min_rate, max_rate] arcsec/day.
    3. Extrapolate linear trajectory forward in time to each subsequent epoch using
       exact delta-t in days.
    4. Search candidate detections within `match_radius_arcsec` of predicted position.
    5. Fit constant-velocity motion and filter by astrometric residual RMS <= max_rms_arcsec.
    """
    sorted_epoch_ids = sorted(
        detections_by_epoch.keys(),
        key=lambda eid: parse_date_to_days(detections_by_epoch[eid][0].date)
        if detections_by_epoch[eid]
        else 0.0,
    )
    # Remove empty epochs
    sorted_epoch_ids = [eid for eid in sorted_epoch_ids if detections_by_epoch[eid]]

    if len(sorted_epoch_ids) < min_detections:
        return []

    tracklets: List[LinkedTracklet] = []
    used_detection_ids: Set[str] = set()

    # Iterate through potential seed pairs
    for i in range(len(sorted_epoch_ids) - 1):
        ep_seed_0 = sorted_epoch_ids[i]
        for j in range(i + 1, min(i + 3, len(sorted_epoch_ids))):
            ep_seed_1 = sorted_epoch_ids[j]

            for d0 in detections_by_epoch[ep_seed_0]:
                if d0.detection_id in used_detection_ids:
                    continue
                t0 = parse_date_to_days(d0.date)

                for d1 in detections_by_epoch[ep_seed_1]:
                    if d1.detection_id in used_detection_ids:
                        continue
                    t1 = parse_date_to_days(d1.date)
                    dt = t1 - t0
                    if dt <= 0:
                        continue

                    sep_arcsec = angular_distance_arcsec(d0.ra, d0.dec, d1.ra, d1.dec)
                    speed = sep_arcsec / dt
                    if speed < min_rate_arcsec_per_day or speed > max_rate_arcsec_per_day:
                        continue

                    # Velocity projection
                    cos_dec = math.cos(math.radians((d0.dec + d1.dec) / 2.0))
                    vx = ((d1.ra - d0.ra) * 3600.0 * cos_dec) / dt
                    vy = ((d1.dec - d0.dec) * 3600.0) / dt

                    candidate_chain = [d0, d1]

                    # Search forward epochs
                    for k in range(j + 1, len(sorted_epoch_ids)):
                        ep_next = sorted_epoch_ids[k]

                        # Refine velocity with current chain of detections
                        if len(candidate_chain) >= 2:
                            _, _, fit_vx, fit_vy, _ = fit_constant_velocity(candidate_chain)
                            vx = fit_vx
                            vy = fit_vy

                        t0_chain = parse_date_to_days(candidate_chain[0].date)
                        best_match = None
                        best_dist = float("inf")

                        for d_next in detections_by_epoch[ep_next]:
                            if d_next.detection_id in used_detection_ids:
                                continue
                            t_next = parse_date_to_days(d_next.date)
                            dt_next = t_next - t0_chain

                            pred_ra = candidate_chain[0].ra + (vx * dt_next) / (3600.0 * cos_dec)
                            pred_dec = candidate_chain[0].dec + (vy * dt_next) / 3600.0

                            dist = angular_distance_arcsec(pred_ra, pred_dec, d_next.ra, d_next.dec)
                            # Adaptive gating radius scaling gracefully with temporal separation
                            gating_radius = max(match_radius_arcsec, 3.0 + 1.2 * dt_next)
                            if dist <= gating_radius and dist < best_dist:
                                best_dist = dist
                                best_match = d_next

                        if best_match is not None:
                            candidate_chain.append(best_match)

                    if len(candidate_chain) >= min_detections:
                        ra0, dec0, fit_vx, fit_vy, rms = fit_constant_velocity(candidate_chain)
                        if rms <= max_rms_arcsec:
                            mean_snr = float(np.mean([d.snr for d in candidate_chain]))
                            trk_id = f"TRK-{len(tracklets) + 1:04d}"
                            tracklet = LinkedTracklet(
                                tracklet_id=trk_id,
                                ra_ref=round(ra0, 6),
                                dec_ref=round(dec0, 6),
                                ra_rate_arcsec_per_day=round(fit_vx, 3),
                                dec_rate_arcsec_per_day=round(fit_vy, 3),
                                detections=candidate_chain,
                                rms_arcsec=round(rms, 3),
                                snr_mean=round(mean_snr, 2),
                            )
                            tracklets.append(tracklet)
                            for d in candidate_chain:
                                used_detection_ids.add(d.detection_id)
                            break  # Seed d0 linked

    return tracklets
