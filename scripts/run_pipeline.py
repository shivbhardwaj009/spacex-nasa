#!/usr/bin/env python3
"""SPHEREx Sky Diary - One-Command Master Pipeline Runner.

Executes all offline pipeline stages in deterministic sequence:
  1. adapter     - Build metadata observation catalog
  2. processing  - Multi-epoch alignment, background subtraction, normalization
  3. detection   - Static-sky subtraction, transient extraction, tracklet linking, cutouts
  4. matching    - Known object ephemeris matching (live or offline cache)
  5. spectra     - 102-channel SED spectrophotometric extraction
  6. frames      - Export shared-stretch epoch display PNGs and manifest
  7. validation  - Strict schema v1.0 validation of output contract
  8. eval        - Ground truth detection efficiency & recovery evaluation
  9. sync        - Synchronize output products to web/public/data and web/public/cutouts

Usage:
  python scripts/run_pipeline.py [--config config/settings.yaml] [--offline] [--clean] [--data-source mock|irsa]
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from data.adapter.factory import get_source, load_config
from data.adapter.base import RegionInfo
from docs.validate import validate_file

IRSA_TODO_VERIFY_ITEMS = [
    "IRSA SIA/TAP query endpoint and table schema for SPHEREx",
    "Metadata fields for epoch grouping (OBSID vs EXPNUM vs TSTART)",
    "Official FITS HDU extension naming conventions (SCI, VAR, DQ, LAMBDA, PSF)",
    "WCS handling (standard TAN vs TAN-SIP distortion polynomial convention)",
    "Per-pixel wavelength extension representation (2D cube vs polynomial coefficients)",
    "Data quality mask/flag bitmask extension definitions (saturation, cosmic rays, edge)",
    "PSF extension format and chromatic wavelength variation across the LVF",
]


def sha256_file(filepath: Path) -> str:
    """Compute hex SHA-256 hash of a file."""
    if not filepath.is_file():
        return ""
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()


def get_git_commit() -> str:
    """Retrieve current git commit hash."""
    try:
        res = subprocess.run(
            ["git", "rev-parse", "HEAD"],
            cwd=str(PROJECT_ROOT),
            capture_output=True,
            text=True,
            timeout=5,
        )
        if res.returncode == 0:
            return res.stdout.strip()
    except Exception:
        pass
    return "unknown"


def run_pipeline(
    config_path: Path | str = "config/settings.yaml",
    offline: bool = False,
    clean: bool = False,
    skip_stages: Optional[List[str]] = None,
    data_source_override: Optional[str] = None,
) -> Dict[str, Any]:
    """Execute complete offline processing pipeline."""
    start_total = time.time()
    cfg_file = Path(config_path)
    if not cfg_file.is_file():
        raise FileNotFoundError(f"Configuration file not found: {cfg_file}")

    cfg = load_config(cfg_file)
    if data_source_override:
        cfg["data_source"] = data_source_override.strip().lower()

    data_source = cfg.get("data_source", "mock").strip().lower()
    skip_set = {s.strip().lower() for s in (skip_stages or [])}

    output_dir = PROJECT_ROOT / "data" / "output"
    processed_dir = output_dir / "processed"
    cutouts_dir = output_dir / "cutouts"
    spectra_dir = output_dir / "spectra"
    frames_dir = output_dir / "frames"
    candidates_file = output_dir / "candidates.json"

    # Handle --clean
    if clean:
        print("[Pipeline] Cleaning output directories (--clean)...")
        if output_dir.exists():
            for child in output_dir.iterdir():
                if child.name not in (".gitkeep", "ground_truth.json"):
                    if child.is_dir():
                        shutil.rmtree(child)
                    else:
                        child.unlink()

    output_dir.mkdir(parents=True, exist_ok=True)
    processed_dir.mkdir(parents=True, exist_ok=True)
    cutouts_dir.mkdir(parents=True, exist_ok=True)
    frames_dir.mkdir(parents=True, exist_ok=True)

    stage_statuses: Dict[str, Dict[str, Any]] = {}

    print("=" * 80)
    print(f"SPHEREx Sky Diary - Pipeline Execution (data_source={data_source})")
    print(f"Started at: {datetime.now(timezone.utc).isoformat()}")
    print(f"Config: {cfg_file.resolve()}")
    print("=" * 80)

    # ---------------------------------------------------------
    # STAGE 0: DATA SOURCE CHECK & INSTANTIATION
    # ---------------------------------------------------------
    print("\n>>> Stage: Data Source Verification")
    if data_source == "irsa":
        print("\n" + "!" * 80)
        print("[PIPELINE HALTED - REAL SPHEREx IRSA DATA SOURCE NOT YET VERIFIED]")
        print("!" * 80)
        print("The pipeline was configured with data_source='irsa', but real flight data")
        print("format and archive access remain pending NASA/IPAC public release.\n")
        print("Open TODO(VERIFY) items:")
        for idx, item in enumerate(IRSA_TODO_VERIFY_ITEMS, 1):
            print(f"  {idx}. {item}")
        print("\nThe pipeline will NOT silently fall back to mock data.")
        print("To run with validated synthetic data, run:")
        print("  python scripts/run_pipeline.py --config config/settings.yaml")
        print("  (or: make pipeline-mock)")
        print("!" * 80 + "\n")
        sys.exit(1)

    try:
        source = get_source(cfg)
    except Exception as exc:
        print(f"[FATAL] Failed to initialize data source adapter: {exc}", file=sys.stderr)
        sys.exit(1)

    region_dict = cfg.get("region", {})
    region = RegionInfo.from_dict(region_dict)
    fov_deg = float(cfg.get("region", {}).get("fov_deg", 0.2))
    seed = int(cfg.get("mock", {}).get("random_seed", 42))
    is_synthetic = data_source == "mock"

    # Helper for stage execution
    def execute_stage(name: str, func, *args, **kwargs):
        if name in skip_set:
            print(f"\n[-] Stage [{name}] SKIPPED")
            stage_statuses[name] = {"status": "skipped", "duration_s": 0.0}
            return None

        print(f"\n[+] Starting Stage [{name}]...")
        t0 = time.time()
        try:
            res = func(*args, **kwargs)
            duration = round(time.time() - t0, 3)
            print(f"[✓] Stage [{name}] COMPLETED in {duration}s")
            stage_statuses[name] = {"status": "success", "duration_s": duration}
            return res
        except Exception as exc:
            duration = round(time.time() - t0, 3)
            print(f"[✗] Stage [{name}] FAILED after {duration}s: {exc}", file=sys.stderr)
            stage_statuses[name] = {
                "status": "failed",
                "duration_s": duration,
                "error": str(exc),
            }
            raise RuntimeError(f"Pipeline stopped at stage '{name}': {exc}") from exc

    # ---------------------------------------------------------
    # STAGE 1: METADATA OBSERVATION CATALOG
    # ---------------------------------------------------------
    def run_stage_adapter():
        from data.adapter.metadata_catalog import build_metadata_catalog
        epochs = source.list_epochs(region, fov_deg=fov_deg)
        meta_csv = build_metadata_catalog(
            epochs=epochs,
            region=region,
            output_path=output_dir / "metadata_catalog.csv",
            fov_deg=fov_deg,
        )
        print(f"    Indexed {len(epochs)} epochs to {meta_csv.name}")
        return epochs

    epochs = execute_stage("adapter", run_stage_adapter)

    # ---------------------------------------------------------
    # STAGE 2: IMAGE PROCESSING
    # ---------------------------------------------------------
    def run_stage_processing():
        from detection.processing.pipeline import process_epochs
        processed = process_epochs(
            source=source,
            region=region,
            fov_deg=fov_deg,
            output_dir=processed_dir,
        )
        print(f"    Processed and aligned {len(processed)} epochs onto common grid")
        return processed

    processed_epochs = execute_stage("processing", run_stage_processing)

    # ---------------------------------------------------------
    # STAGE 3: MOVER DETECTION & LINKING
    # ---------------------------------------------------------
    def run_stage_detection():
        from detection.movers.pipeline import detect_movers
        nonlocal processed_epochs
        if not processed_epochs:
            from detection.processing.pipeline import process_epochs
            processed_epochs = process_epochs(
                source=source,
                region=region,
                fov_deg=fov_deg,
                output_dir=processed_dir,
            )
        res = detect_movers(
            epochs=processed_epochs,
            region=region,
            config=cfg,
            output_dir=output_dir,
            is_synthetic=is_synthetic,
        )
        print(f"    Detected {len(res.get('movers', []))} candidates; cutouts saved to {cutouts_dir}")
        return res

    execute_stage("detection", run_stage_detection)

    # ---------------------------------------------------------
    # STAGE 4: CATALOG MATCHING
    # ---------------------------------------------------------
    def run_stage_matching():
        from matching.pipeline import run_catalog_matching
        report = run_catalog_matching(
            candidates_path=candidates_file,
            offline=offline,
            output_dir=output_dir,
        )
        print(
            f"    Matched {report.get('total_known_recovered_by_detector', 0)} known objects "
            f"({report.get('recovery_percentage', 0)}% recovery)"
        )
        return report

    execute_stage("matching", run_stage_matching)

    # ---------------------------------------------------------
    # STAGE 5: SPECTRA EXTRACTION
    # ---------------------------------------------------------
    def run_stage_spectra():
        from spectra.pipeline import extract_all_spectra
        updated = extract_all_spectra(
            candidates_path=candidates_file,
            output_dir=spectra_dir,
            fov_deg=fov_deg,
            source=source,
        )
        print(f"    Spectra attached to {len(updated.get('movers', []))} candidates")
        return updated

    execute_stage("spectra", run_stage_spectra)

    # ---------------------------------------------------------
    # STAGE 6: FRAME EXPORT
    # ---------------------------------------------------------
    def run_stage_frames():
        from detection.processing.export_frames import export_epoch_frames
        f_res = export_epoch_frames(
            processed_dir=processed_dir,
            output_dir=frames_dir,
            manifest_out=output_dir / "frames_manifest.json",
            web_output_dir=PROJECT_ROOT / "web" / "public" / "data" / "frames",
            web_manifest_out=PROJECT_ROOT / "web" / "public" / "data" / "frames_manifest.json",
        )
        print(f"    Exported {len(f_res.get('frames', []))} display frames with shared stretch")
        return f_res

    execute_stage("frames", run_stage_frames)

    # ---------------------------------------------------------
    # STAGE 7: CONTRACT VALIDATION
    # ---------------------------------------------------------
    def run_stage_validation():
        validate_file(candidates_file)
        print(f"    candidates.json passed schema v1.0 validation cleanly")

    execute_stage("validation", run_stage_validation)

    # ---------------------------------------------------------
    # STAGE 8: EVALUATION REPORTING
    # ---------------------------------------------------------
    def run_stage_eval():
        from evaluate_detection import (
            evaluate_movers,
            load_candidates,
            load_ground_truth,
            sweep_snr_thresholds,
        )
        gt_file = PROJECT_ROOT / "data" / "output" / "ground_truth.json"
        if gt_file.is_file() and candidates_file.is_file():
            cand_data = load_candidates(candidates_file)
            gt_data = load_ground_truth(gt_file)
            eval_results = evaluate_movers(cand_data, gt_data)
            sweep_results = sweep_snr_thresholds(cand_data, gt_data)
            report = {
                "evaluation": eval_results,
                "snr_sweep": sweep_results,
            }
            eval_out = output_dir / "detection_eval.json"
            with open(eval_out, "w", encoding="utf-8") as f:
                json.dump(report, f, indent=2)
            print(f"    Detection Evaluation: Recall={eval_results.get('recall', 0):.2f}, FP={eval_results.get('false_positives', 0)}")
        else:
            print("    [Info] ground_truth.json not found; skipping synthetic benchmark evaluation.")

    execute_stage("eval", run_stage_eval)

    # ---------------------------------------------------------
    # STAGE 9: WEB ASSETS SYNC
    # ---------------------------------------------------------
    def run_stage_sync():
        web_data_dir = PROJECT_ROOT / "web" / "public" / "data"
        web_cutouts_dir = PROJECT_ROOT / "web" / "public" / "cutouts"
        web_data_dir.mkdir(parents=True, exist_ok=True)
        web_cutouts_dir.mkdir(parents=True, exist_ok=True)

        # Sync candidates.json
        if candidates_file.is_file():
            shutil.copy2(candidates_file, web_data_dir / "candidates.json")

        # Sync frames_manifest.json
        frames_manifest = output_dir / "frames_manifest.json"
        if frames_manifest.is_file():
            shutil.copy2(frames_manifest, web_data_dir / "frames_manifest.json")

        # Sync cutouts
        copied_cutouts = 0
        if cutouts_dir.is_dir():
            for img in cutouts_dir.glob("*.png"):
                shutil.copy2(img, web_cutouts_dir / img.name)
                copied_cutouts += 1

        print(f"    Synced candidates.json, frames_manifest.json, and {copied_cutouts} cutouts to web/public/")

    execute_stage("sync", run_stage_sync)

    # ---------------------------------------------------------
    # RUN MANIFEST GENERATION
    # ---------------------------------------------------------
    total_elapsed = round(time.time() - start_total, 3)

    is_synthetic = data_source == "mock"
    catalog_source = "offline" if offline else "live_with_offline_fallback"

    file_hashes = {
        "candidates.json": sha256_file(candidates_file),
        "frames_manifest.json": sha256_file(output_dir / "frames_manifest.json"),
        "validation_report.json": sha256_file(output_dir / "validation_report.json"),
        "detection_eval.json": sha256_file(output_dir / "detection_eval.json"),
    }

    manifest = {
        "schema_version": "1.0",
        "pipeline_version": "v1.0.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "total_duration_s": total_elapsed,
        "data_source": data_source,
        "is_synthetic": is_synthetic,
        "seed": seed,
        "git_commit": get_git_commit(),
        "catalog_source": catalog_source,
        "stages": stage_statuses,
        "file_hashes": file_hashes,
        "region": region.to_dict(),
    }

    manifest_path = output_dir / "run_manifest.json"
    with open(manifest_path, "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)

    # Data budget check (e.g. 50 MB)
    total_bytes = sum(f.stat().st_size for f in output_dir.rglob("*") if f.is_file())
    total_mb = round(total_bytes / (1024 * 1024), 2)
    budget_mb = float(cfg.get("pipeline", {}).get("data_budget_mb", 50.0))

    print("\n" + "=" * 80)
    print(f"[SUCCESS] Pipeline completed in {total_elapsed}s!")
    print(f"Output Directory Size: {total_mb} MB (Budget: {budget_mb} MB)")
    if total_mb > budget_mb:
        print(f"[WARNING] Output directory size ({total_mb} MB) exceeds budget ({budget_mb} MB)!")
    print(f"Run Manifest: {manifest_path}")
    print("=" * 80 + "\n")

    return manifest


def main() -> None:
    """CLI Entry point."""
    parser = argparse.ArgumentParser(
        description="SPHEREx Sky Diary - One-Command Master Pipeline Runner."
    )
    parser.add_argument(
        "--config",
        type=str,
        default="config/settings.yaml",
        help="Path to YAML settings file (default: config/settings.yaml).",
    )
    parser.add_argument(
        "--offline",
        action="store_true",
        help="Enforce offline catalog matching without live network queries.",
    )
    parser.add_argument(
        "--clean",
        action="store_true",
        help="Clean output directories prior to running pipeline.",
    )
    parser.add_argument(
        "--skip-stage",
        action="append",
        dest="skip_stages",
        help="Stage to skip (e.g. --skip-stage processing --skip-stage eval). Can be specified multiple times.",
    )
    parser.add_argument(
        "--data-source",
        choices=["mock", "irsa"],
        default=None,
        help="Override data_source from settings.yaml ('mock' or 'irsa').",
    )

    args = parser.parse_args()

    try:
        run_pipeline(
            config_path=args.config,
            offline=args.offline,
            clean=args.clean,
            skip_stages=args.skip_stages,
            data_source_override=args.data_source,
        )
    except Exception as exc:
        print(f"\n[FATAL ERROR] {exc}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
