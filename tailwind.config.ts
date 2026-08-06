/**
 * Tailwind CSS Configuration
 *
 * Seoul Dragon City Style:
 * - Clean white background
 * - Dark navy/black text
 * - Minimal luxury aesthetic
 * - Premium hotel feel
 */

import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Seoul Dragon City inspired palette
      colors: {
        // Primary - Dark Navy/Black
        primary: {
          50: '#f7f7f8',
          100: '#eeeef0',
          200: '#d9d9de',
          300: '#b8b9c1',
          400: '#91929f',
          500: '#737484',
          600: '#5d5e6c',
          700: '#4c4d58',
          800: '#41424b',
          900: '#1a1a1f', // Main dark color
          950: '#0d0d0f',
        },
        // Accent - Warm Gold
        accent: {
          50: '#fdfbf7',
          100: '#faf5eb',
          200: '#f4e9d3',
          300: '#ead5af',
          400: '#deba7c',
          500: '#c9a227', // Main gold
          600: '#b8922b',
          700: '#997426',
          800: '#7c5d24',
          900: '#664d21',
          950: '#3a2a10',
        },
        // Neutral grays - warmer tone
        neutral: {
          50: '#fafafa',
          100: '#f5f5f5',
          200: '#eeeeee',
          300: '#e0e0e0',
          400: '#bdbdbd',
          500: '#9e9e9e',
          600: '#757575',
          700: '#616161',
          800: '#424242',
          900: '#212121',
          950: '#121212',
        },
        // Background colors
        background: 'var(--background)',
        foreground: 'var(--foreground)',
      },
      // Typography - Elegant Premium
      fontFamily: {
        // Latin runs through Playfair; Hangul falls to Noto Serif KR, which is
        // actually loaded. Previously every serif in this stack lacked Hangul,
        // so Korean headings dropped to an arbitrary system face.
        heading: ['var(--font-playfair)', 'var(--font-serif-kr)', 'Georgia', 'serif'],
        serif: ['var(--font-playfair)', 'var(--font-serif-kr)', 'Georgia', 'serif'],
        body: ['var(--font-sans-kr)', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        sans: ['var(--font-sans-kr)', 'system-ui', 'sans-serif'],
      },
      // Font sizes with appropriate line heights
      fontSize: {
        'display-1': ['4.5rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        'display-2': ['3.75rem', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        'heading-1': ['3rem', { lineHeight: '1.2', letterSpacing: '-0.01em' }],
        'heading-2': ['2.25rem', { lineHeight: '1.25', letterSpacing: '-0.01em' }],
        'heading-3': ['1.875rem', { lineHeight: '1.3' }],
        'heading-4': ['1.5rem', { lineHeight: '1.4' }],
        'body-lg': ['1.125rem', { lineHeight: '1.75' }],
        body: ['1rem', { lineHeight: '1.75' }],
        'body-sm': ['0.875rem', { lineHeight: '1.5' }],
      },
      // Spacing
      spacing: {
        '18': '4.5rem',
        '22': '5.5rem',
        '30': '7.5rem',
        '128': '32rem',
        '144': '36rem',
      },
      // Border radius
      borderRadius: {
        '4xl': '2rem',
        '5xl': '2.5rem',
      },
      // Box shadows
      boxShadow: {
        'soft': '0 2px 15px -3px rgba(0, 0, 0, 0.07), 0 10px 20px -2px rgba(0, 0, 0, 0.04)',
        'medium': '0 4px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 30px -5px rgba(0, 0, 0, 0.08)',
        'large': '0 10px 40px -10px rgba(0, 0, 0, 0.15), 0 20px 50px -10px rgba(0, 0, 0, 0.1)',
        'gold': '0 4px 20px -2px rgba(212, 175, 55, 0.25)',
        'gold-lg': '0 10px 40px -5px rgba(212, 175, 55, 0.3)',
      },
      // Animations
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'fade-in-up': 'fadeInUp 0.6s ease-out',
        'fade-in-down': 'fadeInDown 0.6s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'slide-down': 'slideDown 0.5s ease-out',
        'scale-in': 'scaleIn 0.3s ease-out',
        'shimmer': 'shimmer 2s infinite linear',
        'kenburns': 'kenburns 20s ease-out forwards',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInDown: {
          '0%': { opacity: '0', transform: 'translateY(-20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        kenburns: {
          '0%': { transform: 'scale(1)' },
          '100%': { transform: 'scale(1.1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      // Backdrop blur
      backdropBlur: {
        xs: '2px',
      },
      // Aspect ratios
      aspectRatio: {
        'hotel-room': '16 / 10',
        'portrait': '3 / 4',
      },
      // Z-index
      zIndex: {
        '60': '60',
        '70': '70',
        '80': '80',
        '90': '90',
        '100': '100',
      },
      // Transitions
      transitionDuration: {
        '400': '400ms',
      },
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },
  plugins: [],
};

export default config;
