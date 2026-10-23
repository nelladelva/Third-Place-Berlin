import { manifest } from './pwa-manifest';

test('manifest has standalone display, start_url under /app/, theme #C1592A', () => {
  expect(manifest.display).toBe('standalone');
  expect(manifest.start_url).toBe('/Third-Place-Berlin/app/');
  expect(manifest.scope).toBe('/Third-Place-Berlin/app/');
  expect(manifest.theme_color).toBe('#C1592A');
  expect(manifest.background_color).toBe('#FBF7F0');
  expect(manifest.name).toBe('Third Place Berlin');
  expect(manifest.icons.map((i) => i.sizes)).toEqual(expect.arrayContaining(['192x192', '512x512']));
});

test('demo mode has its own base, name and scope', async () => {
  const { baseFor, manifestFor } = await import('./pwa-manifest');
  expect(baseFor('demo')).toBe('/Third-Place-Berlin/demo/');
  expect(baseFor('production')).toBe('/Third-Place-Berlin/app/');
  const d = manifestFor('demo');
  expect(d.name).toBe('Third Place Berlin Demo');
  expect(d.short_name).toBe('TPB Demo');
  expect(d.scope).toBe('/Third-Place-Berlin/demo/');
  expect(d.start_url).toBe('/Third-Place-Berlin/demo/');
  expect(manifestFor('production')).toEqual(manifest);
});
