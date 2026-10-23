import { join } from 'node:path';
import { demoAliases } from './aliases';

const dataModules = Object.keys(import.meta.glob('/src/data/*.ts')).filter((p) => !p.endsWith('.test.ts'));

test('every data module, the Supabase client and the slot are aliased into src/demo', () => {
  const a = demoAliases('/x', join(process.cwd(), 'src', 'data'));
  for (const p of dataModules) expect(a[`/x${p}`]).toBe(`/x${p.replace('/src/data/', '/src/demo/data/')}`);
  expect(a['/x/src/lib/supabase.ts']).toBe('/x/src/demo/no-supabase.ts');
  expect(a['/x/src/demo/slot.tsx']).toBe('/x/src/demo/slot.demo.tsx');
  expect(Object.keys(a)).toHaveLength(dataModules.length + 2);
});
