import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Screen } from '../../ui/Screen';
import { listCircles, type CircleCard } from '../../data/circles';
import { CircleTile } from './CircleTile';

export function CircleGrid({ link = true }: { link?: boolean }) {
  const [circles, setCircles] = useState<CircleCard[] | null>(null);
  const load = useCallback(() => void listCircles().then(setCircles), []);
  useEffect(load, [load]);
  if (!circles) return null;
  return (
    <div className="cc-grid">
      {circles.map((c) => <CircleTile key={c.id} circle={c} onChange={load} link={link} />)}
    </div>
  );
}

export function CirclesScreen() {
  const { t } = useTranslation();
  return (
    <Screen title={t('circles.title')} subtitle={t('circles.intro')}>
      <p className="muted">{t('circles.legend')}</p>
      <CircleGrid />
      <Link to="/circles/propose" className="card" style={{ display: 'block', textDecoration: 'none', color: 'inherit', marginTop: 12 }}>
        <strong>{t('circles.proposeTitle')}</strong>
        <div className="muted">{t('circles.proposeBody')}</div>
      </Link>
    </Screen>
  );
}
