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
          primary: "#F6C9D2",
          primaryStrong: "#E98291",
          secondary: "#DCD6F7",
          text: "#493B3B",
          muted: "#887B7B",
          success: "#54866A",
          error: "#B84C58",
          border: "#F0E2DA",
          blush: "#FDF2F5",
          lavenderSoft: "#F4F1FC",
          creamDark: "#F6EDE2",
        },
      },
      fontFamily: {
        heading: [
          "Quicksand",
          "Nunito",
          "ui-rounded",
          '"SF Pro Rounded"',
          "system-ui",
          "-apple-system",
          "sans-serif",
        ],
        sans: [
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
          "0 10px 30px -10px rgba(73, 59, 59, 0.08), 0 4px 12px -2px rgba(233, 130, 145, 0.10)",
        sweetLg:
          "0 20px 45px -15px rgba(73, 59, 59, 0.14), 0 8px 20px -4px rgba(233, 130, 145, 0.16)",
      },
    },
  },
  plugins: [],
};

export default config;
