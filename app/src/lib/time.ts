export const TZ = 'Europe/Berlin';

type Lang = 'en' | 'de';
const locale = (lang: Lang) => (lang === 'de' ? 'de-DE' : 'en-GB');

/** Wall-clock parts of an instant in Berlin. */
export function utcToBerlinParts(iso: string): { date: string; time: string } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
      .formatToParts(new Date(iso)).map((p) => [p.type, p.value]),
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

/** Berlin wall-clock date ('YYYY-MM-DD') + time ('HH:mm') → UTC ISO string, DST-aware. */
export function berlinToUtc(date: string, time: string): string {
  const [y, mo, d] = date.split('-').map(Number);
  const [h, mi] = time.split(':').map(Number);
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  const offsetAt = (ms: number) => {
    const p = utcToBerlinParts(new Date(ms).toISOString());
    const [py, pmo, pd] = p.date.split('-').map(Number);
    const [ph, pmi] = p.time.split(':').map(Number);
    return Date.UTC(py, pmo - 1, pd, ph, pmi) - ms;
  };
  let ms = guess - offsetAt(guess);
  ms = guess - offsetAt(ms);
  return new Date(ms).toISOString();
}

export function formatMeetupTime(startIso: string, endIso: string, lang: Lang): string {
  const day = new Intl.DateTimeFormat(locale(lang), { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short' });
  const hm = new Intl.DateTimeFormat(locale(lang), { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  const sameDay = utcToBerlinParts(startIso).date === utcToBerlinParts(endIso).date;
  const start = `${day.format(new Date(startIso))} · ${hm.format(new Date(startIso))}`;
  return sameDay ? `${start}–${hm.format(new Date(endIso))}` : `${start} – ${day.format(new Date(endIso))} · ${hm.format(new Date(endIso))}`;
}

const DOW: Record<string, number> = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };

function addDays(date: string, n: number): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** True when the instant falls between Friday 17:00 and Sunday 23:59 (Berlin) of the current week. */
export function isThisWeekend(iso: string, now: Date): boolean {
  const today = utcToBerlinParts(now.toISOString()).date;
  const dow = DOW[new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'short' }).format(now)];
  const friday = addDays(today, 5 - dow);
  const monday = addDays(friday, 3);
  const p = utcToBerlinParts(iso);
  const at = `${p.date} ${p.time}`;
  return at >= `${friday} 17:00` && at < `${monday} 00:00`;
}
