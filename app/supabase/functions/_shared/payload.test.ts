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

test('every kind has a payload in both languages', () => {
  for (const k of ['meetup_new', 'poll_new', 'mention', 'reply', 'message_new', 'member_approved', 'join_request',
    'join_decided', 'proposal_new', 'proposal_decided', 'recommended'] as const) {
    for (const lang of ['en', 'de'] as const) expect(buildPushPayload(k, {}, lang).title.length).toBeGreaterThan(0);
  }
});
