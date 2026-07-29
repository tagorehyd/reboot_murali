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
          cardBg: '#FFFFFF',
          emerald: '#00A865',
          emeraldDarkText: '#031D0E',
          mint: '#A3E3AB',
          mintDarkText: '#082914',
          mintText: '#111827',
          mintLightText: '#374151',
          heading: '#111827',
          borderLight: '#CBD5E1',
          borderCard: '#CBD5E1',
        },
        brand: {
          50:  '#F0FDF4',
          100: '#DCFCE7',
          500: '#00A865',
          600: '#00A865',
          700: '#008F53',
          800: '#111827',
          900: '#031D0E',
        },
        danger: {
          50:  '#fff1f2',
          500: '#f43f5e',
          700: '#be123c',
        },
        success: {
          50:  '#F0FDF4',
          500: '#00A865',
          700: '#008F53',
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
