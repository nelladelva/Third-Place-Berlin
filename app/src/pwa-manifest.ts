export const BASE = '/Third-Place-Berlin/app/';

export const manifest = {
  name: 'Third Place Berlin',
  short_name: 'Third Place',
  description: 'Not home. Not work. Somewhere in between. Circles, meetups and people for a life in Berlin.',
  start_url: BASE,
  scope: BASE,
  display: 'standalone' as const,
  background_color: '#FBF7F0',
  theme_color: '#C1592A',
  lang: 'en',
  icons: [
    { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
    { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
};

const DEMO_BASE = '/Third-Place-Berlin/demo/';

export function baseFor(mode: string): string {
  return mode === 'demo' ? DEMO_BASE : BASE;
}

/** The demo is its own installable app (own name, id and scope), so it never collides with the real one on a phone. */
export function manifestFor(mode: string) {
  if (mode !== 'demo') return manifest;
  return { ...manifest, name: 'Third Place Berlin Demo', short_name: 'TPB Demo', id: DEMO_BASE, start_url: DEMO_BASE, scope: DEMO_BASE };
}
