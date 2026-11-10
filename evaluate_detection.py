"""SPHEREx Mover Detection Evaluation Script.

Compares detected moving object candidates against ground_truth.json,
computes recall, false positive counts/rates, position astrometric errors,
sweeps S/N thresholds, and writes data/output/detection_eval.json.
"""

from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

PROJECT_ROOT = Path(__file__).resolve().parent


def angular_distance_arcsec(ra1: float, dec1: float, ra2: float, dec2: float) -> float:
    """Calculate angular distance in arcseconds."""
    cos_dec = math.cos(math.radians((dec1 + dec2) / 2.0))
    d_ra = (ra1 - ra2) * cos_dec
    d_dec = dec1 - dec2
    return math.hypot(d_ra, d_dec) * 3600.0


def load_ground_truth(gt_path: Path) -> Dict[str, Any]:
    """Load ground truth JSON dictionary."""
    if not gt_path.is_file():
        raise FileNotFoundError(f"Ground truth file not found at {gt_path}")
    with open(gt_path, "r", encoding="utf-8") as f:
        return json.load(f)


def load_candidates(candidates_path: Path) -> Dict[str, Any]:
    """Load candidates JSON dictionary."""
    if not candidates_path.is_file():
        raise FileNotFoundError(f"Candidates file not found at {candidates_path}")
    with open(candidates_path, "r", encoding="utf-8") as f:
        return json.load(f)


def extract_ground_truth_movers(gt_data: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Consolidate ground truth movers into single trajectory definitions."""
    epochs_gt = gt_data.get("epochs_ground_truth", {})
    movers_by_id: Dict[str, Dict[str, Any]] = {}

    for ep_id, ep_dict in epochs_gt.items():
        for m in ep_dict.get("movers", []):
            obj_id = m["object_id"]
            if obj_id not in movers_by_id:
                movers_by_id[obj_id] = {
                    "object_id": obj_id,
                    "name": m.get("name", obj_id),
                    "ra_rate": m.get("ra_rate_arcsec_per_day", 0.0),
                    "dec_rate": m.get("dec_rate_arcsec_per_day", 0.0),
                    "flux": m.get("flux", 0.0),
                    "epoch_detections": {},
                }
            if m.get("in_fov", True):
                movers_by_id[obj_id]["epoch_detections"][ep_id] = {
                    "ra": m["ra"],
                    "dec": m["dec"],
                    "pixel_x": m.get("pixel_x", 0.0),
                    "pixel_y": m.get("pixel_y", 0.0),
                }

    # Filter to movers that appeared in at least 3 epochs in FOV
    observable_movers = [
        m for m in movers_by_id.values() if len(m["epoch_detections"]) >= 3
    ]
    return observable_movers


def evaluate_movers(
    candidates_data: Dict[str, Any],
    gt_data: Dict[str, Any],
    match_radius_arcsec: float = 4.0,
    velocity_tol_arcsec_day: float = 6.0,
) -> Dict[str, Any]:
    """Evaluate candidate detections against ground truth."""
    gt_movers = extract_ground_truth_movers(gt_data)
    cand_movers = candidates_data.get("movers", [])

    total_gt = len(gt_movers)
    total_detected = len(cand_movers)

    matched_gt_ids = set()
    matched_candidate_ids = set()
    position_errors: List[float] = []
    ra_rate_errors: List[float] = []
    dec_rate_errors: List[float] = []

    for cand in cand_movers:
        cand_id = cand["object_id"]
        cand_motion = cand.get("motion", {})
        cand_ra_rate = cand_motion.get("ra_rate_arcsec_per_day", 0.0)
        cand_dec_rate = cand_motion.get("dec_rate_arcsec_per_day", 0.0)

        # Match cand against ground truth movers
        best_match_id = None
        best_sep_sum = float("inf")
        cand_errs: List[float] = []

        for gt in gt_movers:
            gt_id = gt["object_id"]
            if gt_id in matched_gt_ids:
                continue

            # Velocity check
            diff_ra_rate = abs(cand_ra_rate - gt["ra_rate"])
            diff_dec_rate = abs(cand_dec_rate - gt["dec_rate"])
            if diff_ra_rate > velocity_tol_arcsec_day or diff_dec_rate > velocity_tol_arcsec_day:
                continue

            # Position check across common epochs
            sep_list: List[float] = []
            for det in cand.get("detections", []):
                ep_id = det["epoch_id"]
                if ep_id in gt["epoch_detections"]:
                    gt_pos = gt["epoch_detections"][ep_id]
                    dist = angular_distance_arcsec(det["ra"], det["dec"], gt_pos["ra"], gt_pos["dec"])
                    if dist <= match_radius_arcsec:
                        sep_list.append(dist)

            # Match if at least 2 common epochs within tolerance
            if len(sep_list) >= 2:
                mean_sep = float(np.mean(sep_list))
                if mean_sep < best_sep_sum:
                    best_sep_sum = mean_sep
                    best_match_id = gt_id
                    cand_errs = sep_list

        if best_match_id is not None:
            matched_gt_ids.add(best_match_id)
            matched_candidate_ids.add(cand_id)
            position_errors.extend(cand_errs)
            gt_match = next(g for g in gt_movers if g["object_id"] == best_match_id)
            ra_rate_errors.append(abs(cand_ra_rate - gt_match["ra_rate"]))
            dec_rate_errors.append(abs(cand_dec_rate - gt_match["dec_rate"]))

    true_positives = len(matched_gt_ids)
    false_positives = total_detected - len(matched_candidate_ids)
    recall = (true_positives / total_gt) if total_gt > 0 else 0.0
    fp_rate = (false_positives / total_detected) if total_detected > 0 else 0.0

    mean_pos_err = float(np.mean(position_errors)) if position_errors else 0.0
    median_pos_err = float(np.median(position_errors)) if position_errors else 0.0

    return {
        "total_ground_truth_movers": total_gt,
        "total_detected_movers": total_detected,
        "true_positives": true_positives,
        "false_positives": false_positives,
        "recall": round(recall, 4),
        "false_positive_rate": round(fp_rate, 4),
        "position_error_arcsec": {
            "mean": round(mean_pos_err, 3),
            "median": round(median_pos_err, 3),
            "std": round(float(np.std(position_errors)), 3) if position_errors else 0.0,
        },
        "velocity_error_arcsec_day": {
            "ra_rate_mean_err": round(float(np.mean(ra_rate_errors)), 3) if ra_rate_errors else 0.0,
            "dec_rate_mean_err": round(float(np.mean(dec_rate_errors)), 3) if dec_rate_errors else 0.0,
        },
        "matched_gt_movers": sorted(list(matched_gt_ids)),
    }


def sweep_snr_thresholds(
    candidates_data: Dict[str, Any],
    gt_data: Dict[str, Any],
    snr_levels: List[float] = [2.5, 3.0, 3.5, 4.0, 5.0, 6.0],
) -> List[Dict[str, Any]]:
    """Sweep SNR thresholds and evaluate recall vs false positive tradeoff."""
    sweep_results: List[Dict[str, Any]] = []

    cand_movers = candidates_data.get("movers", [])

    for snr in snr_levels:
        # Filter candidates by minimum detection flux SNR
        filtered_movers = []
        for m in cand_movers:
            dets = m.get("detections", [])
            # Assume proxy detection flux relates to SNR
            fluxes = [d.get("flux", 0.0) for d in dets]
            mean_f = np.mean(fluxes) if fluxes else 0.0
            # Scale threshold test
            if mean_f >= (snr * 35.0):
                filtered_movers.append(m)

        filtered_payload = dict(candidates_data)
        filtered_payload["movers"] = filtered_movers

        eval_res = evaluate_movers(filtered_payload, gt_data)
        sweep_results.append({
            "snr_threshold": snr,
            "detected": len(filtered_movers),
            "true_positives": eval_res["true_positives"],
            "recall_pct": round(eval_res["recall"] * 100.0, 1),
            "false_positives": eval_res["false_positives"],
            "fp_rate_pct": round(eval_res["false_positive_rate"] * 100.0, 1),
        })

    return sweep_results


def print_evaluation_summary(eval_res: Dict[str, Any], sweep_res: List[Dict[str, Any]]) -> None:
    """Print formatted evaluation report and SNR sweep table."""
    print("=" * 68)
    print("        SPHEREx MOVER DETECTION PIPELINE EVALUATION REPORT")
    print("=" * 68)
    print(f" Ground Truth Observable Movers : {eval_res['total_ground_truth_movers']}")
    print(f" Total Candidates Detected       : {eval_res['total_detected_movers']}")
    print(f" True Positives (Recovered)      : {eval_res['true_positives']}")
    print(f" False Positives                 : {eval_res['false_positives']}")
    print(f" Pipeline Recall                 : {eval_res['recall'] * 100.0:.1f}%")
    print(f" False Positive Rate             : {eval_res['false_positive_rate'] * 100.0:.1f}%")
    print(f" Astrometric Position Error      : {eval_res['position_error_arcsec']['median']:.3f} arcsec (median)")
    print(f" Velocity Error (RA / Dec)       : {eval_res['velocity_error_arcsec_day']['ra_rate_mean_err']:.2f} / {eval_res['velocity_error_arcsec_day']['dec_rate_mean_err']:.2f} arcsec/day")
    print("-" * 68)
    print(" SNR THRESHOLD SWEEP (Recall vs False Positives):")
    print("  SNR Thresh  |  Detections  |  True Pos  |  Recall (%)  |  False Pos")
    print("  " + "-" * 62)
    for row in sweep_res:
        print(
            f"     {row['snr_threshold']:4.1f}     |     {row['detected']:4d}     |    {row['true_positives']:2d}      |    {row['recall_pct']:5.1f}%    |    {row['false_positives']:2d}"
        )
    print("=" * 68)


def main() -> None:
    parser = argparse.ArgumentParser(description="Evaluate SPHEREx mover detection performance.")
    parser.add_argument(
        "--candidates",
        type=str,
        default="data/output/candidates.json",
        help="Path to candidates.json.",
    )
    parser.add_argument(
        "--ground-truth",
        type=str,
        default="data/output/ground_truth.json",
        help="Path to ground_truth.json.",
    )
    parser.add_argument(
        "--output",
        type=str,
        default="data/output/detection_eval.json",
        help="Path to output evaluation report JSON.",
    )

    args = parser.parse_args()
    cand_path = PROJECT_ROOT / args.candidates
    gt_path = PROJECT_ROOT / args.ground_truth
    out_path = PROJECT_ROOT / args.output

    if not gt_path.is_file():
        print(f"[Error] Ground truth file not found at {gt_path}. Run MockSource first.", file=sys.stderr)
        sys.exit(1)

    if not cand_path.is_file():
        print(f"[Error] Candidates file not found at {cand_path}.", file=sys.stderr)
        sys.exit(1)

    cand_data = load_candidates(cand_path)
    gt_data = load_ground_truth(gt_path)

    eval_results = evaluate_movers(cand_data, gt_data)
    sweep_results = sweep_snr_thresholds(cand_data, gt_data)

    print_evaluation_summary(eval_results, sweep_results)

    # Save output evaluation report
    report = {
        "evaluation": eval_results,
        "snr_sweep": sweep_results,
    }
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)
    print(f"\n[OK] Evaluation report saved to {out_path}")


if __name__ == "__main__":
    main()
