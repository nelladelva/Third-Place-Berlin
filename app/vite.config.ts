
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export const BASE = '/Third-Place-Berlin/app/';

export default defineConfig({
  base: BASE,
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'supabase/functions/_shared/**/*.test.ts'],
  },
});
