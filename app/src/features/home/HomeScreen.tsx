import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Screen } from '../../ui/Screen';
import { listUpcoming, type MeetupCard } from '../../data/meetups';
import { isThisWeekend } from '../../lib/time';
import { currentPosition, distanceMeters, NEAR_ME_M, type LatLng } from '../../lib/geo';
import { MeetupCardView } from '../meetups/MeetupList';

type Filter = 'all' | 'weekend' | 'near';

export function HomeScreen({ now = new Date(), name }: { now?: Date; name?: string }) {
  const { t } = useTranslation();
  const [meetups, setMeetups] = useState<MeetupCard[] | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [here, setHere] = useState<LatLng | null>(null);
  const [locError, setLocError] = useState(false);

  useEffect(() => {
    listUpcoming().then(setMeetups).catch(() => setMeetups([]));
  }, []);

  async function choose(f: Filter) {
    setFilter(f);
    if (f === 'near' && !here) {
      try {
        setHere(await currentPosition());
        setLocError(false);
      } catch {
        setLocError(true);
      }
    }
  }

  const shown = useMemo(() => {
    const list = meetups ?? [];
    if (filter === 'weekend') return list.filter((m) => isThisWeekend(m.startsAt, now));
    if (filter === 'near') return here ? list.filter((m) => distanceMeters(here, m) <= NEAR_ME_M) : list;
    return list;
  }, [meetups, filter, here, now]);

  return (
    <Screen>
      <h1 className="title">{name ? t('home.hello', { name }) : t('common.appName')}</h1>
      {meetups && <p className="subtitle">{t('home.count', { count: meetups.length })}</p>}
      <div className="chips">
        {(['all', 'weekend', 'near'] as Filter[]).map((f) => (
          <button key={f} className={filter === f ? 'chip on' : 'chip'} onClick={() => void choose(f)}>
            {t(f === 'all' ? 'home.all' : f === 'weekend' ? 'home.weekend' : 'home.nearMe')}
          </button>
        ))}
      </div>
      {locError && filter === 'near' && <p className="notice">{t('home.locationDenied')}</p>}
      {meetups && meetups.length === 0 && (
        <div className="card">
          <p>{t('home.empty')}</p>
          <Link className="btn" to="/circles">{t('home.goToCircles')}</Link>
        </div>
      )}
      {shown.map((m) => <MeetupCardView key={m.id} m={m} />)}
    </Screen>
  );
}
