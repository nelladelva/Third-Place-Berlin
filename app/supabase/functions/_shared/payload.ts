// Push message text in EN/DE/FR. Plain TypeScript (no Deno APIs) so Vitest can test it.
export type NotificationKind = 'meetup_new' | 'poll_new' | 'mention' | 'reply' | 'message_new' | 'member_approved'
  | 'join_request' | 'join_decided' | 'proposal_new' | 'proposal_decided' | 'recommended' | 'weekly_question';
export type Lang = 'en' | 'de' | 'fr';
type D = Record<string, unknown>;

/** Pick the text for a language. */
const t = (l: Lang, en: string, de: string, fr: string) => ({ en, de, fr })[l] ?? en;
const s = (d: D, k: string) => (d[k] == null ? '' : String(d[k]));
const circleUrl = (d: D) => (d.meetup_id ? `#/meetups/${s(d, 'meetup_id')}` : d.circle_id ? `#/circles/${s(d, 'circle_id')}` : '#/');

const TEXT: Record<NotificationKind, (d: D, lang: Lang) => { title: string; body: string; url: string }> = {
  meetup_new: (d, l) => ({ title: t(l, `New meetup in ${s(d, 'circle')}`, `Neues Treffen in ${s(d, 'circle')}`, `Nouvelle rencontre dans ${s(d, 'circle')}`),
    body: s(d, 'title'), url: `#/meetups/${s(d, 'meetup_id')}` }),
  poll_new: (d, l) => ({ title: t(l, `New poll in ${s(d, 'circle')}`, `Neue Umfrage in ${s(d, 'circle')}`, `Nouveau sondage dans ${s(d, 'circle')}`),
    body: s(d, 'question'), url: `#/circles/${s(d, 'circle_id')}` }),
  mention: (d, l) => ({ title: t(l, `${s(d, 'author')} mentioned you`, `${s(d, 'author')} hat dich erwähnt`, `${s(d, 'author')} t'a mentionné·e`),
    body: s(d, 'body'), url: circleUrl(d) }),
  reply: (d, l) => ({ title: t(l, `${s(d, 'author')} replied to you`, `${s(d, 'author')} hat dir geantwortet`, `${s(d, 'author')} t'a répondu`),
    body: s(d, 'body'), url: circleUrl(d) }),
  message_new: (d) => ({ title: `${s(d, 'author')} · ${s(d, 'circle')}`, body: s(d, 'body'), url: circleUrl(d) }),
  member_approved: (_d, l) => ({ title: t(l, 'Welcome to Third Place Berlin! 🎉', 'Willkommen bei Third Place Berlin! 🎉', 'Bienvenue sur Third Place Berlin ! 🎉'),
    body: t(l, "You're in. Pick your circles.", 'Du bist jetzt dabei. Such dir deine Kreise aus.', "C'est fait, tu es membre. Choisis tes cercles."), url: '#/' }),
  join_request: (d, l) => ({ title: t(l, `Join request for ${s(d, 'circle')}`, `Beitrittsanfrage für ${s(d, 'circle')}`, `Demande d'adhésion pour ${s(d, 'circle')}`),
    body: s(d, 'author'), url: `#/circles/${s(d, 'circle_id')}` }),
  join_decided: (d, l) => ({ title: d.approved
      ? t(l, `You're now in ${s(d, 'circle')} 🎉`, `Du bist jetzt in ${s(d, 'circle')} 🎉`, `Tu fais maintenant partie de ${s(d, 'circle')} 🎉`)
      : t(l, `Request for ${s(d, 'circle')} declined`, `Anfrage für ${s(d, 'circle')} abgelehnt`, `Demande pour ${s(d, 'circle')} refusée`),
    body: '', url: `#/circles/${s(d, 'circle_id')}` }),
  proposal_new: (d, l) => ({ title: t(l, 'New circle proposal', 'Neuer Kreis-Vorschlag', 'Nouvelle proposition de cercle'),
    body: `${s(d, 'name')} · ${s(d, 'author')}`, url: '#/me' }),
  proposal_decided: (d, l) => ({
    title: d.status === 'approved' ? t(l, `Your circle “${s(d, 'name')}” is live! 🎉`, `Dein Kreis „${s(d, 'name')}“ ist live! 🎉`, `Ton cercle « ${s(d, 'name')} » est en ligne ! 🎉`)
      : t(l, `Update on your proposal “${s(d, 'name')}”`, `Update zu deinem Vorschlag „${s(d, 'name')}“`, `Du nouveau sur ta proposition « ${s(d, 'name')} »`),
    body: s(d, 'note'), url: d.circle_id ? `#/circles/${s(d, 'circle_id')}` : '#/circles/propose' }),
  recommended: (d, l) => ({ title: t(l, `${s(d, 'author')} recommends you for ${s(d, 'circle')}`, `${s(d, 'author')} empfiehlt dir ${s(d, 'circle')}`, `${s(d, 'author')} te recommande pour ${s(d, 'circle')}`),
    body: '', url: `#/circles/${s(d, 'circle_id')}` }),
  weekly_question: (d, l) => ({ title: t(l, `🌱 Question of the week in ${s(d, 'circle')}`, `🌱 Frage der Woche in ${s(d, 'circle')}`,
      `🌱 Question de la semaine dans ${s(d, 'circle')}`), body: s(d, 'body'), url: `#/circles/${s(d, 'circle_id')}` }),
};

export function buildPushPayload(kind: NotificationKind, data: D, lang: Lang): { title: string; body: string; url: string } {
  return TEXT[kind](data, lang);
}
