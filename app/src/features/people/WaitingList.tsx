import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Avatar } from '../../ui/Avatar';
import { listPending, vouch, type PendingCard } from '../../data/profiles';

export function WaitingList() {
  const { t } = useTranslation();
  const [pending, setPending] = useState<PendingCard[]>([]);
  const load = useCallback(() => void listPending().then(setPending).catch(() => setPending([])), []);
  useEffect(load, [load]);
  if (pending.length === 0) return null;
  return (
    <div className="card">
      <div className="label" style={{ marginTop: 0 }}>{t('people.waitingTitle', { count: pending.length })}</div>
      <p className="muted">{t('people.waitingIntro')}</p>
      {pending.map((p) => (
        <div className="person" key={p.id}>
          <Avatar id={p.id} name={p.displayName} size={36} />
          <div style={{ flex: 1 }}>
            <strong>{p.displayName}</strong>
            <div className="muted">
              {[p.field, p.invitedByName && t('people.invitedBy', { name: p.invitedByName }), t('people.vouchCount', { vouches: p.vouches, required: p.required })]
                .filter(Boolean).join(' · ')}
            </div>
          </div>
          {p.iVouched ? <span className="muted">{t('people.vouched')}</span>
                      : <button className="btn" onClick={() => void vouch(p.id).then(load)}>{t('people.vouch')}</button>}
        </div>
      ))}
    </div>
  );
}
