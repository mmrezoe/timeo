/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Premium dark theme palette
        dark: {
          bg: "#0f1117",
          surface: "#1a1d29",
          "surface-hover": "#22263a",
          elevated: "#252936",
          border: "#2d3142",
          "border-light": "#3a3f55",
        },
        accent: {
          primary: "#6366f1",
          "primary-hover": "#7c3aed",
          secondary: "#10b981",
          "secondary-hover": "#059669",
          danger: "#ef4444",
          "danger-hover": "#dc2626",
          warning: "#f59e0b",
          "warning-hover": "#d97706",
        },
        text: {
          primary: "#e5e7eb",
          secondary: "#9ca3af",
          tertiary: "#6b7280",
          muted: "#4b5563",
        },
      },
      boxShadow: {
        "glow-sm": "0 0 10px rgba(99, 102, 241, 0.1)",
        "glow-md": "0 0 20px rgba(99, 102, 241, 0.2)",
        "glow-lg": "0 0 30px rgba(99, 102, 241, 0.3)",
        premium: "0 10px 40px -10px rgba(0, 0, 0, 0.4)",
        "premium-hover": "0 20px 50px -10px rgba(0, 0, 0, 0.5)",
      },
      animation: {
        "slide-down": "slideDown 0.3s ease-out",
        "slide-up": "slideUp 0.3s ease-out",
        "fade-in": "fadeIn 0.2s ease-out",
        "scale-in": "scaleIn 0.2s ease-out",
      },
      keyframes: {
        slideDown: {
          "0%": { opacity: "0", transform: "translateY(-10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        scaleIn: {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
      },
      transitionTimingFunction: {
        smooth: "cubic-bezier(0.4, 0, 0.2, 1)",
      },
      transitionDuration: {
        250: "250ms",
      },
    },
  },
  plugins: [],
};
