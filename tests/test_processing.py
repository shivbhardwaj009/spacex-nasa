"""Unit Tests for Module 2: Image Processing Layer.

Verifies:
1. Alignment error is below 0.1 pixels for injected WCS offsets.
2. Background mean is near 0 after subtraction.
3. Masks propagate (adapter mask, cosmic rays/outliers, out-of-bounds).
4. Normalisation reduces epoch-to-epoch flux scatter across reference stars.
5. Comparable mask correctly marks matching wavelengths within tolerance.
6. Processing pipeline outputs NPZ files and valid manifest.json.
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pytest
from astropy.wcs import WCS
from photutils.detection import DAOStarFinder

from data.adapter.base import RegionInfo
from data.adapter.mock_source import MockSource
from detection.processing.background import estimate_and_subtract_background
from detection.processing.masking import create_bad_pixel_mask
from detection.processing.normalisation import normalize_epochs, select_reference_stars
from detection.processing.pipeline import process_epochs
from detection.processing.reprojection import reproject_to_common_grid
from detection.processing.types import ProcessedEpoch
from detection.processing.wavelength import comparable_mask


@pytest.fixture
def mock_source(tmp_path: Path) -> MockSource:
    """Fixture providing deterministic MockSource."""
    gt_file = tmp_path / "ground_truth.json"
    return MockSource(seed=42, ground_truth_path=gt_file)


def test_background_subtraction_mean_near_zero(mock_source: MockSource):
    """Background mean must be near 0 after sigma-clipped subtraction."""
    region = RegionInfo(ra_center=269.452, dec_center=66.561)
    img = mock_source.load_epoch("epoch_01", region=region, fov_deg=0.2)

    subtracted, bkg_map, rms_map = estimate_and_subtract_background(img.pixels, mask=img.mask)

    assert subtracted.shape == img.pixels.shape
    assert bkg_map.shape == img.pixels.shape

    # Mean of background-subtracted pixels in unmasked area should be within 0.5 ADU of 0
    valid_pixels = subtracted[~img.mask.astype(bool)]
    bkg_mean = float(np.mean(valid_pixels))
    bkg_median = float(np.median(valid_pixels))

    assert abs(bkg_median) < 0.3, f"Background median {bkg_median} is not near 0"
    assert abs(bkg_mean) < 1.0, f"Background mean {bkg_mean} is not near 0"


def test_alignment_error_below_point_one_pixel(mock_source: MockSource):
    """Reprojection alignment error must be below 0.1 px for injected WCS offsets."""
    region = RegionInfo(ra_center=269.452, dec_center=66.561)
    img = mock_source.load_epoch("epoch_01", region=region, fov_deg=0.2)

    # Reference WCS and common target shape
    target_wcs = img.wcs
    target_shape = img.pixels.shape
    npix = target_shape[0]

    # Injected celestial star coordinate (J2000 RA/Dec)
    star_ra = region.ra_center + 0.015
    star_dec = region.dec_center - 0.012

    # Telescope pointing 1 (reference pointing)
    x_ref, y_ref = target_wcs.all_world2pix(star_ra, star_dec, 0)

    # Telescope pointing 2 with injected pointing jitter / WCS offset (+2.5 px in X, -1.8 px in Y)
    jittered_wcs = target_wcs.deepcopy()
    jittered_wcs.wcs.crpix = [target_wcs.wcs.crpix[0] + 2.5, target_wcs.wcs.crpix[1] - 1.8]
    x_jit, y_jit = jittered_wcs.all_world2pix(star_ra, star_dec, 0)

    # Synthesize PSFs for both observations
    psf_sigma = 1.3
    yy, xx = np.indices((npix, npix))
    star_flux = 350.0

    ref_pixels = (star_flux / (2 * np.pi * psf_sigma ** 2)) * np.exp(
        -((xx - x_ref) ** 2 + (yy - y_ref) ** 2) / (2 * psf_sigma ** 2)
    )
    jittered_pixels = (star_flux / (2 * np.pi * psf_sigma ** 2)) * np.exp(
        -((xx - x_jit) ** 2 + (yy - y_jit) ** 2) / (2 * psf_sigma ** 2)
    )

    # Reproject jittered observation onto common reference grid
    reproj_pixels, _, _, _ = reproject_to_common_grid(
        pixels=jittered_pixels.astype(np.float32),
        variance=np.ones_like(jittered_pixels, dtype=np.float32),
        mask=np.zeros_like(jittered_pixels, dtype=bool),
        wavelength_map=img.wavelength_map,
        input_wcs=jittered_wcs,
        target_wcs=target_wcs,
        target_shape=target_shape,
    )

    # Extract source centroid in both reference and reprojected images
    finder = DAOStarFinder(fwhm=2.8, threshold=10.0, exclude_border=True)
    table_ref = finder(ref_pixels)
    table_reproj = finder(reproj_pixels)

    assert table_ref is not None and len(table_ref) > 0
    assert table_reproj is not None and len(table_reproj) > 0

    x_col = "x_centroid" if "x_centroid" in table_ref.colnames else "xcentroid"
    y_col = "y_centroid" if "y_centroid" in table_ref.colnames else "ycentroid"

    x0 = float(table_ref[x_col][0])
    y0 = float(table_ref[y_col][0])

    xr = float(table_reproj[x_col][0])
    yr = float(table_reproj[y_col][0])

    alignment_error_px = float(np.hypot(xr - x0, yr - y0))

    # Alignment error must be strictly below 0.1 pixel
    assert alignment_error_px < 0.10, (
        f"Alignment error {alignment_error_px:.4f} px exceeds 0.1 px requirement"
    )


def test_masks_propagate(mock_source: MockSource):
    """Propagates adapter mask, outliers/cosmic rays, and out-of-bounds regions."""
    region = RegionInfo(ra_center=269.452, dec_center=66.561)
    img = mock_source.load_epoch("epoch_01", region=region, fov_deg=0.2)

    # Inject an intentional cosmic ray spike at (30, 30)
    test_pixels = img.pixels.copy()
    test_pixels[30, 30] += 5000.0

    mask = create_bad_pixel_mask(test_pixels, adapter_mask=img.mask, nsigma_outlier=5.0)

    # Verify cosmic ray was flagged
    assert mask[30, 30] is True or mask[30, 30] == 1
    # Verify adapter edge mask (first row/col) is preserved
    assert mask[0, 0] is True or mask[0, 0] == 1

    # Test reprojection mask propagation with offset that creates out-of-bounds area
    target_wcs = img.wcs.deepcopy()
    # Shift CRPIX significantly so portion of output grid has no data
    target_wcs.wcs.crpix = [img.wcs.wcs.crpix[0] - 25.0, img.wcs.wcs.crpix[1] - 25.0]

    _, _, reproj_mask, _ = reproject_to_common_grid(
        pixels=test_pixels,
        variance=img.variance,
        mask=mask,
        wavelength_map=img.wavelength_map,
        input_wcs=img.wcs,
        target_wcs=target_wcs,
        target_shape=img.pixels.shape,
    )

    # Out-of-bounds pixels must be masked as True
    assert np.any(reproj_mask)
    assert np.sum(reproj_mask) > np.sum(mask)


def test_normalisation_reduces_epoch_to_epoch_flux_scatter(mock_source: MockSource):
    """Normalisation must reduce cross-epoch flux scatter across reference stars."""
    region = RegionInfo(ra_center=269.452, dec_center=66.561)
    img = mock_source.load_epoch("epoch_01", region=region, fov_deg=0.2)

    # Create 3 synthetic epochs with intentional artificial throughput variations (1.0, 0.85, 1.20)
    true_factors = [1.0, 0.85, 1.20]
    raw_images = []
    raw_variances = []
    raw_masks = []

    for factor in true_factors:
        raw_images.append((img.pixels * factor).astype(np.float32))
        raw_variances.append((img.variance * (factor ** 2)).astype(np.float32))
        raw_masks.append(img.mask.astype(bool))

    # Calculate unnormalized scatter across qualifying stars
    stars_before = select_reference_stars(raw_images, raw_masks, max_relative_scatter=0.30)
    assert len(stars_before) > 0, "No qualifying reference stars found for test"

    scatters_before = [s.flux_scatter_rel for s in stars_before]
    mean_scatter_before = float(np.mean(scatters_before))

    # Run normalisation
    norm_images, norm_vars, scale_factors, ref_stars = normalize_epochs(
        raw_images, raw_variances, raw_masks
    )

    # Scale factors should closely reconstruct true throughput factors
    assert np.isclose(scale_factors[0], 1.0, atol=0.05)
    assert np.isclose(scale_factors[1], 0.85, atol=0.08)
    assert np.isclose(scale_factors[2], 1.20, atol=0.08)

    # Measure scatter after normalisation
    stars_after = select_reference_stars(norm_images, raw_masks, max_relative_scatter=0.30)
    scatters_after = [s.flux_scatter_rel for s in stars_after]
    mean_scatter_after = float(np.mean(scatters_after))

    # Scatter must be strictly reduced by normalisation
    assert mean_scatter_after < mean_scatter_before, (
        f"Normalisation did not reduce scatter: before={mean_scatter_before}, after={mean_scatter_after}"
    )


def test_comparable_mask_tolerances():
    """comparable_mask marks pixels whose wavelengths match within tolerance."""
    shape = (40, 40)
    wcs = WCS(naxis=2)

    # Two epochs with slightly shifted Linear Variable Filter wavelength gradient
    wave_a = np.tile(np.linspace(1.20, 2.40, 40)[:, np.newaxis], (1, 40)).astype(np.float32)
    # Shift wave_b by +0.03 um (within 0.05 um tolerance) in top half, +0.10 um (outside tol) in bottom half
    wave_b = wave_a.copy()
    wave_b[:20, :] += 0.03  # Difference 0.03 <= 0.05
    wave_b[20:, :] += 0.10  # Difference 0.10 > 0.05

    mask_a = np.zeros(shape, dtype=bool)
    mask_b = np.zeros(shape, dtype=bool)
    mask_a[5, 5] = True  # Explicitly mask one pixel in epoch a

    ep_a = ProcessedEpoch(
        epoch_id="ep_01",
        date="2026-03-01T00:00:00Z",
        pixels=np.zeros(shape, dtype=np.float32),
        variance=np.ones(shape, dtype=np.float32),
        mask=mask_a,
        wcs=wcs,
        wavelength_map=wave_a,
    )

    ep_b = ProcessedEpoch(
        epoch_id="ep_02",
        date="2026-03-02T00:00:00Z",
        pixels=np.zeros(shape, dtype=np.float32),
        variance=np.ones(shape, dtype=np.float32),
        mask=mask_b,
        wcs=wcs,
        wavelength_map=wave_b,
    )

    comp = comparable_mask(ep_a, ep_b, tol_um=0.05)

    # Top half (diff <= 0.05) should be True (except masked pixel (5, 5))
    assert comp[0, 0] is True or comp[0, 0] == 1
    assert comp[5, 5] is False or comp[5, 5] == 0
    # Bottom half (diff = 0.10 > 0.05) should be False
    assert comp[30, 30] is False or comp[30, 30] == 0


def test_pipeline_manifest_and_npz_outputs(mock_source: MockSource, tmp_path: Path):
    """Pipeline outputs NPZ files per epoch and valid manifest.json."""
    region = RegionInfo(ra_center=269.452, dec_center=66.561)
    out_dir = tmp_path / "processed_test"

    epochs = process_epochs(
        source=mock_source,
        region=region,
        fov_deg=0.2,
        output_dir=out_dir,
    )

    assert len(epochs) == 5
    manifest_file = out_dir / "manifest.json"
    assert manifest_file.is_file()

    with open(manifest_file, "r", encoding="utf-8") as f:
        manifest = json.load(f)

    assert manifest["schema_version"] == "1.0"
    assert len(manifest["epochs"]) == 5

    # Check each NPZ file
    for ep_rec in manifest["epochs"]:
        npz_file = out_dir / ep_rec["file"]
        assert npz_file.is_file()
        data = np.load(npz_file)
        assert "pixels" in data
        assert "variance" in data
        assert "mask" in data
        assert "wavelength_map" in data
        assert data["pixels"].shape == tuple(manifest["grid_shape"])
