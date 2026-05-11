/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Fraunces', 'ui-serif', 'Georgia', 'serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        // Forest = Primary (Bestand bleibt kompatibel)
        forest: {
          50:  '#F5F7F1',
          100: '#E6ECD9',
          200: '#CFDBB6',
          300: '#B5C58A',
          500: '#6B8E23',
          700: '#4F6B1A',
          800: '#3D5520',
          900: '#2C3D0E',
        },
        // Copper = Akzent / Score-Color
        copper: {
          50:  '#FCF4ED',
          100: '#F5E3CF',
          300: '#E8B894',
          500: '#C97B4B',
          600: '#B36438',
          700: '#9A5530',
        },
        // Score-Zonen-Farben (semantisch konsistent in der ganzen App)
        zone: {
          x:      '#D4A547',  // X / 11 / Vital
          inner:  '#E8B894',  // 10 / Vital
          outer:  '#B5C58A',  // 8 / Wound
          body:   '#8C9988',  // 5
          miss:   '#5C5247',  // Fehl (warm-grau, nicht rot!)
        },
        // Papier / Hintergrund
        canvas: '#FAF8F3',
        sunken: '#F1EDE3',
        elevated: '#FFFFFF',
        // Dark-Mode-Pendants
        'canvas-dark': '#1F2418',
        'sunken-dark': '#252B1E',
        'elevated-dark': '#2D3325',
        // Legacy: archer-* aliased zu forest für Backwards-Compat
        archer: {
          50:  '#F5F7F1',
          100: '#E6ECD9',
          500: '#6B8E23',
          700: '#4F6B1A',
          900: '#2C3D0E',
        },
      },
      boxShadow: {
        'soft':    '0 2px 8px -2px rgba(60, 70, 40, 0.08), 0 1px 3px -1px rgba(60, 70, 40, 0.04)',
        'card':    '0 4px 16px -4px rgba(60, 70, 40, 0.10), 0 2px 4px -2px rgba(60, 70, 40, 0.05)',
        'lift':    '0 12px 32px -8px rgba(60, 70, 40, 0.15), 0 4px 8px -4px rgba(60, 70, 40, 0.08)',
        'copper':  '0 4px 16px -4px rgba(201, 123, 75, 0.30)',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      fontSize: {
        'display':  ['3.5rem',  { lineHeight: '1.05', letterSpacing: '-0.02em', fontWeight: '600' }],
        'score-xl': ['2.5rem',  { lineHeight: '1.1',  fontVariantNumeric: 'tabular-nums', fontWeight: '700' }],
        'score-md': ['1.75rem', { lineHeight: '1.15', fontVariantNumeric: 'tabular-nums', fontWeight: '700' }],
      },
      animation: {
        'pop':       'pop 250ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        'fade-in':   'fadeIn 200ms ease-out',
        'slide-up':  'slideUp 250ms ease-out',
        'count-up':  'countUp 400ms ease-out',
      },
      keyframes: {
        pop: {
          '0%':   { transform: 'scale(0.85)', opacity: '0.6' },
          '50%':  { transform: 'scale(1.08)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        fadeIn: {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%':   { transform: 'translateY(12px)', opacity: '0' },
          '100%': { transform: 'translateY(0)',    opacity: '1' },
        },
        countUp: {
          '0%':   { transform: 'translateY(-4px)', opacity: '0.4' },
          '100%': { transform: 'translateY(0)',    opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
