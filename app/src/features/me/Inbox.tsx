import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { listNotifications, markAllRead, type Notification } from '../../data/notifications';
import { buildPushPayload } from '../../../supabase/functions/_shared/payload';
import { currentLanguage } from '../../lib/i18n';

export function Inbox() {
  const { t } = useTranslation();
  const [items, setItems] = useState<Notification[]>([]);
  useEffect(() => {
    listNotifications().then(setItems).catch(() => setItems([]));
  }, []);
  const unread = items.filter((n) => !n.read).length;
  return (
    <div className="card">
      <div className="row">
        <div className="label" style={{ marginTop: 0 }}>{t('notif.inbox')}{unread ? ` (${unread})` : ''}</div>
        <span className="spacer" />
        {unread > 0 && <button className="btn ghost" onClick={() => void markAllRead().then(() => setItems(items.map((n) => ({ ...n, read: true }))))}>{t('notif.markRead')}</button>}
      </div>
      {items.length === 0 && <p className="muted">{t('notif.empty')}</p>}
      {items.slice(0, 8).map((n) => {
        const p = buildPushPayload(n.kind, n.data, currentLanguage());
        return (
          <a key={n.id} href={p.url} className={`inbox-item${n.read ? '' : ' unread'}`}>
            <strong>{p.title}</strong>
            {p.body && <div className="muted">{p.body}</div>}
          </a>
        );
      })}
    </div>
  );
}
