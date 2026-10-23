import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Screen } from '../../ui/Screen';
import { Avatar } from '../../ui/Avatar';
import { cancelMeetup, cancelRsvp, checkIn, getMeetup, rsvp, updatePin, watchMeetup, type Meetup } from '../../data/meetups';
import { currentUserId } from '../../data/session';
import { formatMeetupTime } from '../../lib/time';
import { currentLanguage } from '../../lib/i18n';
import { currentPosition, directionsUrl, type LatLng } from '../../lib/geo';
import { PinMap } from './PinPicker';

/** The meetup chat is plugged in by the chat feature. */
export const meetupChatSlot: { render?: (m: Meetup) => ReactNode } = {};

export function MeetupScreen() {
  const { t } = useTranslation();
  const { id = '' } = useParams();
  const [m, setM] = useState<Meetup | null | undefined>(undefined);
  const [msg, setMsg] = useState<string | null>(null);
  const [me, setMe] = useState<string | null>(null);
  const [moving, setMoving] = useState<LatLng | null>(null);
  const [sign, setSign] = useState('');
  const load = useCallback(() => void getMeetup(id).then(setM), [id]);

  useEffect(() => {
    load();
    void currentUserId().then(setMe);
    return watchMeetup(id, load);
  }, [id, load]);

  if (m === undefined) return <Screen subtitle={t('common.loading')} />;
  if (m === null) return <Screen subtitle={t('circles.notFound')} />;
  const isHost = me === m.hostId;
  const spots = m.capacity ? m.capacity - m.goingCount : null;

  async function going() {
    const r = await rsvp(m!.id);
    if (r === 'full') setMsg(t('meetup.full'));
    load();
  }
  async function here() {
    try {
      const pos = await currentPosition();
      setMsg(t(`meetup.checkIn.${await checkIn(m!.id, pos.lat, pos.lng)}`));
    } catch {
      setMsg(t('meetup.checkIn.no_location'));
    }
  }

  return (
    <Screen>
      <Link to={`/circles/${m.circleId}`} className="muted">‹ {m.circleEmoji} {m.circleName}</Link>
      <h1 className="title">{m.title}</h1>
      <p className="muted">{formatMeetupTime(m.startsAt, m.endsAt, currentLanguage())} · {t('meetup.hostedBy', { name: m.hostName })}</p>
      {m.cancelled && <p className="notice">{t('meetup.cancelled')}</p>}
      {m.locationName && <p><strong>📍 {m.locationName}</strong></p>}
      <PinMap pin={moving ?? m} sign={moving ? sign : m.sign} onPick={moving ? setMoving : undefined} />
      {m.sign && !moving && <p>🟡 {m.sign}</p>}
      {isHost && (moving ? (
        <div>
          <input className="input" maxLength={120} value={sign} onChange={(e) => setSign(e.target.value)} placeholder={t('meetup.signPlaceholder')} />
          <button className="btn block" onClick={() => void updatePin(m.id, moving.lat, moving.lng, sign || null).then(() => { setMoving(null); load(); })}>
            {t('meetup.savePin')}
          </button>
        </div>
      ) : (
        <button className="btn ghost" onClick={() => { setMoving({ lat: m.lat, lng: m.lng }); setSign(m.sign ?? ''); }}>{t('meetup.movePin')}</button>
      ))}
      {!m.cancelled && (
        <div className="btnrow">
          {m.iAmGoing
            ? <button className="btn secondary" onClick={() => void cancelRsvp(m.id).then(load)}>{t('meetup.cancelGoing')}</button>
            : <button className="btn" disabled={spots === 0} onClick={() => void going()}>{spots === 0 ? t('meetup.full') : t('meetup.going')}</button>}
          <a className="btn secondary" href={directionsUrl(m.lat, m.lng)} target="_blank" rel="noopener">{t('meetup.directions')}</a>
          <button className="btn secondary" onClick={() => void here()}>{t('meetup.here')}</button>
        </div>
      )}
      {msg && <p className="notice" role="status">{msg}</p>}
      {m.bring && <p><strong>{t('meetup.bring')}:</strong> {m.bring}</p>}
      {m.description && <p style={{ whiteSpace: 'pre-wrap' }}>{m.description}</p>}
      <p className="muted">
        {t('meetup.goingCount', { count: m.goingCount })}{spots !== null && spots > 0 ? ` · ${t('meetup.spotsLeft', { count: spots })}` : ''}
      </p>
      <div className="row" style={{ flexWrap: 'wrap', gap: 4 }}>
        {m.attendees.map((a) => (
          <Link key={a.userId} to={`/people/${a.userId}`} title={a.displayName}><Avatar id={a.userId} name={a.displayName} url={a.avatarUrl} size={32} /></Link>
        ))}
      </div>
      {meetupChatSlot.render?.(m)}
      {isHost && !m.cancelled && (
        <button className="btn ghost block" onClick={() => void cancelMeetup(m.id).then(load)}>{t('meetup.cancel')}</button>
      )}
    </Screen>
  );
}
