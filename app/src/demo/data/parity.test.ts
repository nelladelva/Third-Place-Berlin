// Every demo twin exports exactly the same runtime names as the real data module it replaces in the demo build.
const real = import.meta.glob(['/src/data/*.ts', '!/src/data/*.test.ts'], { eager: true }) as Record<string, Record<string, unknown>>;
const twins = import.meta.glob(['/src/demo/data/*.ts', '!/src/demo/data/*.test.ts'], { eager: true }) as Record<string, Record<string, unknown>>;

test.each(Object.keys(real).map((p) => p.replace('/src/data/', '')))('%s: same exports as the real module', (file) => {
  const twin = twins[`/src/demo/data/${file}`];
  expect(twin, `missing twin src/demo/data/${file}`).toBeDefined();
  expect(Object.keys(twin).sort()).toEqual(Object.keys(real[`/src/data/${file}`]).sort());
});
