"""CLI runner for python -m detection."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from data.adapter.factory import get_source, load_config
from data.adapter.base import RegionInfo
from detection.pipeline import run_detection_pipeline

PROJECT_ROOT = Path(__file__).resolve().parent.parent


def main() -> None:
    parser = argparse.ArgumentParser(
        description="SPHEREx Moving Object Detection Pipeline."
    )
    parser.add_argument(
        "--config",
        type=str,
        default="config/settings.yaml",
        help="Path to YAML settings file.",
    )
    parser.add_argument(
        "--fov",
        type=float,
        default=None,
        help="Field of view in degrees.",
    )
    parser.add_argument(
        "--snr",
        type=float,
        default=None,
        help="Source extraction SNR threshold.",
    )

    args = parser.parse_args()
    cfg = load_config(args.config)

    source = get_source(cfg)
    region = RegionInfo.from_dict(cfg.get("region", {}))
    fov_deg = args.fov or cfg.get("region", {}).get("fov_deg", 0.2)
    snr_thresh = args.snr or cfg.get("detection", {}).get("snr_threshold", 3.5)
    min_epochs = cfg.get("detection", {}).get("min_epochs", 3)
    max_vel = cfg.get("detection", {}).get("max_velocity_arcsec_day", 120.0)

    print(f"[Detection] Running pipeline on '{region.name}' (FOV={fov_deg}°)...")
    payload = run_detection_pipeline(
        source=source,
        region=region,
        fov_deg=fov_deg,
        snr_threshold=snr_thresh,
        min_epochs=min_epochs,
        max_velocity_arcsec_day=max_vel,
    )
    print(f"[Success] Discovered {len(payload['movers'])} candidate moving objects.")
    print(f"[Success] Output validated and saved to data/output/candidates.json")


if __name__ == "__main__":
    main()
