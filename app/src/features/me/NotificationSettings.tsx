import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DEFAULT_PREFS, getAllPrefs, setPrefs, type Prefs } from '../../data/notifications';
import { myCircles, type MyCircle } from '../../data/profiles';
import { subscribeToPush, type PushResult } from '../../lib/push';

export function NotificationSettings() {
  const { t } = useTranslation();
  const [circles, setCircles] = useState<MyCircle[]>([]);
  const [prefs, setAll] = useState<Record<string, Prefs>>({});
  const [push, setPush] = useState<PushResult | null>(null);
  useEffect(() => {
    void Promise.all([myCircles(), getAllPrefs()]).then(([c, p]) => { setCircles(c); setAll(p); }).catch(() => undefined);
  }, []);

  function toggle(circleId: string, key: keyof Prefs) {
    const cur = prefs[circleId] ?? DEFAULT_PREFS;
    const next = { ...cur, [key]: !cur[key] };
    setAll({ ...prefs, [circleId]: next });
    void setPrefs(circleId, next);
  }

  const pushText: Record<PushResult, string> = {
    subscribed: t('notif.on'), denied: t('notif.denied'), unsupported: t('notif.unsupported'), needs_install: t('notif.needsInstall'),
  };
  return (
    <div>
      <button className="btn secondary block" onClick={() => void subscribeToPush().then(setPush)}>{t('notif.turnOn')}</button>
      {push && <p className="notice">{pushText[push]}</p>}
      <p className="muted">{t('notif.calm')}</p>
      {circles.map((c) => {
        const p = prefs[c.id] ?? DEFAULT_PREFS;
        return (
          <div className="card" key={c.id}>
            <strong>{c.emoji} {c.name}</strong>
            {(['meetupsPolls', 'mentions', 'everyMessage'] as (keyof Prefs)[]).map((k) => (
              <label className="switch-row" key={k}>
                <span>{t(`notif.${k}`)}</span>
                <input type="checkbox" role="switch" checked={p[k]} onChange={() => toggle(c.id, k)} />
              </label>
            ))}
          </div>
        );
      })}
    </div>
  );
}
