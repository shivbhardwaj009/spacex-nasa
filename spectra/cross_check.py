"""SPHEREx vs IRSA Spectrophotometry Cross-Check Utility.

Compares spectrophotometric SEDs extracted by our pipeline against external spectra
downloaded from the IRSA Spectrophotometry Tool (or IPAC table / CSV / JSON exports).
Computes fractional residuals, RMS errors, and reduced chi-squared metrics.
"""

from __future__ import annotations

import argparse
import csv
import json
import math
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np


def parse_irsa_file(file_path: Path | str) -> Tuple[List[float], List[float], List[float]]:
    """Parse an external IRSA spectrophotometry file (CSV, IPAC table, or JSON).

    Returns
    -------
    wavelength_um : list of float
    flux : list of float
    flux_err : list of float
    """
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"IRSA spectrophotometry file not found: {path}")

    wavelengths: List[float] = []
    fluxes: List[float] = []
    errors: List[float] = []

    # 1. Check if JSON format
    if path.suffix.lower() == ".json":
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        if "spectrum" in data:
            spec = data["spectrum"]
            return spec["wavelength_um"], spec["flux"], spec["flux_err"]
        elif "wavelength_um" in data:
            return data["wavelength_um"], data["flux"], data["flux_err"]

    # 2. Check if CSV or IPAC table
    with open(path, "r", encoding="utf-8") as f:
        lines = f.readlines()

    # Skip IPAC comment/header lines starting with '\' or '|'
    data_lines = [l.strip() for l in lines if l.strip() and not l.startswith(("\\", "|", "#"))]

    # Try CSV reading with comma or whitespace delimiter
    sample_line = data_lines[0] if data_lines else ""
    delimiter = "," if "," in sample_line else None

    # Check for header
    has_header = any(col in sample_line.lower() for col in ["wave", "wavelength", "flux", "w"])
    start_idx = 1 if has_header else 0

    for line in data_lines[start_idx:]:
        parts = line.split(",") if delimiter == "," else line.split()
        if len(parts) >= 2:
            try:
                w = float(parts[0])
                flx = float(parts[1])
                err = float(parts[2]) if len(parts) >= 3 else max(0.05 * flx, 0.5)
                wavelengths.append(w)
                fluxes.append(flx)
                errors.append(err)
            except ValueError:
                continue

    if not wavelengths:
        raise ValueError(f"Could not parse valid spectrophotometry data points from {path}")

    return wavelengths, fluxes, errors


def compare_spectra(
    our_spectrum: Dict[str, List[float]],
    irsa_spectrum: Tuple[List[float], List[float], List[float]],
    name_our: str = "Pipeline Extracted",
    name_ref: str = "IRSA Reference",
) -> Dict[str, Any]:
    """Compare pipeline spectrum to IRSA reference spectrum.

    Parameters
    ----------
    our_spectrum : dict
        Contains 'wavelength_um', 'flux', 'flux_err'.
    irsa_spectrum : tuple
        (wavelengths, fluxes, errors) from IRSA export.
    name_our : str
        Label for pipeline spectrum.
    name_ref : str
        Label for reference spectrum.

    Returns
    -------
    dict
        Summary metrics including mean_fractional_diff, rms_diff, reduced_chi2,
        and comparison table.
    """
    our_w = np.array(our_spectrum["wavelength_um"], dtype=np.float64)
    our_f = np.array(our_spectrum["flux"], dtype=np.float64)
    our_e = np.array(our_spectrum["flux_err"], dtype=np.float64)

    ref_w, ref_f_raw, ref_e_raw = irsa_spectrum
    ref_w = np.array(ref_w, dtype=np.float64)
    ref_f_raw = np.array(ref_f_raw, dtype=np.float64)
    ref_e_raw = np.array(ref_e_raw, dtype=np.float64)

    # Interpolate reference onto our wavelength grid
    ref_f = np.interp(our_w, ref_w, ref_f_raw)
    ref_e = np.interp(our_w, ref_w, ref_e_raw)

    # Metrics
    residuals = our_f - ref_f
    safe_ref = np.where(ref_f > 0, ref_f, 1.0)
    fractional_residuals = np.abs(residuals) / safe_ref

    mean_frac_diff = float(np.mean(fractional_residuals))
    median_frac_diff = float(np.median(fractional_residuals))
    max_frac_diff = float(np.max(fractional_residuals))
    rms_diff = float(np.sqrt(np.mean(residuals ** 2)))

    # Reduced Chi-Squared: sum((our - ref)^2 / (our_err^2 + ref_err^2)) / N
    combined_var = np.maximum(1e-4, our_e ** 2 + ref_e ** 2)
    reduced_chi2 = float(np.sum((residuals ** 2) / combined_var) / len(our_w))

    # Sample comparison rows for printout (e.g. 10 evenly spaced channels)
    sample_indices = np.linspace(0, len(our_w) - 1, 10, dtype=int)
    table_rows = []
    for idx in sample_indices:
        table_rows.append({
            "wavelength_um": round(float(our_w[idx]), 3),
            "our_flux": round(float(our_f[idx]), 3),
            "our_err": round(float(our_e[idx]), 3),
            "ref_flux": round(float(ref_f[idx]), 3),
            "ref_err": round(float(ref_e[idx]), 3),
            "residual": round(float(residuals[idx]), 3),
            "frac_diff_pct": round(float(fractional_residuals[idx] * 100.0), 2),
        })

    return {
        "channels_evaluated": len(our_w),
        "mean_fractional_diff": round(mean_frac_diff, 4),
        "median_fractional_diff": round(median_frac_diff, 4),
        "max_fractional_diff": round(max_frac_diff, 4),
        "rms_diff": round(rms_diff, 4),
        "reduced_chi2": round(reduced_chi2, 4),
        "sample_rows": table_rows,
    }


def print_comparison_report(report: Dict[str, Any]) -> None:
    """Print formatted ASCII comparison report."""
    print("=" * 82)
    print("           SPHEREx SPECTROPHOTOMETRY VS IRSA CROSS-CHECK REPORT           ")
    print("=" * 82)
    print(f"  Channels Evaluated:       {report['channels_evaluated']}")
    print(f"  Mean Fractional Diff:     {report['mean_fractional_diff'] * 100:.2f}%")
    print(f"  Median Fractional Diff:   {report['median_fractional_diff'] * 100:.2f}%")
    print(f"  RMS Flux Difference:      {report['rms_diff']:.3f} mJy")
    print(f"  Reduced Chi-Squared (χ²): {report['reduced_chi2']:.3f}")
    print("-" * 82)
    print(f"{'Wave(um)':<10}{'Our Flux':<14}{'Ref Flux':<14}{'Residual':<14}{'Diff %':<10}")
    print("-" * 82)
    for r in report["sample_rows"]:
        print(
            f"{r['wavelength_um']:<10.3f}"
            f"{r['our_flux']:<14.2f}"
            f"{r['ref_flux']:<14.2f}"
            f"{r['residual']:<14.2f}"
            f"{r['frac_diff_pct']:<10.2f}%"
        )
    print("=" * 82)


def main() -> None:
    """CLI runner for cross-check utility."""
    parser = argparse.ArgumentParser(description="SPHEREx vs IRSA Cross-Check Tool")
    parser.add_argument("--our", type=str, required=True, help="Path to pipeline extracted spectrum JSON")
    parser.add_argument("--irsa", type=str, required=True, help="Path to IRSA reference spectrum (CSV, IPAC, JSON)")
    args = parser.parse_args()

    with open(args.our, "r", encoding="utf-8") as f:
        our_data = json.load(f)
    our_spec = our_data.get("spectrum", our_data)

    irsa_spec = parse_irsa_file(args.irsa)
    report = compare_spectra(our_spec, irsa_spec)
    print_comparison_report(report)


if __name__ == "__main__":
    main()
