import type { Config } from "tailwindcss"

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  darkMode: "media", // suit le thème système
  theme: {
    extend: {
      colors: {
        // tokens Instagram-like
        surface: {
          DEFAULT: "#ffffff",
          dark: "#000000",
        },
        muted: {
          DEFAULT: "#737373",
          dark: "#a8a8a8",
        },
        border: {
          DEFAULT: "#dbdbdb",
          dark: "#262626",
        },
      },
    },
  },
  plugins: [],
}

export default config
