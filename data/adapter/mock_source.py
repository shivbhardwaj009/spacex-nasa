"""SPHEREx Mock Data Source Adapter.

Synthesizes astronomical star fields with Linear Variable Filter (LVF)
wavelength gradients and injects deterministic moving sources with ground truth.
"""

from __future__ import annotations

import json
import math
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

import numpy as np
from astropy.wcs import WCS

from data.adapter.base import EpochImage, EpochInfo, EpochSource, RegionInfo

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent


class MockSource(EpochSource):
    """Deterministic synthetic SPHEREx epoch observation generator."""

    def __init__(
        self,
        seed: int = 42,
        pixel_scale_arcsec: float = 6.2,
        ground_truth_path: Optional[str | Path] = None,
    ):
        self.seed = seed
        self.pixel_scale_arcsec = pixel_scale_arcsec
        self.pixel_scale_deg = pixel_scale_arcsec / 3600.0
        self.ground_truth_path = Path(
            ground_truth_path or (PROJECT_ROOT / "data" / "output" / "ground_truth.json")
        )

        # Baseline epochs (5 epochs across 6 days)
        self._base_time = datetime(2026, 3, 1, 0, 0, 0, tzinfo=timezone.utc)
        self._epoch_offsets_hours = [0.0, 24.0, 48.0, 96.0, 144.0]
        self._epochs: List[EpochInfo] = []
        for idx, offset in enumerate(self._epoch_offsets_hours):
            dt = self._base_time + timedelta(hours=offset)
            self._epochs.append(
                EpochInfo(
                    epoch_id=f"epoch_{idx + 1:02d}",
                    date=dt.isoformat(),
                    files=[f"mock_spherex_field_{idx + 1:02d}.fits"],
                    band_count=102,
                )
            )

        # Injected moving targets definitions
        self._injected_movers = [
            {
                "object_id": "MOCK-MOVER-01",
                "name": "Synthetic Asteroid Alpha",
                "type": "known",
                "ra_offset_arcsec": -120.0,
                "dec_offset_arcsec": -80.0,
                "ra_rate_arcsec_per_day": 32.5,
                "dec_rate_arcsec_per_day": 14.2,
                "base_flux": 850.0,
            },
            {
                "object_id": "MOCK-MOVER-02",
                "name": "Synthetic Planet X Candidate",
                "type": "unknown",
                "ra_offset_arcsec": 50.0,
                "dec_offset_arcsec": 40.0,
                "ra_rate_arcsec_per_day": -4.2,
                "dec_rate_arcsec_per_day": 2.8,
                "base_flux": 420.0,
            },
            {
                "object_id": "MOCK-MOVER-03",
                "name": "Synthetic Fast NEO",
                "type": "unknown",
                "ra_offset_arcsec": -60.0,
                "dec_offset_arcsec": 110.0,
                "ra_rate_arcsec_per_day": 65.0,
                "dec_rate_arcsec_per_day": -38.0,
                "base_flux": 620.0,
            },
        ]

    def list_epochs(
        self,
        region: Optional[RegionInfo | Dict[str, Any]] = None,
        fov_deg: float = 0.2,
    ) -> List[EpochInfo]:
        """Return available synthetic epochs."""
        return list(self._epochs)

    def _build_wcs(self, ra_center: float, dec_center: float, npix: int) -> WCS:
        """Create standard FITS TAN celestial WCS centered on region."""
        w = WCS(naxis=2)
        w.wcs.crpix = [npix / 2.0 + 0.5, npix / 2.0 + 0.5]
        w.wcs.cdelt = [-self.pixel_scale_deg, self.pixel_scale_deg]
        w.wcs.crval = [ra_center, dec_center]
        w.wcs.ctype = ["RA---TAN", "DEC--TAN"]
        w.wcs.cunit = ["deg", "deg"]
        return w

    def load_epoch(
        self,
        epoch_id: str,
        region: Optional[RegionInfo | Dict[str, Any]] = None,
        fov_deg: float = 0.2,
    ) -> EpochImage:
        """Synthesize 2D astronomical image with stars, noise, LVF gradient, and movers."""
        if isinstance(region, dict):
            reg = RegionInfo.from_dict(region)
        elif isinstance(region, RegionInfo):
            reg = region
        else:
            reg = RegionInfo()

        # Find requested epoch
        epoch_idx = next(
            (i for i, e in enumerate(self._epochs) if e.epoch_id == epoch_id), None
        )
        if epoch_idx is None:
            raise KeyError(f"Epoch '{epoch_id}' not found in mock catalog.")

        epoch_info = self._epochs[epoch_idx]
        t_days = self._epoch_offsets_hours[epoch_idx] / 24.0

        # Calculate grid size from FOV (default 0.2 deg ~ 116 pixels at 6.2"/pix)
        npix = max(32, int(round((fov_deg * 3600.0) / self.pixel_scale_arcsec)))
        wcs = self._build_wcs(reg.ra_center, reg.dec_center, npix)

        # Separate RNG streams for static background vs noise
        star_rng = np.random.default_rng(self.seed + 100)
        noise_rng = np.random.default_rng(self.seed + 1000 + epoch_idx)

        # 1. Sky Background and Read Noise
        sky_bg = 120.0
        read_noise = 8.5
        pixels = np.full((npix, npix), sky_bg, dtype=np.float32)

        # 2. Wavelength Gradient (Linear Variable Filter simulation: 1.2 um to 2.4 um)
        # In SPHEREx, dispersion runs across the detector Y-axis
        y_coords = np.linspace(1.20, 2.45, npix, dtype=np.float32)
        wavelength_map = np.tile(y_coords[:, np.newaxis], (1, npix))

        # 3. Static Star Field (Fixed coordinates across all epochs)
        num_stars = max(10, int(npix * 0.4))
        star_ras = reg.ra_center + star_rng.uniform(
            -fov_deg * 0.45, fov_deg * 0.45, size=num_stars
        ) / math.cos(math.radians(reg.dec_center))
        star_decs = reg.dec_center + star_rng.uniform(
            -fov_deg * 0.45, fov_deg * 0.45, size=num_stars
        )
        star_fluxes = star_rng.lognormal(mean=5.5, sigma=1.0, size=num_stars)

        # Inject stars via Gaussian PSF (sigma ~ 1.25 pixels)
        psf_sigma = 1.25
        yy, xx = np.indices((npix, npix))

        for s_ra, s_dec, s_flux in zip(star_ras, star_decs, star_fluxes):
            px, py = wcs.all_world2pix(s_ra, s_dec, 0)
            if -3 < px < npix + 3 and -3 < py < npix + 3:
                star_patch = (s_flux / (2 * math.pi * psf_sigma ** 2)) * np.exp(
                    -((xx - px) ** 2 + (yy - py) ** 2) / (2 * psf_sigma ** 2)
                )
                pixels += star_patch.astype(np.float32)

        # 4. Inject Moving Sources and Record Ground Truth
        ground_truth_movers: List[Dict[str, Any]] = []

        for mover in self._injected_movers:
            # Trajectory calculation
            ra_init = reg.ra_center + (mover["ra_offset_arcsec"] / 3600.0) / math.cos(
                math.radians(reg.dec_center)
            )
            dec_init = reg.dec_center + (mover["dec_offset_arcsec"] / 3600.0)

            delta_ra = (mover["ra_rate_arcsec_per_day"] * t_days / 3600.0) / math.cos(
                math.radians(reg.dec_center)
            )
            delta_dec = (mover["dec_rate_arcsec_per_day"] * t_days / 3600.0)

            cur_ra = float(ra_init + delta_ra)
            cur_dec = float(dec_init + delta_dec)

            # Convert to pixel coordinate
            px, py = wcs.all_world2pix(cur_ra, cur_dec, 0)
            in_bounds = bool(0 <= px < npix and 0 <= py < npix)

            if in_bounds:
                mover_patch = (
                    mover["base_flux"] / (2 * math.pi * psf_sigma ** 2)
                ) * np.exp(-((xx - px) ** 2 + (yy - py) ** 2) / (2 * psf_sigma ** 2))
                pixels += mover_patch.astype(np.float32)

            ground_truth_movers.append({
                "object_id": mover["object_id"],
                "name": mover["name"],
                "type": mover["type"],
                "ra_rate_arcsec_per_day": mover["ra_rate_arcsec_per_day"],
                "dec_rate_arcsec_per_day": mover["dec_rate_arcsec_per_day"],
                "flux": mover["base_flux"],
                "epoch_id": epoch_info.epoch_id,
                "date": epoch_info.date,
                "ra": cur_ra,
                "dec": cur_dec,
                "pixel_x": float(px),
                "pixel_y": float(py),
                "in_fov": in_bounds,
            })

        # 5. Add Poisson Noise + Read Noise
        shot_noise = noise_rng.normal(0, np.sqrt(np.maximum(1.0, pixels)))
        detector_noise = noise_rng.normal(0, read_noise, size=(npix, npix))
        pixels = np.maximum(0.0, pixels + shot_noise + detector_noise).astype(np.float32)

        # 6. Variance Map & Data Quality Mask
        variance = (pixels + (read_noise ** 2)).astype(np.float32)
        mask = np.zeros((npix, npix), dtype=np.uint8)
        # Mark 1-pixel border as edge mask
        mask[0, :] = 1
        mask[-1, :] = 1
        mask[:, 0] = 1
        mask[:, -1] = 1

        # 7. Persist Ground Truth
        self._save_ground_truth(reg, fov_deg, ground_truth_movers, epoch_info)

        return EpochImage(
            pixels=pixels,
            variance=variance,
            mask=mask,
            wcs=wcs,
            wavelength_map=wavelength_map,
            metadata={
                "source": "MockSource",
                "epoch_id": epoch_info.epoch_id,
                "date": epoch_info.date,
                "fov_deg": fov_deg,
                "npix": npix,
                "pixel_scale_arcsec": self.pixel_scale_arcsec,
                "region_name": reg.name,
                "is_synthetic": True,
            },
        )

    def _save_ground_truth(
        self,
        region: RegionInfo,
        fov_deg: float,
        epoch_movers: List[Dict[str, Any]],
        epoch_info: EpochInfo,
    ) -> None:
        """Append or update ground truth JSON file."""
        self.ground_truth_path.parent.mkdir(parents=True, exist_ok=True)
        data: Dict[str, Any] = {}
        if self.ground_truth_path.is_file():
            try:
                with open(self.ground_truth_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
            except Exception:
                data = {}

        data["is_synthetic"] = True
        data["generated_at"] = datetime.now(timezone.utc).isoformat()
        data["region"] = region.to_dict()
        data["fov_deg"] = fov_deg

        if "epochs_ground_truth" not in data:
            data["epochs_ground_truth"] = {}

        data["epochs_ground_truth"][epoch_info.epoch_id] = {
            "date": epoch_info.date,
            "movers": epoch_movers,
        }

        with open(self.ground_truth_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
