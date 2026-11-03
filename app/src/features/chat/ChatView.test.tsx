import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { act } from 'react';
import { vi } from 'vitest';
import { ChatView } from './ChatView';
import i18n, { setLanguage } from '../../lib/i18n';

const send = vi.fn();
const chat = vi.hoisted(() => ({ messages: [] as unknown[] }));
vi.mock('../../data/chat', () => ({
  useMessages: () => ({ messages: chat.messages, loading: false, send, loadOlder: vi.fn(), hasMore: false, reload: vi.fn() }),
  react: vi.fn(), deleteMessage: vi.fn(), report: vi.fn(), REACTIONS: ['❤️', '😂', '🙌', '👍', '🤔', '🔥'],
}));

const question = { id: 'q1', authorId: '', authorName: 'Third Place', authorAvatar: null, kind: 'question',
  body: 'Why Berlin, and not somewhere else?', pollId: null, replyTo: null, mentions: [], createdAt: '2026-11-09T08:00:00Z',
  deleted: false, reactions: [] };

beforeEach(async () => {
  send.mockReset();
  chat.messages = [];
  await act(async () => setLanguage('en'));
});

test('read-only banner after meetup chat closes', () => {
  render(<MemoryRouter><ChatView scope={{ meetupId: 'm1' }} me="u1" members={[]} closesAt="2026-07-07T16:00:00Z" now={new Date('2026-07-08T10:00:00Z')} /></MemoryRouter>);
  expect(screen.getByText(i18n.t('chat.closed'))).toBeInTheDocument();
  expect(screen.queryByPlaceholderText(i18n.t('chat.placeholder'))).toBeNull();
});

test('meetup chat still open before closesAt', () => {
  render(<MemoryRouter><ChatView scope={{ meetupId: 'm1' }} me="u1" members={[]} closesAt="2026-07-07T16:00:00Z" now={new Date('2026-07-06T10:00:00Z')} /></MemoryRouter>);
  expect(screen.getByPlaceholderText(i18n.t('chat.placeholder'))).toBeInTheDocument();
});

test('@mention autocomplete inserts name and records mention id', async () => {
  render(<MemoryRouter><ChatView scope={{ circleId: 'c1' }} me="u1"
    members={[{ userId: 'u-s', displayName: 'Saskia' }, { userId: 'u-j', displayName: 'Jonas' }]} /></MemoryRouter>);
  const box = screen.getByPlaceholderText(i18n.t('chat.placeholder'));
  await userEvent.type(box, 'See you @Sa');
  await userEvent.click(screen.getByRole('button', { name: '@Saskia' }));
  expect(box).toHaveValue('See you @Saskia ');
  await userEvent.type(box, 'tomorrow');
  await userEvent.click(screen.getByRole('button', { name: i18n.t('chat.send') }));
  expect(send).toHaveBeenCalledWith('See you @Saskia tomorrow', { replyTo: undefined, mentions: ['u-s'] });
});

test('leaving the chat does not crash when scrollIntoView returns a Promise (Chrome 155+)', () => {
  const original = Element.prototype.scrollIntoView;
  Element.prototype.scrollIntoView = (() => Promise.resolve()) as unknown as typeof original;
  try {
    const { unmount } = render(<MemoryRouter><ChatView scope={{ circleId: 'c1' }} me="u1" members={[]} /></MemoryRouter>);
    expect(() => unmount()).not.toThrow();
  } finally {
    Element.prototype.scrollIntoView = original;
  }
});

test('the question of the week shows as a special card from Third Place, not a person', () => {
  chat.messages = [question];
  render(<MemoryRouter><ChatView scope={{ circleId: 'c-bbb' }} me="u1" members={[]} /></MemoryRouter>);
  expect(screen.getByText(i18n.t('chat.question.tag'))).toBeInTheDocument();
  expect(screen.getByText('Why Berlin, and not somewhere else?')).toBeInTheDocument();
  expect(screen.queryByRole('link')).toBeNull(); // no profile link: Third Place is not a person
  expect(screen.queryByRole('button', { name: i18n.t('chat.report') })).toBeNull();
});

test('"Answer" on the card sends a reply to it', async () => {
  chat.messages = [question];
  render(<MemoryRouter><ChatView scope={{ circleId: 'c-bbb' }} me="u1" members={[]} /></MemoryRouter>);
  await userEvent.click(screen.getByRole('button', { name: i18n.t('chat.question.answer') }));
  await userEvent.type(screen.getByPlaceholderText(i18n.t('chat.placeholder')), 'Because of the parks');
  await userEvent.click(screen.getByRole('button', { name: i18n.t('chat.send') }));
  expect(send).toHaveBeenCalledWith('Because of the parks', { replyTo: 'q1', mentions: [] });
});

test('an answer quotes the question with the 🌱', () => {
  chat.messages = [question, { ...question, id: 'a1', authorId: 'u2', authorName: 'Amara', kind: 'text', body: 'Parks!', replyTo: 'q1' }];
  render(<MemoryRouter><ChatView scope={{ circleId: 'c-bbb' }} me="u1" members={[]} /></MemoryRouter>);
  expect(screen.getByText(/↪ 🌱 Why Berlin/)).toBeInTheDocument();
});
