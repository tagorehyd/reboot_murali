/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ltc: {
          canvas: '#ECEEEF',
          forest: '#0B3820',
          forestCard: '#0B3820',
          emerald: '#00A865',
          emeraldDarkText: '#031D0E',
          mint: '#A3E3AB',
          mintDarkText: '#082914',
          mintText: '#E2F7E8',
          mintLightText: '#D1EAD0',
          heading: '#111827',
          borderLight: '#CBD5E1',
          borderForest: '#072914',
        },
        brand: {
          50:  '#E2F7E8',
          100: '#D1EAD0',
          500: '#00A865',
          600: '#00A865',
          700: '#0B3820',
          800: '#082914',
          900: '#031D0E',
        },
        danger: {
          50:  '#fff1f2',
          500: '#f43f5e',
          700: '#be123c',
        },
        success: {
          50:  '#E2F7E8',
          500: '#00A865',
          700: '#0B3820',
        },
        warning: {
          50:  '#fffbeb',
          500: '#f59e0b',
          700: '#b45309',
        }
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'ui-sans-serif', 'system-ui'],
        heading: ['Outfit', 'Plus Jakarta Sans', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace'],
      }
    },
  },
  plugins: [],
}
