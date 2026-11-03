import { buildPushPayload } from './payload';

test('German meetup_new payload', () => {
  const p = buildPushPayload('meetup_new', { title: 'Picknick', circle: 'BBB', meetup_id: 'm1' }, 'de');
  expect(p.title).toContain('Neues Treffen');
  expect(p.body).toContain('Picknick');
  expect(p.url).toBe('#/meetups/m1');
});

test('English mention payload links to the circle', () => {
  const p = buildPushPayload('mention', { author: 'Saskia', circle: 'Karaoke', circle_id: 'c1', body: 'see you' }, 'en');
  expect(p.title).toContain('Saskia');
  expect(p.url).toBe('#/circles/c1');
});

test('every kind has a payload in every language', () => {
  for (const k of ['meetup_new', 'poll_new', 'mention', 'reply', 'message_new', 'member_approved', 'join_request',
    'join_decided', 'proposal_new', 'proposal_decided', 'recommended', 'weekly_question'] as const) {
    for (const lang of ['en', 'de', 'fr'] as const) expect(buildPushPayload(k, {}, lang).title.length).toBeGreaterThan(0);
  }
});

test('French reply payload', () => {
  const p = buildPushPayload('reply', { author: 'Amara', circle_id: 'c1', body: 'à samedi' }, 'fr');
  expect(p.title).toBe("Amara t'a répondu");
  expect(p.url).toBe('#/circles/c1');
});

test('weekly question push in all three languages, linking to the circle', () => {
  const d = { circle: 'BBB · Belong Beyond Borders', circle_id: 'c-bbb', body: 'Why Berlin, and not somewhere else?' };
  expect(buildPushPayload('weekly_question', d, 'en').title).toBe('🌱 Question of the week in BBB · Belong Beyond Borders');
  expect(buildPushPayload('weekly_question', d, 'de').title).toBe('🌱 Frage der Woche in BBB · Belong Beyond Borders');
  expect(buildPushPayload('weekly_question', d, 'fr').title).toBe('🌱 Question de la semaine dans BBB · Belong Beyond Borders');
  expect(buildPushPayload('weekly_question', d, 'en').body).toBe('Why Berlin, and not somewhere else?');
  expect(buildPushPayload('weekly_question', d, 'en').url).toBe('#/circles/c-bbb');
});
