/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "primary": "#b80662",
        "primary-container": "#ff4d97",
        "primary-fixed": "#ffd9e2",
        "primary-fixed-dim": "#ffb1c8",
        "secondary": "#9c4422",
        "secondary-container": "#ff9068",
        "secondary-fixed": "#ffdbcf",
        "secondary-fixed-dim": "#ffb59c",
        "tertiary": "#006e08",
        "tertiary-container": "#00aa13",
        "tertiary-fixed": "#76ff66",
        "tertiary-fixed-dim": "#56e24b",
        "surface": "#fff8f8",
        "surface-bright": "#fff8f8",
        "surface-dim": "#eed4d9",
        "surface-container": "#ffe8ed",
        "surface-container-low": "#fff0f2",
        "surface-container-lowest": "#ffffff",
        "surface-container-high": "#fce2e7",
        "surface-container-highest": "#f6dce2",
        "on-primary": "#ffffff",
        "on-secondary": "#ffffff",
        "on-tertiary": "#ffffff",
        "on-surface": "#26181c",
        "on-surface-variant": "#594047",
        "outline": "#8c7077",
        "outline-variant": "#e0bec6",
        "background": "#fff8f8",
        "on-background": "#26181c",
      },
      fontFamily: {
        "lexend": ["Lexend", "sans-serif"],
        "cafe24": ["Cafe24Ssurround", "sans-serif"],
      },
      spacing: {
        "stack-gap": "16px",
        "gutter": "12px",
        "section-margin": "32px",
        "card-padding": "20px",
        "container-padding": "20px"
      }
    },
  },
  plugins: [],
}
