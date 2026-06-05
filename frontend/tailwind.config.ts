import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // A small, calm palette used across the dashboard.
        ink: "#0b0e14",
        panel: "#141925",
        edge: "#232a3a",
        accent: "#5b8cff",
      },
    },
  },
  plugins: [],
};

export default config;
