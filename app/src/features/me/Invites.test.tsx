import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react';
import { vi } from 'vitest';
import { Invites } from './Invites';
import i18n, { setLanguage } from '../../lib/i18n';

const data = vi.hoisted(() => ({ createInvite: vi.fn(), listMyInvites: vi.fn() }));
vi.mock('../../data/invites', () => data);

beforeEach(async () => {
  await act(async () => setLanguage('en'));
  data.createInvite.mockResolvedValue({ code: 'abcdefgh23', url: 'https://example.org/app/#/join/abcdefgh23' });
  data.listMyInvites.mockResolvedValue([]);
});

test('creates link and shares with WhatsApp-friendly text', async () => {
  const share = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'share', { configurable: true, value: share });
  render(<Invites />);
  await userEvent.click(screen.getByRole('button', { name: i18n.t('invites.create') }));
  expect(data.createInvite).toHaveBeenCalled();
  const arg = share.mock.calls[0][0] as { text: string };
  expect(arg.text).toContain('https://example.org/app/#/join/abcdefgh23');
  expect(arg.text).toContain(i18n.t('invites.shareText'));
});

test('falls back to copying when sharing is unavailable', async () => {
  Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
  render(<Invites />);
  await userEvent.click(screen.getByRole('button', { name: i18n.t('invites.create') }));
  expect(writeText).toHaveBeenCalledWith(expect.stringContaining('#/join/abcdefgh23'));
  expect(await screen.findByText(i18n.t('invites.copied'))).toBeInTheDocument();
});
