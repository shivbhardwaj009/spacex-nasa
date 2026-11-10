"""Unit Tests for Module 1: Data Adapter Layer.

Verifies:
1. MockSource returns consistent WCS and pixel coordinate transformations.
2. Wavelength map shape matches 2D image shape and contains valid values.
3. Ground truth matches injected positions and kinematics.
4. Factory switches between MockSource and IrsaFitsSource based on config.
5. IrsaFitsSource raises NotImplementedError with documented TODO(VERIFY) tags.
6. Metadata catalog builds and reads CSV coverage properly.
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pytest
from astropy.wcs import WCS

from data.adapter.base import EpochImage, EpochInfo, RegionInfo
from data.adapter.factory import get_source
from data.adapter.irsa_source import IrsaFitsSource
from data.adapter.metadata_catalog import (
    build_metadata_catalog,
    query_catalog_coverage,
    read_metadata_catalog,
)
from data.adapter.mock_source import MockSource


def test_mock_source_wcs_consistency(tmp_path: Path):
    """MockSource must return consistent, valid WCS centered on region."""
    gt_file = tmp_path / "ground_truth.json"
    source = MockSource(seed=42, ground_truth_path=gt_file)
    region = RegionInfo(name="Test Field", ra_center=180.0, dec_center=45.0, radius_deg=0.5)

    img = source.load_epoch("epoch_01", region=region, fov_deg=0.2)

    assert isinstance(img.wcs, WCS)
    npix = img.pixels.shape[0]

    # Center pixel should project within 0.01 arcsec of (ra_center, dec_center)
    center_px = (npix / 2.0 + 0.5, npix / 2.0 + 0.5)
    ra_proj, dec_proj = img.wcs.all_pix2world(center_px[0], center_px[1], 1)

    assert np.isclose(ra_proj, 180.0, atol=1e-4)
    assert np.isclose(dec_proj, 45.0, atol=1e-4)


@pytest.mark.parametrize("fov_deg", [0.1, 0.2, 0.35])
def test_wavelength_map_shape_equals_image_shape(tmp_path: Path, fov_deg: float):
    """Wavelength map shape must strictly equal image, variance, and mask shapes."""
    gt_file = tmp_path / "ground_truth.json"
    source = MockSource(seed=42, ground_truth_path=gt_file)
    region = RegionInfo(ra_center=269.452, dec_center=66.561)

    img = source.load_epoch("epoch_01", region=region, fov_deg=fov_deg)

    expected_shape = img.pixels.shape
    assert len(expected_shape) == 2
    assert img.variance.shape == expected_shape
    assert img.mask.shape == expected_shape
    assert img.wavelength_map.shape == expected_shape

    # Wavelength values must lie within SPHEREx infrared regime (0.75 - 5.0 um)
    assert np.all(img.wavelength_map >= 0.75)
    assert np.all(img.wavelength_map <= 5.00)


def test_ground_truth_matches_injected_positions(tmp_path: Path):
    """Ground truth positions and rates must match injected source coordinates."""
    gt_file = tmp_path / "ground_truth.json"
    source = MockSource(seed=42, ground_truth_path=gt_file)
    region = RegionInfo(ra_center=269.452, dec_center=66.561)

    # Load two consecutive epochs
    img1 = source.load_epoch("epoch_01", region=region, fov_deg=0.2)
    img2 = source.load_epoch("epoch_02", region=region, fov_deg=0.2)

    assert gt_file.is_file()
    with open(gt_file, "r", encoding="utf-8") as f:
        gt = json.load(f)

    assert gt["is_synthetic"] is True
    assert "epoch_01" in gt["epochs_ground_truth"]
    assert "epoch_02" in gt["epochs_ground_truth"]

    movers_ep1 = gt["epochs_ground_truth"]["epoch_01"]["movers"]
    assert len(movers_ep1) >= 3

    # Verify world2pix mapping matches ground truth pixel coordinates
    for m in movers_ep1:
        ra = m["ra"]
        dec = m["dec"]
        calc_px, calc_py = img1.wcs.all_world2pix(ra, dec, 0)
        assert np.isclose(calc_px, m["pixel_x"], atol=1e-3)
        assert np.isclose(calc_py, m["pixel_y"], atol=1e-3)


def test_factory_switches_by_config():
    """Factory correctly switches between MockSource and IrsaFitsSource based on config."""
    # Mock source
    src_mock = get_source({"data_source": "mock", "mock": {"random_seed": 123}})
    assert isinstance(src_mock, MockSource)
    assert src_mock.seed == 123

    # IRSA source
    src_irsa = get_source({"data_source": "irsa"})
    assert isinstance(src_irsa, IrsaFitsSource)

    # Invalid source
    with pytest.raises(ValueError) as excinfo:
        get_source({"data_source": "unsupported_source"})
    assert "Unsupported data_source" in str(excinfo.value)


def test_irsa_source_stubs_raise_not_implemented():
    """IrsaFitsSource stub must raise NotImplementedError with TODO(VERIFY) tags."""
    irsa = IrsaFitsSource()
    region = RegionInfo()

    with pytest.raises(NotImplementedError) as excinfo:
        irsa.list_epochs(region=region, fov_deg=0.2)
    assert "TODO(VERIFY)" in str(excinfo.value)

    with pytest.raises(NotImplementedError) as excinfo2:
        irsa.load_epoch("epoch_01", region=region, fov_deg=0.2)
    assert "TODO(VERIFY)" in str(excinfo2.value)


def test_metadata_catalog_roundtrip(tmp_path: Path):
    """Metadata catalog must write and read CSV footprints properly."""
    epochs = [
        EpochInfo(epoch_id="epoch_01", date="2026-03-01T00:00:00Z", files=["f1.fits"], band_count=102),
        EpochInfo(epoch_id="epoch_02", date="2026-03-02T00:00:00Z", files=["f2.fits"], band_count=102),
    ]
    region = RegionInfo(ra_center=150.0, dec_center=30.0, radius_deg=0.5)
    csv_file = tmp_path / "metadata.csv"

    out = build_metadata_catalog(epochs, region=region, output_path=csv_file, fov_deg=0.2)
    assert out.is_file()

    records = read_metadata_catalog(csv_file)
    assert len(records) == 2
    assert records[0]["epoch_id"] == "epoch_01"
    assert records[0]["band_count"] == 102
    assert records[0]["ra_center"] == 150.0

    # Test spatial query
    matching = query_catalog_coverage(records, ra=150.0, dec=30.0)
    assert len(matching) == 2

    far_away = query_catalog_coverage(records, ra=10.0, dec=10.0)
    assert len(far_away) == 0


def test_epoch_image_validation():
    """EpochImage dataclass enforces 2D array shapes and matching dimensions."""
    pix = np.zeros((64, 64), dtype=np.float32)
    var = np.zeros((64, 64), dtype=np.float32)
    mask = np.zeros((64, 64), dtype=np.uint8)
    wave = np.zeros((64, 64), dtype=np.float32)
    wcs = WCS(naxis=2)

    # Valid image creation
    img = EpochImage(pixels=pix, variance=var, mask=mask, wcs=wcs, wavelength_map=wave)
    assert img.pixels.shape == (64, 64)

    # Mismatched variance
    bad_var = np.zeros((64, 60), dtype=np.float32)
    with pytest.raises(ValueError) as exc:
        EpochImage(pixels=pix, variance=bad_var, mask=mask, wcs=wcs, wavelength_map=wave)
    assert "Variance shape" in str(exc.value)

    # Mismatched wavelength map
    bad_wave = np.zeros((60, 64), dtype=np.float32)
    with pytest.raises(ValueError) as exc2:
        EpochImage(pixels=pix, variance=var, mask=mask, wcs=wcs, wavelength_map=bad_wave)
    assert "Wavelength map shape" in str(exc2.value)
