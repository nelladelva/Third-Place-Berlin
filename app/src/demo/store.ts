// The demo's state lives in this browser (localStorage). Old, corrupt or unreadable state falls back to the seed,
// and a storage that throws (private mode, quota) still works in memory for the visit.
import { seed } from './seed';
import { todayDate } from './time';
import type { DemoState } from './types';

export const STORE_KEY = 'tpb-demo:state';
export const STORE_VERSION = 1;

let cache: DemoState | null = null;
const listeners = new Set<() => void>();

function load(): DemoState {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const s = JSON.parse(raw) as DemoState;
      if (s && s.version === STORE_VERSION && Array.isArray(s.circles) && s.me?.id === 'demo-you') return s;
    }
  } catch {
    /* unreadable or corrupt: start fresh */
  }
  return seed(todayDate());
}

function save(s: DemoState): void {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(s));
  } catch {
    /* storage unavailable: keep working in memory */
  }
}

function notify(): void {
  for (const cb of [...listeners]) cb();
}

export function getState(): DemoState {
  if (!cache) {
    cache = load();
    save(cache);
  }
  return cache;
}

export function update(fn: (s: DemoState) => void): void {
  const s = getState();
  fn(s);
  save(s);
  notify();
}

export function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => void listeners.delete(cb);
}

export function resetDemo(): void {
  cache = seed(todayDate());
  save(cache);
  notify();
}

let counter = 0;
export function newId(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now().toString(36)}${counter.toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

/** Tests only: drop the in-memory copy and load again from storage. */
export function reloadForTest(): DemoState {
  cache = null;
  return getState();
}
