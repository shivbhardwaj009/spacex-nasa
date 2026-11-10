"""Unit Tests for Module 4: Catalog Matching Layer.

Uses mocked network responses (no live calls in pytest).
Verifies:
1. Query caching using deterministic SHA-256 hash.
2. Robust offline fallback when network is unavailable.
3. Position prediction across arbitrary epoch dates.
4. Correct classification of Known vs Unknown candidates based on position & motion tolerances.
5. In-place candidates.json update and schema validation.
6. Validation report generation (JSON and Markdown).
"""

from __future__ import annotations

import copy
import json
from pathlib import Path
from unittest.mock import MagicMock, patch

import numpy as np
import pytest

from docs.validate import validate_file
from matching.ephemeris import is_prediction_in_field, predict_known_positions
from matching.matcher import match_candidates
from matching.pipeline import run_catalog_matching
from matching.query import load_offline_fallback, query_known_objects
from matching.types import EphemerisPrediction, KnownObject
from matching.validation import build_validation_report


@pytest.fixture
def sample_candidates_payload() -> dict:
    """Fixture providing minimal candidate payload."""
    return {
        "schema_version": "1.0",
        "data_version": "v0.1.0-test",
        "generated_at": "2026-03-01T00:00:00Z",
        "fov_deg": 1.0,
        "region": {
            "name": "SPHEREx Test Region",
            "ra_center": 269.452,
            "dec_center": 66.561,
            "radius_deg": 0.5,
        },
        "epochs": [
            {"epoch_id": "epoch_01", "date": "2026-03-01T00:00:00Z", "band_count": 102},
            {"epoch_id": "epoch_02", "date": "2026-03-02T00:00:00Z", "band_count": 102},
            {"epoch_id": "epoch_03", "date": "2026-03-03T00:00:00Z", "band_count": 102},
        ],
        "movers": [
            {
                # Should match 1 Ceres
                "object_id": "SPX-MOV-0001",
                "ra": 269.452,
                "dec": 66.561,
                "type": "unknown",
                "match_name": None,
                "confidence": 0.85,
                "is_synthetic": True,
                "motion": {
                    "ra_rate_arcsec_per_day": 32.5,
                    "dec_rate_arcsec_per_day": 14.2,
                },
                "detections": [
                    {
                        "epoch_id": "epoch_01",
                        "date": "2026-03-01T00:00:00Z",
                        "ra": 269.452,
                        "dec": 66.561,
                        "flux": 800.0,
                        "cutout_url": "cutouts/SPX-MOV-0001_epoch_01.png",
                    },
                    {
                        "epoch_id": "epoch_02",
                        "date": "2026-03-02T00:00:00Z",
                        "ra": 269.452 + (32.5 / (3600.0 * 0.39775)),
                        "dec": 66.561 + (14.2 / 3600.0),
                        "flux": 795.0,
                        "cutout_url": "cutouts/SPX-MOV-0001_epoch_02.png",
                    },
                    {
                        "epoch_id": "epoch_03",
                        "date": "2026-03-03T00:00:00Z",
                        "ra": 269.452 + (65.0 / (3600.0 * 0.39775)),
                        "dec": 66.561 + (28.4 / 3600.0),
                        "flux": 810.0,
                        "cutout_url": "cutouts/SPX-MOV-0001_epoch_03.png",
                    },
                ],
                "spectrum": None,
            },
            {
                # Unknown mover (Planet X candidate with slow motion: -3.0, 1.5)
                "object_id": "SPX-MOV-0002",
                "ra": 269.100,
                "dec": 66.400,
                "type": "unknown",
                "match_name": None,
                "confidence": 0.72,
                "is_synthetic": True,
                "motion": {
                    "ra_rate_arcsec_per_day": -3.0,
                    "dec_rate_arcsec_per_day": 1.5,
                },
                "detections": [
                    {
                        "epoch_id": "epoch_01",
                        "date": "2026-03-01T00:00:00Z",
                        "ra": 269.100,
                        "dec": 66.400,
                        "flux": 350.0,
                        "cutout_url": "cutouts/SPX-MOV-0002_epoch_01.png",
                    },
                    {
                        "epoch_id": "epoch_02",
                        "date": "2026-03-02T00:00:00Z",
                        "ra": 269.100 - (3.0 / (3600.0 * 0.39775)),
                        "dec": 66.400 + (1.5 / 3600.0),
                        "flux": 345.0,
                        "cutout_url": "cutouts/SPX-MOV-0002_epoch_02.png",
                    },
                    {
                        "epoch_id": "epoch_03",
                        "date": "2026-03-03T00:00:00Z",
                        "ra": 269.100 - (6.0 / (3600.0 * 0.39775)),
                        "dec": 66.400 + (3.0 / 3600.0),
                        "flux": 355.0,
                        "cutout_url": "cutouts/SPX-MOV-0002_epoch_03.png",
                    },
                ],
                "spectrum": None,
            },
        ],
    }


def test_offline_fallback_loader():
    """Offline fallback loads known asteroids without network."""
    known = load_offline_fallback()
    assert len(known) >= 5
    names = [k.name for k in known]
    assert any("Ceres" in n for n in names)
    assert any("Vesta" in n for n in names)


def test_query_caching_and_offline_mode(tmp_path: Path):
    """Query caching saves on-disk JSON and avoids network on repeat calls."""
    cache_dir = tmp_path / "cache"

    # Call with offline=True
    res1 = query_known_objects(
        ra=269.452,
        dec=66.561,
        radius_deg=0.5,
        dates=["2026-03-01T00:00:00Z"],
        cache_dir=cache_dir,
        offline=True,
    )
    assert len(res1) >= 5

    # Check cache file was created
    cache_files = list(cache_dir.glob("*.json"))
    assert len(cache_files) == 1

    # Second call should load from cache
    res2 = query_known_objects(
        ra=269.452,
        dec=66.561,
        radius_deg=0.5,
        dates=["2026-03-01T00:00:00Z"],
        cache_dir=cache_dir,
        offline=False,
    )
    assert len(res2) == len(res1)


@patch("matching.query._query_skybot_api")
def test_query_network_failure_falls_back_gracefully(mock_skybot, tmp_path: Path):
    """When network raises ConnectionError/Timeout, query falls back to offline catalog."""
    mock_skybot.side_effect = ConnectionError("Simulated network down")
    cache_dir = tmp_path / "cache"

    # Should NOT raise ConnectionError, must fall back cleanly
    results = query_known_objects(
        ra=269.452,
        dec=66.561,
        radius_deg=0.5,
        dates=["2026-03-01T00:00:00Z"],
        cache_dir=cache_dir,
        offline=False,
        max_retries=1,
    )
    assert len(results) >= 5
    assert any("Ceres" in k.name for k in results)


def test_ephemeris_propagation():
    """Predicts coordinates accurately based on elapsed days and motion rates."""
    obj = KnownObject(
        designation="1",
        name="1 Ceres",
        body_type="asteroid",
        ra_deg=180.0,
        dec_deg=0.0,
        ra_rate_arcsec_per_day=36.0,  # 0.01 deg/day
        dec_rate_arcsec_per_day=-18.0, # -0.005 deg/day
        epoch_date="2026-03-01T00:00:00Z",
    )

    epochs = [
        ("ep_01", "2026-03-01T00:00:00Z"),
        ("ep_02", "2026-03-02T00:00:00Z"), # +1 day
        ("ep_03", "2026-03-03T12:00:00Z"), # +2.5 days
    ]

    preds = predict_known_positions([obj], epochs)
    assert len(preds["ep_01"]) == 1
    assert preds["ep_01"][0].ra == 180.0
    assert preds["ep_01"][0].dec == 0.0

    # +1 day: RA += 36 arcsec = 0.01 deg
    assert np.isclose(preds["ep_02"][0].ra, 180.01, atol=1e-5)
    assert np.isclose(preds["ep_02"][0].dec, -0.005, atol=1e-5)

    # +2.5 days: RA += 90 arcsec = 0.025 deg
    assert np.isclose(preds["ep_03"][0].ra, 180.025, atol=1e-5)
    assert np.isclose(preds["ep_03"][0].dec, -0.0125, atol=1e-5)


def test_matcher_known_vs_unknown_classification(sample_candidates_payload):
    """Matcher correctly tags known asteroid vs unknown candidate."""
    known_objects = load_offline_fallback()
    epochs = [("epoch_01", "2026-03-01T00:00:00Z"), ("epoch_02", "2026-03-02T00:00:00Z"), ("epoch_03", "2026-03-03T00:00:00Z")]
    predictions = predict_known_positions(known_objects, epochs)

    updated_payload, match_records = match_candidates(
        candidates_payload=sample_candidates_payload,
        predictions_by_epoch=predictions,
        position_tol_arcsec=4.0,
        motion_tol_arcsec_day=6.0,
    )

    movers = updated_payload["movers"]
    assert len(movers) == 2

    # SPX-MOV-0001 matches 1 Ceres
    m1 = next(m for m in movers if m["object_id"] == "SPX-MOV-0001")
    assert m1["type"] == "known"
    assert m1["match_name"] == "1 Ceres"
    assert m1["confidence"] >= 0.90

    # SPX-MOV-0002 remains unknown
    m2 = next(m for m in movers if m["object_id"] == "SPX-MOV-0002")
    assert m2["type"] == "unknown"
    assert m2["match_name"] is None

    # Verify diagnostic records
    rec1 = next(r for r in match_records if r.candidate_id == "SPX-MOV-0001")
    assert rec1.is_matched is True
    assert rec1.mean_distance_arcsec < 2.0

    rec2 = next(r for r in match_records if r.candidate_id == "SPX-MOV-0002")
    assert rec2.is_matched is False


def test_validation_report_generation(sample_candidates_payload, tmp_path: Path):
    """Validation report correctly generates JSON and Markdown files."""
    known_objects = load_offline_fallback()
    epochs = [("epoch_01", "2026-03-01T00:00:00Z"), ("epoch_02", "2026-03-02T00:00:00Z"), ("epoch_03", "2026-03-03T00:00:00Z")]
    predictions = predict_known_positions(known_objects, epochs)

    updated_payload, match_records = match_candidates(
        candidates_payload=sample_candidates_payload,
        predictions_by_epoch=predictions,
    )

    report = build_validation_report(
        candidates_payload=updated_payload,
        predictions_by_epoch=predictions,
        match_records=match_records,
        output_dir=tmp_path,
    )

    assert report["total_known_recovered_by_detector"] >= 1
    assert report["unknown_candidates_detected"] == 1

    # Check files exist on disk
    json_path = tmp_path / "validation_report.json"
    md_path = tmp_path / "validation_report.md"
    assert json_path.is_file()
    assert md_path.is_file()

    with open(md_path, "r", encoding="utf-8") as f:
        md_text = f.read()
    assert "Catalog Recovery Fraction" in md_text
    assert "1 Ceres" in md_text


def test_pipeline_in_place_update_and_schema_validation(sample_candidates_payload, tmp_path: Path):
    """Pipeline updates candidates.json in place and passes schema v1.0 validation."""
    cand_file = tmp_path / "candidates.json"
    with open(cand_file, "w", encoding="utf-8") as f:
        json.dump(sample_candidates_payload, f, indent=2)

    # Run pipeline in offline mode
    report = run_catalog_matching(
        candidates_path=cand_file,
        offline=True,
        output_dir=tmp_path,
    )

    assert report["total_known_recovered_by_detector"] >= 1

    # In-place validation
    validated = validate_file(cand_file)
    assert validated["schema_version"] == "1.0"

    # Check that candidates are correctly updated in place on disk
    with open(cand_file, "r", encoding="utf-8") as f:
        saved_data = json.load(f)
    m1 = next(m for m in saved_data["movers"] if m["object_id"] == "SPX-MOV-0001")
    assert m1["type"] == "known"
    assert m1["match_name"] == "1 Ceres"
