"""SPHEREx IRSA / IPAC Live Data Adapter Stub.

Awaiting official NASA/IPAC SPHEREx public release data definitions.
All assumptions must remain marked with TODO(VERIFY).
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any, Dict, List, Optional

from data.adapter.base import EpochImage, EpochInfo, EpochSource, RegionInfo

logger = logging.getLogger(__name__)


class IrsaFitsSource(EpochSource):
    """Stub adapter for live SPHEREx FITS observations downloaded from IRSA."""

    def __init__(self, data_dir: Optional[str | Path] = None):
        self.data_dir = Path(data_dir or "data/raw")

    def list_epochs(
        self,
        region: Optional[RegionInfo | Dict[str, Any]] = None,
        fov_deg: float = 0.2,
    ) -> List[EpochInfo]:
        """Query IRSA metadata service for observation epochs covering region."""
        # TODO(VERIFY): Confirm official IRSA TAP/SIA query endpoint and table schema for SPHEREx
        # TODO(VERIFY): Verify metadata fields for epoch grouping (OBSID vs EXPNUM vs TSTART)
        raise NotImplementedError(
            "SPHEREx IRSA epoch listing is pending public data release. "
            "TODO(VERIFY): IRSA SIA/TAP table columns and query endpoint."
        )

    def load_epoch(
        self,
        epoch_id: str,
        region: Optional[RegionInfo | Dict[str, Any]] = None,
        fov_deg: float = 0.2,
    ) -> EpochImage:
        """Load FITS multi-extension cube from IRSA cache or archive."""
        # TODO(VERIFY): Official FITS HDU extension naming conventions (e.g., PRIMARY, SCI, VAR, DQ, LAMBDA, PSF)
        # TODO(VERIFY): WCS handling: standard TAN vs TAN-SIP distortion polynomial convention in SPHEREx level 2/3
        # TODO(VERIFY): Per-pixel wavelength extension: whether 2D wavelength cube is stored explicitly or as polynomial coefficients
        # TODO(VERIFY): Data quality mask/flag bitmask extension definitions (e.g. saturation, cosmic ray, edge, dead pixel)
        # TODO(VERIFY): PSF extension format: whether empirical 2D oversampled PSFs or effective PSF polynomials are supplied
        # TODO(VERIFY): Known PSF header caveat: SPHEREx PSF is highly non-uniform and varies strongly with wavelength across the LVF
        raise NotImplementedError(
            f"Cannot load real SPHEREx epoch '{epoch_id}'. "
            "TODO(VERIFY): SPHEREx public release FITS extensions, WCS keywords, and wavelength calibration."
        )


def query_irsa_cutouts(
    ra: float,
    dec: float,
    size_deg: float = 0.2,
    service_url: Optional[str] = None,
) -> Optional[Any]:
    """Guarded query helper for IRSA Simple Image Access (SIA) cutouts.

    This helper is guarded and optional; it is not called during test execution.
    """
    try:
        from pyvo.dal import sia  # type: ignore
    except ImportError:
        logger.warning("pyvo is not installed; IRSA SIA query disabled.")
        return None

    # TODO(VERIFY): Update with official NASA/IPAC SPHEREx SIA endpoint when published
    endpoint = service_url or "https://irsa.ipac.caltech.edu/SIA?COLLECTION=spherex"
    try:
        service = sia.SIAService(endpoint)
        pos = (ra, dec)
        results = service.search(pos=pos, size=size_deg)
        return results
    except Exception as exc:
        logger.warning("IRSA SIA query failed: %s", exc)
        return None
