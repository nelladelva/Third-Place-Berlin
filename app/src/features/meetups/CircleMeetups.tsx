import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { listUpcoming, type MeetupCard } from '../../data/meetups';
import type { CircleCard } from '../../data/circles';
import { MeetupCardView } from './MeetupList';

export function CircleMeetups({ circle }: { circle: CircleCard }) {
  const { t } = useTranslation();
  const [list, setList] = useState<MeetupCard[]>([]);
  useEffect(() => {
    listUpcoming(circle.id).then(setList).catch(() => setList([]));
  }, [circle.id]);
  return (
    <>
      <Link className="btn block" to={`/circles/${circle.id}/meetups/new`} style={{ marginBottom: 10 }}>{t('meetup.new')}</Link>
      {list.length === 0 && <p className="muted">{t('meetup.none')}</p>}
      {list.map((m) => <MeetupCardView key={m.id} m={m} />)}
    </>
  );
}
