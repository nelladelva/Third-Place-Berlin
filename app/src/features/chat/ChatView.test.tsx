import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { act } from 'react';
import { vi } from 'vitest';
import { ChatView } from './ChatView';
import i18n, { setLanguage } from '../../lib/i18n';

const send = vi.fn();
vi.mock('../../data/chat', () => ({
  useMessages: () => ({ messages: [], loading: false, send, loadOlder: vi.fn(), hasMore: false, reload: vi.fn() }),
  react: vi.fn(), deleteMessage: vi.fn(), report: vi.fn(),
}));

beforeEach(async () => {
  send.mockReset();
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
