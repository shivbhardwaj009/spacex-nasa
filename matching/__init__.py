"""SPHEREx Catalog Matching Package.

Cross-matches detected tracklets against known Solar System objects
(IMCCE SkyBoT, Minor Planet Center, JPL Horizons) to classify
candidates as 'known' (asteroid/comet) or 'unknown' (Planet X / NEO).
"""

from matching.ephemeris import is_prediction_in_field, predict_known_positions
from matching.matcher import match_candidates
from matching.pipeline import run_catalog_matching
from matching.query import load_offline_fallback, query_known_objects
from matching.types import EphemerisPrediction, KnownObject, MatchRecord
from matching.validation import build_validation_report

__all__ = [
    "KnownObject",
    "EphemerisPrediction",
    "MatchRecord",
    "query_known_objects",
    "load_offline_fallback",
    "predict_known_positions",
    "is_prediction_in_field",
    "match_candidates",
    "build_validation_report",
    "run_catalog_matching",
]
