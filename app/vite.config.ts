import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { baseFor, manifestFor } from './src/pwa-manifest';
import { demoAliases } from './src/demo/aliases';

export default defineConfig(({ mode }) => ({
  base: baseFor(mode),
  resolve: { alias: mode === 'demo' ? demoAliases(__dirname) : {} },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png', 'push-sw.js'],
      manifest: manifestFor(mode),
      workbox: {
        // app shell only; Supabase API responses are never cached
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
        navigateFallback: `${baseFor(mode)}index.html`,
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
}));
