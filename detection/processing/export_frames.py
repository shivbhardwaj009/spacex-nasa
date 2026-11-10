"""SPHEREx Epoch Frames Exporter.

Renders display-ready PNG images for each observation epoch from processed .npz stacks,
using a fixed, shared stretch across all epochs so transient/motion brightness changes
represent true physical variations rather than rescaling artefacts.
Generates /data/output/frames_manifest.json for georeferenced web overlays.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List

import numpy as np
from PIL import Image

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent


def export_epoch_frames(
    processed_dir: Path | str = PROJECT_ROOT / "data" / "output" / "processed",
    output_dir: Path | str = PROJECT_ROOT / "data" / "output" / "frames",
    web_output_dir: Path | str = PROJECT_ROOT / "web" / "public" / "data" / "frames",
    manifest_out: Path | str = PROJECT_ROOT / "data" / "output" / "frames_manifest.json",
    web_manifest_out: Path | str = PROJECT_ROOT / "web" / "public" / "data" / "frames_manifest.json",
) -> Dict[str, Any]:
    processed_path = Path(processed_dir)
    out_path = Path(output_dir)
    out_path.mkdir(parents=True, exist_ok=True)

    web_out_path = Path(web_output_dir)
    web_out_path.mkdir(parents=True, exist_ok=True)

    manifest_file = processed_path / "manifest.json"
    if not manifest_file.exists():
        raise FileNotFoundError(f"Processed stack manifest not found: {manifest_file}")

    with open(manifest_file, "r", encoding="utf-8") as f:
        meta = json.load(f)

    epochs_meta = meta.get("epochs", [])
    region = meta.get("region", {})
    fov_deg = meta.get("fov_deg", 0.2)

    # 1. Load all epoch pixel arrays to compute a single, fixed, shared stretch
    pixel_arrays: List[np.ndarray] = []
    masks: List[np.ndarray] = []

    for ep in epochs_meta:
        npz_file = processed_path / ep["file"]
        data = np.load(npz_file)
        pix = data["pixels"]
        mask = data["mask"]
        pixel_arrays.append(pix)
        masks.append(mask)

    # Compute shared stretch across all unmasked pixels
    all_unmasked = np.concatenate([
        pix[mask == 0] for pix, mask in zip(pixel_arrays, masks) if np.any(mask == 0)
    ])

    vmin = float(np.percentile(all_unmasked, 1.0))
    vmax = float(np.percentile(all_unmasked, 99.5))
    if vmax <= vmin:
        vmax = vmin + 1.0

    # Celestial bounds for georeferencing
    # Center: region["ra_center"], region["dec_center"], radius: fov_deg / 2
    ra_c = region.get("ra_center", 269.452)
    dec_c = region.get("dec_center", 66.561)
    half_fov = fov_deg / 2.0
    cos_dec = np.cos(np.radians(dec_c))

    bounds = {
        "ra_min": round(ra_c - (half_fov / cos_dec), 6),
        "ra_max": round(ra_c + (half_fov / cos_dec), 6),
        "dec_min": round(dec_c - half_fov, 6),
        "dec_max": round(dec_c + half_fov, 6),
        "ra_center": ra_c,
        "dec_center": dec_c,
        "fov_deg": fov_deg,
    }

    frames_records: List[Dict[str, Any]] = []

    # 2. Render each frame to PNG with inverted colormap (stars bright on dark sky)
    for idx, (ep, pix, mask) in enumerate(zip(epochs_meta, pixel_arrays, masks)):
        ep_id = ep["epoch_id"]
        date = ep["date"]

        # Normalize with fixed shared stretch
        norm = np.clip((pix - vmin) / (vmax - vmin), 0.0, 1.0)
        # Gamma curve for astronomical visibility
        stretched = np.power(norm, 0.75)
        # Convert to 8-bit grayscale
        uint8_img = (stretched * 255.0).astype(np.uint8)

        # Apply transparency for edge/bad masked pixels
        alpha = np.where(mask == 0, 255, 0).astype(np.uint8)
        rgba = np.dstack([uint8_img, uint8_img, uint8_img, alpha])

        img = Image.fromarray(rgba, mode="RGBA")

        # Save to both data/output/frames/ and web/public/data/frames/
        filename = f"{ep_id}.png"
        img.save(out_path / filename)
        img.save(web_out_path / filename)

        frames_records.append({
            "epoch_id": ep_id,
            "date": date,
            "image_path": f"data/frames/{filename}",
            "bounds": bounds,
            "is_synthetic": True,
            "stretch": {"vmin": vmin, "vmax": vmax},
        })

    result_manifest = {
        "schema_version": "1.0",
        "is_synthetic": True,
        "region": region,
        "bounds": bounds,
        "frames": frames_records,
    }

    # Save manifest
    with open(manifest_out, "w", encoding="utf-8") as f:
        json.dump(result_manifest, f, indent=2)

    with open(web_manifest_out, "w", encoding="utf-8") as f:
        json.dump(result_manifest, f, indent=2)

    return result_manifest


if __name__ == "__main__":
    res = export_epoch_frames()
    print(f"Exported {len(res['frames'])} display-ready epoch frames to /data/output/frames and web/public/data/frames")
