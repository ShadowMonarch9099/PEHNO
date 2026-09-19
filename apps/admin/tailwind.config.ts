import type { Config } from 'tailwindcss';

// PEHNO palette (mirrors apps/mobile/src/theme)
export default {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: { DEFAULT: '#964900', light: '#fd8621', dark: '#554334' },
        accent: '#426087',
        cream: '#fff8f1',
        sand: '#faf3e8',
        ink: '#1e1b15',
        muted: '#8f7a69',
        line: '#dbc2ae',
      },
    },
  },
  plugins: [],
} satisfies Config;
