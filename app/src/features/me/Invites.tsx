import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { createInvite, listMyInvites, type MyInvite } from '../../data/invites';

export async function shareInvite(url: string, text: string): Promise<'shared' | 'copied'> {
  const message = `${text} ${url}`;
  if (navigator.share) {
    await navigator.share({ title: 'Third Place Berlin', text: message });
    return 'shared';
  }
  await navigator.clipboard.writeText(message);
  return 'copied';
}

export function Invites() {
  const { t } = useTranslation();
  const [mine, setMine] = useState<MyInvite[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const load = () => void listMyInvites().then(setMine).catch(() => setMine([]));
  useEffect(load, []);

  async function create() {
    setNote(null);
    try {
      const { url } = await createInvite();
      if ((await shareInvite(url, t('invites.shareText'))) === 'copied') setNote(t('invites.copied'));
    } catch (e) {
      if ((e as Error).name !== 'AbortError') setNote(t('common.error'));
    }
    load();
  }

  return (
    <div className="card">
      <div className="label" style={{ marginTop: 0 }}>{t('invites.title')}</div>
      <p className="muted">{t('invites.intro')}</p>
      <button className="btn block" onClick={() => void create()}>{t('invites.create')}</button>
      {note && <p className="notice">{note}</p>}
      {mine.length > 0 && (
        <>
          <div className="label">{t('invites.mine')}</div>
          {mine.map((i) => (
            <div key={i.code} className="row person">
              <code>{i.code}</code><span className="spacer" />
              <span className="muted">
                {i.used ? t('invites.used') : new Date(i.expiresAt) < new Date() ? t('invites.expired') : t('invites.open', { date: i.expiresAt.slice(0, 10) })}
              </span>
              {!i.used && new Date(i.expiresAt) > new Date() && (
                <button className="btn ghost" onClick={() => void shareInvite(i.url, t('invites.shareText')).then((r) => r === 'copied' && setNote(t('invites.copied')))}>↗</button>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  );
}
