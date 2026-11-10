"""Optional live smoke test for external astronomical services (IMCCE SkyBoT / JPL Horizons).

Not invoked by automated test suite. Run manually to test live API connectivity:
    python scripts/live_skybot_smoke.py
"""

from __future__ import annotations

import sys
import time

try:
    import astropy.units as u
    from astropy.coordinates import SkyCoord
    from astropy.time import Time
    from astroquery.imcce import Skybot
    from astroquery.jplhorizons import Horizons
except ImportError as err:
    print(f"[Error] Required libraries missing: {err}")
    sys.exit(1)


def test_skybot_live() -> bool:
    print("[1/2] Testing live connection to IMCCE SkyBoT service...")
    # Cone search near ecliptic where asteroids are abundant
    coord = SkyCoord(ra=180.0 * u.deg, dec=10.0 * u.deg, frame="icrs")
    epoch_time = Time("2026-03-01T00:00:00")
    radius = 1000.0 * u.arcsec

    start = time.time()
    try:
        table = Skybot.cone_search(coord, radius, epoch_time, find_filter="all")
        elapsed = time.time() - start
        count = len(table) if table is not None else 0
        print(f"  ✓ SkyBoT responded in {elapsed:.2f}s with {count} objects.")
        if count > 0:
            for row in table[:3]:
                print(f"    - {row['Name']} (V={row['V']}, Type={row['Type']})")
        return True
    except Exception as exc:
        print(f"  ✗ SkyBoT query failed (offline or network timeout): {exc}")
        return False


def test_horizons_live() -> bool:
    print("[2/2] Testing live connection to JPL Horizons service...")
    start = time.time()
    try:
        # Query 1 Ceres ephemeris
        obj = Horizons(id="1", location="500", epochs={"start": "2026-03-01", "stop": "2026-03-02", "step": "1d"})
        eph = obj.ephemerides()
        elapsed = time.time() - start
        count = len(eph) if eph is not None else 0
        print(f"  ✓ JPL Horizons responded in {elapsed:.2f}s with {count} ephemeris rows.")
        if count > 0:
            print(f"    - Ceres: RA={eph['RA'][0]:.4f}°, Dec={eph['DEC'][0]:.4f}°, V={eph['V'][0]:.2f}")
        return True
    except Exception as exc:
        print(f"  ✗ JPL Horizons query failed: {exc}")
        return False


def main() -> None:
    print("=" * 60)
    print("      SPHEREx Live Ephemeris Service Smoke Test")
    print("=" * 60)
    sb_ok = test_skybot_live()
    hz_ok = test_horizons_live()
    print("=" * 60)
    if sb_ok or hz_ok:
        print("Smoke test completed: At least one live provider reachable.")
    else:
        print("Live services currently unreachable (network down or blocked).")
        print("Pipeline offline fallback ensures zero interruption.")


if __name__ == "__main__":
    main()
