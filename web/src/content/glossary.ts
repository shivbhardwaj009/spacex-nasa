/**
 * SPHEREx Sky Diary - Science Glossary.
 *
 * Plain-language definitions for astronomy terms used across the application.
 * Designed for beginner mode tooltips, educational sidebars, and accessibility.
 * Reviewed for accuracy with respect to SPHEREx mission operations.
 */

export interface GlossaryEntry {
  id: string;
  term: string;
  short: string;
  detail: string;
  learnMoreUrl?: string;
}

export const GLOSSARY: Record<string, GlossaryEntry> = {
  epoch: {
    id: "epoch",
    term: "Epoch",
    short: "A single snapshot of a sky region taken at a specific point in time.",
    detail:
      "SPHEREx surveys the entire sky every 6 months. Each visit to the same patch of sky is called an epoch. Comparing images from multiple epochs allows astronomers to see what moved or changed brightness over days, weeks, or months.",
  },
  blinkComparator: {
    id: "blinkComparator",
    term: "Blink Comparator",
    short: "An optical tool that alternates rapidly between two images to reveal moving or variable objects.",
    detail:
      "Invented by Carl Lampland and used famously by Clyde Tombaugh in 1930 to discover Pluto. By rapidly flipping between photos taken on different dates, stationary stars stay still while moving objects appear to jump back and forth.",
  },
  motionTrail: {
    id: "motionTrail",
    term: "Motion Trail / Tracklet",
    short: "The path formed by connecting an object's detected positions across consecutive observation dates.",
    detail:
      "A moving solar system body changes position between visits. By drawing a line through its positions at each epoch, we calculate its speed and direction across the celestial sphere.",
  },
  confidence: {
    id: "confidence",
    term: "Detection Confidence",
    short: "A mathematical score from 0% to 100% measuring how likely a detection is a real physical object.",
    detail:
      "The score combines signal-to-noise ratio (S/N), smoothness of the linear motion fit, and number of observing epochs. High confidence (>70%) means clean, straight motion detected in three or more independent epochs with low residual scatter.",
  },
  known: {
    id: "known",
    term: "Known Object",
    short: "A mover successfully matched to an asteroid, comet, or planet in official astronomical databases.",
    detail:
      "Matched against the IMCCE SkyBoT catalog or JPL Horizons orbit predictions within position and velocity tolerances. The name shown is the official catalog designation (e.g., '1 Ceres' or '2024 BX1').",
  },
  unknown: {
    id: "unknown",
    term: "Unknown Mover",
    short: "No catalog match, candidate for follow-up. A mover that did not match queried asteroid/comet databases.",
    detail:
      "IMPORTANT: 'Unknown' means 'no catalog match in queried asteroid catalogs' — it is NOT a confirmed new discovery. It could be a faint uncatalogued asteroid, a variable star residual, a high-proper-motion star, or an imaging artifact. Astronomical follow-up is required to confirm.",
  },
  spectrum: {
    id: "spectrum",
    term: "Spectrum (SED)",
    short: "A measurement of how much light an object emits or reflects at different wavelengths of color.",
    detail:
      "SPHEREx measures 102 infrared spectral channels from 0.75 to 5.0 micrometers. A spectrum acts like a chemical fingerprint, revealing water ice, carbon dioxide, organics, and mineral compositions on an asteroid's surface.",
  },
  wavelength: {
    id: "wavelength",
    term: "Wavelength (µm)",
    short: "The physical distance between peaks of a light wave, measured in micrometers (microns).",
    detail:
      "Visible light spans 0.4 to 0.7 µm. SPHEREx observes in the near-infrared from 0.75 to 5.0 µm, a regime where planetary ices and asteroid minerals exhibit distinct absorption bands invisible to human eyes.",
  },
  fov: {
    id: "fov",
    term: "Field of View (FOV)",
    short: "The angular width of the sky visible in the viewer, measured in degrees.",
    detail:
      "Full Moon is about 0.5° across. SPHEREx Deep Field cutouts typically cover 0.1° to 0.5° (6 to 30 arcminutes) to isolate candidate solar system movers against the background stellar field.",
  },
  testData: {
    id: "testData",
    term: "TEST DATA",
    short: "Synthetic or simulated data used to validate software pipelines prior to mission science releases.",
    detail:
      "To ensure algorithms work before SPHEREx flight data is calibrated, synthetic stars, background noise, and injected movers with known orbital trajectories are generated. Simulated detections must never be cited as real celestial discoveries.",
  },
};

