import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Screen } from '../../ui/Screen';
import { supabase } from '../../lib/supabase';
import type { Profile } from '../../data/session';

export const splitList = (s: string, max = 10): string[] =>
  s.split(',').map((x) => x.trim()).filter(Boolean).slice(0, max);

/** Profile setup; with `requireConsent` it is the first-run welcome, otherwise a plain profile editor. */
export function WelcomeFlow({ profile, onDone, circlesStep, requireConsent = true }:
  { profile: Profile; onDone: () => void; circlesStep?: ReactNode; requireConsent?: boolean }) {
  const { t } = useTranslation();
  const total = requireConsent ? 5 : 3;
  const [step, setStep] = useState(1);
  const [f, setF] = useState({
    displayName: profile.displayName, field: profile.field ?? '', origin: profile.origin ?? '',
    languages: profile.languages.join(', '), berlinSince: profile.berlinSince ?? '', bio: profile.bio ?? '',
    funFact: profile.funFact ?? '', teach: profile.teach.join(', '), learn: profile.learn.join(', '),
  });
  const [adult, setAdult] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  async function save(final: boolean) {
    const update: Record<string, unknown> = {
      display_name: f.displayName.trim() || profile.displayName, field: f.field.trim() || null, origin: f.origin.trim() || null,
      languages: splitList(f.languages), berlin_since: f.berlinSince || null, bio: f.bio.trim() || null,
      fun_fact: f.funFact.trim() || null, teach: splitList(f.teach), learn: splitList(f.learn),
    };
    if (final && requireConsent) update.consent_at = new Date().toISOString();
    const { error: err } = await supabase.from('profiles').update(update).eq('id', profile.id);
    if (err) {
      setError(t('common.error'));
      return false;
    }
    return true;
  }

  async function next() {
    setError(null);
    const last = step === total;
    if (!(await save(last))) return;
    if (last) onDone();
    else setStep(step + 1);
  }

  const field = (key: keyof typeof f, label: string, props: Record<string, unknown> = {}) => (
    <>
      <label className="label" htmlFor={`wf-${key}`}>{label}</label>
      {props.multiline ? (
        <textarea id={`wf-${key}`} className="input" rows={3} value={f[key]} onChange={set(key)} maxLength={props.maxLength as number} />
      ) : (
        <input id={`wf-${key}`} className="input" value={f[key]} onChange={set(key)} {...props} />
      )}
    </>
  );

  return (
    <Screen title={requireConsent ? t('welcome.title') : t('waiting.editProfile')} subtitle={t('welcome.step', { n: step, total })}>
      {step === 1 && (
        <section>
          <h2 className="label">{t('welcome.about')}</h2>
          {field('displayName', t('welcome.name'), { maxLength: 60 })}
          {field('field', t('welcome.field'), { maxLength: 80 })}
          {field('origin', t('welcome.origin'), { maxLength: 80 })}
          {field('languages', t('welcome.languages'))}
          {field('berlinSince', t('welcome.berlinSince'), { type: 'date' })}
        </section>
      )}
      {step === 2 && (
        <section>
          <h2 className="label">{t('welcome.bioTitle')}</h2>
          {field('bio', t('welcome.bio'), { multiline: true, maxLength: 500 })}
          {field('funFact', t('welcome.funFact'), { maxLength: 200 })}
        </section>
      )}
      {step === 3 && (
        <section>
          <h2 className="label">{t('welcome.skillsTitle')}</h2>
          {field('teach', t('welcome.teach'))}
          {field('learn', t('welcome.learn'))}
          <p className="muted">{t('welcome.skillsHint')}</p>
        </section>
      )}
      {step === 4 && requireConsent && (
        <section>
          <h2 className="label">{t('welcome.circlesTitle')}</h2>
          <p className="muted">{t('welcome.circlesHint')}</p>
          {circlesStep}
        </section>
      )}
      {step === 5 && requireConsent && (
        <section>
          <h2 className="label">{t('welcome.consentTitle')}</h2>
          <label className="check"><input type="checkbox" checked={adult} onChange={(e) => setAdult(e.target.checked)} /> {t('welcome.adult')}</label>
          <label className="check"><input type="checkbox" checked={privacy} onChange={(e) => setPrivacy(e.target.checked)} /> {t('welcome.privacy')}</label>
        </section>
      )}
      {error && <p className="error" role="alert">{error}</p>}
      <div className="row" style={{ marginTop: 16 }}>
        {step > 1 && <button className="btn secondary" onClick={() => setStep(step - 1)}>{t('common.back')}</button>}
        <span className="spacer" />
        <button className="btn" onClick={() => void next()}
                disabled={step === total && requireConsent && !(adult && privacy)}>
          {step === total ? (requireConsent ? t('welcome.finish') : t('common.save')) : t('common.next')}
        </button>
      </div>
    </Screen>
  );
}
