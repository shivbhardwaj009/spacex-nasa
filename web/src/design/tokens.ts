/**
 * SPHEREx Sky Diary - Design Tokens & Visual Hierarchy.
 *
 * Implements cosmic dark space palette, semantic color tokens, WCAG AA contrast rules,
 * and background survey identifiers for Aladin Lite sky visualization.
 */

export const DESIGN_TOKENS = {
  colors: {
    // Cosmic Deep Space Canvas
    space: {
      950: "#050814", // Deepest cosmic navy background (>15:1 contrast against white)
      900: "#090e24", // Primary panel / elevated surface
      850: "#0d1536", // Glass panel base
      800: "#131d47", // Card active / hover border
      700: "#1d2c68", // Subtle borders
      600: "#2d4294",
      400: "#7c93e4", // Muted text (AA standard >= 4.5:1)
      200: "#cfd9fa", // Soft foreground
      50: "#f6f8ff",  // Crisp high-contrast white text
    },
    // Cyan: Catalog-Matched Known Asteroids / Comets
    known: {
      primary: "#06b6d4",
      light: "#22d3ee",
      hover: "#67e8f9",
      dark: "#083344",
      glow: "rgba(34, 211, 238, 0.35)",
    },
    // Amber: Unknown Movers & Planet X Candidates
    unknown: {
      primary: "#f59e0b",
      light: "#fbbf24",
      hover: "#fcd34d",
      dark: "#451a03",
      glow: "rgba(251, 191, 36, 0.35)",
    },
    // Rose: Test Data & Synthetic Alerts
    synthetic: {
      primary: "#f43f5e",
      light: "#fb7185",
      dark: "#4c0519",
      glow: "rgba(244, 63, 94, 0.4)",
    },
  },

  // Aladin Lite Survey Defaults
  surveys: {
    // TODO(VERIFY): Best all-sky infrared survey for SPHEREx 0.75-5.0um cross-comparison.
    // Defaulting to allWISE mid-infrared color composite (W1/W2/W4).
    defaultSurveyId: "P/allWISE/color",
    fallbackSurveyId: "P/2MASS/color",
    opticalSurveyId: "P/DSS2/color",
  },

  // Field of View Presets (degrees)
  fov: {
    min: 0.02,
    max: 5.0,
    default: 0.2,
    presets: [0.1, 0.2, 0.5, 1.0],
    coverageLimitDeg: 0.25, // Maximum extent covered by precomputed SPHEREx test data
  },

  // Touch and Accessibility Standards
  a11y: {
    minTouchTargetPx: 44,
    focusRing: "focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:outline-none",
    maxBlinkHz: 3.0, // Strict photo-sensitivity cap: <= 3 flashes per second
    defaultBlinkHz: 1.5,
  },
} as const;

export type DesignTokens = typeof DESIGN_TOKENS;

