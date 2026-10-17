import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { act } from 'react';
import { TabBar } from './TabBar';
import { setLanguage } from '../lib/i18n';

test('renders four tabs in German', async () => {
  await act(async () => setLanguage('de'));
  render(
    <MemoryRouter>
      <TabBar active="home" />
    </MemoryRouter>,
  );
  for (const label of ['Start', 'Kreise', 'Leute', 'Ich']) {
    expect(screen.getByText(label)).toBeInTheDocument();
  }
});
