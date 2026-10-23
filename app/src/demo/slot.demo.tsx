// Demo build only (swapped in for slot.tsx): the "Demo · sample data" ribbon, and the Admin / Member switch plus
// "Reset demo" in Me. Uses an in-app confirm, never window.confirm.
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { resetDemo, update } from './store';
import { state, useStore } from './view';

export function DemoRibbon() {
  const { t } = useTranslation();
  return (
    <div role="note" style={{ position: 'sticky', top: 0, zIndex: 1000, background: 'var(--rust)', color: '#fff', textAlign: 'center',
      fontSize: 12, fontWeight: 700, letterSpacing: 0.3, padding: '4px 8px' }}>
      {t('demo.ribbon')}
    </div>
  );
}

export function DemoControls({ onChanged }: { onChanged?: () => void }) {
  const { t } = useTranslation();
  const viewAs = useStore(() => state().me.viewAs);
  const [confirming, setConfirming] = useState(false);
  const setView = (v: 'admin' | 'member') => {
    update((s) => { s.me.viewAs = v; });
    onChanged?.();
  };
  const seg = (v: 'admin' | 'member', label: string) => (
    <button type="button" className={viewAs === v ? 'btn' : 'btn ghost'} aria-pressed={viewAs === v} onClick={() => setView(v)}
      style={{ flex: 1 }}>{label}</button>
  );
  return (
    <div className="card" style={{ marginBottom: 12, background: 'var(--warn)' }}>
      <div className="label" style={{ marginTop: 0 }}>{t('demo.viewAs')}</div>
      <div className="row" style={{ gap: 8 }}>{seg('admin', t('demo.admin'))}{seg('member', t('demo.member'))}</div>
      {!confirming ? (
        <button type="button" className="btn ghost block" style={{ marginTop: 10 }} onClick={() => setConfirming(true)}>{t('demo.reset')}</button>
      ) : (
        <div style={{ marginTop: 10 }}>
          <p className="muted" style={{ margin: '0 0 8px' }}>{t('demo.resetConfirm')}</p>
          <div className="row" style={{ gap: 8 }}>
            <button type="button" className="btn" style={{ flex: 1 }} onClick={() => { resetDemo(); setConfirming(false); onChanged?.(); }}>
              {t('demo.resetYes')}</button>
            <button type="button" className="btn ghost" style={{ flex: 1 }} onClick={() => setConfirming(false)}>{t('common.cancel')}</button>
          </div>
        </div>
      )}
    </div>
  );
}
