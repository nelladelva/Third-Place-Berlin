import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { act } from 'react';
import { vi } from 'vitest';
import { PollView } from './PollCard';
import { PollComposer } from './PollComposer';
import i18n, { setLanguage } from '../../lib/i18n';

beforeEach(async () => {
  await act(async () => setLanguage('en'));
});

test('shows counts and marks my vote', async () => {
  const onVote = vi.fn();
  render(<PollView poll={{ id: 'p', question: 'Which book for November?', closesAt: null, myOptionId: 'o1',
    options: [{ id: 'o1', label: 'Pachinko', votes: 11 }, { id: 'o2', label: 'Paons / Pfauen', votes: 6 }] }} onVote={onVote} />);
  expect(screen.getByText('Which book for November?')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Pachinko.*11.*✓/ })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Paons \/ Pfauen.*6/ })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: /Paons/ }));
  expect(onVote).toHaveBeenCalledWith('o2');
});

test('composer rejects fewer than 2 options', async () => {
  const onCreate = vi.fn();
  render(<PollComposer onCreate={onCreate} onCancel={vi.fn()} />);
  await userEvent.type(screen.getByLabelText(i18n.t('poll.question')), 'Where next?');
  await userEvent.type(screen.getByLabelText(i18n.t('poll.option', { n: 1 })), 'Mauerpark');
  const create = screen.getByRole('button', { name: i18n.t('poll.create') });
  expect(create).toBeDisabled();
  await userEvent.type(screen.getByLabelText(i18n.t('poll.option', { n: 2 })), 'Tempelhof');
  expect(create).toBeEnabled();
  await userEvent.click(create);
  expect(onCreate).toHaveBeenCalledWith('Where next?', ['Mauerpark', 'Tempelhof']);
});
