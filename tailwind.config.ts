import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        paper: "#f6f5f4",
        canvas: "#ffffff",
        ink: "#111111",
        inkSecondary: "#31302e",
        muted: "#615d59",
        faint: "#a39e98",
        hairline: "#e6e6e6",
        brand: "#0075de",
        brandActive: "#005bab",
        night: "#213183",
        stickerSky: "#62aef0",
        stickerPurple: "#d6b6f6",
        stickerPink: "#ff64c8",
        stickerOrange: "#dd5b00",
        stickerTeal: "#2a9d99",
        stickerGreen: "#1aae39"
      },
      boxShadow: {
        soft: "0 0.175px 1.041px rgba(0, 0, 0, 0.01), 0 0.8px 2.925px rgba(0, 0, 0, 0.02), 0 2.025px 7.847px rgba(0, 0, 0, 0.027), 0 4px 18px rgba(0, 0, 0, 0.04)"
      }
    }
  },
  plugins: []
};

export default config;
