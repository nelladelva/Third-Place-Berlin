import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { sendCode, verifyCode } from '../../data/session';
import { Screen } from '../../ui/Screen';

export function LoginScreen({ onLoggedIn }: { onLoggedIn?: () => void }) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitEmail(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await sendCode(email);
    setBusy(false);
    if (res.ok) setStep('code');
    else setError(t(res.reason === 'rate_limited' ? 'login.rateLimited' : res.reason === 'invalid_email' ? 'login.invalidEmail' : 'common.error'));
  }

  async function submitCode(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const ok = await verifyCode(email, code);
    setBusy(false);
    if (ok) onLoggedIn?.();
    else setError(t('login.badCode'));
  }

  return (
    <Screen>
      <div className="brand">
        <span className="brand-mark">TP</span>
        <div className="brand-name">Third Place <span>Berlin</span></div>
        <p className="muted">{t('common.tagline')}</p>
      </div>
      <h1 className="title">{t('login.title')}</h1>
      {step === 'email' ? (
        <form onSubmit={submitEmail}>
          <p className="subtitle">{t('login.intro')}</p>
          <label className="label" htmlFor="login-email">{t('login.email')}</label>
          <input id="login-email" className="input" type="email" autoComplete="email" inputMode="email" required
                 value={email} onChange={(e) => setEmail(e.target.value)} />
          {error && <p className="error" role="alert">{error}</p>}
          <button className="btn block" type="submit" disabled={busy}>{t('login.sendCode')}</button>
        </form>
      ) : (
        <form onSubmit={submitCode}>
          <p className="subtitle">{t('login.codeSent', { email: email.trim() })}</p>
          <label className="label" htmlFor="login-code">{t('login.code')}</label>
          <input id="login-code" className="input code-input" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]*"
                 maxLength={6} required value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
          {error && <p className="error" role="alert">{error}</p>}
          <button className="btn block" type="submit" disabled={busy || code.length !== 6}>{t('login.verify')}</button>
          <button className="btn ghost block" type="button" onClick={() => { setStep('email'); setCode(''); setError(null); }}>
            {t('login.changeEmail')}
          </button>
        </form>
      )}
    </Screen>
  );
}
