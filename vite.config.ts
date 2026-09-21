import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// GitHub Pages: https://sakanayuki.github.io/cc_toushidensha/
export default defineConfig({
  base: '/cc_toushidensha/',
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
