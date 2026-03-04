// tailwind.config.ts
// In Tailwind v4, configuration is primarily done in CSS (globals.css).
// This file exists for tooling compatibility.
// The forge custom theme is defined in src/styles/globals.css via CSS custom properties.

import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
} satisfies Config;
