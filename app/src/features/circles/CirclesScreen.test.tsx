import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { act } from 'react';
import { vi } from 'vitest';
import { CirclesScreen } from './CirclesScreen';
import { ProposeCircle } from './ProposeCircle';
import i18n, { setLanguage } from '../../lib/i18n';
import type { CircleCard } from '../../data/circles';

const data = vi.hoisted(() => ({
  listCircles: vi.fn(), joinCircle: vi.fn(), requestJoin: vi.fn(), proposeCircle: vi.fn(), myProposals: vi.fn(),
}));
vi.mock('../../data/circles', () => data);

const card = (over: Partial<CircleCard>): CircleCard => ({
  id: 'c', name: 'X', description: '', emoji: '✨', color: '#2F5D58', visibility: 'open',
  memberCount: 3, isMember: false, isHost: false, myRequestStatus: null, ...over,
});

beforeEach(async () => {
  Object.values(data).forEach((f) => f.mockReset());
  data.myProposals.mockResolvedValue([]);
  await act(async () => setLanguage('en'));
});

function renderList(cards: CircleCard[]) {
  data.listCircles.mockResolvedValue(cards);
  render(<MemoryRouter><CirclesScreen /></MemoryRouter>);
}

test('shows open and closed badges', async () => {
  renderList([card({ id: 'bbb', name: 'BBB', visibility: 'open' }), card({ id: 'w', name: 'Women Events', visibility: 'closed' })]);
  const open = await screen.findByTestId('circle-bbb');
  const closed = screen.getByTestId('circle-w');
  expect(within(open).getByText(/🔓/)).toBeInTheDocument();
  expect(within(closed).getByText(/🔒/)).toBeInTheDocument();
});

test('open circle shows Join, closed shows Request to join', async () => {
  renderList([card({ id: 'bbb', visibility: 'open' }), card({ id: 'w', visibility: 'closed' })]);
  const open = await screen.findByTestId('circle-bbb');
  await userEvent.click(within(open).getByRole('button', { name: i18n.t('circles.join') }));
  expect(data.joinCircle).toHaveBeenCalledWith('bbb');
  const closed = screen.getByTestId('circle-w');
  await userEvent.click(within(closed).getByRole('button', { name: i18n.t('circles.requestJoin') }));
  expect(data.requestJoin).toHaveBeenCalledWith('w');
});

test('pending request shows status "Waiting for approval"', async () => {
  renderList([card({ id: 'w', visibility: 'closed', myRequestStatus: 'pending' })]);
  const closed = await screen.findByTestId('circle-w');
  expect(within(closed).getByText(i18n.t('circles.waitingApproval'))).toBeInTheDocument();
  expect(within(closed).queryByRole('button', { name: i18n.t('circles.requestJoin') })).toBeNull();
});

test('propose form requires a name and sends visibility', async () => {
  data.proposeCircle.mockResolvedValue('p1');
  render(<MemoryRouter><ProposeCircle /></MemoryRouter>);
  const send = screen.getByRole('button', { name: i18n.t('propose.send') });
  expect(send).toBeDisabled();
  await userEvent.type(screen.getByLabelText(i18n.t('propose.name')), 'Supper Club');
  await userEvent.click(screen.getByRole('button', { name: new RegExp(i18n.t('circles.closed')) }));
  await userEvent.click(send);
  expect(data.proposeCircle).toHaveBeenCalledWith(expect.objectContaining({ name: 'Supper Club', visibility: 'closed' }));
  expect(await screen.findByText(i18n.t('propose.sent'))).toBeInTheDocument();
});
