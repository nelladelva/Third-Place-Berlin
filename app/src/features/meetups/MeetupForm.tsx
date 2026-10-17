import { useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Screen } from '../../ui/Screen';
import { createMeetup } from '../../data/meetups';
import { berlinToUtc, utcToBerlinParts } from '../../lib/time';
import { currentPosition, type LatLng } from '../../lib/geo';
import { PinMap } from './PinPicker';

export function MeetupForm() {
  const { t } = useTranslation();
  const { id: circleId = '' } = useParams();
  const navigate = useNavigate();
  const today = utcToBerlinParts(new Date().toISOString()).date;
  const [f, setF] = useState({ title: '', date: today, start: '18:00', end: '20:00', locationName: '', sign: '', bring: '', capacity: '', description: '' });
  const [pin, setPin] = useState<LatLng | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!pin) return setError(t('meetup.needPin'));
    const startsAt = berlinToUtc(f.date, f.start);
    let endsAt = berlinToUtc(f.date, f.end);
    if (endsAt <= startsAt) endsAt = new Date(new Date(endsAt).getTime() + 24 * 3600 * 1000).toISOString();
    if (new Date(endsAt).getTime() - new Date(startsAt).getTime() > 24 * 3600 * 1000) return setError(t('meetup.badTimes'));
    setBusy(true);
    try {
      const id = await createMeetup({
        circleId, title: f.title.trim(), description: f.description.trim(), startsAt, endsAt, locationName: f.locationName.trim(),
        lat: pin.lat, lng: pin.lng, sign: f.sign.trim(), bring: f.bring.trim(), capacity: f.capacity ? Number(f.capacity) : null,
      });
      navigate(`/meetups/${id}`, { replace: true });
    } catch {
      setError(t('common.error'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen title={t('meetup.newTitle')}>
      <form onSubmit={submit}>
        <label className="label" htmlFor="mf-title">{t('meetup.title')}</label>
        <input id="mf-title" className="input" required maxLength={100} value={f.title} onChange={set('title')} />
        <div className="row">
          <div style={{ flex: 2 }}><label className="label" htmlFor="mf-date">{t('meetup.date')}</label>
            <input id="mf-date" className="input" type="date" required value={f.date} onChange={set('date')} /></div>
          <div style={{ flex: 1 }}><label className="label" htmlFor="mf-start">{t('meetup.start')}</label>
            <input id="mf-start" className="input" type="time" required value={f.start} onChange={set('start')} /></div>
          <div style={{ flex: 1 }}><label className="label" htmlFor="mf-end">{t('meetup.end')}</label>
            <input id="mf-end" className="input" type="time" required value={f.end} onChange={set('end')} /></div>
        </div>
        <label className="label" htmlFor="mf-loc">{t('meetup.locationName')}</label>
        <input id="mf-loc" className="input" maxLength={120} value={f.locationName} onChange={set('locationName')} />
        <p className="muted">{t('meetup.pinHint')}</p>
        <PinMap pin={pin} sign={f.sign} onPick={setPin} />
        <button type="button" className="btn secondary block" onClick={() => void currentPosition().then(setPin).catch(() => setError(t('meetup.checkIn.no_location')))}>
          {t('meetup.useLocation')}
        </button>
        <label className="label" htmlFor="mf-sign">{t('meetup.sign')}</label>
        <input id="mf-sign" className="input" maxLength={120} placeholder={t('meetup.signPlaceholder')} value={f.sign} onChange={set('sign')} />
        <label className="label" htmlFor="mf-bring">{t('meetup.bring')}</label>
        <input id="mf-bring" className="input" maxLength={200} value={f.bring} onChange={set('bring')} />
        <label className="label" htmlFor="mf-cap">{t('meetup.capacity')}</label>
        <input id="mf-cap" className="input" type="number" min={1} value={f.capacity} onChange={set('capacity')} />
        <label className="label" htmlFor="mf-desc">{t('meetup.description')}</label>
        <textarea id="mf-desc" className="input" rows={3} maxLength={1000} value={f.description} onChange={set('description')} />
        {error && <p className="error" role="alert">{error}</p>}
        <button className="btn block" type="submit" disabled={busy || !f.title.trim()}>{t('meetup.create')}</button>
      </form>
    </Screen>
  );
}
