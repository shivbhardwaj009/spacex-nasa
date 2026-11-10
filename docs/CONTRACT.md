# SPHEREx Sky Diary — Data Contract Specification

**Version:** 1.0  
**Draft Standard:** JSON Schema draft 2020-12  
**Challenge:** NASA Space Apps Challenge 2026: Planet X and SPHEREx  

---

## 1. Overview & Architecture Boundary

The SPHEREx Sky Diary pipeline follows a strict **offline-first static decoupled architecture**:

```
[ SPHEREx Data (Mock or IRSA) ]
              │
              ▼
   [ /detection Pipeline ]
              │
              ▼
   [ /matching Engine ]
              │
              ▼
   [ /spectra Extraction ]
              │
              ▼
   [ /data/output/candidates.json + /cutouts/ ]
              │
     (Validated via docs/schema.json v1.0)
              │
              ▼
    [ Next.js Web Application ] (Read-only static consumer)
```

- **Python Pipeline (Offline):** Ingests raw data or generates synthetic simulations, executes transient and motion detection across multi-epoch images, queries asteroid/comet ephemerides (SkyBoT / MPC / JPL Horizons), synthesizes 102-channel spectrophotometry (0.75 – 5.0 µm), and exports static JSON and PNG files.
- **Web App (Frontend):** Purely static consumer. Reads `candidates.json` and associated cutouts. Performs **no heavy processing or ephemeris lookups at request time**.
- **Contract Guarantee:** All pipeline stages communicate exclusively through this versioned schema. Any modification to `schema.json` requires a version bump (e.g., to `1.1` or `2.0`) and explicit notification.

---

## 2. Mandatory Rules

1. **Synthetic Data Transparency:**
   Every synthetic candidate must have `is_synthetic: true`. The web frontend is required to render a high-visibility `"TEST DATA"` badge whenever `is_synthetic === true`. Synthetic data must never be presented as real discoveries.
2. **Schema Invariance:**
   Every output file must pass validation via `/docs/validate.py` (which validates against `/docs/schema.json` and enforces array length consistency). Any schema violation must raise an exception and halt the pipeline.
3. **Data Source Switch:**
   The parameter `data_source` in `/config/settings.yaml` (`mock` | `irsa`) controls pipeline execution mode.
4. **Isolated Adapter:**
   All real SPHEREx file handling is strictly isolated in data adapters. Unverified FITS headers and extension assumptions must be tagged with `TODO(VERIFY)`.

---

## 3. Schema Fields Breakdown (`v1.0`)

### Top-Level Fields

| Field | Type | Required | Description |
|---|---|---|---|
| `schema_version` | String | Yes | Const value `"1.0"`. Identifies contract version. |
| `data_version` | String | No | Build/run identifier (e.g., `"v0.1.0-mock"`). |
| `generated_at` | String | No | ISO 8601 UTC timestamp of creation. |
| `fov_deg` | Number | No | Field of view size in degrees. |
| `region` | Object | Yes | Target sky region metadata. |
| `epochs` | Array | Yes | List of observation epochs available for this field. |
| `movers` | Array | Yes | List of detected candidate objects. |

### `region` Object

| Field | Type | Constraints | Description |
|---|---|---|---|
| `name` | String | Min length 1 | Identifying name of the sky region. |
| `ra_center` | Number | 0.0 to 360.0 | J2000 Right Ascension center (degrees). |
| `dec_center` | Number | -90.0 to +90.0 | J2000 Declination center (degrees). |
| `radius_deg` | Number | > 0.0 | Field radius around the center (degrees). |

### `epochs` Array Item

| Field | Type | Description |
|---|---|---|
| `epoch_id` | String | Unique string identifier for the observation epoch (e.g., `"epoch_01"`). |
| `date` | String | ISO 8601 timestamp of observation midpoint. |
| `band_count` | Integer | Total number of spectral bands (SPHEREx nominally 102). |

### `movers` Array Item

| Field | Type | Constraints | Description |
|---|---|---|---|
| `object_id` | String | Min length 1 | Unique mover identifier (e.g., `"SPX-MOV-0001"`). |
| `ra` | Number | 0.0 to 360.0 | Mean / Reference Right Ascension (degrees). |
| `dec` | Number | -90.0 to +90.0 | Mean / Reference Declination (degrees). |
| `type` | String | `"known"` \| `"unknown"` | Catalog status. `"known"` matched an existing Solar System body; `"unknown"` is an unidentified mover (Planet X / NEO candidate). |
| `match_name` | String \| Null | - | Catalog designation (e.g., `"Ceres"`, `"2024 BX1"`) if known; `null` if unknown. |
| `confidence` | Number | 0.0 to 1.0 | Metric of detection/association confidence. |
| `is_synthetic` | Boolean | - | `true` for simulated test data; `false` for real observations. |
| `motion` | Object | - | Kinematic vectors. |
| `motion.ra_rate_arcsec_per_day` | Number | - | Apparent RA proper motion rate in arcsec/day ($\cos\delta$ projected). |
| `motion.dec_rate_arcsec_per_day` | Number | - | Apparent Dec proper motion rate in arcsec/day. |
| `detections` | Array | Min length 1 | Array of tracklet detections across epochs. |
| `spectrum` | Object \| Null | - | 102-point spectrophotometric data or `null`. |

### `detections` Array Item

| Field | Type | Constraints | Description |
|---|---|---|---|
| `epoch_id` | String | - | Associated epoch ID from `epochs`. |
| `date` | String | - | ISO 8601 date of observation. |
| `ra` | Number | 0.0 to 360.0 | Centroid RA coordinate in degrees. |
| `dec` | Number | -90.0 to +90.0 | Centroid Dec coordinate in degrees. |
| `flux` | Number | - | Photometric flux measurement. |
| `cutout_url` | String | - | Relative path to cutout PNG image. |

### `spectrum` Object

| Field | Type | Description |
|---|---|---|
| `wavelength_um` | Number[] | 102 wavelength samples from 0.75 to 5.00 µm. |
| `flux` | Number[] | Flux density values matching `wavelength_um` length. |
| `flux_err` | Number[] | 1-sigma uncertainty values matching `wavelength_um` length. |

> **Array Length Invariant:** `len(wavelength_um) == len(flux) == len(flux_err)`.

