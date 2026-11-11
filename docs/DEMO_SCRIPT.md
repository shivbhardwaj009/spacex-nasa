# SPHEREx Sky Diary — 3-Minute Challenge Pitch Script

**Challenge:** NASA Space Apps Challenge 2026: Planet X and SPHEREx  
**Pitch Duration:** 180 seconds (3 minutes)  
**Live URL:** `http://localhost:3000/?demo=1`

---

## ⏱️ Timeline & Presentation Flow

```
 0:00        0:25           0:50              1:20           1:50          2:20         2:45   3:00
  ├─── Intro ──┼─── Blink ───┼── Motion Trails ─┼── 1 Ceres ───┼── Unknown ──┼── SED ─────┼─ Share ─┤
  │ Survey     │ Alternating │ Subtraction &    │ IMCCE Match  │ Honest      │ 102 Bands  │ Social  │
  │ Viewport   │ Optics      │ Linking          │ Astrometry   │ Disclaimer  │ CSV Export │ Embed   │
```

---

### Step 1: Opening & Survey View (0:00 – 0:25)
- **Viewport State:** `ra=269.4520&dec=66.5610&fov=0.20&mode=viewer&epoch=0`
- **Presenter Spoken Script:**
  > "Judges, welcome to SPHEREx Sky Diary! NASA's SPHEREx mission maps the entire sky every six months across 102 infrared wavelengths. But in a multi-petabyte survey, how do astronomers spot the faint, elusive objects that move — from near-Earth asteroids to a potential Planet X?
  > Here, we are looking at the SPHEREx Deep Field North. Notice the persistent 'TEST DATA' badge: every synthetic dataset is completely transparent."
- **Key Action:** Point out the coordinates reticle, FOV indicator, and clean space theme.

---

### Step 2: Time-Lapse & Blink Comparator (0:25 – 0:50)
- **Viewport State:** `mode=blink&epoch=1`
- **Presenter Spoken Script:**
  > "In 1930, Clyde Tombaugh discovered Pluto using a mechanical blink comparator. We brought that classic technique into the modern web.
  > Clicking 'Blink' rapidly alternates between observation epochs. Notice how the distant stars stay locked in place, while solar system movers immediately pop out to the human eye."
- **Key Action:** Toggle the Blink button to show the rapid image alternation.

---

### Step 3: Spotting Real Movers with Motion Trails (0:50 – 1:20)
- **Viewport State:** `mode=viewer&trails=1&epoch=0`
- **Presenter Spoken Script:**
  > "Human eyes are great, but our offline pipeline automates this entirely. It performs sigma-clipped background subtraction, multi-epoch image differencing, and links centroid detections into constant-velocity tracklets.
  > Turning on 'Trails' reveals the exact kinematic vectors and direction of motion across the sky."
- **Key Action:** Enable the Trails toggle; hover over the cyan and amber sky markers.

---

### Step 4: Inspecting a Known Object — 1 Ceres (1:20 – 1:50)
- **Viewport State:** `object=SPX-MOV-0001`
- **Presenter Spoken Script:**
  > "Let's click candidate SPX-MOV-0001. Instantly, our side drawer displays its astrometric dossier.
  > Our automated catalog engine queried IMCCE SkyBoT and matched this candidate with 91% confidence to dwarf planet 1 Ceres, showing its exact daily proper motion rate and sexagesimal coordinates."
- **Key Action:** Highlight the Facts Block, coordinates, and "Known Object" badge.

---

### Step 5: Unknown Candidate & Scientific Honesty (1:50 – 2:20)
- **Viewport State:** `object=SPX-MOV-0002`
- **Presenter Spoken Script:**
  > "Now, what happens when we spot something unmatched? Clicking candidate SPX-MOV-0002 opens an Unknown mover.
  > Crucially, Sky Diary is scientifically honest. We never hype unverified discoveries. The interface explicitly states: 'No catalog match, candidate for follow-up — does not guarantee a new discovery'. It could be a faint uncatalogued asteroid, an imaging artifact, or a variable source."
- **Key Action:** Read the prominent Honest Science amber disclaimer banner.

---

### Step 6: 102-Channel Spectrophotometry SED (2:20 – 2:45)
- **Viewport State:** Switch to 'Spectrum (SED)' tab on `SPX-MOV-0002`
- **Presenter Spoken Script:**
  > "What sets SPHEREx apart from imaging telescopes is its 102 spectral channels from 0.75 to 5.0 micrometers.
  > Here is the extracted spectrophotometric SED curve with shaded uncertainty error bands. Interactive tooltips reveal individual band fluxes, an accessible data table is available for screen readers, and scientists can download the raw data via CSV with one click."
- **Key Action:** Hover on spectral points and toggle the data table.

---

### Step 7: Sharing, Social Cards & Embedding (2:45 – 3:00)
- **Viewport State:** Click "Share" button to open `ShareModal`
- **Presenter Spoken Script:**
  > "Finally, science is collaborative. The Share modal lets researchers copy an exact deep link, embed the interactive time-lapse into any research blog using an iframe snippet, or download a high-resolution 1200x630 social card directly generated in the browser.
  > SPHEREx Sky Diary: Bridging complex space data and citizen science with transparency and rigor. Thank you!"
- **Key Action:** Show the Share modal, copy link feedback, and click "Download Card (PNG)".

