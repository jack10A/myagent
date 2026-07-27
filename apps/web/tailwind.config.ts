import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#15181d",
        panel: "#f7f4ef",
        line: "#ded9d1",
        sage: "#8ca58a",
        teal: "#367a7a",
        coral: "#c86455",
        gold: "#c99b3b"
      },
      boxShadow: {
        soft: "0 18px 45px rgba(21, 24, 29, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;

