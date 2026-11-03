import en from '../locales/en.json';
import de from '../locales/de.json';
import fr from '../locales/fr.json';
import { toLang } from './i18n';

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

test('en and fr have identical key sets', () => {
  expect(keys(fr)).toEqual(keys(en));
});

test('toLang maps browser tags to supported languages', () => {
  expect(toLang('fr-CA')).toBe('fr');
  expect(toLang('de-AT')).toBe('de');
  expect(toLang('en-US')).toBe('en');
  expect(toLang('es')).toBeUndefined();
  expect(toLang(null)).toBeUndefined();
});
