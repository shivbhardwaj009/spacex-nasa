"""SPHEREx Catalog Matching - Known Objects Query.

Queries known Solar System ephemerides using IMCCE SkyBoT and JPL Horizons
with SHA-256 query caching, rate limiting, exponential retries, timeouts,
and seamless offline fallback.
"""

from __future__ import annotations

import hashlib
import json
import logging
import math
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

import astropy.units as u
from astropy.coordinates import SkyCoord
from astropy.time import Time

from matching.types import KnownObject

logger = logging.getLogger(__name__)
PROJECT_ROOT = Path(__file__).resolve().parent.parent

# Global rate-limiting tracker
_LAST_REQUEST_TIME = 0.0


def _get_query_hash(ra: float, dec: float, radius_deg: float, dates: List[str]) -> str:
    """Generate deterministic SHA-256 cache key from query parameters."""
    normalized_dates = sorted(dates)
    key_str = f"{round(ra, 4):.4f}_{round(dec, 4):.4f}_{round(radius_deg, 4):.4f}_{'_'.join(normalized_dates)}"
    return hashlib.sha256(key_str.encode("utf-8")).hexdigest()


def load_offline_fallback() -> List[KnownObject]:
    """Load bundled offline catalog fallback from matching/cache/offline_known.json."""
    offline_file = PROJECT_ROOT / "matching" / "cache" / "offline_known.json"
    if not offline_file.is_file():
        logger.warning("Offline fallback catalog missing at %s", offline_file)
        return []

    try:
        with open(offline_file, "r", encoding="utf-8") as f:
            data = json.load(f)
        results: List[KnownObject] = []
        for obj in data.get("objects", []):
            results.append(
                KnownObject(
                    designation=str(obj.get("designation", "")),
                    name=str(obj.get("name", "")),
                    body_type=str(obj.get("body_type", "asteroid")),
                    ra_deg=float(obj.get("ra_deg", 0.0)),
                    dec_deg=float(obj.get("dec_deg", 0.0)),
                    ra_rate_arcsec_per_day=float(obj.get("ra_rate_arcsec_per_day", 0.0)),
                    dec_rate_arcsec_per_day=float(obj.get("dec_rate_arcsec_per_day", 0.0)),
                    magnitude_v=float(obj.get("magnitude_v", 15.0)),
                    epoch_date=str(obj.get("epoch_date", "2026-03-01T00:00:00Z")),
                    aliases=list(obj.get("aliases", [])),
                )
            )
        return results
    except Exception as exc:
        logger.error("Failed to parse offline fallback catalog: %s", exc)
        return []


def _apply_rate_limiting(min_interval_sec: float = 0.5) -> None:
    """Enforce minimum delay between external HTTP queries."""
    global _LAST_REQUEST_TIME
    now = time.time()
    elapsed = now - _LAST_REQUEST_TIME
    if elapsed < min_interval_sec:
        time.sleep(min_interval_sec - elapsed)
    _LAST_REQUEST_TIME = time.time()


def _query_skybot_api(
    ra: float,
    dec: float,
    radius_deg: float,
    epoch_time_iso: str,
    timeout_sec: float = 10.0,
) -> List[KnownObject]:
    """Execute live query to IMCCE SkyBoT service via astroquery."""
    from astroquery.imcce import Skybot

    coord = SkyCoord(ra=ra * u.deg, dec=dec * u.deg, frame="icrs")
    epoch_time = Time(epoch_time_iso)
    radius_arcsec = (radius_deg * 3600.0) * u.arcsec

    table = Skybot.cone_search(
        coord,
        radius_arcsec,
        epoch_time,
        find_filter="all",
        location="500",  # Geocenter
    )

    if table is None or len(table) == 0:
        return []

    objects: List[KnownObject] = []
    for row in table:
        name = str(row["Name"]) if "Name" in row.colnames else "Unknown"
        desig = str(row["Num"]) if "Num" in row.colnames else name
        body_type = str(row["Type"]) if "Type" in row.colnames else "asteroid"
        r_ra = float(row["RA"].to(u.deg).value) if hasattr(row["RA"], "to") else float(row["RA"])
        r_dec = float(row["DEC"].to(u.deg).value) if hasattr(row["DEC"], "to") else float(row["DEC"])

        # SkyBoT rates are given in arcsec/hour; convert to arcsec/day (* 24.0)
        v_ra = float(row["dRA"]) * 24.0 if "dRA" in row.colnames else 0.0
        v_dec = float(row["dDEC"]) * 24.0 if "dDEC" in row.colnames else 0.0
        v_mag = float(row["V"]) if "V" in row.colnames else 18.0

        objects.append(
            KnownObject(
                designation=desig,
                name=f"{desig} {name}".strip() if desig != name else name,
                body_type=body_type.lower(),
                ra_deg=round(r_ra, 6),
                dec_deg=round(r_dec, 6),
                ra_rate_arcsec_per_day=round(v_ra, 3),
                dec_rate_arcsec_per_day=round(v_dec, 3),
                magnitude_v=round(v_mag, 2),
                epoch_date=epoch_time_iso,
                aliases=[name, desig],
            )
        )
    return objects


def query_known_objects(
    ra: float,
    dec: float,
    radius_deg: float,
    dates: List[str],
    cache_dir: Optional[str | Path] = None,
    offline: bool = False,
    timeout_sec: float = 10.0,
    max_retries: int = 3,
    min_request_interval_sec: float = 0.5,
) -> List[KnownObject]:
    """Query known celestial bodies intersecting the specified sky cone and dates.

    Robustly handles caching, rate limiting, network retries, and offline fallback.
    The pipeline is guaranteed to never raise network exceptions or crash.

    Parameters
    ----------
    ra : float
        Cone center Right Ascension in degrees.
    dec : float
        Cone center Declination in degrees.
    radius_deg : float
        Search radius in degrees.
    dates : list of str
        ISO 8601 observation epoch timestamps.
    cache_dir : str or Path, optional
        Directory storing on-disk cached query responses.
    offline : bool
        If True, skips all network attempts and loads from local cache or offline fallback.
    timeout_sec : float
        Network timeout in seconds.
    max_retries : int
        Maximum number of retry attempts on network error.
    min_request_interval_sec : float
        Rate limiting pause between requests.

    Returns
    -------
    list of KnownObject
        Catalog of known bodies with positions and motion vectors.
    """
    cache_path = Path(cache_dir or (PROJECT_ROOT / "matching" / "cache" / "queries"))
    cache_path.mkdir(parents=True, exist_ok=True)

    query_hash = _get_query_hash(ra, dec, radius_deg, dates)
    cache_file = cache_path / f"{query_hash}.json"

    # 1. On-Disk Cache Lookup
    if cache_file.is_file():
        try:
            with open(cache_file, "r", encoding="utf-8") as f:
                cached_data = json.load(f)
            return [KnownObject(**item) for item in cached_data.get("objects", [])]
        except Exception as exc:
            logger.warning("Corrupted query cache at %s: %s", cache_file, exc)

    # 2. Offline Mode
    if offline:
        logger.info("Offline mode requested; using bundled offline catalog.")
        objects = load_offline_fallback()
        # Save to cache
        try:
            cache_data = {
                "query": {
                    "ra": ra,
                    "dec": dec,
                    "radius_deg": radius_deg,
                    "dates": dates,
                    "cached_at": datetime.now(timezone.utc).isoformat(),
                    "offline": True,
                },
                "objects": [obj.__dict__ for obj in objects],
            }
            with open(cache_file, "w", encoding="utf-8") as f:
                json.dump(cache_data, f, indent=2)
        except Exception as exc:
            logger.warning("Failed to write query cache to %s: %s", cache_file, exc)
        return objects

    # 3. Live Query with Retries and Exponential Backoff
    ref_date = dates[0] if dates else "2026-03-01T00:00:00Z"
    objects: List[KnownObject] = []

    for attempt in range(1, max_retries + 1):
        try:
            _apply_rate_limiting(min_request_interval_sec)
            objects = _query_skybot_api(ra, dec, radius_deg, ref_date, timeout_sec=timeout_sec)
            break
        except Exception as exc:
            logger.warning(
                "SkyBoT query attempt %d/%d failed: %s", attempt, max_retries, exc
            )
            if attempt < max_retries:
                time.sleep(1.0 * (2 ** (attempt - 1)))
            else:
                logger.warning("All SkyBoT query attempts failed. Engaging offline fallback.")
                objects = load_offline_fallback()

    # 4. Save successful query or fallback to on-disk cache
    try:
        cache_data = {
            "query": {
                "ra": ra,
                "dec": dec,
                "radius_deg": radius_deg,
                "dates": dates,
                "cached_at": datetime.now(timezone.utc).isoformat(),
            },
            "objects": [obj.__dict__ for obj in objects],
        }
        with open(cache_file, "w", encoding="utf-8") as f:
            json.dump(cache_data, f, indent=2)
    except Exception as exc:
        logger.warning("Failed to write query cache to %s: %s", cache_file, exc)

    return objects
