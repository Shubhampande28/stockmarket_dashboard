/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#0B0F14",
          900: "#0E1117",
          850: "#121821",
          800: "#161F2B",
          700: "#202B3A"
        },
        text: {
          primary: "#E6EDF3",
          secondary: "#9FB0C3",
          muted: "#6B7A90"
        },
        accent: {
          blue: "#3A86FF",
          green: "#00C896",
          red: "#FF5A5F"
        }
      },
      boxShadow: {
        glow: "0 0 36px rgba(58, 134, 255, 0.18)",
        lift: "0 18px 44px rgba(0, 0, 0, 0.32)",
        card: "0 10px 28px rgba(0, 0, 0, 0.24)"
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif"
        ]
      }
    }
  },
  plugins: []
};
