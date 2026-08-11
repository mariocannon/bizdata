/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: { '2xl': '1400px' },
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },

        // Semantic states. `DEFAULT` is the text/icon tone, `soft` the tint it
        // sits on and `border` the outline between them — every pairing is
        // contrast-checked in docs/BRANDING.md §6.
        success: {
          DEFAULT: 'hsl(var(--success))',
          soft: 'hsl(var(--success-soft))',
          border: 'hsl(var(--success-border))',
        },
        attention: {
          DEFAULT: 'hsl(var(--attention))',
          soft: 'hsl(var(--attention-soft))',
          border: 'hsl(var(--attention-border))',
        },
        danger: {
          DEFAULT: 'hsl(var(--danger))',
          soft: 'hsl(var(--danger-soft))',
          border: 'hsl(var(--danger-border))',
        },
        progress: {
          DEFAULT: 'hsl(var(--progress))',
          soft: 'hsl(var(--progress-soft))',
          border: 'hsl(var(--progress-border))',
        },
        neutral: {
          DEFAULT: 'hsl(var(--neutral))',
          soft: 'hsl(var(--neutral-soft))',
          border: 'hsl(var(--neutral-border))',
        },
        // The Tide palette, verbatim from docs/BRANDING.md. These are the only
        // brand colours — reach for a named one before any Tailwind default.
        foam: '#faf5ea',
        sand: '#f0e7d6',
        paper: '#fffdf8',
        harbor: '#23313c',
        driftwood: '#8a8272',
        mist: '#9aa4ac',
        navy: '#23415a',
        seaglass: '#a2c5d3',
        steel: '#45758c',
        coral: '#b3372c',
        kelp: '#1e7a4d',

        // The coastal ramp, for tints and shades of the brand blues. The three
        // anchors are brand colours: 300 Sea Glass, 600 Steel Blue, 800 Deep
        // Navy; 900 is Deep Harbor. Everything between is interpolated.
        tide: {
          50: '#f4f9fb',
          100: '#e4eff4',
          200: '#c9dfe8',
          300: '#a2c5d3',
          400: '#7ba7ba',
          500: '#5b8ba2',
          600: '#45758c',
          700: '#345a70',
          800: '#23415a',
          900: '#23313c',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
