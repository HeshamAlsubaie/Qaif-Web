import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';

/**
 * QAIF Tailwind theme.
 *
 * Every color resolves from a CSS variable defined in src/styles/globals.css, using the
 * `hsl(var(--x) / <alpha-value>)` form so opacity utilities (e.g. `bg-confirmed/10`) work.
 * The forensic vocabulary — tier (confirmed vs probabilistic), ai, integrity, ambiguity — is a
 * FIRST-CLASS part of the theme, so the R4/R6 visual separation is expressed in tokens, not
 * ad-hoc classes scattered across components.
 */
const withAlpha = (variable: string) => `hsl(var(${variable}) / <alpha-value>)`;

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: { '2xl': '1400px' },
    },
    extend: {
      colors: {
        border: withAlpha('--border'),
        input: withAlpha('--input'),
        ring: withAlpha('--ring'),
        background: withAlpha('--background'),
        foreground: withAlpha('--foreground'),
        primary: {
          DEFAULT: withAlpha('--primary'),
          foreground: withAlpha('--primary-foreground'),
        },
        secondary: {
          DEFAULT: withAlpha('--secondary'),
          foreground: withAlpha('--secondary-foreground'),
        },
        muted: {
          DEFAULT: withAlpha('--muted'),
          foreground: withAlpha('--muted-foreground'),
        },
        accent: {
          DEFAULT: withAlpha('--accent'),
          foreground: withAlpha('--accent-foreground'),
        },
        destructive: {
          DEFAULT: withAlpha('--destructive'),
          foreground: withAlpha('--destructive-foreground'),
        },
        card: {
          DEFAULT: withAlpha('--card'),
          foreground: withAlpha('--card-foreground'),
        },
        popover: {
          DEFAULT: withAlpha('--popover'),
          foreground: withAlpha('--popover-foreground'),
        },

        // Elevation surfaces (deepest → highest).
        surface: {
          0: withAlpha('--surface-0'),
          1: withAlpha('--surface-1'),
          2: withAlpha('--surface-2'),
          3: withAlpha('--surface-3'),
        },

        // R4 — tier separation, made visual.
        confirmed: {
          DEFAULT: withAlpha('--confirmed'),
          foreground: withAlpha('--confirmed-foreground'),
          muted: withAlpha('--confirmed-muted'),
          border: withAlpha('--confirmed-border'),
        },
        probabilistic: {
          DEFAULT: withAlpha('--probabilistic'),
          foreground: withAlpha('--probabilistic-foreground'),
          muted: withAlpha('--probabilistic-muted'),
          border: withAlpha('--probabilistic-border'),
        },

        // R6 — AI suggestion "quarantine".
        ai: {
          DEFAULT: withAlpha('--ai'),
          foreground: withAlpha('--ai-foreground'),
          muted: withAlpha('--ai-muted'),
          border: withAlpha('--ai-border'),
        },

        // Evidence integrity — verified vs broken chain of custody.
        'integrity-verified': {
          DEFAULT: withAlpha('--integrity-verified'),
          foreground: withAlpha('--integrity-verified-foreground'),
          muted: withAlpha('--integrity-verified-muted'),
          border: withAlpha('--integrity-verified-border'),
        },
        'integrity-broken': {
          DEFAULT: withAlpha('--integrity-broken'),
          foreground: withAlpha('--integrity-broken-foreground'),
          muted: withAlpha('--integrity-broken-muted'),
          border: withAlpha('--integrity-broken-border'),
        },

        // Timeline ambiguity states.
        ambiguity: {
          'assumed-tz': withAlpha('--ambiguity-assumed-tz'),
          indeterminate: withAlpha('--ambiguity-indeterminate'),
          skew: withAlpha('--ambiguity-skew'),
          tie: withAlpha('--ambiguity-tie'),
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['var(--font-sans)'],
        mono: ['var(--font-mono)'],
      },
      fontSize: {
        // A restrained typographic scale (label → display), tuned for dense console UIs.
        micro: ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.02em' }],
        caption: ['0.75rem', { lineHeight: '1.1rem' }],
        body: ['0.875rem', { lineHeight: '1.4rem' }],
        'body-lg': ['1rem', { lineHeight: '1.6rem' }],
        h4: ['1.125rem', { lineHeight: '1.6rem', fontWeight: '600' }],
        h3: ['1.375rem', { lineHeight: '1.8rem', fontWeight: '600' }],
        h2: ['1.75rem', { lineHeight: '2.1rem', fontWeight: '600', letterSpacing: '-0.01em' }],
        h1: ['2.25rem', { lineHeight: '2.6rem', fontWeight: '700', letterSpacing: '-0.02em' }],
        display: ['3rem', { lineHeight: '3.2rem', fontWeight: '700', letterSpacing: '-0.02em' }],
      },
      keyframes: {
        'pulse-dot': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.35' },
        },
      },
      animation: {
        'pulse-dot': 'pulse-dot 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [animate],
} satisfies Config;
