// Push message text in EN/DE. Plain TypeScript (no Deno APIs) so Vitest can test it.
export type NotificationKind = 'meetup_new' | 'poll_new' | 'mention' | 'reply' | 'message_new' | 'member_approved'
  | 'join_request' | 'join_decided' | 'proposal_new' | 'proposal_decided' | 'recommended';
type Lang = 'en' | 'de';
type D = Record<string, unknown>;

const s = (d: D, k: string) => (d[k] == null ? '' : String(d[k]));
const circleUrl = (d: D) => (d.meetup_id ? `#/meetups/${s(d, 'meetup_id')}` : d.circle_id ? `#/circles/${s(d, 'circle_id')}` : '#/');

const TEXT: Record<NotificationKind, (d: D, lang: Lang) => { title: string; body: string; url: string }> = {
  meetup_new: (d, l) => ({ title: l === 'de' ? `Neues Treffen in ${s(d, 'circle')}` : `New meetup in ${s(d, 'circle')}`,
    body: s(d, 'title'), url: `#/meetups/${s(d, 'meetup_id')}` }),
  poll_new: (d, l) => ({ title: l === 'de' ? `Neue Umfrage in ${s(d, 'circle')}` : `New poll in ${s(d, 'circle')}`,
    body: s(d, 'question'), url: `#/circles/${s(d, 'circle_id')}` }),
  mention: (d, l) => ({ title: l === 'de' ? `${s(d, 'author')} hat dich erwähnt` : `${s(d, 'author')} mentioned you`,
    body: s(d, 'body'), url: circleUrl(d) }),
  reply: (d, l) => ({ title: l === 'de' ? `${s(d, 'author')} hat dir geantwortet` : `${s(d, 'author')} replied to you`,
    body: s(d, 'body'), url: circleUrl(d) }),
  message_new: (d) => ({ title: `${s(d, 'author')} · ${s(d, 'circle')}`, body: s(d, 'body'), url: circleUrl(d) }),
  member_approved: (_d, l) => ({ title: l === 'de' ? 'Willkommen bei Third Place Berlin! 🎉' : 'Welcome to Third Place Berlin! 🎉',
    body: l === 'de' ? 'Du bist jetzt dabei. Such dir deine Kreise aus.' : "You're in. Pick your circles.", url: '#/' }),
  join_request: (d, l) => ({ title: l === 'de' ? `Beitrittsanfrage für ${s(d, 'circle')}` : `Join request for ${s(d, 'circle')}`,
    body: s(d, 'author'), url: `#/circles/${s(d, 'circle_id')}` }),
  join_decided: (d, l) => ({ title: d.approved
      ? (l === 'de' ? `Du bist jetzt in ${s(d, 'circle')} 🎉` : `You're now in ${s(d, 'circle')} 🎉`)
      : (l === 'de' ? `Anfrage für ${s(d, 'circle')} abgelehnt` : `Request for ${s(d, 'circle')} declined`),
    body: '', url: `#/circles/${s(d, 'circle_id')}` }),
  proposal_new: (d, l) => ({ title: l === 'de' ? 'Neuer Kreis-Vorschlag' : 'New circle proposal',
    body: `${s(d, 'name')} · ${s(d, 'author')}`, url: '#/me' }),
  proposal_decided: (d, l) => ({
    title: d.status === 'approved' ? (l === 'de' ? `Dein Kreis „${s(d, 'name')}“ ist live! 🎉` : `Your circle “${s(d, 'name')}” is live! 🎉`)
      : (l === 'de' ? `Update zu deinem Vorschlag „${s(d, 'name')}“` : `Update on your proposal “${s(d, 'name')}”`),
    body: s(d, 'note'), url: d.circle_id ? `#/circles/${s(d, 'circle_id')}` : '#/circles/propose' }),
  recommended: (d, l) => ({ title: l === 'de' ? `${s(d, 'author')} empfiehlt dir ${s(d, 'circle')}` : `${s(d, 'author')} recommends you for ${s(d, 'circle')}`,
    body: '', url: `#/circles/${s(d, 'circle_id')}` }),
};

export function buildPushPayload(kind: NotificationKind, data: D, lang: Lang): { title: string; body: string; url: string } {
  return TEXT[kind](data, lang);
}
