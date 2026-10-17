import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react';
import { vi } from 'vitest';
import { JoinScreen } from './AuthScreens';
import i18n, { setLanguage } from '../../lib/i18n';

const data = vi.hoisted(() => ({ redeemInvite: vi.fn() }));
vi.mock('../../data/invites', async (orig) => ({ ...(await orig<typeof import('../../data/invites')>()), redeemInvite: data.redeemInvite }));
vi.mock('../../lib/supabase', () => ({ supabase: { auth: { signOut: vi.fn() } } }));

beforeEach(async () => {
  data.redeemInvite.mockReset().mockResolvedValue('pending');
  await act(async () => setLanguage('en'));
});

test('joining needs both 18+ and privacy consent before anything is shared', async () => {
  const onJoined = vi.fn();
  render(<JoinScreen code="abcdefgh23" onJoined={onJoined} />);
  await userEvent.type(screen.getByLabelText(i18n.t('join.name')), 'Nina');
  const submit = screen.getByRole('button', { name: i18n.t('join.submit') });
  expect(submit).toBeDisabled();
  await userEvent.click(screen.getByLabelText(i18n.t('welcome.adult')));
  expect(submit).toBeDisabled();
  await userEvent.click(screen.getByLabelText(i18n.t('welcome.privacy')));
  await userEvent.click(submit);
  expect(data.redeemInvite).toHaveBeenCalledWith('abcdefgh23', 'Nina');
  expect(onJoined).toHaveBeenCalled();
});
