"""SPHEREx Observation Metadata Catalog.

Builds and reads CSV observation catalogs tracking epoch dates,
spectral bands, footprints (RA/Dec bounding box), and file paths.
"""

from __future__ import annotations

import csv
import math
from pathlib import Path
from typing import Any, Dict, List, Optional

from data.adapter.base import EpochInfo, RegionInfo


CSV_FIELDNAMES = [
    "epoch_id",
    "date",
    "band_count",
    "ra_center",
    "dec_center",
    "fov_deg",
    "ra_min",
    "ra_max",
    "dec_min",
    "dec_max",
    "file_path",
]


def build_metadata_catalog(
    epochs: List[EpochInfo],
    region: Optional[RegionInfo | Dict[str, Any]] = None,
    output_path: Optional[str | Path] = None,
    fov_deg: float = 0.2,
) -> Path:
    """Build and write CSV metadata catalog for a set of epochs covering region."""
    if isinstance(region, dict):
        reg = RegionInfo.from_dict(region)
    elif isinstance(region, RegionInfo):
        reg = region
    else:
        reg = RegionInfo()

    out_file = Path(output_path or "data/output/metadata_catalog.csv")
    out_file.parent.mkdir(parents=True, exist_ok=True)

    # Footprint calculation
    half_fov = fov_deg / 2.0
    dec_cos = max(0.01, math.cos(math.radians(reg.dec_center)))
    ra_half = half_fov / dec_cos

    ra_min = round(reg.ra_center - ra_half, 6)
    ra_max = round(reg.ra_center + ra_half, 6)
    dec_min = round(max(-90.0, reg.dec_center - half_fov), 6)
    dec_max = round(min(90.0, reg.dec_center + half_fov), 6)

    rows: List[Dict[str, Any]] = []
    for ep in epochs:
        file_path = ep.files[0] if ep.files else f"{ep.epoch_id}.fits"
        rows.append({
            "epoch_id": ep.epoch_id,
            "date": ep.date,
            "band_count": ep.band_count,
            "ra_center": round(reg.ra_center, 6),
            "dec_center": round(reg.dec_center, 6),
            "fov_deg": round(fov_deg, 4),
            "ra_min": ra_min,
            "ra_max": ra_max,
            "dec_min": dec_min,
            "dec_max": dec_max,
            "file_path": file_path,
        })

    with open(out_file, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=CSV_FIELDNAMES)
        writer.writeheader()
        writer.writerows(rows)

    return out_file


def read_metadata_catalog(csv_path: str | Path) -> List[Dict[str, Any]]:
    """Read CSV metadata catalog and parse typed records."""
    target = Path(csv_path)
    if not target.is_file():
        raise FileNotFoundError(f"Metadata catalog CSV not found at {target}")

    records: List[Dict[str, Any]] = []
    with open(target, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            records.append({
                "epoch_id": row["epoch_id"],
                "date": row["date"],
                "band_count": int(row["band_count"]),
                "ra_center": float(row["ra_center"]),
                "dec_center": float(row["dec_center"]),
                "fov_deg": float(row["fov_deg"]),
                "ra_min": float(row["ra_min"]),
                "ra_max": float(row["ra_max"]),
                "dec_min": float(row["dec_min"]),
                "dec_max": float(row["dec_max"]),
                "file_path": row["file_path"],
            })
    return records


def query_catalog_coverage(
    catalog: List[Dict[str, Any]],
    ra: float,
    dec: float,
) -> List[Dict[str, Any]]:
    """Filter catalog records whose spatial footprint bounds the target RA/Dec."""
    matching: List[Dict[str, Any]] = []
    for entry in catalog:
        if (entry["ra_min"] <= ra <= entry["ra_max"]) and (entry["dec_min"] <= dec <= entry["dec_max"]):
            matching.append(entry)
    return matching
