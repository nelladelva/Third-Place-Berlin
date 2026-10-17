import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { formatMeetupTime } from '../../lib/time';
import { currentLanguage } from '../../lib/i18n';
import type { MeetupCard } from '../../data/meetups';

export function MeetupCardView({ m }: { m: MeetupCard }) {
  const { t } = useTranslation();
  return (
    <Link to={`/meetups/${m.id}`} className="card meetup-card">
      <div className="mc-circle" style={{ color: m.circleColor ?? 'var(--teal)' }}>{m.circleEmoji} {m.circleName}</div>
      <div className="mc-title">{m.title}</div>
      <div className="muted">{formatMeetupTime(m.startsAt, m.endsAt, currentLanguage())}{m.locationName ? ` · ${m.locationName}` : ''}</div>
      <div className="row" style={{ marginTop: 6 }}>
        <span className="muted">{t('meetup.goingCount', { count: m.goingCount })}</span>
        <span className="spacer" />
        {m.iAmGoing && <span className="tag teach">{t('meetup.going')} ✓</span>}
      </div>
    </Link>
  );
}
