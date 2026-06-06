import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Warm business dashboard palette
        ink: "#FFFDF7",          // page background – warm white
        panel: "#FFFFFF",        // card surface – pure white
        edge: "#E7E5E4",        // borders – stone-200
        accent: "#D97706",      // primary accent – amber-600
        "accent-hover": "#B45309",  // darker amber on hover
        "accent-light": "#FEF3C7",  // amber-100 – subtle highlight bg
        "accent-subtle": "#FFFBEB",  // amber-50 – barely-there tint
      },
      boxShadow: {
        // Layered shadows for realistic depth (senior UX trick)
        card: "0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.03)",
        "card-hover": "0 2px 8px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.05)",
        soft: "0 1px 2px rgba(0,0,0,0.03)",
        nav: "0 1px 3px rgba(0,0,0,0.04)",
      },
    },
  },
  plugins: [],
};

export default config;
