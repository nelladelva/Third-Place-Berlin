import { useEffect, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Screen } from '../../ui/Screen';
import { signOut } from '../../data/session';
import { forgetInvite, myJoinStatus, parseInvite, redeemInvite, rememberInvite, type JoinStatus } from '../../data/invites';

export function NeedInviteScreen({ onCode }: { onCode: () => void }) {
  const { t } = useTranslation();
  const [value, setValue] = useState('');
  function submit(e: FormEvent) {
    e.preventDefault();
    const code = parseInvite(value);
    if (code) {
      rememberInvite(code);
      onCode();
    }
  }
  return (
    <Screen title={t('needInvite.title')}>
      <p className="subtitle">{t('needInvite.body')}</p>
      <form onSubmit={submit}>
        <label className="label" htmlFor="invite-code">{t('needInvite.code')}</label>
        <input id="invite-code" className="input" value={value} onChange={(e) => setValue(e.target.value)} />
        <button className="btn block" type="submit" disabled={!parseInvite(value)}>{t('needInvite.continue')}</button>
      </form>
      <button className="btn ghost block" onClick={() => void signOut()}>{t('common.logout')}</button>
    </Screen>
  );
}

export function JoinScreen({ code, onJoined }: { code: string; onJoined: () => void }) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [adult, setAdult] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await redeemInvite(code, name.trim());
      forgetInvite();
      onJoined();
    } catch (err) {
      setError(t((err as Error).message === 'invite_invalid' ? 'join.invalid' : 'common.error'));
      if ((err as Error).message === 'invite_invalid') forgetInvite();
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen title={t('join.title')}>
      <p className="subtitle">{t('join.body')}</p>
      <form onSubmit={submit}>
        <label className="label" htmlFor="join-name">{t('join.name')}</label>
        <input id="join-name" className="input" maxLength={60} required value={name} onChange={(e) => setName(e.target.value)} />
        <label className="check"><input type="checkbox" checked={adult} onChange={(e) => setAdult(e.target.checked)} /> {t('welcome.adult')}</label>
        <label className="check"><input type="checkbox" checked={privacy} onChange={(e) => setPrivacy(e.target.checked)} /> {t('welcome.privacy')}</label>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="btn block" type="submit" disabled={busy || !name.trim() || !adult || !privacy}>{t('join.submit')}</button>
      </form>
    </Screen>
  );
}

export function WaitingScreen({ onRefresh, onEditProfile }: { onRefresh: () => void; onEditProfile: () => void }) {
  const { t } = useTranslation();
  const [status, setStatus] = useState<JoinStatus | null>(null);
  useEffect(() => {
    void myJoinStatus().then(setStatus);
  }, []);
  return (
    <Screen title={t('waiting.title')}>
      {status && (
        <div className="card">
          <p>{t('waiting.body', { vouches: status.vouches, required: status.required })}</p>
          <div className="progress"><i style={{ width: `${Math.min(100, (100 * status.vouches) / status.required)}%` }} /></div>
          {status.invited_by_name && <p className="muted">{t('waiting.invitedBy', { name: status.invited_by_name })}</p>}
        </div>
      )}
      <p className="subtitle">{t('waiting.tip')}</p>
      <button className="btn block" onClick={onEditProfile}>{t('waiting.editProfile')}</button>
      <button className="btn secondary block" style={{ marginTop: 8 }} onClick={onRefresh}>{t('waiting.refresh')}</button>
      <button className="btn ghost block" onClick={() => void signOut()}>{t('common.logout')}</button>
    </Screen>
  );
}

export function RemovedScreen() {
  const { t } = useTranslation();
  return (
    <Screen title={t('removed.title')}>
      <p className="subtitle">{t('removed.body')}</p>
      <button className="btn ghost block" onClick={() => void signOut()}>{t('common.logout')}</button>
    </Screen>
  );
}
