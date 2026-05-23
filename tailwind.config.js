/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Distinct Services design tokens
        primary:    '#73F3A4',
        secondary:  '#79BD89',
        'black-1':  '#0F0F0F',
        'black-2':  '#1E1E1E',
        'black-deep': '#080808',
        'white-1':  '#FAFAFA',
        surface:    '#2A2A2A',
        'green-glow': 'rgba(115,243,164,0.08)',
        'glass-border': 'rgba(115,243,164,0.15)',
        'glass-border-strong': 'rgba(115,243,164,0.30)',
        muted:      'rgba(250,250,250,0.55)',
        'muted-light': 'rgba(250,250,250,0.35)',
        divider:    'rgba(250,250,250,0.08)',
        'muted-surface': 'rgba(250,250,250,0.04)',
        'log-ok':   '#73F3A4',
        'log-wait': '#F3C173',
        'warn':     '#F3C173',
        'error-text': '#FF8B85',
      },
      fontFamily: {
        display: ['"Montserrat Alternates"', 'Montserrat', 'system-ui', 'sans-serif'],
        body:    ['Inter', 'system-ui', 'sans-serif'],
        mono:    ['"JetBrains Mono"', 'ui-monospace', 'SF Mono', 'Menlo', 'monospace'],
      },
      borderRadius: {
        sm:   '6px',
        md:   '10px',
        lg:   '16px',
        xl:   '24px',
        full: '100px',
      },
      boxShadow: {
        glow:     '0 0 32px rgba(115,243,164,0.35)',
        'glow-strong': '0 0 48px rgba(115,243,164,0.55)',
        elev:     '0 16px 56px rgba(0,0,0,0.45)',
        card:     '0 8px 32px rgba(0,0,0,0.35)',
      },
      animation: {
        'pulse-dot': 'pulse-dot 2.4s ease-in-out infinite',
        'fade-in':   'fade-in 0.3s ease-out',
        'slide-up':  'slide-up 0.3s ease-out',
      },
      keyframes: {
        'pulse-dot': {
          '0%,100%': { opacity: '1' },
          '50%':     { opacity: '0.4' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
}
