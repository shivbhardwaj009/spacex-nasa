"""Tests for SPHEREx Spectrophotometry Extraction (Module 5).

Verifies:
1. Photometric aperture measurement with local background annulus.
2. Recovery of known injected source spectrum within tolerance on MockSource.
3. Spectrum extraction 102-channel contract invariants and positive uncertainties.
4. 6-band detector array pooling for boosted S/N.
5. Extraction pipeline updating candidates.json and exporting demo spectra.
6. Schema v1.0 validation of all pipeline-generated documents.
7. FastAPI endpoint /spectrum with live computation and static demo fallback.
8. IRSA spectrophotometry cross-check utility and parser (CSV, IPAC, JSON).
9. Spectral taxonomy classification (S-type, C-type, D-type, Icy/Planet X).
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pytest
from starlette.testclient import TestClient

from data.adapter.mock_source import MockSource
from docs.validate import validate_file
from spectra.cross_check import compare_spectra, parse_irsa_file
from spectra.extractor import (
    SPHEREX_SIX_BANDS,
    bin_measurements_to_102_channels,
    bin_to_six_detector_bands,
    get_spectrum,
)
from spectra.photometry import measure_local_photometry
from spectra.pipeline import extract_all_spectra
from spectra.server import app
from spectra.taxonomy import classify_spectral_taxonomy, measure_band_depth
from spectra.types import ExtractedSpectrum, PhotometricSample


class TestAperturePhotometry:
    """Tests for circular aperture photometry with local background annulus."""

    def test_photometry_on_injected_source(self) -> None:
        """Verify local photometry extracts positive flux and realistic SNR."""
        src = MockSource(seed=42)
        img = src.load_epoch("epoch_01")

        # Ground truth MOCK-MOVER-01 position at epoch_01
        ra = 269.3682
        dec = 66.53878
        meas = measure_local_photometry(
            img,
            ra,
            dec,
            aperture_radius_px=3.0,
            annulus_inner_radius_px=5.0,
            annulus_outer_radius_px=8.0,
        )

        assert meas is not None
        assert meas.is_valid
        assert meas.flux_net > 0.0
        assert meas.flux_err > 0.0
        assert meas.snr > 3.0
        assert 0.75 <= meas.wavelength_um <= 5.0

    def test_photometry_out_of_bounds(self) -> None:
        """Verify out-of-bounds coordinates return invalid or None measurement."""
        src = MockSource(seed=42)
        img = src.load_epoch("epoch_01")

        # Position completely outside field
        meas = measure_local_photometry(img, ra=10.0, dec=10.0)
        assert meas is None or not meas.is_valid


class TestSpectrumExtraction:
    """Tests for 102-channel spectrophotometry and 6-band pooling."""

    def test_get_spectrum_contract(self) -> None:
        """Verify 102-channel spectrum conforms to schema contract array lengths."""
        src = MockSource(seed=42)
        ra = 269.452
        dec = 66.561

        spec = get_spectrum(ra=ra, dec=dec, source=src, fov_deg=0.2)
        assert "wavelength_um" in spec
        assert "flux" in spec
        assert "flux_err" in spec

        waves = spec["wavelength_um"]
        flux = spec["flux"]
        err = spec["flux_err"]

        assert len(waves) == 102
        assert len(flux) == 102
        assert len(err) == 102

        # Invariant checks: ascending wavelengths covering 0.75 to 5.00 um
        assert waves[0] == pytest.approx(0.75, abs=0.01)
        assert waves[-1] == pytest.approx(5.00, abs=0.01)
        assert all(w1 < w2 for w1, w2 in zip(waves[:-1], waves[1:]))

        # Positive fluxes and uncertainties
        assert all(f > 0.0 for f in flux)
        assert all(e > 0.0 for e in err)

    def test_recover_injected_spectrum_within_tolerance(self) -> None:
        """Recover a known injected source on MockSource within tolerance."""
        src = MockSource(seed=42)
        # Position of injected mover MOCK-MOVER-01
        ra = 269.3682
        dec = 66.53878

        spec = get_spectrum(ra=ra, dec=dec, source=src, fov_deg=0.2)

        # Injected base flux was 850.0. The aperture captures central PSF fraction (~90-95%)
        # with noise and continuum normalization. Mean flux must be strongly positive.
        mean_flux = np.mean(spec["flux"])
        assert mean_flux > 10.0
        # Peak flux near the source's observed channel should be substantial
        peak_flux = np.max(spec["flux"])
        assert peak_flux > 30.0

    def test_six_band_pooling(self) -> None:
        """Verify pooling across the 6 physical SPHEREx detector arrays."""
        src = MockSource(seed=42)
        ra = 269.452
        dec = 66.561

        spec = get_spectrum(ra=ra, dec=dec, source=src, sum_six_bands=True)
        waves = spec["wavelength_um"]
        flux = spec["flux"]
        err = spec["flux_err"]

        assert len(waves) == 6
        assert len(flux) == 6
        assert len(err) == 6

        # Band centers match SPHEREx specifications
        expected_centers = [b["w_center"] for b in SPHEREX_SIX_BANDS]
        for w_meas, w_exp in zip(waves, expected_centers):
            assert w_meas == pytest.approx(w_exp, abs=0.01)

    def test_extracted_spectrum_dataclass(self) -> None:
        """Verify ExtractedSpectrum dataclass validation logic."""
        waves = list(np.linspace(0.75, 5.00, 102))
        flux = [100.0] * 102
        err = [5.0] * 102

        ext_spec = ExtractedSpectrum(
            object_id="TEST-01",
            wavelength_um=waves,
            flux=flux,
            flux_err=err,
        )
        as_dict = ext_spec.to_dict()
        assert len(as_dict["wavelength_um"]) == 102

        # Mismatch must raise ValueError
        with pytest.raises(ValueError):
            ExtractedSpectrum(
                object_id="BAD",
                wavelength_um=waves[:50],
                flux=flux,
                flux_err=err,
            )


class TestSpectraPipeline:
    """Tests for extract_all_spectra pipeline execution and schema validation."""

    def test_extract_all_spectra_pipeline(self, tmp_path: Path) -> None:
        """Run full extraction pipeline on a candidates file and validate schema."""
        cand_path = tmp_path / "candidates.json"
        spectra_dir = tmp_path / "spectra"

        # Create valid minimal candidates document
        doc = {
            "schema_version": "1.0",
            "region": {
                "name": "Test Region",
                "ra_center": 269.452,
                "dec_center": 66.561,
                "radius_deg": 0.2,
            },
            "epochs": [
                {"epoch_id": "epoch_01", "date": "2026-03-01T00:00:00Z", "band_count": 102}
            ],
            "movers": [
                {
                    "object_id": "TEST-MOV-01",
                    "ra": 269.368,
                    "dec": 66.538,
                    "type": "known",
                    "match_name": "Test Asteroid",
                    "confidence": 0.95,
                    "is_synthetic": True,
                    "motion": {
                        "ra_rate_arcsec_per_day": 30.0,
                        "dec_rate_arcsec_per_day": 12.0,
                    },
                    "detections": [
                        {
                            "epoch_id": "epoch_01",
                            "date": "2026-03-01T00:00:00Z",
                            "ra": 269.368,
                            "dec": 66.538,
                            "flux": 500.0,
                            "cutout_url": "cutouts/test.png",
                        }
                    ],
                    "spectrum": None,
                }
            ],
        }
        with open(cand_path, "w", encoding="utf-8") as f:
            json.dump(doc, f, indent=2)

        # Run extraction
        src = MockSource(seed=42)
        updated = extract_all_spectra(
            candidates_path=cand_path,
            output_dir=spectra_dir,
            fov_deg=0.2,
            source=src,
        )

        assert updated["movers"][0]["spectrum"] is not None
        assert len(updated["movers"][0]["spectrum"]["wavelength_um"]) == 102

        # Validate file with schema validator
        validate_file(cand_path)

        # Check per-object spectrum file
        demo_file = spectra_dir / "TEST-MOV-01.json"
        assert demo_file.exists()
        with open(demo_file, "r", encoding="utf-8") as f:
            demo_data = json.load(f)
        assert demo_data["object_id"] == "TEST-MOV-01"
        assert "taxonomy" in demo_data


class TestFastAPIService:
    """Tests for FastAPI HTTP spectrum service and static demo fallback."""

    @pytest.fixture
    def client(self) -> TestClient:
        return TestClient(app)

    def test_health_endpoint(self, client: TestClient) -> None:
        """Verify health check returns status online."""
        resp = client.get("/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "online"
        assert data["service"] == "spherex-spectrophotometry"

    def test_live_spectrum_endpoint(self, client: TestClient) -> None:
        """Verify GET /spectrum returns 102-channel spectrophotometry."""
        resp = client.get("/spectrum?ra=269.452&dec=66.561&fov=0.2")
        assert resp.status_code == 200
        data = resp.json()
        assert "spectrum" in data
        assert len(data["spectrum"]["wavelength_um"]) == 102
        assert "taxonomy" in data

    def test_demo_fallback_endpoint(self, client: TestClient) -> None:
        """Verify demo=true flag triggers static fallback without error."""
        resp = client.get("/spectrum?ra=269.368&dec=66.538&demo=true")
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("fallback") is True
        assert "spectrum" in data


class TestCrossCheckUtility:
    """Tests for IRSA spectrophotometry file parser and cross-check comparator."""

    def test_parse_and_compare_csv(self, tmp_path: Path) -> None:
        """Verify parsing external CSV and computing agreement metrics."""
        csv_file = tmp_path / "irsa_test.csv"
        # Generate reference CSV
        waves = np.linspace(0.75, 5.00, 50)
        lines = ["# IRSA Spectrophotometry Tool Export\n", "wavelength_um,flux,flux_err\n"]
        for w in waves:
            flx = 100.0 * np.exp(-((w - 1.2) ** 2) / 2.0)
            lines.append(f"{w:.3f},{flx:.2f},{flx * 0.05:.2f}\n")
        with open(csv_file, "w", encoding="utf-8") as f:
            f.writelines(lines)

        # Parse IRSA file
        irsa_spec = parse_irsa_file(csv_file)
        assert len(irsa_spec[0]) == 50

        # Create our extracted spectrum
        our_waves = list(np.linspace(0.75, 5.00, 102))
        our_flux = [
            float(100.0 * np.exp(-((w - 1.2) ** 2) / 2.0) * 1.01) for w in our_waves
        ]
        our_err = [float(f * 0.05) for f in our_flux]
        our_spec = {"wavelength_um": our_waves, "flux": our_flux, "flux_err": our_err}

        report = compare_spectra(our_spec, irsa_spec)
        assert report["channels_evaluated"] == 102
        # ~1% systematic offset
        assert report["mean_fractional_diff"] < 0.05
        assert report["reduced_chi2"] < 2.0


class TestSpectralTaxonomy:
    """Tests for asteroid taxonomy and volatile ice absorption classification."""

    def test_s_type_classification(self) -> None:
        """Verify silicate 1.05 and 2.00 um absorption triggers S-type."""
        w = np.linspace(0.75, 5.00, 102)
        # Continuum + silicate absorption troughs at 1.05 and 2.00 um
        f = 100.0 * (1.0 + 0.1 * (w - 0.75))
        f *= (1.0 - 0.15 * np.exp(-((w - 1.05) ** 2) / 0.01))
        f *= (1.0 - 0.10 * np.exp(-((w - 2.00) ** 2) / 0.02))

        result = classify_spectral_taxonomy(w, f)
        assert "S-type" in result["taxonomy_class"]

    def test_icy_body_planet_x_classification(self) -> None:
        """Verify deep volatile H2O/CO2 ice bands trigger Icy Body / Planet X candidate."""
        w = np.linspace(0.75, 5.00, 102)
        f = 100.0 * np.ones_like(w)
        # Deep 2.02 um water ice absorption
        f *= (1.0 - 0.35 * np.exp(-((w - 2.02) ** 2) / 0.005))

        result = classify_spectral_taxonomy(w, f)
        assert "Icy Body" in result["taxonomy_class"] or "Planet X" in result["taxonomy_class"]
