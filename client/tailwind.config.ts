import type { Config } from 'tailwindcss';

/**
 * Every colour that changes between the light and dark themes is defined as
 * an RGB triplet in a CSS variable (see src/styles/index.css) and referenced
 * here with `<alpha-value>`, so `bg-surface/60` keeps working. The brand
 * greens that are the same on both themes (sidebar, logo, tea-green accents)
 * stay as plain hex.
 */
const themed = (variable: string) => `rgb(var(${variable}) / <alpha-value>)`;

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // --- fixed brand palette (identical in both themes) ---
        'tea-green': '#C9F2C7',
        'light-green': '#ACECA1',
        'muted-olive': '#96BE8C',
        evergreen: '#243119',
        'evergreen-hover': '#31441F',
        priority: {
          critical: '#E53935',
          high: '#FB8C00',
          medium: '#F4C20D',
          low: '#7E57C2',
          'very-low': '#1E88E5',
        },
        warning: '#F4C95D',

        // --- themed tokens ---
        'bg-app': themed('--c-bg-app'),
        surface: themed('--c-surface'),
        'surface-2': themed('--c-surface-2'),
        'bg-pure': themed('--c-surface'),
        'text-primary': themed('--c-text-primary'),
        'text-secondary': themed('--c-text-secondary'),
        border: themed('--c-border'),
        'sage-green': themed('--c-sage'),
        /** Dark green text/icons on light surfaces; pale green in the dark theme. */
        brand: themed('--c-brand'),
        primary: {
          DEFAULT: themed('--c-primary'),
          hover: themed('--c-primary-hover'),
          fg: themed('--c-primary-fg'),
        },
        /** Soft green tint behind icons, selected rows, info boxes. */
        tint: {
          DEFAULT: themed('--c-tint'),
          strong: themed('--c-tint-strong'),
        },
        sidebar: themed('--c-sidebar'),
        overlay: themed('--c-overlay'),
        success: themed('--c-sage'),
        'success-light': themed('--c-tint-strong'),
        'warning-fg': themed('--c-warning-fg'),
        danger: {
          DEFAULT: themed('--c-danger'),
          hover: themed('--c-danger-hover'),
        },
        chart: {
          grid: themed('--c-chart-grid'),
          baseline: themed('--c-chart-baseline'),
          leader: themed('--c-chart-leader'),
        },
        // Finanças. The three ledger hues are semantic (receita = verde,
        // despesa = vermelho, investimento = azul) and were validated as a
        // categorical set on a white surface: lightness band, chroma floor,
        // normal-vision ΔE 29.0 and contrast ≥ 3:1 all pass. The verde↔vermelho
        // pair sits at CVD ΔE 7.2 (the 6–8 floor band), so anywhere all three
        // appear together they carry secondary encoding — distinct marker
        // shapes plus direct labels — never colour alone.
        finance: {
          income: themed('--c-fin-income'),
          'income-soft': themed('--c-fin-income-soft'),
          expense: themed('--c-fin-expense'),
          'expense-soft': themed('--c-fin-expense-soft'),
          investment: themed('--c-fin-investment'),
          'investment-soft': themed('--c-fin-investment-soft'),
        },
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
        card: '0 6px 24px rgb(var(--c-shadow) / 0.06)',
        elevated: '0 18px 50px rgb(var(--c-shadow) / 0.14)',
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
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'chart-reveal': {
          '0%': { transform: 'scaleX(0)' },
          '100%': { transform: 'scaleX(1)' },
        },
        'mark-pop': {
          '0%': { opacity: '0', transform: 'scale(0.4)' },
          '70%': { opacity: '1', transform: 'scale(1.15)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'toast-in': 'toast-in 220ms cubic-bezier(0.22, 1, 0.36, 1)',
        'modal-in': 'modal-in 200ms cubic-bezier(0.22, 1, 0.36, 1)',
        'backdrop-in': 'backdrop-in 180ms ease',
        'check-pop': 'check-pop 220ms cubic-bezier(0.22, 1, 0.36, 1)',
        'fade-up': 'fade-up 260ms cubic-bezier(0.22, 1, 0.36, 1) both',
        'chart-reveal': 'chart-reveal 1100ms cubic-bezier(0.22, 1, 0.36, 1) both',
        'mark-pop': 'mark-pop 420ms cubic-bezier(0.22, 1, 0.36, 1) both',
      },
    },
  },
  plugins: [],
} satisfies Config;
