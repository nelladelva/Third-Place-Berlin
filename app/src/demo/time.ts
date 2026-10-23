// Sample content moves forward with today, so the demo never looks out of date. User-created rows keep their time.
const DAY = 24 * 60 * 60 * 1000;

export function daysSince(startedAt: string, now: Date): number {
  return Math.max(0, Math.floor((now.getTime() - Date.parse(`${startedAt}T00:00:00Z`)) / DAY));
}

export function shiftedIso(iso: string, sample: boolean, startedAt: string, now: Date = new Date()): string {
  if (!sample) return iso;
  return new Date(Date.parse(iso) + daysSince(startedAt, now) * DAY).toISOString();
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function todayDate(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}
