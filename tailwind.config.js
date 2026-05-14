/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans:    ['Inter', '-apple-system', 'BlinkMacSystemFont', '"SF Pro Display"', '"Avenir Next"', 'system-ui', 'sans-serif'],
        display: ['Inter', '-apple-system', 'BlinkMacSystemFont', '"SF Pro Display"', '"Avenir Next"', 'system-ui', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      letterSpacing: {
        tightest: '-0.022em',
        tighter:  '-0.016em',
        tight:    '-0.011em',
        normal:   '0em',
        wide:     '0.02em',
        wider:    '0.04em',
        widest:   '0.12em',
      },
      colors: {
        // ─── Semantische Tokens (CSS-Var-backed für Light/Dark) ────────────
        canvas:        'rgb(var(--bg-canvas) / <alpha-value>)',
        surface:       'rgb(var(--bg-surface) / <alpha-value>)',
        elevated:      'rgb(var(--bg-elevated) / <alpha-value>)',
        hairline:      'rgb(var(--border-hairline) / <alpha-value>)',
        ink: {
          DEFAULT:   'rgb(var(--text-primary) / <alpha-value>)',
          primary:   'rgb(var(--text-primary) / <alpha-value>)',
          secondary: 'rgb(var(--text-secondary) / <alpha-value>)',
          muted:     'rgb(var(--text-muted) / <alpha-value>)',
        },

        // ─── Accent: Cherry ───────────────────────────────────────────────
        cherry: {
          50:  '#F8E9EC',
          100: '#EDC9CF',
          200: '#D89DA6',
          300: '#B46A76',  // dusty rose
          400: '#A04A56',
          500: '#8E2C3A',  // muted cherry (primary)
          600: '#7A2532',
          700: '#641E28',  // dark cherry
          800: '#4D1620',
          900: '#350F17',
        },

        // ─── Secondary accents ────────────────────────────────────────────
        gold: {
          DEFAULT: '#C6A56B',
          soft:    '#D4B783',
          deep:    '#A88753',
        },
        sage: {
          DEFAULT: '#7A8B7A',
          soft:    '#A0AEA0',
          deep:    '#5F6F5F',
        },

        // ─── Dark-Mode-Surface-Specifika (statisch, falls direkter Bezug nötig) ─
        warm: {
          black:   '#111111',
          graphite:'#1C1C1E',
          charcoal:'#232326',
          slate:   '#2B2D31',
        },
        ivory:  '#F5F2EB',
        cream:  '#FAF8F4',

        // ─── Legacy-Aliase (zeigen jetzt auf neue Werte, damit alter Code lebt) ─
        // Forest-Skala -> Neutral/Sage (war Primärfarbe, jetzt Text/Sekundär)
        forest: {
          50:  '#F5F2EB', // ivory
          100: '#EAE6DC',
          200: '#D4CDC0',
          300: '#9CA59C', // muted neutral
          500: '#7A8B7A', // sage
          700: '#232326', // charcoal (war Haupttext)
          800: '#1C1C1E', // graphite
          900: '#111111', // warm black
        },
        archer: {
          50:  '#F5F2EB',
          100: '#EAE6DC',
          500: '#7A8B7A',
          700: '#232326',
          900: '#111111',
        },
        // Copper-Skala -> Cherry (war Akzent, bleibt Akzent)
        copper: {
          50:  '#F8E9EC',
          100: '#EDC9CF',
          300: '#B46A76',
          500: '#8E2C3A',
          600: '#7A2532',
          700: '#641E28',
        },
        // Zone-Farben (Bullseye-Pad) — bleiben semantisch, an Cherry/Gold angepasst
        zone: {
          x:      '#C6A56B', // Gold (X / Vital / 11)
          inner:  '#B46A76', // Dusty Rose (10 / Vital)
          outer:  '#8E2C3A', // Cherry (8 / Wound)
          body:   '#7A8B7A', // Sage (5)
          miss:   '#5C5247', // Warmgrau (Fehl, nicht rot)
        },
        // Canvas/sunken/elevated-Aliase — auf CSS-Vars umgebogen
        // (kommen aus dem semantischen Block oben — Tailwind erlaubt nur ein "elevated")
        'canvas-dark':   '#111111',
        'sunken':        'rgb(var(--bg-surface) / <alpha-value>)',
        'sunken-dark':   '#1C1C1E',
        'elevated-dark': '#232326',
      },
      boxShadow: {
        // Minimal & elegant. Tiefe primär via Kontrast/Surface, nicht Schatten.
        soft:    '0 1px 2px -1px rgba(0,0,0,0.04), 0 1px 3px 0 rgba(0,0,0,0.03)',
        card:    '0 2px 8px -2px rgba(0,0,0,0.05), 0 1px 2px -1px rgba(0,0,0,0.03)',
        lift:    '0 8px 24px -8px rgba(0,0,0,0.10), 0 2px 6px -2px rgba(0,0,0,0.06)',
        glass:   '0 1px 0 0 rgba(255,255,255,0.04) inset, 0 -1px 0 0 rgba(0,0,0,0.04) inset',
        cherry:  '0 6px 20px -8px rgba(142,44,58,0.35)',
      },
      borderRadius: {
        none: '0',
        sm:   '6px',
        DEFAULT: '8px',
        md:   '10px',
        lg:   '14px',
        xl:   '18px',
        '2xl':'24px',
        '3xl':'32px',
        '4xl':'40px',
        full: '9999px',
      },
      fontSize: {
        'display':  ['2.75rem', { lineHeight: '1.08', letterSpacing: '-0.022em', fontWeight: '600' }],
        'h1':       ['2rem',    { lineHeight: '1.12', letterSpacing: '-0.016em', fontWeight: '600' }],
        'h2':       ['1.5rem',  { lineHeight: '1.2',  letterSpacing: '-0.011em', fontWeight: '600' }],
        'h3':       ['1.25rem', { lineHeight: '1.3',  letterSpacing: '-0.011em', fontWeight: '600' }],
        'eyebrow':  ['0.6875rem', { lineHeight: '1', letterSpacing: '0.12em', fontWeight: '600' }],
        'score-xl': ['2.5rem',  { lineHeight: '1.05', fontVariantNumeric: 'tabular-nums', fontWeight: '600', letterSpacing: '-0.02em' }],
        'score-md': ['1.5rem',  { lineHeight: '1.1',  fontVariantNumeric: 'tabular-nums', fontWeight: '600', letterSpacing: '-0.01em' }],
      },
      backdropBlur: {
        xs: '4px',
      },
      animation: {
        'fade-in':  'fadeIn 200ms cubic-bezier(0.2, 0, 0, 1)',
        'slide-up': 'slideUp 240ms cubic-bezier(0.2, 0, 0, 1)',
        'count-up': 'countUp 320ms cubic-bezier(0.2, 0, 0, 1)',
        'pop':      'pop 200ms cubic-bezier(0.2, 0, 0, 1)',
      },
      keyframes: {
        fadeIn:  { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { transform: 'translateY(8px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
        countUp: { '0%': { transform: 'translateY(-2px)', opacity: '0.5' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
        pop:     { '0%': { transform: 'scale(0.96)', opacity: '0.6' }, '100%': { transform: 'scale(1)', opacity: '1' } },
      },
      transitionTimingFunction: {
        'out-quint': 'cubic-bezier(0.22, 1, 0.36, 1)',
        'in-out-quart': 'cubic-bezier(0.76, 0, 0.24, 1)',
      },
    },
  },
  plugins: [],
};
