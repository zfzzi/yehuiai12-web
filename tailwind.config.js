import animate from "tailwindcss-animate";

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        border: "#243349",
        input: "#1E293B",
        ring: "#F59E0B",
        background: "#0F172A",
        foreground: "#F8FAFC",
        primary: {
          DEFAULT: "#F59E0B",
          foreground: "#0F172A"
        },
        secondary: {
          DEFAULT: "#16233A",
          foreground: "#F8FAFC"
        },
        muted: {
          DEFAULT: "#152033",
          foreground: "#A5B4C8"
        },
        accent: {
          DEFAULT: "#0B3B5A",
          foreground: "#BAE6FD"
        },
        destructive: {
          DEFAULT: "oklch(0.62 0.16 28)",
          foreground: "oklch(0.98 0.004 260)"
        },
        card: {
          DEFAULT: "#111C31",
          foreground: "#F8FAFC"
        }
      },
      borderRadius: {
        lg: "0.75rem",
        md: "0.55rem",
        sm: "0.4rem"
      },
      boxShadow: {
        "auth-card": "0 24px 80px rgb(0 0 0 / 0.42), 0 0 0 1px rgb(245 158 11 / 0.2)",
        "auth-glow": "0 12px 38px rgb(245 158 11 / 0.25)"
      },
      keyframes: {
        "auth-fade": {
          "0%": { opacity: "0", transform: "translateY(10px) scale(0.99)" },
          "100%": { opacity: "1", transform: "translateY(0) scale(1)" }
        },
        "light-drift": {
          "0%": { transform: "translate3d(-2%, 2%, 0)" },
          "50%": { transform: "translate3d(2%, -1%, 0)" },
          "100%": { transform: "translate3d(-2%, 2%, 0)" }
        },
        "city-glow": {
          "0%, 100%": { opacity: "0.42" },
          "50%": { opacity: "0.72" }
        }
      },
      animation: {
        "auth-fade": "auth-fade 260ms ease-out both",
        "light-drift": "light-drift 14s ease-in-out infinite",
        "city-glow": "city-glow 6s ease-in-out infinite"
      }
    }
  },
  plugins: [animate]
};
