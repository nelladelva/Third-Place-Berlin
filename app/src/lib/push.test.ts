import { vi } from 'vitest';
import { subscribeToPush } from './push';

vi.mock('./supabase', () => ({ supabase: { from: vi.fn(), auth: { getSession: vi.fn() } } }));

test('iPhone not installed to home screen needs install first', async () => {
  Object.defineProperty(navigator, 'userAgent', { configurable: true, value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)' });
  Object.defineProperty(navigator, 'standalone', { configurable: true, value: false });
  expect(await subscribeToPush()).toBe('needs_install');
});

test('browsers without push support are unsupported', async () => {
  Object.defineProperty(navigator, 'userAgent', { configurable: true, value: 'Mozilla/5.0 (X11; Linux x86_64)' });
  expect(await subscribeToPush()).toBe('unsupported');
});
