import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Screen } from '../../ui/Screen';
import { Avatar } from '../../ui/Avatar';
import { listPeople } from '../../data/profiles';
import { filterPeople, type PeopleFilter, type PersonCard } from '../../lib/people';
import type { Profile } from '../../data/session';
import { WaitingList } from './WaitingList';

const DAY = 24 * 3600 * 1000;

export function PeopleScreen({ me }: { me: Profile }) {
  const { t } = useTranslation();
  const [people, setPeople] = useState<PersonCard[]>([]);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<PeopleFilter>('all');
  useEffect(() => {
    listPeople().then(setPeople).catch(() => setPeople([]));
  }, []);
  const now = useMemo(() => new Date(), []);
  const shown = filterPeople(people, q, filter, me, now);
  const filters: [PeopleFilter, string][] = [['all', t('people.all', { count: people.length })], ['new', t('people.new')],
    ['canTeachMe', t('people.canTeachMe')], ['sameField', t('people.sameField')]];
  return (
    <Screen title={t('people.title')}>
      <WaitingList />
      <input className="input" type="search" placeholder={t('people.search')} value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="chips">
        {filters.map(([f, label]) => <button key={f} className={filter === f ? 'chip on' : 'chip'} onClick={() => setFilter(f)}>{label}</button>)}
      </div>
      {shown.length === 0 && <p className="muted">{t('people.none')}</p>}
      {shown.map((p) => (
        <Link key={p.id} to={`/people/${p.id}`} className="card person-card">
          <Avatar id={p.id} name={p.displayName} url={p.avatarUrl} size={44} />
          <div>
            <strong>{p.displayName}</strong>
            {p.approvedAt && now.getTime() - new Date(p.approvedAt).getTime() <= 30 * DAY && <span className="muted"> · {t('people.newBadge')}</span>}
            <div className="muted">{[p.field, p.origin, p.languages.join('/')].filter(Boolean).join(' · ')}</div>
            <div>
              {p.teach.slice(0, 2).map((s) => <span key={`t${s}`} className="tag teach">{t('people.teaches', { skill: s })}</span>)}
              {p.learn.slice(0, 2).map((s) => <span key={`l${s}`} className="tag learn">{t('people.learning', { skill: s })}</span>)}
            </div>
          </div>
        </Link>
      ))}
    </Screen>
  );
}
