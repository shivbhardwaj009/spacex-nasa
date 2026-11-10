"""SPHEREx Source Detection - Point Source Extraction.

Extracts point-source candidates from single-epoch observations using
DAOStarFinder and aperture photometry.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import List, Optional

import numpy as np
from astropy.wcs import WCS
from photutils.aperture import CircularAperture, aperture_photometry
from photutils.detection import DAOStarFinder

from data.adapter.base import EpochImage
from detection.background import estimate_background_2d


@dataclass(frozen=True)
class SourceDetection:
    """Individual source detection in a single observation epoch."""
    detection_id: str
    epoch_id: str
    date: str
    ra: float
    dec: float
    x_px: float
    y_px: float
    flux: float
    flux_err: float
    snr: float


def extract_sources(
    epoch_image: EpochImage,
    snr_threshold: float = 3.5,
    fwhm_px: float = 2.8,
    aperture_radius_px: float = 2.5,
) -> List[SourceDetection]:
    """Extract point-like astronomical sources from an EpochImage.

    Parameters
    ----------
    epoch_image : EpochImage
        Single observation epoch data cube container.
    snr_threshold : float
        Detection threshold in multiples of background RMS noise.
    fwhm_px : float
        Expected point spread function full-width at half-maximum in pixels.
    aperture_radius_px : float
        Radius in pixels for circular aperture photometry.

    Returns
    -------
    list of SourceDetection
        Catalog of extracted sources with fitted centroids and calibrated flux.
    """
    pixels = epoch_image.pixels
    mask = epoch_image.mask
    wcs: WCS = epoch_image.wcs
    epoch_id = epoch_image.metadata.get("epoch_id", "epoch_00")
    date = epoch_image.metadata.get("date", "2026-01-01T00:00:00Z")

    # 1. Estimate background and RMS noise map
    bkg_map, rms_map = estimate_background_2d(pixels, mask=mask)
    subtracted = pixels - bkg_map
    median_rms = float(np.nanmedian(rms_map))

    if median_rms <= 0:
        median_rms = 1.0

    # 2. DAOStarFinder point-source identification
    detection_threshold = snr_threshold * median_rms
    finder = DAOStarFinder(
        fwhm=fwhm_px,
        threshold=detection_threshold,
        exclude_border=True,
    )

    finder_mask = mask.astype(bool) if mask is not None else None
    sources_table = finder(subtracted, mask=finder_mask)

    if sources_table is None or len(sources_table) == 0:
        return []

    x_col = "x_centroid" if "x_centroid" in sources_table.colnames else "xcentroid"
    y_col = "y_centroid" if "y_centroid" in sources_table.colnames else "ycentroid"

    # 3. Circular Aperture Photometry
    positions = np.transpose([sources_table[x_col], sources_table[y_col]])
    aperture = CircularAperture(positions, r=aperture_radius_px)
    phot_table = aperture_photometry(subtracted, aperture, error=np.sqrt(epoch_image.variance))

    # 4. Transform pixel coordinates to celestial coordinates (J2000 RA/Dec)
    ras, decs = wcs.all_pix2world(sources_table[x_col], sources_table[y_col], 0)

    detections: List[SourceDetection] = []
    for idx in range(len(sources_table)):
        x = float(sources_table[x_col][idx])
        y = float(sources_table[y_col][idx])
        ra = float(ras[idx])
        dec = float(decs[idx])

        flux_val = float(phot_table["aperture_sum"][idx])
        if "aperture_sum_err" in phot_table.colnames:
            flux_err = float(phot_table["aperture_sum_err"][idx])
        else:
            flux_err = float(math.sqrt(max(1.0, flux_val + median_rms ** 2)))

        snr = float(flux_val / max(1e-3, flux_err))

        det_id = f"{epoch_id}-SRC-{idx + 1:04d}"
        detections.append(
            SourceDetection(
                detection_id=det_id,
                epoch_id=epoch_id,
                date=date,
                ra=round(ra, 6),
                dec=round(dec, 6),
                x_px=round(x, 2),
                y_px=round(y, 2),
                flux=round(max(0.1, flux_val), 2),
                flux_err=round(max(0.1, flux_err), 2),
                snr=round(snr, 2),
            )
        )

    return detections

