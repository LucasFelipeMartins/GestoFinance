import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'tea-green': '#C9F2C7',
        'light-green': '#ACECA1',
        'muted-olive': '#96BE8C',
        'sage-green': '#629460',
        evergreen: '#243119',
        'evergreen-hover': '#31441F',
        priority: {
          critical: '#E53935',
          high: '#FB8C00',
          medium: '#F4C20D',
          low: '#7E57C2',
          'very-low': '#1E88E5',
        },
        success: '#629460',
        'success-light': '#C9F2C7',
        warning: '#F4C95D',
        danger: '#D93A3A',
        'text-primary': '#182014',
        'text-secondary': '#66705F',
        border: '#DDE7D9',
        'bg-app': '#F7FAF5',
        'bg-pure': '#FFFFFF',
      },
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'sans-serif',
        ],
      },
      fontSize: {
        display: ['32px', { lineHeight: '1.2', fontWeight: '700' }],
        h1: ['28px', { lineHeight: '1.25', fontWeight: '700' }],
        'h1-mobile': ['24px', { lineHeight: '1.25', fontWeight: '700' }],
        h2: ['22px', { lineHeight: '1.3', fontWeight: '700' }],
        h3: ['18px', { lineHeight: '1.35', fontWeight: '650' }],
        'body-lg': ['16px', { lineHeight: '1.5', fontWeight: '400' }],
        body: ['14px', { lineHeight: '1.5', fontWeight: '400' }],
        'body-strong': ['14px', { lineHeight: '1.5', fontWeight: '600' }],
        caption: ['12px', { lineHeight: '1.4', fontWeight: '400' }],
        micro: ['11px', { lineHeight: '1.3', fontWeight: '500' }],
      },
      borderRadius: {
        card: '18px',
        modal: '20px',
        input: '12px',
        btn: '12px',
        badge: '999px',
      },
      boxShadow: {
        card: '0 6px 24px rgba(36, 49, 25, 0.06)',
        elevated: '0 18px 50px rgba(36, 49, 25, 0.12)',
      },
      spacing: {
        18: '4.5rem',
      },
      transitionTimingFunction: {
        gentle: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      keyframes: {
        'toast-in': {
          '0%': { opacity: '0', transform: 'translateY(-8px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'modal-in': {
          '0%': { opacity: '0', transform: 'scale(0.98)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'backdrop-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'check-pop': {
          '0%': { transform: 'scale(0.8)' },
          '50%': { transform: 'scale(1.15)' },
          '100%': { transform: 'scale(1)' },
        },
      },
      animation: {
        'toast-in': 'toast-in 220ms cubic-bezier(0.22, 1, 0.36, 1)',
        'modal-in': 'modal-in 200ms cubic-bezier(0.22, 1, 0.36, 1)',
        'backdrop-in': 'backdrop-in 180ms ease',
        'check-pop': 'check-pop 220ms cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
} satisfies Config;
