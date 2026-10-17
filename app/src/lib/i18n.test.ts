import en from '../locales/en.json';
import de from '../locales/de.json';

function keys(obj: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(obj)
    .flatMap(([k, v]) =>
      v && typeof v === 'object' ? keys(v as Record<string, unknown>, `${prefix}${k}.`) : [`${prefix}${k}`],
    )
    .sort();
}

test('en and de have identical key sets', () => {
  expect(keys(de)).toEqual(keys(en));
});
