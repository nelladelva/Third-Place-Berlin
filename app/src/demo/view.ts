// Shared read helpers for the demo data twins: the store with sample times shifted to today, and React hooks
// that re-render when the store changes.
import { useEffect, useState } from 'react';
import { getState, subscribe } from './store';
import { shiftedIso } from './time';
import type { DemoState } from './types';

export const state = (): DemoState => getState();
export const ME = 'demo-you';

/** A row's time as the screens should see it: sample rows move forward with today. */
export const when = (iso: string, sample: boolean): string => shiftedIso(iso, sample, getState().startedAt);

export const profileOf = (id: string) => getState().profiles.find((p) => p.id === id);
export const nameOf = (id: string) => profileOf(id)?.displayName ?? '…';
export const blockedByMe = (): Set<string> => new Set(getState().blocks.filter((b) => b.blockerId === ME).map((b) => b.blockedId));
export const isMemberOf = (circleId: string, userId = ME) =>
  getState().circleMembers.some((m) => m.circleId === circleId && m.userId === userId);

/** Re-run `read` whenever the demo store changes. */
export function useStore<T>(read: () => T): T {
  const [value, setValue] = useState<T>(read);
  useEffect(() => {
    setValue(read());
    return subscribe(() => setValue(read()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return value;
}
