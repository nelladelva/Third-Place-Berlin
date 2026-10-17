import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react';
import { vi } from 'vitest';
import { LoginScreen } from './LoginScreen';
import i18n, { setLanguage } from '../../lib/i18n';

const auth = vi.hoisted(() => ({ signInWithOtp: vi.fn(), verifyOtp: vi.fn() }));
vi.mock('../../lib/supabase', () => ({ supabase: { auth } }));

beforeEach(async () => {
  auth.signInWithOtp.mockReset();
  auth.verifyOtp.mockReset();
  await act(async () => setLanguage('en'));
});

test('sends a code then verifies with type email', async () => {
  auth.signInWithOtp.mockResolvedValue({ error: null });
  auth.verifyOtp.mockResolvedValue({ data: { session: {} }, error: null });
  render(<LoginScreen />);
  await userEvent.type(screen.getByLabelText(i18n.t('login.email')), 'amara@example.com');
  await userEvent.click(screen.getByRole('button', { name: i18n.t('login.sendCode') }));
  expect(auth.signInWithOtp).toHaveBeenCalledWith({ email: 'amara@example.com', options: { shouldCreateUser: true } });
  await userEvent.type(await screen.findByLabelText(i18n.t('login.code')), '123456');
  await userEvent.click(screen.getByRole('button', { name: i18n.t('login.verify') }));
  expect(auth.verifyOtp).toHaveBeenCalledWith({ email: 'amara@example.com', token: '123456', type: 'email' });
});

test.each(['en', 'de'] as const)('shows rate-limit message (%s)', async (lang) => {
  await act(async () => setLanguage(lang));
  auth.signInWithOtp.mockResolvedValue({ error: { status: 429, code: 'over_email_send_rate_limit', message: 'rate limit' } });
  render(<LoginScreen />);
  await userEvent.type(screen.getByLabelText(i18n.t('login.email')), 'amara@example.com');
  await userEvent.click(screen.getByRole('button', { name: i18n.t('login.sendCode') }));
  expect(await screen.findByText(i18n.t('login.rateLimited'))).toBeInTheDocument();
  expect(i18n.t('login.rateLimited')).not.toBe('login.rateLimited');
});

test('wrong code shows an error and stays on the code step', async () => {
  auth.signInWithOtp.mockResolvedValue({ error: null });
  auth.verifyOtp.mockResolvedValue({ data: { session: null }, error: { message: 'Token has expired or is invalid' } });
  render(<LoginScreen />);
  await userEvent.type(screen.getByLabelText(i18n.t('login.email')), 'amara@example.com');
  await userEvent.click(screen.getByRole('button', { name: i18n.t('login.sendCode') }));
  await userEvent.type(await screen.findByLabelText(i18n.t('login.code')), '000000');
  await userEvent.click(screen.getByRole('button', { name: i18n.t('login.verify') }));
  expect(await screen.findByText(i18n.t('login.badCode'))).toBeInTheDocument();
});
