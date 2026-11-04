import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Linkify } from './Linkify';

describe('Linkify', () => {
  it('turns https links into links that open in a new tab', () => {
    render(<p><Linkify text={'Info & tickets: https://www.expolingua.com/ see you'} /></p>);
    const a = screen.getByRole('link', { name: 'https://www.expolingua.com/' });
    expect(a.getAttribute('href')).toBe('https://www.expolingua.com/');
    expect(a.getAttribute('target')).toBe('_blank');
    expect(a.getAttribute('rel')).toContain('noopener');
    expect(screen.getByText(/see you/)).toBeTruthy();
  });

  it('keeps a full stop or bracket at the end out of the link', () => {
    render(<p><Linkify text={'Look (https://a.de/x).'} /></p>);
    expect(screen.getByRole('link').getAttribute('href')).toBe('https://a.de/x');
  });

  it('does not link other schemes', () => {
    render(<p><Linkify text={'javascript:alert(1) http://plain.de'} /></p>);
    expect(screen.queryAllByRole('link')).toHaveLength(0);
  });
});
