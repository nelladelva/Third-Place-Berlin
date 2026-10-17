import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Screen } from '../../ui/Screen';
import * as admin from '../../data/admin';
import { listPending, type PendingCard } from '../../data/profiles';
import { inviteUrl } from '../../data/invites';
import { shareInvite } from '../me/Invites';
import type { Profile } from '../../data/session';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="card"><div className="label" style={{ marginTop: 0 }}>{title}</div>{children}</div>;
}

export function AdminScreen({ profile }: { profile: Profile }) {
  const { t } = useTranslation();
  const isAdmin = profile.role === 'admin';
  const [settings, setSettings] = useState<admin.Settings | null>(null);
  const [pending, setPending] = useState<PendingCard[]>([]);
  const [members, setMembers] = useState<admin.MemberAdmin[]>([]);
  const [proposals, setProposals] = useState<admin.ProposalAdmin[]>([]);
  const [reports, setReports] = useState<admin.ReportAdmin[]>([]);
  const [circles, setCircles] = useState<admin.CircleAdmin[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [flash, setFlash] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!isAdmin) return;
    void admin.getSettings().then(setSettings);
    void listPending().then(setPending).catch(() => setPending([]));
    void admin.listMembersAdmin().then(setMembers);
    void admin.listProposals().then(setProposals);
    void admin.listReports().then(setReports);
    void admin.listAllCircles().then(setCircles);
  }, [isAdmin]);
  useEffect(load, [load]);

  if (!isAdmin) return <Screen title={t('admin.title')}><p className="notice">{t('admin.notAllowed')}</p></Screen>;
  const run = (p: Promise<unknown>) => void p.then(load).catch(() => setFlash(t('common.error')));
  const launchUrl = settings?.launchCode ? inviteUrl(settings.launchCode) : null;

  return (
    <Screen title={t('admin.title')}>
      <Link to="/me" className="muted">‹ {t('me.title')}</Link>
      {flash && <p className="notice">{flash}</p>}

      <Section title={t('admin.launch')}>
        <p className="muted">{t('admin.launchIntro')}</p>
        {settings?.launchOpen && launchUrl ? (
          <>
            <p><code>{launchUrl}</code></p>
            <div className="btnrow">
              <button className="btn" onClick={() => void shareInvite(launchUrl, t('admin.launchText'))}>{t('admin.shareLaunch')}</button>
              <button className="btn secondary" onClick={() => run(admin.closeLaunch())}>{t('admin.closeLaunch')}</button>
            </div>
          </>
        ) : (
          <button className="btn block" onClick={() => void admin.openLaunch().then((code) => {
            setSettings((s) => ({ ...(s ?? { vouchesRequired: 2 }), launchOpen: true, launchCode: code }));
          })}>{t('admin.openLaunch')}</button>
        )}
      </Section>

      {pending.length > 0 && (
        <Section title={t('admin.waiting')}>
          {pending.map((p) => (
            <div className="row person" key={p.id}>
              <div style={{ flex: 1 }}><strong>{p.displayName}</strong>
                <div className="muted">{t('people.vouchCount', { vouches: p.vouches, required: p.required })}{p.invitedByName ? ` · ${t('people.invitedBy', { name: p.invitedByName })}` : ''}</div></div>
              <button className="btn" onClick={() => run(admin.approveMember(p.id))}>{t('admin.approve')}</button>
            </div>
          ))}
        </Section>
      )}

      <Section title={t('admin.proposals')}>
        {proposals.length === 0 && <p className="muted">{t('admin.noProposals')}</p>}
        {proposals.map((p) => (
          <div key={p.id} className="person" style={{ display: 'block' }}>
            <strong>{p.emoji} {p.name}</strong> · {p.visibility === 'open' ? t('circles.open') : t('circles.closed')}
            <div className="muted">{p.description} · {p.proposerName}{p.status === 'question' ? ` · ${t('propose.status.question')}` : ''}</div>
            <input className="input" placeholder={t('admin.note')} value={notes[p.id] ?? ''} onChange={(e) => setNotes({ ...notes, [p.id]: e.target.value })} />
            <div className="btnrow">
              <button className="btn" onClick={() => run(admin.decideProposal(p.id, 'approved', notes[p.id] ?? ''))}>{t('circles.approve')}</button>
              <button className="btn secondary" onClick={() => run(admin.decideProposal(p.id, 'question', notes[p.id] ?? ''))}>{t('admin.ask')}</button>
              <button className="btn ghost" onClick={() => run(admin.decideProposal(p.id, 'declined', notes[p.id] ?? ''))}>{t('admin.decline')}</button>
            </div>
          </div>
        ))}
      </Section>

      <Section title={t('admin.reports')}>
        {reports.length === 0 && <p className="muted">{t('admin.noReports')}</p>}
        {reports.map((r) => (
          <div key={r.id} className="person" style={{ display: 'block' }}>
            <strong>{r.targetType}</strong>: “{r.preview}”
            <div className="muted">{r.reason} · {r.reporterName}</div>
            <div className="btnrow">
              <button className="btn" onClick={() => run(admin.removeReportedContent(r).then(() => admin.resolveReport(r.id)))}>{t('admin.deleteTarget')}</button>
              <button className="btn secondary" onClick={() => run(admin.resolveReport(r.id))}>{t('admin.resolve')}</button>
            </div>
          </div>
        ))}
      </Section>

      <Section title={t('admin.circles')}>
        {circles.map((c) => (
          <div key={c.id} className="person" style={{ display: 'block' }}>
            <strong>{c.emoji} {c.name}</strong>{c.status === 'archived' ? ` · ${t('admin.archived')}` : ''}
            <div className="muted">{t('admin.hosts')}: {c.hosts.map((h) => h.displayName).join(', ') || '–'}</div>
            <div className="btnrow">
              <button className="btn secondary" onClick={() => run(admin.setVisibility(c.id, c.visibility === 'open' ? 'closed' : 'open'))}>
                {c.visibility === 'open' ? t('circles.closed') : t('circles.open')}
              </button>
              <select className="input" style={{ margin: 0, flex: 1 }} value="" onChange={(e) => e.target.value && run(admin.setHost(c.id, e.target.value, true))}>
                <option value="">{t('admin.addHost')}</option>
                {members.filter((m) => !c.hosts.some((h) => h.userId === m.id)).map((m) => <option key={m.id} value={m.id}>{m.displayName}</option>)}
              </select>
              <button className="btn ghost" onClick={() => run(admin.archiveCircle(c.id, c.status !== 'archived'))}>
                {c.status === 'archived' ? t('admin.unarchive') : t('admin.archive')}
              </button>
            </div>
          </div>
        ))}
      </Section>

      <Section title={t('admin.members')}>
        {members.map((m) => (
          <div key={m.id} className="row person">
            <span style={{ flex: 1 }}>{m.displayName} {m.role === 'admin' && <span className="tag teach">{t('admin.adminBadge')}</span>}</span>
            {m.id !== profile.id && (
              <>
                <button className="btn ghost" onClick={() => run(admin.setAdmin(m.id, m.role !== 'admin'))}>{m.role === 'admin' ? t('admin.unmakeAdmin') : t('admin.makeAdmin')}</button>
                <button className="btn ghost" style={{ color: '#A6192E' }}
                        onClick={() => window.confirm(t('admin.removeConfirm', { name: m.displayName })) && run(admin.removeMember(m.id))}>{t('admin.remove')}</button>
              </>
            )}
          </div>
        ))}
      </Section>

      {settings && (
        <Section title={t('admin.settings')}>
          <label className="label" htmlFor="vr">{t('admin.vouchesRequired')}</label>
          <select id="vr" className="input" value={settings.vouchesRequired}
                  onChange={(e) => { const n = Number(e.target.value); setSettings({ ...settings, vouchesRequired: n }); run(admin.setVouchesRequired(n)); }}>
            {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </Section>
      )}
    </Screen>
  );
}
