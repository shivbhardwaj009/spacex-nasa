# SPHEREx Sky Diary — Challenge Targets & Regional Coverage Guide

**Challenge:** NASA Space Apps Challenge 2026: Planet X and SPHEREx  
**Contract Version:** 1.0  

---

## 1. Challenge Target Directory

The SPHEREx Sky Diary includes quick-pick support for the five official NASA Space Apps Challenge targets. Each target represents a scientifically compelling class of solar system or sub-stellar mover:

| Target Name | Category | RA (J2000) | Dec (J2000) | Default FOV | Precomputed Data Status |
|:---|:---|:---|:---|:---|:---|
| **SPHEREx Deep Field North** | Deep Survey | 269.4520° | +66.5610° | 1.0° | **Available** (Multi-epoch test data) |
| **Barnard's Star** | High Proper Motion | 269.4521° | +04.6934° | 0.2° | *No precomputed SPHEREx data yet* |
| **Epsilon Indi B** | Cold Brown Dwarf | 330.8403° | -56.7861° | 0.2° | *No precomputed SPHEREx data yet* |
| **WISE 0855-0714** | Sub-stellar Water Clouds | 133.7951° | -07.2452° | 0.2° | *No precomputed SPHEREx data yet* |
| **RW Aurigae** | Young Stellar Object | 077.1085° | +30.4014° | 0.2° | *No precomputed SPHEREx data yet* |
| **R Draconis** | Mira Variable Star | 247.5545° | +66.7028° | 0.2° | *No precomputed SPHEREx data yet* |

> [!NOTE]
> Coordinates for specific challenge targets reflect J2000 catalog positions.
> `TODO(VERIFY)`: Verify exact SPHEREx Level 2/3 observation schedule footprints covering these targets upon public data release.

---

## 2. Scientific Target Profiles

### 1. Barnard's Star (GJ 699)
- **RA:** 269.45208° (17h 57m 48.50s), **Dec:** +04.69339° (+04° 41' 36.2") `TODO(VERIFY)`
- **Significance:** Highest known proper motion star in the sky (10.3 arcsec/year). Exhibits rapid detectable shift between 6-month SPHEREx survey passes.
- **Spectral Feature:** M4V red dwarf with intense molecular TiO and VO absorption.

### 2. Epsilon Indi B (HD 209013 B)
- **RA:** 330.84025° (22h 03m 21.66s), **Dec:** -56.78608° (-56° 47' 09.9") `TODO(VERIFY)`
- **Significance:** One of the closest known brown dwarf binary systems (T1 + T6), displaying strong methane ($\text{CH}_4$) and water ($\text{H}_2\text{O}$) vapor absorption across SPHEREx's 1.0–5.0 µm channels.

### 3. WISE 0855-0714
- **RA:** 133.79513° (08h 55m 10.83s), **Dec:** -07.24515° (-07° 14' 42.5") `TODO(VERIFY)`
- **Significance:** Fourth-closest sub-stellar system to Earth (~7.2 light-years). At ~250 K, it is the coldest known brown dwarf and a premier analog for giant gas exoplanets with suspected atmospheric water ice clouds.

### 4. RW Aurigae
- **RA:** 077.10850° (05h 08m 26.04s), **Dec:** +30.40142° (+30° 24' 05.1") `TODO(VERIFY)`
- **Significance:** Classical T Tauri binary showing recurrent photometric dimming events due to tidal disruption and circumstellar dust streams.

### 5. R Draconis
- **RA:** 247.55446° (16h 30m 13.07s), **Dec:** +66.70278° (+66° 42' 10.0") `TODO(VERIFY)`
- **Significance:** Mira-type pulsating red giant with an amplitude of >6 magnitudes in visible light. SPHEREx 102-band infrared spectroscopy tracks circum-stellar dust shell expansion.

---

## 3. How to Add a New Sky Region

To process and add a new observation region or challenge target:

### Step 1: Create a Region Config File
Create `config/regions/<slug>.yaml`:

```yaml
data_source: mock  # or 'irsa' once flight data is released
region:
  name: "WISE 0855 Field"
  slug: "wise-0855"
  ra_center: 133.79513
  dec_center: -7.24515
  radius_deg: 0.2
  fov_deg: 0.2

pipeline:
  output_dir: "data/output/regions/wise-0855"
  cutout_dir: "data/output/regions/wise-0855/cutouts"
```

### Step 2: Execute the Pipeline
Run the one-command pipeline specifying the target configuration:

```bash
python scripts/run_pipeline.py --config config/regions/wise-0855.yaml --offline
```

### Step 3: Register in Regions Index
Add the new region to `data/output/regions.json`:

```json
{
  "slug": "wise-0855",
  "name": "WISE 0855 Field",
  "ra_center": 133.79513,
  "dec_center": -7.24515,
  "radius_deg": 0.2,
  "fov_deg": 0.2,
  "data_url": "/data/regions/wise-0855/candidates.json",
  "has_data": true,
  "is_synthetic": true
}
```

### Step 4: Sync to Web Assets
Copy files to `/web/public/data/regions/<slug>/`:

```bash
mkdir -p web/public/data/regions/wise-0855
cp data/output/regions/wise-0855/candidates.json web/public/data/regions/wise-0855/
cp data/output/regions.json web/public/data/regions.json
```

---

## 4. UI Honesty Invariant

When a user selects a target that does **not** yet have precomputed SPHEREx pipeline data:
- The viewer navigates to the sky coordinates using the Aladin Lite survey background.
- The UI renders an informative status badge: **"No precomputed SPHEREx data for this target yet"**.
- The system **never** synthesizes fake mover detections or pseudo-discoveries at the target location.

