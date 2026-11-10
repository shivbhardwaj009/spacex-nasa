import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        space: {
          950: "#050814", // Deepest cosmic background
          900: "#090e24", // Primary app background
          850: "#0d1536", // Elevated glass panel surface
          800: "#131d47", // Active / elevated border
          700: "#1d2c68", // Subtle borders
          600: "#2d4294", // Accent borders
          500: "#4862c4",
          400: "#7c93e4", // Muted text
          300: "#a9b9f3", // Light text
          200: "#cfd9fa", // Soft white
          100: "#e9effe",
          50: "#f6f8ff",  // Pure bright foreground
        },
        cyan: {
          300: "#67e8f9",
          400: "#22d3ee",
          500: "#06b6d4",
          600: "#0891b2",
          900: "#164e63",
          950: "#082f49",
        },
        amber: {
          300: "#fcd34d",
          400: "#fbbf24",
          500: "#f59e0b",
          600: "#d97706",
          900: "#78350f",
          950: "#451a03",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Oxygen",
          "Ubuntu",
          "Cantarell",
          "Fira Sans",
          "Droid Sans",
          "Helvetica Neue",
          "sans-serif",
        ],
        mono: [
          "JetBrains Mono",
          "Fira Code",
          "Consolas",
          "Monaco",
          "monospace",
        ],
      },
      minHeight: {
        touch: "44px",
      },
      minWidth: {
        touch: "44px",
      },
      boxShadow: {
        glass: "0 8px 32px 0 rgba(0, 0, 0, 0.45)",
        "glow-cyan": "0 0 20px -3px rgba(34, 211, 238, 0.35)",
        "glow-amber": "0 0 20px -3px rgba(251, 191, 36, 0.35)",
      },
    },
  },
  plugins: [],
};
export default config;
