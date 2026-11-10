"""SPHEREx Spectra Pipeline.

Attaches spectrophotometric energy distributions (SEDs) to all detected movers
in candidates.json, validates against schema v1.0, and exports per-position
spectra for web visualization and downstream analysis.
"""

from __future__ import annotations

import argparse
import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Optional

from data.adapter.factory import get_source
from docs.validate import validate_file
from spectra.extractor import get_spectrum
from spectra.taxonomy import classify_spectral_taxonomy

logger = logging.getLogger(__name__)


def extract_all_spectra(
    candidates_path: Path | str = Path("data/output/candidates.json"),
    output_dir: Optional[Path | str] = None,
    fov_deg: float = 0.2,
    sum_six_bands: bool = False,
    source: Any = None,
) -> Dict[str, Any]:
    """Extract and attach spectrophotometric data for all candidates in candidates.json.

    Parameters
    ----------
    candidates_path : Path or str
        Path to input candidates.json.
    output_dir : Path or str, optional
        Directory where per-object spectra JSON files are saved.
        Defaults to 'data/output/spectra'.
    fov_deg : float
        Field-of-view in degrees for epoch image loading.
    sum_six_bands : bool
        If True, pool measurements across the 6 SPHEREx detector bands.
    source : EpochSource, optional
        Pre-configured data source adapter.

    Returns
    -------
    dict
        Updated candidates document matching schema v1.0.
    """
    candidates_file = Path(candidates_path)
    if not candidates_file.exists():
        raise FileNotFoundError(f"Candidates file not found: {candidates_file}")

    with open(candidates_file, "r", encoding="utf-8") as f:
        doc = json.load(f)

    if output_dir is None:
        spectra_dir = candidates_file.parent / "spectra"
    else:
        spectra_dir = Path(output_dir)
    spectra_dir.mkdir(parents=True, exist_ok=True)

    src = source or get_source()
    region = doc.get("region", {})
    movers = doc.get("movers", [])

    logger.info("Extracting spectra for %d movers in %s", len(movers), candidates_file.name)

    extracted_summaries: List[Dict[str, Any]] = []

    for mover in movers:
        obj_id = mover.get("object_id", "UNKNOWN")
        ra = float(mover["ra"])
        dec = float(mover["dec"])

        # Extract 102-channel spectrophotometry across epochs
        spec_dict = get_spectrum(
            ra=ra,
            dec=dec,
            source=src,
            fov_deg=fov_deg,
            sum_six_bands=sum_six_bands,
            region=region,
        )

        # Enforce contract: attach to mover
        mover["spectrum"] = spec_dict

        # Classify taxonomy & absorption features for scientific depth
        taxonomy = classify_spectral_taxonomy(
            wavelength_um=spec_dict["wavelength_um"],
            flux=spec_dict["flux"],
        )

        # Write per-position demo spectrum file
        per_pos_payload = {
            "object_id": obj_id,
            "ra": ra,
            "dec": dec,
            "type": mover.get("type", "unknown"),
            "match_name": mover.get("match_name"),
            "is_synthetic": mover.get("is_synthetic", True),
            "spectrum": spec_dict,
            "taxonomy": {
                "class": taxonomy["taxonomy_class"],
                "spectral_slope_pct_per_um": taxonomy["spectral_slope_pct_per_um"],
                "absorption_features": taxonomy["absorption_features"],
            },
        }

        demo_file = spectra_dir / f"{obj_id}.json"
        with open(demo_file, "w", encoding="utf-8") as f:
            json.dump(per_pos_payload, f, indent=2)

        extracted_summaries.append({
            "object_id": obj_id,
            "channels": len(spec_dict["wavelength_um"]),
            "mean_flux": round(float(sum(spec_dict["flux"]) / len(spec_dict["flux"])), 3),
            "taxonomy_class": taxonomy["taxonomy_class"],
            "file": str(demo_file),
        })

    # Save updated candidates document in place
    with open(candidates_file, "w", encoding="utf-8") as f:
        json.dump(doc, f, indent=2)

    # Validate against JSON schema v1.0
    validate_file(candidates_file)
    logger.info("Validated candidates.json against schema v1.0 successfully")

    # Save summary report
    summary_path = candidates_file.parent / "spectra_summary.json"
    summary_data = {
        "is_synthetic": doc.get("is_synthetic", True),
        "total_spectra_extracted": len(movers),
        "fov_deg": fov_deg,
        "sum_six_bands": sum_six_bands,
        "spectra": extracted_summaries,
    }
    with open(summary_path, "w", encoding="utf-8") as f:
        json.dump(summary_data, f, indent=2)

    return doc


def main() -> None:
    """CLI entry point for spectrum extraction."""
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
    parser = argparse.ArgumentParser(description="SPHEREx Spectrophotometry Extraction Pipeline")
    parser.add_argument(
        "--candidates",
        type=str,
        default="data/output/candidates.json",
        help="Path to candidates.json",
    )
    parser.add_argument(
        "--output-dir",
        type=str,
        default="data/output/spectra",
        help="Directory to save per-object spectra",
    )
    parser.add_argument(
        "--fov",
        type=float,
        default=0.2,
        help="Field of view in degrees (default 0.2)",
    )
    parser.add_argument(
        "--six-bands",
        action="store_true",
        help="Pool into the 6 physical SPHEREx detector bands for boosted S/N",
    )
    args = parser.parse_args()

    extract_all_spectra(
        candidates_path=args.candidates,
        output_dir=args.output_dir,
        fov_deg=args.fov,
        sum_six_bands=args.six_bands,
    )
    print("Spectra extraction complete and validated.")


if __name__ == "__main__":
    main()
