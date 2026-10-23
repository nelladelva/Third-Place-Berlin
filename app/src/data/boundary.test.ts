// Every Supabase call goes through src/data/ so the demo build can swap that one layer.
const files = import.meta.glob('/src/**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

test('only src/data and lib/supabase talk to Supabase', () => {
  const offenders = Object.entries(files)
    .filter(([path]) => !/\.test\.tsx?$/.test(path) && !path.startsWith('/src/data/') && !path.startsWith('/src/demo/') && path !== '/src/lib/supabase.ts')
    .filter(([, src]) => /lib\/supabase|@supabase\/|from '\.\/supabase'/.test(src))
    .map(([path]) => path);
  expect(offenders).toEqual([]);
});
