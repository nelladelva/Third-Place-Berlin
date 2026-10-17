import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Screen } from '../../ui/Screen';
import { Avatar } from '../../ui/Avatar';
import { currentLanguage, setLanguage, type Lang } from '../../lib/i18n';
import { signOut, type Profile } from '../../data/session';
import { deleteAccount, exportMyData, saveLocale, uploadAvatar } from '../../data/me';
import { listBlocked, myCircles, unblock, type MyCircle } from '../../data/profiles';
import { Invites } from './Invites';

/** Extra sections (notifications, admin) are plugged in by later features. */
export const meSections: { notifications?: () => ReactNode; admin?: () => ReactNode; inbox?: () => ReactNode } = {};

export function MeScreen({ profile, onChanged }: { profile: Profile; onChanged: () => void }) {
  const { t } = useTranslation();
  const [lang, setLang] = useState<Lang>(currentLanguage());
  const [circles, setCircles] = useState<MyCircle[]>([]);
  const [blocked, setBlocked] = useState<{ id: string; displayName: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    myCircles().then(setCircles).catch(() => setCircles([]));
    listBlocked().then(setBlocked).catch(() => setBlocked([]));
  }, []);

  async function changeLang(l: Lang) {
    setLang(l);
    setLanguage(l);
    await saveLocale(l);
  }
  async function onPhoto(file?: File) {
    if (!file) return;
    setError(null);
    try {
      await uploadAvatar(file);
      onChanged();
    } catch {
      setError(t('me.photoError'));
    }
  }
  async function download() {
    const blob = await exportMyData();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `third-place-berlin-my-data-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }
  async function remove() {
    if (!window.confirm(t('me.deleteConfirm1'))) return;
    const typed = window.prompt(t('me.deleteConfirm2')) ?? '';
    if (!['DELETE', 'LÖSCHEN'].includes(typed.trim().toUpperCase())) return;
    try {
      await deleteAccount();
      window.alert(t('me.deleted'));
    } catch {
      setError(t('common.error'));
    }
  }

  return (
    <Screen title={t('me.title')}>
      <div className="row card">
        <button className="avatar-btn" onClick={() => fileRef.current?.click()} aria-label={t('me.photo')}>
          <Avatar id={profile.id} name={profile.displayName} url={profile.avatarUrl} size={64} />
        </button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => void onPhoto(e.target.files?.[0])} />
        <div>
          <strong style={{ fontSize: 18 }}>{profile.displayName}</strong>
          <div className="muted">{profile.field}</div>
          <Link to={`/people/${profile.id}`}>{t('me.viewProfile')}</Link> · <Link to="/me/edit">{t('me.editProfile')}</Link>
        </div>
      </div>
      {error && <p className="error">{error}</p>}
      {meSections.inbox?.()}
      {meSections.admin?.()}
      <Invites />
      <div className="label">{t('me.language')}</div>
      <div className="toggle">
        <button className={lang === 'en' ? 'on' : ''} onClick={() => void changeLang('en')}>English</button>
        <button className={lang === 'de' ? 'on' : ''} onClick={() => void changeLang('de')}>Deutsch</button>
      </div>
      <div className="label">{t('me.myCircles')}</div>
      {circles.map((c) => <Link key={c.id} to={`/circles/${c.id}`} className="tag">{c.emoji} {c.name}</Link>)}
      {meSections.notifications && (<><div className="label">{t('me.notifications')}</div>{meSections.notifications()}</>)}
      <div className="label">{t('me.blocked')}</div>
      {blocked.length === 0 ? <p className="muted">{t('me.noBlocked')}</p> : blocked.map((b) => (
        <div className="row person" key={b.id}>{b.displayName}<span className="spacer" />
          <button className="btn ghost" onClick={() => void unblock(b.id).then(() => setBlocked(blocked.filter((x) => x.id !== b.id)))}>{t('people.unblock')}</button>
        </div>
      ))}
      <div className="label">{t('me.privacy')}</div>
      <p className="muted">{t('me.privacyText')}</p>
      <button className="btn secondary block" onClick={() => void download()}>{t('me.export')}</button>
      <button className="btn ghost block" onClick={() => void signOut()}>{t('common.logout')}</button>
      <button className="btn ghost block" style={{ color: '#A6192E' }} onClick={() => void remove()}>{t('me.delete')}</button>
    </Screen>
  );
}
