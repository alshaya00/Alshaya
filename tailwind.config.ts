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
        male: {
          light: '#DBEEF3',
          DEFAULT: '#4472C4',
          dark: '#2F528F',
        },
        female: {
          light: '#F2DCDB',
          DEFAULT: '#E91E63',
          dark: '#AD1457',
        },
        family: {
          green: '#70AD47',
          gold: '#FFD700',
        },
      },
      fontFamily: {
        arabic: ['Noto Sans Arabic', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
