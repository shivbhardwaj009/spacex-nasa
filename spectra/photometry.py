"""SPHEREx Spectrophotometry - Aperture Photometry with Local Background Annulus.

Performs circular aperture photometry with local circular annulus background
subtraction and error propagation across SPHEREx multi-epoch data.
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Optional, Tuple

import numpy as np
from photutils.aperture import CircularAnnulus, CircularAperture, aperture_photometry

from data.adapter.base import EpochImage


@dataclass(frozen=True)
class ApertureMeasurement:
    """Individual aperture photometric measurement with local annulus background."""
    ra: float
    dec: float
    x_px: float
    y_px: float
    wavelength_um: float
    flux_net: float
    flux_err: float
    local_bkg_per_pixel: float
    snr: float
    is_valid: bool


def measure_local_photometry(
    image: EpochImage,
    ra: float,
    dec: float,
    aperture_radius_px: float = 3.0,
    annulus_inner_radius_px: float = 5.0,
    annulus_outer_radius_px: float = 8.0,
) -> Optional[ApertureMeasurement]:
    """Measure net flux with local background subtraction via surrounding annulus.

    Parameters
    ----------
    image : EpochImage
        Single observation epoch data cube container.
    ra : float
        Target celestial Right Ascension in degrees.
    dec : float
        Target celestial Declination in degrees.
    aperture_radius_px : float
        Radius of circular aperture enclosing target source flux (default 3.0 px).
    annulus_inner_radius_px : float
        Inner radius of local background annulus (default 5.0 px).
    annulus_outer_radius_px : float
        Outer radius of local background annulus (default 8.0 px).

    Returns
    -------
    measurement : ApertureMeasurement or None
        Net flux, propagated error, and local wavelength. None if out of bounds.
    """
    ny, nx = image.pixels.shape
    wcs = image.wcs

    # Transform RA/Dec to pixel coordinate
    px, py = wcs.all_world2pix(ra, dec, 0)
    ix = int(round(float(px)))
    iy = int(round(float(py)))

    # Edge buffer check
    margin = int(math.ceil(annulus_outer_radius_px)) + 1
    if not (margin <= ix < nx - margin and margin <= iy < ny - margin):
        return None

    # Check if centroid pixel is masked
    if image.mask[iy, ix] > 0:
        return None

    pos = [(px, py)]
    aperture = CircularAperture(pos, r=aperture_radius_px)
    annulus = CircularAnnulus(pos, r_in=annulus_inner_radius_px, r_out=annulus_outer_radius_px)

    # 1. Aperture raw flux and variance
    phot_ap = aperture_photometry(image.pixels, aperture, error=np.sqrt(image.variance))
    raw_ap_flux = float(phot_ap["aperture_sum"][0])
    raw_ap_err = float(phot_ap["aperture_sum_err"][0]) if "aperture_sum_err" in phot_ap.colnames else 1.0

    # 2. Local background from surrounding annulus
    annulus_mask = annulus.to_mask(method="center")[0]
    annulus_data = annulus_mask.multiply(image.pixels)
    annulus_weights = annulus_mask.data

    valid_annulus_pixels = annulus_data[annulus_weights > 0]
    if len(valid_annulus_pixels) == 0:
        local_bkg = 0.0
        bkg_std = float(np.sqrt(image.variance[iy, ix]))
    else:
        # Sigma-clipped median background in annulus
        med_bkg = float(np.nanmedian(valid_annulus_pixels))
        q75, q25 = np.percentile(valid_annulus_pixels, [75, 25])
        bkg_std = float(max(1e-4, (q75 - q25) / 1.349))
        local_bkg = med_bkg

    ap_area = aperture.area
    annulus_area = annulus.area

    # 3. Net flux: F_net = F_ap - (Area_ap * bkg_annulus)
    flux_net = float(raw_ap_flux - (ap_area * local_bkg))

    # 4. Propagated error: Var = Var_ap + (Area_ap^2 / Area_annulus) * bkg_std^2
    var_net = (raw_ap_err ** 2) + ((ap_area ** 2 / max(1.0, annulus_area)) * (bkg_std ** 2))
    flux_err = float(math.sqrt(max(0.1, var_net)))
    snr = float(flux_net / max(1e-3, flux_err))

    # 5. Observed central wavelength at source position from per-pixel wavelength map
    local_wavelength = float(image.wavelength_map[iy, ix])

    return ApertureMeasurement(
        ra=round(float(ra), 6),
        dec=round(float(dec), 6),
        x_px=round(float(px), 2),
        y_px=round(float(py), 2),
        wavelength_um=round(local_wavelength, 4),
        flux_net=round(flux_net, 3),
        flux_err=round(flux_err, 3),
        local_bkg_per_pixel=round(local_bkg, 3),
        snr=round(snr, 2),
        is_valid=bool(local_wavelength > 0 and flux_net > -3.0 * flux_err),
    )

