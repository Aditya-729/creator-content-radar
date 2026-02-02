import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#0a0b13",
          900: "#0f1220",
          800: "#161a2c",
          700: "#1f2540",
        },
        glow: {
          cyan: "#5ee7ff",
          indigo: "#8fa6ff",
          violet: "#b18cff",
          emerald: "#5cf0b7",
        },
      },
      boxShadow: {
        glow: "0 16px 40px -24px rgba(94, 231, 255, 0.65)",
        soft: "0 20px 45px -28px rgba(15, 18, 32, 0.45)",
        lift: "0 20px 60px -30px rgba(9, 10, 19, 0.5)",
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.5rem",
        "3xl": "2rem",
      },
      backgroundImage: {
        "hero-gradient":
          "radial-gradient(circle at top, rgba(94,231,255,0.45), transparent 55%), radial-gradient(circle at 40% 30%, rgba(177,140,255,0.35), transparent 50%), radial-gradient(circle at 80% 20%, rgba(92,240,183,0.35), transparent 45%)",
        "card-gradient":
          "linear-gradient(135deg, rgba(255,255,255,0.75), rgba(255,255,255,0.4))",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-12px)" },
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 0 rgba(94,231,255,0.0)" },
          "50%": { boxShadow: "0 0 28px rgba(94,231,255,0.5)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "0% 50%" },
          "100%": { backgroundPosition: "100% 50%" },
        },
      },
      animation: {
        float: "float 6s ease-in-out infinite",
        pulseGlow: "pulseGlow 2.6s ease-in-out infinite",
        shimmer: "shimmer 8s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
