"""SPHEREx Catalog Matching - Matcher Engine.

Cross-matches candidate moving tracks against predicted known object ephemerides
using dual celestial position and proper-motion vector criteria.
"""

from __future__ import annotations

import math
from typing import Any, Dict, List, Optional, Tuple

from matching.types import EphemerisPrediction, MatchRecord


def angular_distance_arcsec(ra1: float, dec1: float, ra2: float, dec2: float) -> float:
    """Calculate celestial angular distance in arcseconds."""
    cos_dec = math.cos(math.radians((dec1 + dec2) / 2.0))
    d_ra = (ra1 - ra2) * cos_dec
    d_dec = dec1 - dec2
    return math.hypot(d_ra, d_dec) * 3600.0


def match_candidates(
    candidates_payload: Dict[str, Any],
    predictions_by_epoch: Dict[str, List[EphemerisPrediction]],
    position_tol_arcsec: float = 4.0,
    motion_tol_arcsec_day: float = 6.0,
    min_matched_epochs: int = 2,
) -> Tuple[Dict[str, Any], List[MatchRecord]]:
    """Match mover candidates against known ephemerides and update payload in place.

    Parameters
    ----------
    candidates_payload : dict
        Candidate movers JSON payload conforming to schema v1.0.
    predictions_by_epoch : dict
        Known object ephemeris predictions keyed by epoch_id.
    position_tol_arcsec : float
        Maximum spatial separation threshold in arcseconds.
    motion_tol_arcsec_day : float
        Maximum allowable velocity vector discrepancy in arcsec/day.
    min_matched_epochs : int
        Minimum number of epoch detections matching the known object.

    Returns
    -------
    updated_payload : dict
        Candidates payload updated with 'known' vs 'unknown' classifications.
    match_records : list of MatchRecord
        Detailed per-candidate matching diagnostic records.
    """
    movers = candidates_payload.get("movers", [])
    match_records: List[MatchRecord] = []

    # Flatten predictions by object designation
    objects_pred_map: Dict[str, Dict[str, EphemerisPrediction]] = {}
    for ep_id, preds in predictions_by_epoch.items():
        for p in preds:
            objects_pred_map.setdefault(p.object_name, {})[ep_id] = p

    for mover in movers:
        cand_id = mover.get("object_id", "UNKNOWN")
        motion = mover.get("motion", {})
        cand_vx = motion.get("ra_rate_arcsec_per_day", 0.0)
        cand_vy = motion.get("dec_rate_arcsec_per_day", 0.0)
        detections = mover.get("detections", [])

        best_match_name: Optional[str] = None
        best_mean_dist: float = float("inf")
        best_v_diff: float = float("inf")
        best_matched_count: int = 0
        best_pred_obj: Optional[EphemerisPrediction] = None

        # Compare against each known object
        for obj_name, ep_preds in objects_pred_map.items():
            first_pred = next(iter(ep_preds.values()))

            # 1. Motion-vector tolerance check
            diff_vx = abs(cand_vx - first_pred.ra_rate_arcsec_per_day)
            diff_vy = abs(cand_vy - first_pred.dec_rate_arcsec_per_day)
            total_v_diff = math.hypot(diff_vx, diff_vy)

            if total_v_diff > motion_tol_arcsec_day:
                continue

            # 2. Position tolerance check across individual detections
            epoch_distances: List[float] = []
            for det in detections:
                ep_id = det.get("epoch_id")
                if ep_id in ep_preds:
                    pred_p = ep_preds[ep_id]
                    dist_arcsec = angular_distance_arcsec(
                        det["ra"], det["dec"], pred_p.ra, pred_p.dec
                    )
                    if dist_arcsec <= position_tol_arcsec:
                        epoch_distances.append(dist_arcsec)

            if len(epoch_distances) >= min_matched_epochs:
                mean_dist = sum(epoch_distances) / len(epoch_distances)
                if mean_dist < best_mean_dist:
                    best_mean_dist = mean_dist
                    best_match_name = obj_name
                    best_v_diff = total_v_diff
                    best_matched_count = len(epoch_distances)
                    best_pred_obj = first_pred

        # Update candidate classification
        if best_match_name is not None and best_pred_obj is not None:
            mover["type"] = "known"
            mover["match_name"] = best_match_name
            # Boost confidence for catalog-confirmed asteroid/comet
            orig_conf = mover.get("confidence", 0.80)
            mover["confidence"] = round(min(0.99, max(0.90, orig_conf + 0.10)), 3)

            match_records.append(
                MatchRecord(
                    candidate_id=cand_id,
                    is_matched=True,
                    match_name=best_match_name,
                    designation=best_pred_obj.designation,
                    body_type=best_pred_obj.body_type,
                    mean_distance_arcsec=round(best_mean_dist, 3),
                    velocity_diff_arcsec_day=round(best_v_diff, 3),
                    matched_epochs_count=best_matched_count,
                )
            )
        else:
            mover["type"] = "unknown"
            mover["match_name"] = None

            match_records.append(
                MatchRecord(
                    candidate_id=cand_id,
                    is_matched=False,
                    match_name=None,
                    mean_distance_arcsec=0.0,
                    velocity_diff_arcsec_day=0.0,
                    matched_epochs_count=0,
                )
            )

    return candidates_payload, match_records
