"""SPHEREx Mover Detection Package.

Provides static-sky modeling, epoch differencing, transient extraction,
tracklet linking, artifact rejection, and confidence scoring.
"""

from detection.movers.artifacts import (
    filter_response_artifacts,
    filter_single_epoch_events,
    filter_stationary_residuals,
)
from detection.movers.confidence import compute_mover_confidence
from detection.movers.difference import (
    EpochDifference,
    difference_all_epochs,
    difference_epoch_against_model,
)
from detection.movers.extractor import MoverDetection, extract_difference_sources
from detection.movers.linking import LinkedTracklet, link_tracklets
from detection.movers.pipeline import detect_movers, load_detection_config
from detection.movers.static_sky import build_static_sky_model

__all__ = [
    "build_static_sky_model",
    "difference_epoch_against_model",
    "difference_all_epochs",
    "EpochDifference",
    "extract_difference_sources",
    "MoverDetection",
    "link_tracklets",
    "LinkedTracklet",
    "filter_single_epoch_events",
    "filter_stationary_residuals",
    "filter_response_artifacts",
    "compute_mover_confidence",
    "detect_movers",
    "load_detection_config",
]

