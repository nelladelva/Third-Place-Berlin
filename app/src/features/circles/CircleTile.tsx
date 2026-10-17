import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { joinCircle, requestJoin, type CircleCard } from '../../data/circles';

/** A coloured circle card with its membership action. Used in the Circles tab and in the welcome flow. */
export function CircleTile({ circle, onChange, link = true }: { circle: CircleCard; onChange: () => void; link?: boolean }) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const act = async (fn: (id: string) => Promise<void>) => {
    setBusy(true);
    try {
      await fn(circle.id);
    } finally {
      setBusy(false);
      onChange();
    }
  };
  const title = (
    <>
      <div className="cc-name">{circle.emoji} {circle.name}</div>
      {circle.description && <div className="cc-desc">{circle.description}</div>}
    </>
  );
  return (
    <div className="cc" style={{ background: circle.color ?? 'var(--teal)' }} data-testid={`circle-${circle.id}`}>
      {link ? <Link to={`/circles/${circle.id}`} className="cc-link">{title}</Link> : title}
      <div className="cc-foot">
        <span className="cc-badge">
          {circle.visibility === 'open' ? t('circles.open') : t('circles.closed')} · {t('circles.members', { count: circle.memberCount })}
        </span>
        {circle.isMember ? (
          <span className="cc-badge">{t('circles.joined')}</span>
        ) : circle.myRequestStatus === 'pending' ? (
          <span className="cc-badge">{t('circles.waitingApproval')}</span>
        ) : circle.visibility === 'open' ? (
          <button className="cc-btn" disabled={busy} onClick={() => void act(joinCircle)}>{t('circles.join')}</button>
        ) : (
          <button className="cc-btn" disabled={busy} onClick={() => void act(requestJoin)}>{t('circles.requestJoin')}</button>
        )}
      </div>
    </div>
  );
}
