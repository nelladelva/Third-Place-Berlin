import type { Profile } from '../data/session';

export type PersonCard = {
  id: string; displayName: string; field: string | null; origin: string | null; languages: string[];
  teach: string[]; learn: string[]; avatarUrl: string | null; approvedAt: string | null; bio: string | null;
};
export type PeopleFilter = 'all' | 'new' | 'canTeachMe' | 'sameField';

export function normalize(s: string): string {
  return s.normalize('NFKD').replace(/ß/g, 'ss').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

export function canTeachMe(myLearn: string[], theirTeach: string[]): boolean {
  const want = new Set(myLearn.map(normalize).filter(Boolean));
  return theirTeach.some((x) => want.has(normalize(x)));
}

const DAY = 24 * 3600 * 1000;

export function filterPeople(people: PersonCard[], q: string, filter: PeopleFilter, me: Profile, now: Date): PersonCard[] {
  const query = normalize(q);
  return people.filter((p) => {
    if (query) {
      const hay = [p.displayName, p.field ?? '', p.origin ?? '', p.bio ?? '', ...p.languages, ...p.teach, ...p.learn].map(normalize).join(' | ');
      if (!hay.includes(query)) return false;
    }
    if (filter === 'new') return !!p.approvedAt && now.getTime() - new Date(p.approvedAt).getTime() <= 30 * DAY;
    if (filter === 'canTeachMe') return canTeachMe(me.learn, p.teach);
    if (filter === 'sameField') return !!me.field && !!p.field && normalize(p.field).includes(normalize(me.field).split(' ')[0]);
    return true;
  });
}
