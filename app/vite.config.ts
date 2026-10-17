import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { BASE, manifest } from './src/pwa-manifest';

export default defineConfig({
  base: BASE,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png', 'push-sw.js'],
      manifest,
      workbox: {
        // app shell only; Supabase API responses are never cached
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
        navigateFallback: `${BASE}index.html`,
        importScripts: ['push-sw.js'],
        runtimeCaching: [],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.test.{ts,tsx}', 'supabase/functions/_shared/**/*.test.ts'],
  },
});
