import { getState, reloadForTest, resetDemo, STORE_KEY, subscribe, update } from './store';

beforeEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
  reloadForTest();
});

test('saves and reloads', () => {
  update((s) => { s.me.viewAs = 'member'; });
  expect(JSON.parse(localStorage.getItem(STORE_KEY)!).me.viewAs).toBe('member');
  expect(reloadForTest().me.viewAs).toBe('member');
});

test('version mismatch resets to seed', () => {
  localStorage.setItem(STORE_KEY, JSON.stringify({ version: 0 }));
  expect(reloadForTest().circles).toHaveLength(8);
});

test('corrupt JSON resets to seed', () => {
  localStorage.setItem(STORE_KEY, '{oops');
  expect(reloadForTest().circles).toHaveLength(8);
});

test('throwing storage still works in memory', () => {
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied'); });
  expect(() => update((s) => { s.me.viewAs = 'member'; })).not.toThrow();
  expect(getState().me.viewAs).toBe('member');
});

test('subscribers are told about changes', () => {
  const cb = vi.fn();
  const off = subscribe(cb);
  update(() => {});
  expect(cb).toHaveBeenCalled();
  off();
});

test('reset restores the seed', () => {
  update((s) => { s.circles = []; });
  resetDemo();
  expect(getState().circles).toHaveLength(8);
});

test('a change saved in another tab is picked up here (no silent overwrite)', () => {
  const cb = vi.fn();
  const off = subscribe(cb);
  const other = JSON.parse(JSON.stringify(getState()));
  other.me.viewAs = 'member';
  localStorage.setItem(STORE_KEY, JSON.stringify(other));
  window.dispatchEvent(new StorageEvent('storage', { key: STORE_KEY, newValue: JSON.stringify(other) }));
  expect(getState().me.viewAs).toBe('member');
  expect(cb).toHaveBeenCalled();
  off();
});
