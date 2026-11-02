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
          bg: "#FFF9F2",
          surface: "#FFFFFF",
          primary: "#FBCFE8",
          primaryStrong: "#F472B6",
          secondary: "#DCD6F7",
          softPink: "#FFE5EC",
          peach: "#FFF0F0",
          lilac: "#F3E8FF",
          text: "#3F3D56",
          muted: "#7A7893",
          success: "#54866A",
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
          "0 10px 25px -8px rgba(244, 114, 182, 0.25), 0 4px 10px -2px rgba(63, 61, 86, 0.06)",
        sweetLg:
          "0 20px 35px -10px rgba(244, 114, 182, 0.32), 0 8px 16px -4px rgba(63, 61, 86, 0.08)",
        glow:
          "0 0 25px 4px rgba(244, 114, 182, 0.45)",
      },
    },
  },
  plugins: [],
};

export default config;
