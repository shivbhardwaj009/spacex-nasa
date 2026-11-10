"""Unit Tests for Module 3: Mover Detection Layer.

Verifies:
1. Static-sky model builds masked median and respects wavelength comparability.
2. Epoch differencing isolates moving excess flux.
3. Tracklet linking handles unequal time spacing.
4. Artifact rejection filters (single-epoch, stationary, filter-response) unit tests.
5. Confidence scoring formula and bounds.
6. Pipeline produces schema v1.0 compliant candidates with cutout PNGs.
7. evaluate_detection computes recall and position error.
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pytest
from astropy.wcs import WCS

from data.adapter.base import RegionInfo
from data.adapter.mock_source import MockSource
from detection.movers.artifacts import (
    filter_response_artifacts,
    filter_single_epoch_events,
    filter_stationary_residuals,
)
from detection.movers.confidence import compute_mover_confidence
from detection.movers.difference import difference_all_epochs, difference_epoch_against_model
from detection.movers.extractor import MoverDetection, extract_difference_sources
from detection.movers.linking import LinkedTracklet, fit_constant_velocity, link_tracklets
from detection.movers.pipeline import detect_movers, load_detection_config
from detection.movers.static_sky import build_static_sky_model
from detection.processing.pipeline import process_epochs
from detection.processing.types import ProcessedEpoch
from docs.validate import validate_file
from evaluate_detection import evaluate_movers


@pytest.fixture
def sample_processed_stack() -> list[ProcessedEpoch]:
    """Create a 3-epoch synthetic stack with a stationary star and a moving object."""
    shape = (50, 50)
    wcs = WCS(naxis=2)
    wcs.wcs.crpix = [25.5, 25.5]
    wcs.wcs.cdelt = [-0.001, 0.001]
    wcs.wcs.crval = [180.0, 45.0]
    wcs.wcs.ctype = ["RA---TAN", "DEC--TAN"]

    dates = ["2026-03-01T00:00:00Z", "2026-03-02T12:00:00Z", "2026-03-04T00:00:00Z"]
    wave = np.full(shape, 1.5, dtype=np.float32)

    stack = []
    yy, xx = np.indices(shape)

    for i, date in enumerate(dates):
        pix = np.zeros(shape, dtype=np.float32)

        # Stationary star at (25, 25) in all epochs
        pix += 300.0 * np.exp(-((xx - 25.0) ** 2 + (yy - 25.0) ** 2) / (2 * 1.5 ** 2))

        # Moving source moving along x axis: x = 12 + 8 * i
        mover_x = 12.0 + 8.0 * i
        mover_y = 35.0
        pix += 200.0 * np.exp(-((xx - mover_x) ** 2 + (yy - mover_y) ** 2) / (2 * 1.5 ** 2))

        # Noise
        rng = np.random.default_rng(42 + i)
        pix += rng.normal(0, 5.0, size=shape).astype(np.float32)

        stack.append(
            ProcessedEpoch(
                epoch_id=f"epoch_0{i + 1}",
                date=date,
                pixels=pix,
                variance=np.full(shape, 25.0, dtype=np.float32),
                mask=np.zeros(shape, dtype=bool),
                wcs=wcs,
                wavelength_map=wave,
            )
        )

    return stack


def test_static_sky_model_and_differencing(sample_processed_stack):
    """Static-sky model computes median and differencing removes stationary star."""
    model, var, mask = build_static_sky_model(sample_processed_stack)
    assert model.shape == (50, 50)
    assert not np.any(mask)

    # Stationary star at (25, 25) should be present in static model with flux ~300
    assert model[25, 25] > 200.0

    # Moving source was transient, so its median should be near 0
    assert model[35, 12] < 50.0

    # Differencing epoch 01
    diff = difference_epoch_against_model(sample_processed_stack[0], model, var, mask)
    # Stationary star should be subtracted down near 0
    assert abs(diff.diff_pixels[25, 25]) < 30.0
    # Mover at (35, 12) should show positive excess in epoch 1
    assert diff.diff_pixels[35, 12] > 120.0


def test_tracklet_linking_unequal_dates():
    """Tracklet linking correctly fits velocity across non-uniformly spaced dates."""
    dates = ["2026-03-01T00:00:00Z", "2026-03-01T18:00:00Z", "2026-03-04T06:00:00Z"]
    # dt in days: [0.0, 0.75, 3.25]
    # Injected motion: ra_rate = 20.0 "/day, dec_rate = -10.0 "/day
    ra0, dec0 = 180.0, 45.0
    cos_dec = np.cos(np.radians(dec0))

    dt_days = [0.0, 0.75, 3.25]
    dets_by_epoch = {}
    chain = []

    for idx, dt in enumerate(dt_days):
        ra = ra0 + (20.0 * dt) / (3600.0 * cos_dec)
        dec = dec0 + (-10.0 * dt) / 3600.0
        det = MoverDetection(
            detection_id=f"D{idx}",
            epoch_id=f"ep_{idx}",
            date=dates[idx],
            ra=ra,
            dec=dec,
            x_px=10.0 + idx * 5.0,
            y_px=10.0,
            flux=500.0,
            flux_err=15.0,
            snr=33.3,
            wavelength_um=1.5,
        )
        dets_by_epoch[f"ep_{idx}"] = [det]
        chain.append(det)

    tracklets = link_tracklets(dets_by_epoch, min_detections=3, max_rms_arcsec=1.5)
    assert len(tracklets) == 1
    trk = tracklets[0]
    assert np.isclose(trk.ra_rate_arcsec_per_day, 20.0, atol=0.2)
    assert np.isclose(trk.dec_rate_arcsec_per_day, -10.0, atol=0.2)
    assert trk.rms_arcsec < 0.1


def test_filter_single_epoch_events():
    """Filter A: Rejects tracklets with fewer than min_epochs distinct observations."""
    det1 = MoverDetection("D1", "ep_01", "2026-03-01T00:00:00Z", 180.0, 45.0, 10, 10, 100, 5, 20, 1.5)
    det2 = MoverDetection("D2", "ep_01", "2026-03-01T00:00:00Z", 180.001, 45.0, 12, 10, 100, 5, 20, 1.5)

    tracklet_bad = LinkedTracklet("TRK-BAD", 180.0, 45.0, 15.0, 5.0, [det1, det2], 0.1, 20.0)
    det3 = MoverDetection("D3", "ep_02", "2026-03-02T00:00:00Z", 180.005, 45.0, 15, 10, 100, 5, 20, 1.5)
    det4 = MoverDetection("D4", "ep_03", "2026-03-03T00:00:00Z", 180.010, 45.0, 20, 10, 100, 5, 20, 1.5)
    tracklet_good = LinkedTracklet("TRK-GOOD", 180.0, 45.0, 15.0, 5.0, [det1, det3, det4], 0.1, 20.0)

    passed, rejected = filter_single_epoch_events([tracklet_bad, tracklet_good], min_epochs=3)
    assert len(passed) == 1
    assert passed[0].tracklet_id == "TRK-GOOD"
    assert len(rejected) == 1
    assert rejected[0].tracklet_id == "TRK-BAD"


def test_filter_stationary_residuals():
    """Filter B: Rejects tracklets with near-zero proper motion (< stationary_max_rate)."""
    det = MoverDetection("D1", "ep_01", "2026-03-01T00:00:00Z", 180.0, 45.0, 10, 10, 100, 5, 20, 1.5)

    # Stationary artifact: rate = 0.2 "/day (< 0.8)
    trk_stat = LinkedTracklet("TRK-STAT", 180.0, 45.0, 0.15, 0.10, [det, det, det], 0.1, 20.0)
    # Real mover: rate = 25.0 "/day (> 0.8)
    trk_mover = LinkedTracklet("TRK-MOV", 180.0, 45.0, 20.0, 15.0, [det, det, det], 0.1, 20.0)

    passed, rejected = filter_stationary_residuals([trk_stat, trk_mover], stationary_max_rate=0.8)
    assert len(passed) == 1
    assert passed[0].tracklet_id == "TRK-MOV"
    assert len(rejected) == 1
    assert rejected[0].tracklet_id == "TRK-STAT"


def test_filter_response_artifacts():
    """Filter C: Rejects tracklets whose flux correlates strongly with wavelength."""
    # Stationary color residual: flux rises linearly with filter wavelength
    d1 = MoverDetection("D1", "ep_01", "2026-03-01T00:00:00Z", 180.0, 45.0, 10, 10, 100.0, 5, 20, 1.0)
    d2 = MoverDetection("D2", "ep_02", "2026-03-02T00:00:00Z", 180.0, 45.0, 10, 10, 200.0, 5, 20, 2.0)
    d3 = MoverDetection("D3", "ep_03", "2026-03-03T00:00:00Z", 180.0, 45.0, 10, 10, 300.0, 5, 20, 3.0)
    trk_artifact = LinkedTracklet("TRK-ART", 180.0, 45.0, 0.5, 0.5, [d1, d2, d3], 0.1, 20.0)

    # Real mover with constant flux and real motion (rate = 25 "/day)
    m1 = MoverDetection("M1", "ep_01", "2026-03-01T00:00:00Z", 180.0, 45.0, 10, 10, 250.0, 5, 20, 1.2)
    m2 = MoverDetection("M2", "ep_02", "2026-03-02T00:00:00Z", 180.01, 45.0, 15, 10, 255.0, 5, 20, 1.8)
    m3 = MoverDetection("M3", "ep_03", "2026-03-03T00:00:00Z", 180.02, 45.0, 20, 10, 248.0, 5, 20, 2.4)
    trk_real = LinkedTracklet("TRK-REAL", 180.0, 45.0, 20.0, 15.0, [m1, m2, m3], 0.1, 20.0)

    passed, rejected = filter_response_artifacts([trk_artifact, trk_real], corr_threshold=0.70)
    assert len(passed) == 1
    assert passed[0].tracklet_id == "TRK-REAL"
    assert len(rejected) == 1
    assert rejected[0].tracklet_id == "TRK-ART"


def test_confidence_scoring_bounds():
    """Confidence metric stays strictly in [0.0, 1.0] and behaves monotonically."""
    # Ideal high-confidence mover: SNR=25, RMS=0.05, 6 epochs
    c_high = compute_mover_confidence(snr_mean=25.0, rms_arcsec=0.05, epoch_count=6)
    assert 0.85 <= c_high <= 1.0

    # Marginal low-confidence mover: SNR=3.5, RMS=1.4, 3 epochs
    c_low = compute_mover_confidence(snr_mean=3.5, rms_arcsec=1.4, epoch_count=3)
    assert 0.0 <= c_low < 0.40

    assert c_high > c_low


def test_detection_pipeline_on_mock_stack(tmp_path: Path):
    """End-to-end mover detection on MockSource recovers candidates and produces schema-valid JSON."""
    gt_file = tmp_path / "ground_truth.json"
    source = MockSource(seed=42, ground_truth_path=gt_file)
    region = RegionInfo(ra_center=269.452, dec_center=66.561)

    # Run Module 2 processing
    proc_epochs = process_epochs(
        source=source,
        region=region,
        fov_deg=0.2,
        output_dir=tmp_path / "processed",
    )

    # Run Module 3 mover detection
    candidates = detect_movers(
        epochs=proc_epochs,
        region=region,
        output_dir=tmp_path / "output",
        is_synthetic=True,
    )

    assert candidates["schema_version"] == "1.0"
    assert len(candidates["movers"]) > 0

    # Verify each candidate has required fields and is_synthetic: true
    for mover in candidates["movers"]:
        assert mover["is_synthetic"] is True
        assert mover["type"] == "unknown"
        assert 0.0 <= mover["confidence"] <= 1.0
        assert len(mover["detections"]) >= 3

        # Check cutouts exist
        for d in mover["detections"]:
            cutout_path = tmp_path / "output" / d["cutout_url"]
            assert cutout_path.is_file()

    # Validate output file against schema
    cand_file = tmp_path / "output" / "candidates.json"
    validated = validate_file(cand_file)
    assert len(validated["movers"]) == len(candidates["movers"])

    # Test evaluation
    with open(gt_file, "r", encoding="utf-8") as f:
        gt_data = json.load(f)
    eval_res = evaluate_movers(candidates, gt_data)
    assert eval_res["total_ground_truth_movers"] >= 3
    assert eval_res["recall"] > 0.60
    assert eval_res["position_error_arcsec"]["median"] < 1.5
