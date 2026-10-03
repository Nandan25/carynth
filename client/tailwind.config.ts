import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Light mode
        base: "#FAFAF8",
        ink: "#1C1E21",
        muted: "#55575E",
        border: "#E4E4E0",
        // Dark mode
        "base-dark": "#14151A",
        "surface-dark": "#1C1E24",
        "ink-dark": "#EDEDEE",
        "muted-dark": "#9A9CA5",
        "border-dark": "#2A2C34",
        // Shared
        accent: {
          DEFAULT: "#4F46E5",
          light: "#818CF8",
          soft: "#EEF0FF",
        },
        success: "#16A34A",
        warning: "#D97706",
        danger: "#DC2626",
      },
      fontFamily: {
        display: ["Fraunces", "ui-serif", "Georgia", "serif"],
        sans: ["Inter", "ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
} satisfies Config;
