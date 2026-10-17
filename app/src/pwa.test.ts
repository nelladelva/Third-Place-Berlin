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
