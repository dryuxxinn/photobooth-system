import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
    "./hooks/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        sweet: {
          bg: "#FFF5F7",
          surface: "#FFFFFF",
          primary: "#FBCFE8",
          primaryStrong: "#DB2777",
          secondary: "#DCD6F7",
          softPink: "#FFE5EC",
          peach: "#FFF0F0",
          lilac: "#F3E8FF",
          text: "#3F3D56",
          muted: "#5C5A72",
          success: "#047857",
          error: "#B84C58",
          border: "#F3E6EE",
          blush: "#FFF0F5",
          lavenderSoft: "#F3E8FF",
          creamDark: "#F6EDE2",
        },
      },
      fontFamily: {
        heading: [
          "Fredoka",
          "Quicksand",
          "Nunito",
          "ui-rounded",
          '"SF Pro Rounded"',
          "system-ui",
          "-apple-system",
          "sans-serif",
        ],
        sans: [
          "Quicksand",
          "Nunito",
          "Inter",
          '"Nunito Sans"',
          "system-ui",
          "-apple-system",
          '"Segoe UI"',
          "sans-serif",
        ],
      },
      boxShadow: {
        sweet:
          "0 8px 20px -6px rgba(63, 61, 86, 0.06), 0 2px 6px -1px rgba(244, 114, 182, 0.08)",
        sweetLg:
          "0 20px 40px -12px rgba(63, 61, 86, 0.14), 0 8px 20px -6px rgba(244, 114, 182, 0.20)",
        glow: "0 0 0 3px rgba(244, 114, 182, 0.35)",
      },
    },
  },
  plugins: [],
};

export default config;
