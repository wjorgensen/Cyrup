import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        cream: {
          50: '#FFFEF7',
          100: '#FFFDF0',
          200: '#FFF9D9',
          300: '#FFF5C2',
          400: '#FFEE94',
          500: '#FFE766',
          600: '#E6D05C',
          700: '#998A3D',
          800: '#73682E',
          900: '#4C451F',
        },
        purple: {
          50: '#FAF5FF',
          100: '#F3E8FF',
          200: '#E9D5FF',
          300: '#D8B4FE',
          400: '#C084FC',
          500: '#A855F7',
          600: '#9333EA',
          700: '#7E22CE',
          800: '#6B21A8',
          900: '#581C87',
        },
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
export default config;