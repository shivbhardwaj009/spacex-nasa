# SPHEREx Sky Diary — Web Application

Interactive multi-epoch sky viewer, asteroid detection explorer, and 102-channel spectrophotometry tool developed for the **NASA Space Apps Challenge 2026** (*Planet X and SPHEREx*).

---

## 1. Getting Started

### Development
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to launch the full SPHEREx Sky Diary app.
Open [http://localhost:3000/design](http://localhost:3000/design) to inspect the design system tokens, WCAG AA contrast rules, and interactive component catalog.

### Validation & Testing
```bash
npm run typecheck   # Typecheck without emit (TypeScript)
npm run lint        # Next.js ESLint verification
npm test            # Vitest unit test suite
npm run build       # Production static build export
```

---

## 2. URL State & Deep Linking Parameters

The Sky Diary view is fully driven by URL state. You can deep-link directly to any celestial coordinate, observation epoch, and candidate mover:

| Query Parameter | Example | Description |
|---|---|---|
| `ra` | `?ra=133.7951` | Right Ascension in degrees J2000 $[0, 360)$. |
| `dec` | `?dec=-7.2452` | Declination in degrees J2000 $[-90, +90]$. |
| `fov` | `?fov=0.2` | Field of View diameter in degrees. |
| `epoch` | `?epoch=2` | Active observation epoch index (0-based). |
| `object` | `?object=SPX-MOV-0002` | Pre-selected mover candidate ID. |
| `trails` | `?trails=1` / `?trails=0` | Toggle motion trail vectors on/off. |
| `mode` | `?mode=viewer` / `?mode=blink` | Switch between Sky Viewer and Blink Comparator. |
| `demo` | `?demo=1` | Fully offline mode (plain canvas star-field, no network calls). |
| `embed` | `?embed=1` | Embed mode (hides top bar & sidebar for iframe embeds). |

### Example Deep Links
- **WISE 0855 Target:** `http://localhost:3000/?ra=133.7951&dec=-7.2452&fov=0.2&epoch=2`
- **Barnard's Star Target:** `http://localhost:3000/?ra=269.4521&dec=4.6934&fov=0.2`
- **Blink Comparator Mode:** `http://localhost:3000/?mode=blink&epoch=1`

---

## 3. Embedding in External Websites / Portals (`embed=1`)

To embed the SPHEREx Sky Diary into another portal, science article, or dashboard, use the `embed=1` parameter. This hides the navigation chrome and sidebar while keeping the interactive time-lapse controls, mover markers, and mandatory `TEST DATA` badges visible:

```html
<!-- SPHEREx Sky Diary Iframe Embed Snippet -->
<iframe
  src="https://your-domain.org/?ra=133.7951&dec=-7.2452&fov=0.2&epoch=0&embed=1"
  width="100%"
  height="600"
  style="border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 16px; overflow: hidden;"
  title="SPHEREx Sky Diary - Multi-Epoch Celestial Time-Lapse"
  allow="fullscreen"
  loading="lazy"
></iframe>
```
