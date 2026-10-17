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
