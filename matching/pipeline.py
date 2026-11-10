"""SPHEREx Catalog Matching Pipeline.

Coordinates known object ephemeris queries, orbital propagation, candidate
cross-matching, in-place candidates.json update, and validation reporting.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any, Dict, Optional

from docs.validate import validate_file
from matching.ephemeris import predict_known_positions
from matching.matcher import match_candidates
from matching.query import query_known_objects
from matching.validation import build_validation_report

PROJECT_ROOT = Path(__file__).resolve().parent.parent


def run_catalog_matching(
    candidates_path: Optional[str | Path] = None,
    offline: bool = False,
    position_tol_arcsec: float = 4.0,
    motion_tol_arcsec_day: float = 6.0,
    min_matched_epochs: int = 2,
    output_dir: Optional[str | Path] = None,
) -> Dict[str, Any]:
    """Execute complete catalog cross-matching and update candidates.json in place.

    Parameters
    ----------
    candidates_path : str or Path, optional
        Path to candidate JSON file to update.
    offline : bool
        If True, enforces offline fallback with zero network calls.
    position_tol_arcsec : float
        Maximum spatial separation for positive association.
    motion_tol_arcsec_day : float
        Maximum velocity residual tolerance.
    min_matched_epochs : int
        Minimum matching epoch detections required.
    output_dir : str or Path, optional
        Destination directory for validation reports.

    Returns
    -------
    report : dict
        Validation summary metrics.
    """
    cand_file = Path(candidates_path or (PROJECT_ROOT / "data" / "output" / "candidates.json"))
    if not cand_file.is_file():
        raise FileNotFoundError(f"Candidate file not found at {cand_file}")

    out_dir = Path(output_dir or (PROJECT_ROOT / "data" / "output"))
    out_dir.mkdir(parents=True, exist_ok=True)

    with open(cand_file, "r", encoding="utf-8") as f:
        payload = json.load(f)

    region = payload.get("region", {})
    ra_center = float(region.get("ra_center", 269.452))
    dec_center = float(region.get("dec_center", 66.561))
    radius_deg = float(region.get("radius_deg", 0.5))

    epoch_list = payload.get("epochs", [])
    epoch_dates = [ep["date"] for ep in epoch_list]
    epoch_tuples = [(ep["epoch_id"], ep["date"]) for ep in epoch_list]

    # 1. Query known bodies (with cache, retries, and offline fallback)
    known_objects = query_known_objects(
        ra=ra_center,
        dec=dec_center,
        radius_deg=radius_deg,
        dates=epoch_dates,
        offline=offline,
    )

    # 2. Predict positions across all observation epoch dates
    predictions_by_epoch = predict_known_positions(
        known_objects=known_objects,
        epochs=epoch_tuples,
    )

    # 3. Match candidates in place
    updated_payload, match_records = match_candidates(
        candidates_payload=payload,
        predictions_by_epoch=predictions_by_epoch,
        position_tol_arcsec=position_tol_arcsec,
        motion_tol_arcsec_day=motion_tol_arcsec_day,
        min_matched_epochs=min_matched_epochs,
    )

    # 4. Generate validation reports
    val_report = build_validation_report(
        candidates_payload=updated_payload,
        predictions_by_epoch=predictions_by_epoch,
        match_records=match_records,
        output_dir=out_dir,
    )

    # 5. Save updated candidates.json in place
    with open(cand_file, "w", encoding="utf-8") as f:
        json.dump(updated_payload, f, indent=2)

    # 6. Validate in-place updated file against schema v1.0
    validate_file(cand_file)

    return val_report


def main() -> None:
    parser = argparse.ArgumentParser(description="SPHEREx Known Catalog Cross-Matching.")
    parser.add_argument(
        "--candidates",
        type=str,
        default="data/output/candidates.json",
        help="Path to candidates.json to update.",
    )
    parser.add_argument(
        "--offline",
        action="store_true",
        help="Force offline mode using local cached catalog.",
    )
    parser.add_argument(
        "--pos-tol",
        type=float,
        default=4.0,
        help="Astrometric matching tolerance in arcseconds.",
    )
    parser.add_argument(
        "--vel-tol",
        type=float,
        default=6.0,
        help="Velocity vector matching tolerance in arcsec/day.",
    )

    args = parser.parse_args()
    print(f"[Matching] Running catalog matching (offline={args.offline})...")
    report = run_catalog_matching(
        candidates_path=args.candidates,
        offline=args.offline,
        position_tol_arcsec=args.pos_tol,
        motion_tol_arcsec_day=args.vel_tol,
    )
    print(f"[Success] Known objects recovered: {report['total_known_recovered_by_detector']}/{report['total_known_predicted_in_field']} ({report['recovery_percentage']}%)")
    print(f"[Success] Unknown mover candidates: {report['unknown_candidates_detected']}")
    print(f"[Success] Updated candidates.json and validated schema v1.0.")


if __name__ == "__main__":
    main()

