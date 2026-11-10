"""SPHEREx Mover Detection - Difference Source Extraction.

Identifies transient positive excess point sources on difference images
above configurable Signal-to-Noise thresholds.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import List

import numpy as np
from photutils.aperture import CircularAperture, aperture_photometry
from photutils.detection import DAOStarFinder

from detection.movers.difference import EpochDifference


@dataclass(frozen=True)
class MoverDetection:
    """Individual transient source detection on a difference image."""
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
    wavelength_um: float


def extract_difference_sources(
    diff_epoch: EpochDifference,
    snr_threshold: float = 3.5,
    fwhm_px: float = 2.8,
    aperture_radius_px: float = 2.5,
) -> List[MoverDetection]:
    """Extract candidate moving object detections from a difference image.

    Parameters
    ----------
    diff_epoch : EpochDifference
        Difference image container with residual pixels, variance, and mask.
    snr_threshold : float
        Detection threshold in units of effective background noise sigma.
    fwhm_px : float
        Expected PSF full-width at half-maximum in pixels.
    aperture_radius_px : float
        Radius in pixels for circular aperture flux measurement.

    Returns
    -------
    list of MoverDetection
        Catalog of extracted candidate transient detections.
    """
    diff_pixels = diff_epoch.diff_pixels
    mask = diff_epoch.mask
    variance = diff_epoch.diff_variance
    wcs = diff_epoch.wcs
    wavelength_map = diff_epoch.wavelength_map
    epoch_id = diff_epoch.epoch_id
    date = diff_epoch.date

    # Effective background noise calculation
    valid_var = variance[~mask]
    if len(valid_var) == 0:
        return []

    median_rms = float(np.sqrt(np.median(valid_var)))
    if median_rms <= 0:
        median_rms = 1.0

    threshold = snr_threshold * median_rms

    # DAOStarFinder source identification
    finder = DAOStarFinder(
        fwhm=fwhm_px,
        threshold=threshold,
        exclude_border=True,
    )

    sources = finder(diff_pixels, mask=mask)
    if sources is None or len(sources) == 0:
        return []

    x_col = "x_centroid" if "x_centroid" in sources.colnames else "xcentroid"
    y_col = "y_centroid" if "y_centroid" in sources.colnames else "ycentroid"

    x_coords = np.array(sources[x_col], dtype=np.float32)
    y_coords = np.array(sources[y_col], dtype=np.float32)

    # Circular aperture photometry on difference pixels
    positions = np.transpose([x_coords, y_coords])
    aperture = CircularAperture(positions, r=aperture_radius_px)
    phot_table = aperture_photometry(diff_pixels, aperture, error=np.sqrt(variance))

    # Transform pixel coordinates to celestial J2000 (RA, Dec)
    ras, decs = wcs.all_pix2world(x_coords, y_coords, 0)

    detections: List[MoverDetection] = []
    ny, nx = diff_pixels.shape

    for idx in range(len(sources)):
        x = float(x_coords[idx])
        y = float(y_coords[idx])
        ra = float(ras[idx])
        dec = float(decs[idx])

        flux_val = float(phot_table["aperture_sum"][idx])
        if "aperture_sum_err" in phot_table.colnames:
            flux_err = float(phot_table["aperture_sum_err"][idx])
        else:
            flux_err = float(math.sqrt(max(1.0, flux_val + median_rms ** 2)))

        snr = float(flux_val / max(1e-3, flux_err))

        # Lookup local wavelength from reprojected wavelength map
        ix = int(round(np.clip(x, 0, nx - 1)))
        iy = int(round(np.clip(y, 0, ny - 1)))
        wave_um = float(wavelength_map[iy, ix])

        det_id = f"{epoch_id}-MOV-{idx + 1:04d}"
        detections.append(
            MoverDetection(
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
                wavelength_um=round(wave_um, 4),
            )
        )

    return detections
