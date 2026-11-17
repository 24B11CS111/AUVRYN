import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // AUVRYN Official Brand Palette
        auvryn: {
          navy: '#0B1E3F',
          deep: '#07152B',
          secondary: '#142C4C',
          blue: '#2563EB',
          lightBlue: '#EAF2FF',
          white: '#FFFFFF',
          bg: '#F5F7FB',
          surface: '#FFFFFF',
          text: '#17243A',
          muted: '#64748B',
          border: '#E2E8F0',
          success: '#16A36A',
          warning: '#D99A22',
          error: '#DC4545',
        },
        // Mapped Brand Scale (Navy + Electric Blue)
        brand: {
          50: '#EAF2FF',
          100: '#DBEAFE',
          200: '#BFDBFE',
          300: '#93C5FD',
          400: '#60A5FA',
          500: '#2563EB', // Electric Blue
          600: '#1D4ED8',
          700: '#1E40AF',
          800: '#142C4C', // Secondary Navy
          900: '#0B1E3F', // Primary Navy
          950: '#07152B', // Deep Navy
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
