import { useState } from 'react';
import { useTranslation } from 'react-i18next';

const KEY = 'tpb.installHelpDismissed';

export function isStandalone(): boolean {
  return (navigator as Navigator & { standalone?: boolean }).standalone === true || !!window.matchMedia?.('(display-mode: standalone)').matches;
}

/** Shown on phones until the app is installed (or dismissed). */
export function InstallHelp() {
  const { t } = useTranslation();
  const [hidden, setHidden] = useState(() => {
    try {
      return localStorage.getItem(KEY) === '1';
    } catch {
      return false;
    }
  });
  const mobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  if (hidden || isStandalone() || !mobile) return null;
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
  return (
    <div className="card install">
      <strong>{t('install.title')}</strong>
      <p style={{ margin: '6px 0' }}>{ios ? t('install.ios') : t('install.android')}</p>
      <p className="muted">{t('install.why')}</p>
      <button className="btn ghost" onClick={() => { try { localStorage.setItem(KEY, '1'); } catch { /* ignore */ } setHidden(true); }}>
        {t('install.dismiss')}
      </button>
    </div>
  );
}
