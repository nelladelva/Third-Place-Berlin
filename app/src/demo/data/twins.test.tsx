import { act, render, screen, waitFor } from '@testing-library/react';
import { reloadForTest } from '../store';
import * as circles from './circles';
import * as meetups from './meetups';
import * as chat from './chat';
import * as notifications from './notifications';
import * as invites from './invites';
import * as session from './session';

beforeEach(() => {
  vi.useRealTimers();
  localStorage.clear();
  sessionStorage.clear();
  reloadForTest();
});

test('8 circles, and I can see my membership', async () => {
  const list = await circles.listCircles();
  expect(list).toHaveLength(8);
  expect(list.find((c) => c.name === 'BBB · Belong Beyond Borders')).toMatchObject({ isMember: true, isHost: true });
  expect(list.find((c) => c.name === 'Women Events')).toMatchObject({ isMember: true, isHost: true, visibility: 'closed' });
  expect(list.find((c) => c.name === 'Art Lovers')).toMatchObject({ isMember: false, visibility: 'open' });
});

test('Tempelhof picnic stays upcoming 30 days later', async () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(Date.now() + 30 * 24 * 3600 * 1000));
  const m = (await meetups.listUpcoming()).find((x) => x.title === 'Tempelhof picnic')!;
  expect(m).toBeDefined();
  expect(Date.parse(m.startsAt)).toBeGreaterThan(Date.now());
});

test('RSVP shows up on the meetup', async () => {
  expect(await meetups.rsvp('m-cowork')).toBe('going');
  expect((await meetups.getMeetup('m-cowork'))!.iAmGoing).toBe(true);
});

function Chat() {
  const { messages, send } = chat.useMessages({ circleId: 'c-bbb' });
  return (<div><button onClick={() => void send('hello from the test')}>send</button>
    <ul>{messages.map((m) => <li key={m.id}>{m.body}</li>)}</ul></div>);
}
test('sending a message shows it in the chat', async () => {
  render(<Chat />);
  await screen.findByText(/Welcome to everyone/);
  await act(async () => screen.getByText('send').click());
  await screen.findByText('hello from the test');
});

function Unread() {
  return <span data-testid="unread">{notifications.useUnreadCount()}</span>;
}
test('unread count rises when my join request is approved', async () => {
  render(<Unread />);
  await waitFor(() => expect(screen.getByTestId('unread').textContent).toBe('3'));
  await act(async () => { await circles.leaveCircle('c-women'); });
  await act(async () => { await circles.requestJoin('c-women'); }); // no note to myself for my own request
  expect(screen.getByTestId('unread').textContent).toBe('3');
  const mine = (await circles.listJoinRequests('c-women')).find((j) => j.userId === 'demo-you')!;
  await act(async () => { await circles.decideJoin(mine.id, true); });
  await waitFor(() => expect(screen.getByTestId('unread').textContent).toBe('4'));
});

test('invites point at the demo and never touch the real app\'s key', () => {
  expect(invites.inviteUrl('abcdefghij')).toContain('/Third-Place-Berlin/demo/#/join/abcdefghij');
  invites.rememberInvite('abcdefghij');
  expect(sessionStorage.getItem('tpb.invite')).toBeNull();
  expect(invites.rememberedInvite()).toBe('abcdefghij');
});

test('the demo session is me, already welcomed, as admin', async () => {
  const p = await session.fetchProfile('demo-you');
  expect(p).toMatchObject({ id: 'demo-you', role: 'admin', status: 'member' });
  expect(p!.welcomedAt).not.toBeNull();
  expect(await session.currentUserId()).toBe('demo-you');
});
