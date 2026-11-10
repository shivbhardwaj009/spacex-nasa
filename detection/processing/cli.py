"""SPHEREx Image Processing CLI.

Command-line entry point:
python -m detection.processing --config config/settings.yaml
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from data.adapter.factory import get_source, load_config
from data.adapter.base import RegionInfo
from detection.processing.pipeline import process_epochs

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent


def main(args: list[str] | None = None) -> None:
    """CLI runner for SPHEREx image processing module."""
    parser = argparse.ArgumentParser(
        description="SPHEREx multi-epoch image processing, reprojection, and normalization."
    )
    parser.add_argument(
        "--config",
        type=str,
        default="config/settings.yaml",
        help="Path to YAML settings configuration file.",
    )
    parser.add_argument(
        "--fov",
        type=float,
        default=None,
        help="Override field of view diameter in degrees (default from config or 0.2 deg).",
    )
    parser.add_argument(
        "--output-dir",
        type=str,
        default=None,
        help="Destination directory for processed NPZ files and manifest.json.",
    )

    parsed = parser.parse_args(args)
    config_path = Path(parsed.config)
    cfg = load_config(config_path)

    # Resolve FOV (default 0.2 deg)
    fov_deg = parsed.fov or cfg.get("region", {}).get("fov_deg", 0.2)
    # Target region
    region_dict = cfg.get("region", {})
    region = RegionInfo.from_dict(region_dict)

    # Output directory
    output_dir = parsed.output_dir or (PROJECT_ROOT / "data" / "output" / "processed")

    print(f"[Processing] Loading data source for '{region.name}'...")
    source = get_source(cfg)

    print(f"[Processing] Starting multi-epoch stack alignment (FOV={fov_deg}°)...")
    try:
        processed_stack = process_epochs(
            source=source,
            region=region,
            fov_deg=fov_deg,
            output_dir=output_dir,
        )
        print(f"[Success] Aligned {len(processed_stack)} epochs onto common reference grid.")
        print(f"[Success] Processed files and manifest saved to: {output_dir}")
    except Exception as exc:
        print(f"[Error] Image processing failed: {exc}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()

