"""SPHEREx Catalog Matching - Ephemeris Propagation.

Predicts coordinates and proper motion vectors for known objects across
arbitrary observation epoch dates.
"""

from __future__ import annotations

import math
from datetime import datetime
from typing import Dict, List, Tuple

from matching.types import EphemerisPrediction, KnownObject


def parse_date_to_days(iso_date: str) -> float:
    """Parse ISO date string into elapsed days since Unix epoch."""
    dt = datetime.fromisoformat(iso_date.replace("Z", "+00:00"))
    return dt.timestamp() / 86400.0


def predict_known_positions(
    known_objects: List[KnownObject],
    epochs: List[Tuple[str, str]],  # List of (epoch_id, iso_date)
) -> Dict[str, List[EphemerisPrediction]]:
    """Predict celestial positions for all known objects across target observation epochs.

    Parameters
    ----------
    known_objects : list of KnownObject
        Catalog of known objects with reference epoch coordinates and motion rates.
    epochs : list of tuple of (str, str)
        Pairs of (epoch_id, iso_date_string).

    Returns
    -------
    predictions_by_epoch : dict
        Mapping from epoch_id to list of EphemerisPrediction objects.
    """
    predictions_by_epoch: Dict[str, List[EphemerisPrediction]] = {}

    for ep_id, ep_date in epochs:
        t_target = parse_date_to_days(ep_date)
        epoch_preds: List[EphemerisPrediction] = []

        for obj in known_objects:
            t_base = parse_date_to_days(obj.epoch_date)
            dt_days = t_target - t_base

            cos_dec = max(1e-4, math.cos(math.radians(obj.dec_deg)))
            delta_ra = (obj.ra_rate_arcsec_per_day * dt_days) / (3600.0 * cos_dec)
            delta_dec = (obj.dec_rate_arcsec_per_day * dt_days) / 3600.0

            pred_ra = round(obj.ra_deg + delta_ra, 6)
            pred_dec = round(obj.dec_deg + delta_dec, 6)

            epoch_preds.append(
                EphemerisPrediction(
                    object_name=obj.name,
                    designation=obj.designation,
                    body_type=obj.body_type,
                    epoch_id=ep_id,
                    date=ep_date,
                    ra=pred_ra,
                    dec=pred_dec,
                    ra_rate_arcsec_per_day=obj.ra_rate_arcsec_per_day,
                    dec_rate_arcsec_per_day=obj.dec_rate_arcsec_per_day,
                )
            )

        predictions_by_epoch[ep_id] = epoch_preds

    return predictions_by_epoch


def is_prediction_in_field(
    pred: EphemerisPrediction,
    ra_center: float,
    dec_center: float,
    radius_deg: float,
) -> bool:
    """Check if predicted position falls inside circular sky field."""
    cos_dec = math.cos(math.radians((pred.dec + dec_center) / 2.0))
    d_ra = (pred.ra - ra_center) * cos_dec
    d_dec = pred.dec - dec_center
    sep_deg = math.hypot(d_ra, d_dec)
    return sep_deg <= radius_deg
