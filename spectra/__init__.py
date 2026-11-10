"""SPHEREx Sky Diary - Spectra Package.

Extracts, calibrates, and characterizes 102-channel spectrophotometry
(0.75 - 5.0 um) for moving objects detected in SPHEREx field data.
"""

from spectra.cross_check import compare_spectra, parse_irsa_file
from spectra.extractor import (
    SPHEREX_SIX_BANDS,
    bin_measurements_to_102_channels,
    bin_to_six_detector_bands,
    get_spectrum,
)
from spectra.photometry import ApertureMeasurement, measure_local_photometry
from spectra.pipeline import extract_all_spectra
from spectra.taxonomy import (
    classify_spectral_taxonomy,
    measure_band_depth,
)
from spectra.types import ExtractedSpectrum, PhotometricSample

__all__ = [
    "SPHEREX_SIX_BANDS",
    "ApertureMeasurement",
    "ExtractedSpectrum",
    "PhotometricSample",
    "bin_measurements_to_102_channels",
    "bin_to_six_detector_bands",
    "classify_spectral_taxonomy",
    "compare_spectra",
    "extract_all_spectra",
    "get_spectrum",
    "measure_band_depth",
    "measure_local_photometry",
    "parse_irsa_file",
]
